import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useAuth } from '@/hooks';
import { useNotifications } from '../hooks/useNotifications';
import LoadingSpinner, { LoadingButton } from '../components/common/LoadingSpinner';
import {
  FiDollarSign, FiMessageSquare, FiActivity, FiCreditCard, FiBriefcase, FiTrendingUp, FiZap
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
      
      // Используем метод с перенаправлением на платежную систему
      const formData = new FormData();
      formData.append('amount', parseFloat(rechargeAmount));
      formData.append('description', `Пополнение баланса ReplyX на ${rechargeAmount} руб.`);
      
      // Добавляем email пользователя для формирования чека
      if (user && user.email) {
        formData.append('email', user.email);
      }

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
          // Перенаправляем на страницу оплаты
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

      <div className="bg-white px-4 sm:px-6 xl:px-8 pt-4 sm:pt-6 xl:pt-8 pb-4 sm:pb-6 xl:pb-8 rounded-2xl animate-fade-in">
        <div>
          {/* Заголовок страницы - в стиле Dashboard */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 mb-4 sm:mb-6">
            <div className="flex flex-col md:flex-row items-start justify-between gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
              {/* Левая часть - приветствие и информация */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start sm:items-center gap-3 mb-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12 xl:h-12 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <FiDollarSign className="text-[#6334E5]" size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:gap-2">
                      <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold text-gray-900 break-words leading-tight">
                        Управление балансом
                      </h1>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      Пополните счет и отслеживайте расходы на AI-сервисы
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Правая часть - статус баланса */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50">
                <div className={`w-2 h-2 rounded-full ${
                  userBalance > 0 ? 'bg-green-500' : 'bg-orange-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  userBalance > 0 ? 'text-green-700' : 'text-orange-700'
                }`}>
                  {userBalance > 0 ? 'Активен' : 'Требует пополнения'}
                </span>
              </div>
            </div>
          </div>

          {/* Главная информация - современные карточки */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 animate-slide-up">
            {/* Текущий баланс - компактная карточка */}
            <div className="xl:col-span-1 bg-gradient-to-br from-white via-white to-gray-50/50 border border-gray-200 rounded-2xl p-5 sm:p-6 relative overflow-hidden">
              {/* Декоративный элемент */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#6334E5]/5 rounded-full -translate-y-16 translate-x-16"></div>
              
              <div className="relative h-full flex flex-col justify-center">
                {/* Заголовок сверху */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#6334E5]/10 rounded-xl flex items-center justify-center">
                    <FiBriefcase className="text-[#6334E5]" size={18} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900">Текущий баланс</div>
                    <div className="text-sm text-gray-600">Доступные средства</div>
                  </div>
                </div>
                
                {/* Основной контент по центру вертикально */}
                <div className="flex-1 flex flex-col justify-center text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                    {(userBalance || 0).toLocaleString('ru-RU')}
                    <span className="text-xl text-gray-500 ml-1">₽</span>
                  </div>
                  
                  {/* Метрики */}
                  <div className="flex justify-center items-center gap-8">
                    <div className="text-center">
                      <div className="text-xl font-bold text-[#6334E5]">{Math.floor((userBalance || 0) / 5)}</div>
                      <div className="text-xs text-gray-500">сообщений</div>
                    </div>
                    <div className="w-px h-8 bg-gray-200"></div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-emerald-600">5₽</div>
                      <div className="text-xs text-gray-500">за сообщение</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Пополнение баланса - компактная форма */}
            <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FiTrendingUp className="text-emerald-600" size={18} />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900">Пополнение баланса</div>
                  <div className="text-sm text-gray-600">Безопасные платежи</div>
                </div>
              </div>
              
              <div className="space-y-5">
                {/* Поле ввода суммы - компактное */}
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="1000"
                      min="1"
                      max="50000"
                      className="w-full px-4 py-3 text-2xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-[#6334E5]/20 focus:border-[#6334E5] transition-all text-center bg-gray-50"
                    />
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl font-bold">₽</div>
                  </div>
                  
                  {amount && parseFloat(amount) >= 1 && (
                    <div className="mt-2 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#6334E5]/10 text-[#6334E5] rounded-lg text-xs font-medium">
                        <FiZap size={12} />
                        {Math.floor(parseFloat(amount) / 5)} сообщений
                      </div>
                    </div>
                  )}
                </div>

                {/* Быстрые суммы - компактные кнопки */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Популярные суммы</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[500, 1000, 2500, 5000].map((sum) => (
                      <button
                        key={sum}
                        onClick={() => setAmount(sum.toString())}
                        className={`p-2 rounded-lg text-center transition-all duration-200 border ${
                          amount === sum.toString()
                            ? 'bg-[#6334E5] text-white border-[#6334E5] shadow-md'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="text-sm font-bold">{sum.toLocaleString('ru-RU')}₽</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Кнопка пополнения - компактная */}
                <div>
                  <LoadingButton
                    onClick={() => handleRecharge(amount)}
                    loading={loading}
                    disabled={!amount || parseFloat(amount) < 1}
                    className="w-full py-3 text-base font-semibold bg-gradient-to-r from-[#6334E5] to-[#7C3AED] disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FiCreditCard size={16} />
                    <span>{loading ? 'Подготовка к оплате...' : 'Пополнить баланс'}</span>
                  </LoadingButton>
                  
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    Минимум 1₽ • Максимум 50,000₽ • Без комиссий
                  </div>
                </div>
                
                {/* Сообщения об ошибках/успехе */}
                {message && (
                  <div className={`p-3 rounded-lg text-sm border ${
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
            </div>
          </div>


          {/* История операций - современный дизайн */}
          <div id="transaction-history" className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <FiActivity className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">История операций</h3>
                  <p className="text-sm text-gray-600">Все транзакции и операции с балансом</p>
                </div>
              </div>
              
              {/* Счетчик операций */}
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">
                  {transactions.length} операций
                </span>
              </div>
            </div>
            {dataLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="sm" text="Загрузка транзакций..." />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-20">
                <div className="relative mx-auto mb-8 w-24 h-24">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center">
                    <FiActivity size={32} className="text-gray-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#6334E5] rounded-full flex items-center justify-center">
                    <FiZap size={16} className="text-white" />
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">История операций пуста</h4>
                <p className="text-gray-600 mb-6">Совершите первое пополнение баланса, чтобы начать использовать платформу</p>
                <button 
                  onClick={() => {
                    const form = document.querySelector('input[type="number"]');
                    if (form) {
                      form.focus();
                      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#6334E5] hover:bg-[#5028c2] text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FiCreditCard size={18} />
                  <span>Пополнить баланс</span>
                </button>
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
                        {/* Мобильная версия - улучшенная карточка */}
                        <div className="md:hidden bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-gray-300">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                <FiActivity size={16} className="text-gray-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 text-sm">
                                  {formatTransactionType(transaction.transaction_type)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatDate(transaction.created_at)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className={`text-lg font-semibold ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                              }`}>
                                {transaction.amount > 0 ? '+' : ''}{Math.abs(transaction.amount).toLocaleString('ru-RU')}₽
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Баланс: {Math.abs(transaction.balance_after).toLocaleString('ru-RU')}₽
                              </div>
                            </div>
                          </div>
                          
                          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${
                            transaction.amount > 0 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {status.text}
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