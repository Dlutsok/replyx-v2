import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks';
import { useNotifications } from '../hooks/useNotifications';
import LoadingSpinner, { LoadingButton } from '../components/common/LoadingSpinner';
import {
  FiCheck, FiShield, FiDollarSign, FiMessageSquare, FiActivity, FiCreditCard, FiBriefcase, FiTrendingUp, FiSettings
} from 'react-icons/fi';

import { API_URL } from '../config/api';



// Основной компонент страницы баланса в стиле дашборда
export default function Balance() {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  const [amount, setAmount] = useState('500');
  const [balanceStats, setBalanceStats] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const { user } = useAuth();
  const { showError } = useNotifications();

  // Загрузка баланса при монтировании
  useEffect(() => {
    if (user) {
      loadBalanceData();
    }
  }, [user]);

  // Обработчик обновления баланса
  useEffect(() => {
    const handleBalanceUpdate = (event) => {
      if (event.detail && event.detail.newBalance !== undefined) {
        setUserBalance(event.detail.newBalance);
        // Перезагружаем полные данные при обновлении баланса
        loadBalanceData();
      }
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate);
    return () => window.removeEventListener('balanceUpdated', handleBalanceUpdate);
  }, []);


  const loadBalanceData = async () => {
    if (!user) return;

    const token = localStorage.getItem('token');
    setDataLoading(true);

    try {
      // Загружаем статистику баланса
      const statsResponse = await fetch(`${API_URL}/api/balance/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch balance stats');
      }
      
      const statsData = await statsResponse.json();
      setBalanceStats(statsData);
      setUserBalance(statsData.current_balance || 0);

      // Загружаем последние транзакции
      const transactionsResponse = await fetch(`${API_URL}/api/balance/transactions?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData);
      }

    } catch (err) {
      showError('Ошибка загрузки данных баланса');
    } finally {
      setDataLoading(false);
    }
  };

  // Метод оплаты - перенаправление на Т-Банк или виджеты 
  const handleRecharge = async (rechargeAmount) => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      setMessage('Введите корректную сумму');
      setMessageType('error');
      return;
    }

    if (parseFloat(rechargeAmount) < 1) {
      setMessage('Минимальная сумма пополнения составляет 1 рубль');
      setMessageType('error');
      return;
    }

    if (parseFloat(rechargeAmount) > 50000) {
      setMessage('Максимальная сумма пополнения составляет 50 000 рублей');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('Перенаправление на страницу оплаты...');
    setMessageType('info');

    try {
      const token = localStorage.getItem('token');
      
      // Используем метод с перенаправлением на сайт Тинькофф
      const formData = new FormData();
      formData.append('amount', parseFloat(rechargeAmount));
      formData.append('description', `Пополнение баланса ReplyX на ${rechargeAmount} руб.`);

      const response = await fetch(`${API_URL}/api/payments/create-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.redirect_url) {
          // Перенаправляем на страницу оплаты Тинькофф
          window.location.href = data.redirect_url;
        } else {
          throw new Error(data.error || 'Ошибка создания платежа');
        }
      } else {
        throw new Error('Ошибка создания платежа');
      }
      
    } catch (error) {
      setMessage(error.message || 'Произошла ошибка при создании платежа');
      setMessageType('error');
      setLoading(false);
    }
  };

  // Функция для форматирования типа транзакции
  const formatTransactionType = (transactionType) => {
    const types = {
      'balance_topup': 'Пополнение',
      'payment_topup': 'Пополнение',
      'ai_message': 'Использование',
      'bot_message': 'Использование', 
      'widget_message': 'Использование',
      'document_upload': 'Использование',
      'welcome_bonus': 'Бонус'
    };
    return types[transactionType] || 'Операция';
  };

  // Функция для получения статуса транзакции
  const getTransactionStatus = (transaction) => {
    if (transaction.amount > 0) {
      return {
        text: 'Пополнение баланса',
        className: 'bg-green-100 text-green-800'
      };
    } else {
      const messageCount = Math.abs(transaction.amount / 5);
      return {
        text: `${messageCount} сообщений`,
        className: 'bg-blue-100 text-blue-800'
      };
    }
  };

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };




  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка данных пользователя..." />
      </div>
    );
  }

  if (dataLoading && !balanceStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка данных баланса..." />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Баланс - ReplyX</title>
        <meta name="description" content="Управление балансом и оплата услуг в платформе ReplyX." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 rounded-2xl">
        <div>
          {/* Заголовок страницы */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 mb-4 sm:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
                <FiDollarSign className="text-[#6334E5]" size={18} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Баланс</h1>
                <p className="text-sm text-gray-600">Управление балансом и пополнение счета</p>
              </div>
            </div>
          </div>

          {/* Основная информация о балансе */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {/* Текущий баланс */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 transition-all hover:border-gray-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
                  <FiBriefcase className="text-[#6334E5]" size={18} />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">Ваш баланс</div>
                  <div className="text-sm text-gray-600">Доступные средства</div>
                </div>
              </div>
              
              {/* Основная сумма баланса */}
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {(userBalance || 0).toLocaleString('ru-RU')}₽
                </div>
              </div>

              {/* Статус и дополнительная информация */}
              <div className="space-y-3">
                {/* Статус баланса */}
                <div className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${
                  userBalance > 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    userBalance > 0 ? 'bg-green-500' : 'bg-orange-500'
                  }`}></div>
                  <span className={`font-medium text-sm ${
                    userBalance > 0 ? 'text-green-700' : 'text-orange-700'
                  }`}>
                    {userBalance > 0 ? 'Баланс активен' : 'Требуется пополнение'}
                  </span>
                </div>

                {/* Быстрые факты */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Стоимость сообщения</span>
                      <span className="font-semibold text-gray-900">5₽</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Остаток сообщений</span>
                      <span className="font-semibold text-gray-900">{Math.floor((userBalance || 0) / 5)}</span>
                    </div>
                    {userBalance > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="text-gray-600">Хватит примерно на</span>
                        <span className="font-semibold text-[#6334E5]">
                          {Math.floor((userBalance || 0) / 2500)} месяцев
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Быстрая ссылка на историю */}
                <div className="pt-2">
                  <button 
                    onClick={() => {
                      const historyElement = document.querySelector('#transaction-history');
                      if (historyElement) {
                        historyElement.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 text-sm font-medium text-gray-600 hover:text-[#6334E5] hover:bg-[#6334E5]/10 rounded-lg transition-colors"
                  >
                    <FiActivity size={14} />
                    <span>Смотреть историю операций</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Пополнить баланс */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 sm:p-6 transition-all hover:border-gray-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
                  <FiTrendingUp className="text-[#6334E5]" size={18} />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">Пополнение баланса</div>
                  <div className="text-sm text-gray-600">Выберите сумму или введите свою</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Основная форма пополнения */}
                <div className="lg:col-span-3 space-y-5">
                  {/* Поле ввода суммы */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Сумма пополнения
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="1000"
                        min="1"
                        max="50000"
                        className="w-full px-4 py-3 text-xl font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6334E5] focus:border-transparent transition-all text-center"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">₽</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      Минимум 1₽ • Максимум 50,000₽
                    </div>
                  </div>

                  {/* Быстрые суммы */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Популярные суммы
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {[500, 1000, 2500, 5000].map((sum) => (
                        <button
                          key={sum}
                          onClick={() => setAmount(sum.toString())}
                          className={`p-3 rounded-xl text-center transition-all border ${
                            amount === sum.toString()
                              ? 'bg-[#6334E5] text-white border-[#6334E5] shadow-sm'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="text-lg font-semibold">{sum}₽</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Кнопка пополнения */}
                  <div className="pt-2">
                    <LoadingButton
                      onClick={() => handleRecharge(amount)}
                      loading={loading}
                      disabled={!amount || parseFloat(amount) < 1}
                      className="w-full py-3.5 text-base font-semibold bg-[#6334E5] hover:bg-[#5028c2] disabled:bg-gray-300 text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <FiCreditCard size={18} />
                      {loading ? 'Подготовка к оплате...' : 'Пополнить баланс'}
                    </LoadingButton>
                    
                    {amount && parseFloat(amount) >= 1 && (
                      <div className="text-center text-sm text-gray-600 mt-2">
                        Вы получите ≈ {Math.floor(parseFloat(amount) / 5)} сообщений
                      </div>
                    )}
                  </div>
                  
                  {/* Сообщения об ошибках/успехе */}
                  {message && (
                    <div className={`p-4 rounded-xl text-sm border ${
                      messageType === 'success'
                        ? 'bg-green-50 text-green-800 border-green-200'
                        : messageType === 'info' 
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      {message}
                    </div>
                  )}

                </div>
                
                {/* Боковая информация */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Безопасность */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FiShield className="text-[#6334E5]" size={16} />
                      <h4 className="font-medium text-gray-900">Безопасность</h4>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-start gap-2">
                        <FiCheck size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>SSL шифрование</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <FiCheck size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Мгновенное зачисление</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <FiCheck size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Возврат средств</span>
                      </div>
                    </div>
                  </div>

                  {/* Тарификация */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FiSettings className="text-[#6334E5]" size={16} />
                      <h4 className="font-medium text-gray-900">Тарифы</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">За сообщение</span>
                        <span className="font-semibold text-gray-900">5₽</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Минимум</span>
                        <span className="font-semibold text-gray-900">100₽</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Абонплата</span>
                        <span className="font-semibold text-green-600">0₽</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* История операций */}
          <div id="transaction-history" className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 mb-6 transition-all hover:border-gray-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center">
                <FiActivity className="text-[#6334E5]" size={18} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">История операций</h3>
            </div>
            {dataLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="sm" text="Загрузка транзакций..." />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FiActivity size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2">История транзакций пуста</p>
                <p className="text-sm text-gray-500">Совершите первое пополнение баланса</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                {/* Заголовки таблицы - только для десктопа */}
                <div className="hidden md:grid md:grid-cols-4 gap-4 pb-4 mb-6 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider text-right">
                    Сумма
                  </div>
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wider text-right">
                    Статус
                  </div>
                </div>

                {/* Строки транзакций */}
                <div className="space-y-4">
                  {transactions.map((transaction) => {
                    const status = getTransactionStatus(transaction);
                    return (
                      <div key={transaction.id}>
                        {/* Мобильная версия */}
                        <div className="md:hidden bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="text-sm text-gray-500">Дата</div>
                              <div className="text-sm text-gray-900 font-medium">
                                {formatDate(transaction.created_at)}
                              </div>
                            </div>
                            <div className="flex justify-between items-start">
                              <div className="text-sm text-gray-500">Тип</div>
                              <div className="text-sm text-gray-900 font-medium">
                                {formatTransactionType(transaction.transaction_type)}
                              </div>
                            </div>
                            <div className="flex justify-between items-start">
                              <div className="text-sm text-gray-500">Сумма</div>
                              <div className={`text-sm font-semibold ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-gray-600'
                              }`}>
                                {transaction.amount > 0 ? '+' : ''}{Math.abs(transaction.amount).toLocaleString('ru-RU')}₽
                              </div>
                            </div>
                            <div className="flex justify-between items-start">
                              <div className="text-sm text-gray-500">Статус</div>
                              <div className="text-sm text-gray-900 font-medium">
                                {status.text}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Десктопная версия */}
                        <div className="hidden md:grid md:grid-cols-4 gap-4 py-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="text-sm text-gray-900">
                            {formatDate(transaction.created_at)}
                          </div>
                          <div className="text-sm text-gray-900">
                            {formatTransactionType(transaction.transaction_type)}
                          </div>
                          <div className={`text-sm font-medium text-right ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {transaction.amount > 0 ? '+' : ''}{Math.abs(transaction.amount).toLocaleString('ru-RU')}₽
                          </div>
                          <div className="text-sm text-gray-500 text-right">
                            {status.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}