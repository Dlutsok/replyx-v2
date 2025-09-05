import React, { useMemo, useCallback } from 'react';
import { FiCreditCard, FiRefreshCw } from 'react-icons/fi';

const BalanceWidget = React.memo(({ balance, loading, onRefresh }) => {

  // Данные баланса 
  const balanceData = useMemo(() => {
    const currentBalance = balance?.current_balance || 0;
    return { currentBalance };
  }, [balance]);

  // Цвет баланса в зависимости от суммы
  const balanceColor = useMemo(() => {
    if (balanceData.currentBalance <= 100) return 'text-red-600';
    if (balanceData.currentBalance <= 500) return 'text-orange-600';
    return 'text-gray-900';
  }, [balanceData.currentBalance]);

  // Мемоизация функций форматирования
  const formatAmount = useCallback((amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);


  const handleTopUp = useCallback(() => {
    window.location.href = '/balance';
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[340px] flex flex-col">
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
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-[280px] flex flex-col transition-all duration-150 hover:border-gray-300">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-center">
            <FiCreditCard className="text-purple-600" size={18} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Баланс</h3>
        </div>
        <button
          onClick={onRefresh}
          className="w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-150 flex items-center justify-center text-gray-500 hover:text-gray-700"
          title="Обновить"
        >
          <FiRefreshCw size={16} />
        </button>
      </div>

      {/* Центральный блок с балансом */}
      <div className="flex-1 flex flex-col justify-center items-center mb-6">
        <div className={`text-4xl font-bold mb-2 ${balanceColor}`}>
          {formatAmount(balanceData.currentBalance)}
        </div>
        <p className="text-sm text-gray-500">доступно для сообщений</p>
      </div>

      {/* Кнопка пополнения */}
      <button
        onClick={handleTopUp}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-all duration-150 flex items-center justify-center gap-2"
      >
        <FiCreditCard size={18} />
        Пополнить баланс
      </button>
    </div>
  );
});

// Добавляем displayName для лучшей отладки
BalanceWidget.displayName = 'BalanceWidget';

export default BalanceWidget;