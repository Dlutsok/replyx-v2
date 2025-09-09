import { useState, useEffect } from 'react';
import { FiBarChart, FiRefreshCw, FiMessageSquare, FiClock, FiCheckCircle, FiUsers, FiZap, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

const PerformanceMetrics = ({ metrics, loading, onRefresh }) => {
  // Функции форматирования
  const formatNumber = (num) => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  const formatShortNumber = (num) => {
    if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num/1000).toFixed(1)}k`;
    return num.toString();
  };

  // Компонент тренд индикатора
  const TrendIndicator = ({ value }) => {
    if (!value || value === 0) return null;
    
    const isPositive = value > 0;
    const TrendIcon = isPositive ? FiTrendingUp : FiTrendingDown;
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    
    return (
      <div className={`flex items-center ${colorClass}`}>
        <TrendIcon className="w-4 h-4" />
      </div>
    );
  };

  // Компонент компактной карточки метрики
  const MetricCard = ({ icon: Icon, value, label, color, trend }) => {
    return (
      <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 hover:border-gray-300 transition-all duration-200 border border-gray-200 group">
        <div className="flex items-center justify-between mb-2">
          <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center ${color} group-hover:shadow-sm transition-shadow`}>
            <Icon className="w-4 h-4" />
          </div>
          {!loading && <TrendIndicator value={trend} />}
        </div>
        <div className="text-lg font-semibold text-gray-900 mb-1">
          {value}
        </div>
        <div className="text-xs text-gray-500 leading-tight">
          {label}
        </div>
      </div>
    );
  };

  // Loading состояние
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 h-[330px] sm:h-[280px] md:h-[330px] flex flex-col">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-40"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          
          {/* Main metric skeleton */}
          <div className="mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-8 bg-gray-200 rounded mb-2 w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>
          
          {/* Grid skeleton */}
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 h-[330px] sm:h-[280px] md:h-[330px] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FiBarChart className="mr-2 text-[#6334E5] w-5 h-5" />
          Производительность
        </h3>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
          title="Обновить"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      {/* Main Metric - Messages per hour */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#6334E5]/10 to-indigo-100 flex items-center justify-center">
            <FiMessageSquare className="w-6 h-6 text-[#6334E5]" />
          </div>
          <div className="flex-1">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-[#6334E5] to-indigo-600 bg-clip-text text-transparent">
              {formatNumber(metrics?.messages_per_hour || 0)}
            </div>
            <div className="text-sm text-gray-500">сообщений/час</div>
          </div>
          <TrendIndicator value={metrics?.trends?.messages} />
        </div>
      </div>
      
      {/* Secondary Metrics Grid 1x2 */}
      <div className="grid grid-cols-2 gap-4 flex-1">
        <MetricCard 
          icon={FiClock}
          value={`${metrics?.avg_response_time || 0}с`}
          label="Время ответа"
          color="text-blue-600"
          trend={metrics?.trends?.response_time}
        />
        <MetricCard 
          icon={FiUsers}
          value={formatNumber(metrics?.active_dialogs_count || 0)}
          label="Активные"
          color="text-orange-600"
          trend={metrics?.trends?.active_dialogs}
        />
      </div>
    </div>
  );
};

export default PerformanceMetrics;