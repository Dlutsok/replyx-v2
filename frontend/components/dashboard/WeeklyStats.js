import React, { useMemo, useCallback } from 'react';
import { FiBarChart2, FiMessageSquare, FiZap, FiRefreshCw } from 'react-icons/fi';

const WeeklyStats = React.memo(({ metrics, loading, onRefresh }) => {

  // Статистика за неделю
  const weeklyData = useMemo(() => {
    return {
      totalMessages: metrics?.periodMessages ?? 0,
      avgResponseTime: metrics?.avgResponseTime ?? 0
    };
  }, [metrics]);

  // Форматирование чисел
  const formatNumber = useCallback((num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.0', '') + 'к';
    }
    return num.toString();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* Заголовок скелетон */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="ml-auto w-6 h-6 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Карточки скелетон */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded w-12"></div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded w-8"></div>
          </div>
        </div>
      </div>
    );
  }

  // Пустое состояние - нет данных
  // Проверяем, что метрики действительно загружены от API (не null и не undefined)
  const hasData = metrics && (metrics.periodMessages !== undefined || metrics.avgResponseTime !== undefined);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
      {/* Заголовок */}
      <div className="flex items-center gap-2 xl:gap-3 mb-2 xl:mb-3">
        <div className="w-5 h-5 xl:w-6 xl:h-6 bg-gray-50 rounded-lg flex items-center justify-center">
          <FiBarChart2 className="text-gray-600" size={12} />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">За последние 7 дней</h3>
        <div className="ml-auto">
          <button
            onClick={onRefresh}
            className="w-5 h-5 xl:w-6 xl:h-6 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm active:scale-[0.95] active:rotate-180 transition-all duration-300 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:rotate-180"
            title="Обновить статистику"
          >
            <FiRefreshCw size={10} className="transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Пустое состояние */}
      {!hasData ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-center max-w-xs">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <FiBarChart2 className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-gray-900 text-sm font-semibold mb-2">Добро пожаловать!</h3>
            <p className="text-gray-600 text-sm mb-1">Здесь появится статистика ваших диалогов</p>
            <p className="text-sm text-gray-500 mb-4">
              Начните общение с ассистентами, и мы покажем аналитику здесь
            </p>
            <button
              onClick={() => window.location.href = '/ai-assistant'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <FiMessageSquare className="w-4 h-4" />
              Создать первого ассистента
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 xl:gap-3">
          {/* Сообщения */}
          <div className="bg-gray-50 rounded-lg p-3 xl:p-4 border border-gray-200 hover:border-gray-300 transition-all duration-200">
            <div className="flex items-center gap-2 xl:gap-3 mb-1 xl:mb-2">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                <FiMessageSquare className="text-gray-600" size={14} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Сообщений</h4>
                <p className="text-sm text-gray-500">за неделю</p>
              </div>
            </div>
            <div className="text-lg xl:text-xl font-bold text-gray-900">
              {formatNumber(weeklyData.totalMessages)}
            </div>
          </div>

          {/* Время ответа */}
          <div className="bg-gray-50 rounded-lg p-3 xl:p-4 border border-gray-200 hover:border-gray-300 transition-all duration-200">
            <div className="flex items-center gap-2 xl:gap-3 mb-1 xl:mb-2">
              <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                <FiZap className="text-gray-600" size={14} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Время ответа</h4>
                <p className="text-sm text-gray-500">среднее</p>
              </div>
            </div>
            <div className="text-lg xl:text-xl font-bold text-gray-900">
              {weeklyData.avgResponseTime}с
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Добавляем displayName для лучшей отладки
WeeklyStats.displayName = 'WeeklyStats';

export default WeeklyStats;