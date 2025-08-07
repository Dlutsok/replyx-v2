import { useState } from 'react';
import { FiTrendingUp, FiTrendingDown, FiCreditCard, FiRefreshCw } from 'react-icons/fi';

const BalanceWidget = ({ balance, loading, onRefresh }) => {
  const [showTransactions, setShowTransactions] = useState(false);

  const currentBalance = balance?.current_balance || 0;
  const totalSpent = balance?.total_spent || 0;
  const totalToppedUp = balance?.total_topped_up || 0;
  const recentTransactions = balance?.recent_transactions || [];

  // Расчет процента использования баланса
  const balancePercentage = totalToppedUp > 0 ? Math.max(0, (currentBalance / totalToppedUp) * 100) : 0;
  
  // Определение цвета на основе остатка баланса
  const getBalanceColor = () => {
    if (currentBalance <= 100) return 'text-red-600';
    if (currentBalance <= 500) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (balancePercentage <= 20) return 'bg-red-500';
    if (balancePercentage <= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTopUp = () => {
    window.location.href = '/balance';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[400px] flex flex-col">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
          <div className="flex space-x-3 mt-auto">
            <div className="h-10 bg-gray-200 rounded flex-1"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[400px] flex flex-col">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <span className="mr-2 text-green-600 text-lg font-bold">₽</span>
          Баланс
        </h3>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Обновить"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Текущий баланс с tooltip для низкого баланса */}
      <div className="mb-4 relative group">
        <div className={`text-3xl font-bold ${getBalanceColor()}`}>
          {formatAmount(currentBalance)}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Доступно для отправки сообщений
        </p>
        
        {/* Tooltip для низкого баланса */}
        {currentBalance <= 100 && (
          <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-red-600 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            Низкий баланс! Пополните счёт для продолжения работы ботов.
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600"></div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Использовано</span>
          <span>{balancePercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${Math.min(100, balancePercentage)}%` }}
          ></div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center text-green-600 mb-1">
            <FiTrendingUp className="w-4 h-4 mr-1" />
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {formatAmount(totalToppedUp)}
          </div>
          <div className="text-xs text-gray-500">Пополнено</div>
        </div>
        
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center text-red-600 mb-1">
            <FiTrendingDown className="w-4 h-4 mr-1" />
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {formatAmount(totalSpent)}
          </div>
          <div className="text-xs text-gray-500">Потрачено</div>
        </div>
      </div>

      {/* Действия */}
      <div className="flex space-x-3 mt-auto">
        <button
          onClick={handleTopUp}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
        >
          <FiCreditCard className="w-4 h-4 mr-2" />
          Пополнить
        </button>
        
        <button
          onClick={() => setShowTransactions(!showTransactions)}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          История
        </button>
      </div>

      {/* Последние транзакции */}
      {showTransactions && recentTransactions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Последние операции
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    transaction.amount > 0 ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-gray-600 truncate max-w-32">
                    {transaction.description || transaction.transaction_type}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-medium ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{formatAmount(transaction.amount)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(transaction.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default BalanceWidget;