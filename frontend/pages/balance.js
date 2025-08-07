import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import dashStyles from '../styles/pages/Dashboard.module.css';
import { 
  FiUser, FiCreditCard, FiRefreshCw, FiTrendingUp, FiTrendingDown,
  FiZap, FiStar, FiTarget, FiShield, FiGift, FiPlus,
  FiArrowUp, FiArrowDown, FiMessageSquare, FiFileText,
  FiLoader, FiCheck, FiCalendar, FiActivity
} from 'react-icons/fi';

// Простой заголовок страницы
function SimplePageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление балансом</h1>
      <p className="text-gray-600">Пополните счёт и следите за расходами</p>
    </div>
  );
}

// Профессиональный виджет баланса
function BalanceCard({ balance, balanceStats, loading, onRefresh }) {
  const currentBalance = balance || 0;
  const { totalTopups, totalSpent, avgTopup, thisMonth } = balanceStats;

  // Расчет процента использования
  const balancePercentage = totalTopups > 0 ? 
    Math.max(0, ((totalTopups - currentBalance) / totalTopups) * 100) : 0;

  const getBalanceColor = () => {
    if (currentBalance <= 100) return 'text-red-600';
    if (currentBalance <= 500) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleTopUp = () => {
    const form = document.getElementById('topup-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-24"></div>
          <div className="h-8 bg-gray-200 rounded w-32"></div>
          <div className="h-3 bg-gray-200 rounded w-28"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <FiCreditCard className="text-gray-600" size={16} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Баланс</h3>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="Обновить"
        >
          <FiRefreshCw className="text-gray-500" size={16} />
        </button>
      </div>

      {/* Основной баланс */}
      <div className="mb-4">
        <div className={`text-3xl font-bold ${getBalanceColor()} mb-1`}>
          {formatAmount(currentBalance)}
        </div>
        <p className="text-sm text-gray-600">
          Доступно для отправки сообщений
        </p>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Использовано</span>
            <span>{balancePercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-purple-600 transition-all duration-500"
              style={{ width: `${Math.min(100, balancePercentage)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center text-green-600 mb-1">
            <FiTrendingUp size={14} />
          </div>
          <div className="font-semibold text-sm text-gray-900">
            {formatAmount(totalTopups)}
          </div>
          <div className="text-xs text-gray-500">Пополнено</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center text-red-600 mb-1">
            <FiTrendingDown size={14} />
          </div>
          <div className="font-semibold text-sm text-gray-900">
            {formatAmount(totalSpent)}
          </div>
          <div className="text-xs text-gray-500">Потрачено</div>
        </div>
      </div>

      {/* Дополнительная статистика */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <div className="flex items-center justify-center text-gray-600 mb-1">
            <FiActivity size={12} />
          </div>
          <div className="font-medium text-xs text-gray-900">
            {formatAmount(avgTopup)}
          </div>
          <div className="text-xs text-gray-500">Среднее</div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-2.5 text-center">
          <div className="flex items-center justify-center text-gray-600 mb-1">
            <FiCalendar size={12} />
          </div>
          <div className="font-medium text-xs text-gray-900">
            {formatAmount(thisMonth)}
          </div>
          <div className="text-xs text-gray-500">За месяц</div>
        </div>
      </div>

      {/* Действия */}
      <div className="flex space-x-2">
        <button
          onClick={handleTopUp}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center text-sm"
        >
          <FiCreditCard className="mr-2" size={14} />
          Пополнить
        </button>
        
        <button
          onClick={() => {
            const history = document.getElementById('transaction-history');
            if (history) {
              history.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          className="px-4 py-2.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          История
        </button>
      </div>
    </div>
  );
}

// Профессиональный блок быстрого пополнения
function QuickTopupGrid({ onAmountSelect }) {
  const quickAmounts = [
    { amount: 500, label: '500₽', subLabel: 'Минимум', icon: FiZap },
    { amount: 1000, label: '1000₽', subLabel: 'Стандарт', isPopular: true, icon: FiStar },
    { amount: 2500, label: '2500₽', subLabel: 'Про', icon: FiTarget },
    { amount: 5000, label: '5000₽', subLabel: 'Бизнес', icon: FiTrendingUp }
  ];

  const calculateRequests = (sum) => {
    return Math.floor(sum / 3);
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      {/* Заголовок */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <FiZap className="text-gray-600" size={16} />
          </div>
          Быстрое пополнение
        </h3>
        <p className="text-sm text-gray-600">
          Выберите удобную сумму для пополнения
        </p>
      </div>

      {/* Сетка с суммами */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickAmounts.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.amount}
              className="relative group cursor-pointer"
              onClick={() => onAmountSelect(item.amount)}
            >
              {item.isPopular && (
                <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full font-medium z-10">
                  ХИТ
                </div>
              )}
              
              <div className="bg-gray-50 hover:bg-purple-50 border hover:border-purple-200 p-4 rounded-lg transition-all duration-200 group-hover:shadow-sm">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center group-hover:bg-purple-100">
                    <IconComponent className="text-gray-600 group-hover:text-purple-600" size={16} />
                  </div>
                  
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {item.subLabel}
                    </div>
                    <div className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                      ≈ {calculateRequests(item.amount)} запросов
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Дополнительная информация */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
            <FiGift className="text-white" size={12} />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">Есть промокод?</p>
            <p className="text-xs text-gray-600">Введите его при пополнении для получения скидки</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Форма пополнения
function TopupForm({ amount, setAmount, promoCode, setPromoCode, loading, onSubmit, message, messageType }) {
  const calculateRequests = (sum) => {
    return Math.floor(sum / 3);
  };

  const calculateDays = (sum) => {
    const requestsPerDay = 10;
    const totalRequests = calculateRequests(sum);
    return Math.floor(totalRequests / requestsPerDay);
  };

  const handleAmountChange = (value) => {
    setAmount(value);
  };

  return (
    <div id="topup-form" className="bg-white rounded-xl p-4 shadow-sm border">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <FiPlus className="text-gray-600" size={16} />
          </div>
          Пополнение баланса
        </h3>
      </div>

      <div className="space-y-4">
        {/* Поле суммы */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Сумма пополнения (минимум 500₽)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="Введите сумму от 500₽"
              min="500"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
              ₽
            </span>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>≈ {calculateRequests(parseFloat(amount) || 0)} запросов к AI</span>
            <span>≈ {calculateDays(parseFloat(amount) || 0)} дней использования</span>
          </div>
        </div>

        {/* Поле промокода */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Промокод (необязательно)
          </label>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Введите промокод для получения скидки"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Кнопка пополнения */}
        <button
          onClick={onSubmit}
          disabled={loading || !amount || parseFloat(amount) < 500}
          className={`w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${loading || !amount || parseFloat(amount) < 500 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin mr-2" size={16} />
              Обработка...
            </>
          ) : (
            <>
              <FiCreditCard size={16} className="mr-2" />
              Пополнить на {amount || '0'}₽
            </>
          )}
        </button>

        {/* Сообщение */}
        {message && (
          <div className={`flex items-center p-3 rounded-lg text-sm ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {messageType === 'success' ? <FiCheck className="mr-2" size={14} /> : <FiZap className="mr-2" size={14} />}
            {message}
          </div>
        )}

        {/* Информационные блоки */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-200">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 p-1.5 bg-green-100 rounded-lg">
              <FiShield className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Безопасные платежи</h4>
              <p className="text-xs text-gray-500">SSL шифрование</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 p-1.5 bg-purple-100 rounded-lg">
              <FiZap className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Мгновенное зачисление</h4>
              <p className="text-xs text-gray-500">Средства поступают моментально</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 p-1.5 bg-purple-100 rounded-lg">
              <FiGift className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Промокоды</h4>
              <p className="text-xs text-gray-500">Скидки и бонусы</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// История операций в стиле ActiveDialogs
function TransactionHistory({ transactions, loading, onRefresh }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTransactionIcon = (transaction) => {
    if (transaction.amount > 0) {
      return <FiArrowUp className="text-green-600" size={16} />;
    }
    
    switch (transaction.transaction_type) {
      case 'ai_message':
        return <FiMessageSquare className="text-blue-600" size={16} />;
      case 'document_upload':
        return <FiFileText className="text-purple-600" size={16} />;
      default:
        return <FiArrowDown className="text-red-600" size={16} />;
    }
  };

  return (
    <div id="transaction-history" className="bg-white rounded-xl p-4 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
            <FiActivity className="text-gray-600" size={16} />
          </div>
          История операций
        </h3>
        <button
          onClick={onRefresh}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Обновить"
        >
          <FiRefreshCw className="text-gray-500" size={16} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <FiFileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">История операций пуста</h4>
          <p className="text-gray-500">Здесь будут отображаться все ваши транзакции</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0 p-1.5 bg-white rounded-full border">
                {getTransactionIcon(transaction)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {transaction.description || 'Операция'}
                  </p>
                  <span className={`font-semibold text-sm ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{formatAmount(transaction.amount)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-500">
                    {formatDate(transaction.created_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Баланс: {formatAmount(transaction.balance_after)}
                  </p>
                </div>

                {/* Дополнительная информация */}
                {transaction.related_info && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    {transaction.related_info.type === 'message' && (
                      <div className="text-xs text-gray-600">
                        <p className="italic">"{transaction.related_info.message_text}"</p>
                        {transaction.related_info.dialog_info && (
                          <p className="mt-1 text-xs">
                            {transaction.related_info.dialog_info.telegram_username ? (
                              `@${transaction.related_info.dialog_info.telegram_username}`
                            ) : (
                              transaction.related_info.dialog_info.user_email
                            )}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {transaction.related_info.type === 'document' && (
                      <div className="flex items-center text-xs text-gray-600">
                        <FiFileText className="mr-1" size={10} />
                        <span>{transaction.related_info.filename}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Основной компонент страницы
export default function Balance() {
  const [amount, setAmount] = useState('500');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [userBalance, setUserBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [balanceStats, setBalanceStats] = useState({
    totalTopups: 0,
    totalSpent: 0,
    avgTopup: 0,
    thisMonth: 0
  });
  
  const { user } = useAuth();

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    if (user) {
      loadBalanceData();
      loadTransactions();
    }
  }, [user]);

  // Обработчик обновления баланса
  useEffect(() => {
    const handleBalanceUpdate = (event) => {
      if (event.detail && event.detail.newBalance !== undefined) {
        setUserBalance(event.detail.newBalance);
      }
    };

    window.addEventListener('balanceUpdated', handleBalanceUpdate);
    return () => window.removeEventListener('balanceUpdated', handleBalanceUpdate);
  }, []);

  const loadBalanceData = async () => {
    const token = localStorage.getItem('token');
    
    try {
      // Получаем текущий баланс
      const balanceResponse = await fetch('http://localhost:8000/api/balance/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const balanceData = await balanceResponse.json();
      
      if (balanceData.error) throw new Error(balanceData.message);
      setUserBalance(balanceData.balance || 0);

      // Получаем транзакции для статистики
      const transactionsResponse = await fetch('http://localhost:8000/api/balance/transactions/detailed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const transactionsData = await transactionsResponse.json();
      
      if (transactionsResponse.ok) {
        calculateBalanceStats(transactionsData);
      }
    } catch (err) {
      setMessage(`Ошибка загрузки данных: ${err.message}`);
      setMessageType('error');
    }
  };

  const calculateBalanceStats = (data) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const topups = data.filter(t => t.amount > 0);
    const spent = data.filter(t => t.amount < 0);
    
    const totalTopups = topups.reduce((sum, t) => sum + t.amount, 0);
    const totalSpent = Math.abs(spent.reduce((sum, t) => sum + t.amount, 0));
    const thisMonthTopups = topups
      .filter(t => new Date(t.created_at) >= thisMonth)
      .reduce((sum, t) => sum + t.amount, 0);

    setBalanceStats({
      totalTopups,
      totalSpent,
      avgTopup: topups.length > 0 ? totalTopups / topups.length : 0,
      thisMonth: thisMonthTopups
    });
  };

  const loadTransactions = async () => {
    const token = localStorage.getItem('token');
    setTransactionsLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/balance/transactions/detailed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Ошибка загрузки транзакций:', error);
      }
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleAmountSelect = (selectedAmount) => {
    setAmount(selectedAmount.toString());
    // Прокрутка к форме пополнения
    const form = document.getElementById('topup-form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRecharge = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setMessage('Введите корректную сумму');
      setMessageType('error');
      return;
    }

    if (parseFloat(amount) < 500) {
      setMessage('Минимальная сумма пополнения составляет 500 рублей');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/balance/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          amount: parseFloat(amount),
          promo_code: promoCode || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        const newBalance = data.new_balance;
        setUserBalance(newBalance);
        
        // Уведомляем другие компоненты об обновлении баланса
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
          detail: { newBalance: newBalance }
        }));

        setMessage(`Баланс успешно пополнен на ${amount}₽${data.discount_amount ? ` (скидка: ${data.discount_amount}₽)` : ''}`);
        setMessageType('success');
        setPromoCode('');
        
        // Обновляем данные
        loadBalanceData();
        loadTransactions();
      } else {
        setMessage(data.message || 'Ошибка пополнения баланса');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Ошибка соединения с сервером');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className={dashStyles.loadingContainer}>
        <div className={dashStyles.loadingSpinner}></div>
        <span>Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto">
        <SimplePageHeader />

        {/* Main Content */}
        <div className="space-y-6">
          {/* Top Row - Баланс и Быстрое пополнение */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Баланс */}
            <BalanceCard 
              balance={userBalance}
              balanceStats={balanceStats}
              loading={false}
              onRefresh={loadBalanceData}
            />

            {/* Быстрые действия пополнения */}
            <QuickTopupGrid onAmountSelect={handleAmountSelect} />
          </div>

          {/* Форма пополнения */}
          <TopupForm
            amount={amount}
            setAmount={setAmount}
            promoCode={promoCode}
            setPromoCode={setPromoCode}
            loading={loading}
            onSubmit={handleRecharge}
            message={message}
            messageType={messageType}
          />

          {/* История операций */}
          <TransactionHistory 
            transactions={transactions}
            loading={transactionsLoading}
            onRefresh={loadTransactions}
          />
        </div>
    </div>
  );
}