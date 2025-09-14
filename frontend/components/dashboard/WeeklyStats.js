import React, { useMemo, useCallback } from 'react';
import { FiBarChart2, FiMessageSquare, FiZap, FiRefreshCw } from 'react-icons/fi';

const WeeklyStats = React.memo(({ metrics, loading, onRefresh, assistants = [], weeklyMetrics = null }) => {

  // Статистика за неделю
  const weeklyData = useMemo(() => {
    return {
      totalMessages: metrics?.periodMessages ?? metrics?.messages_processed ?? 0,
      avgResponseTime: weeklyMetrics?.avg_response_time ?? metrics?.avgResponseTime ?? metrics?.avg_response_time ?? 0,
      assistantsCount: assistants?.length ?? 0
    };
  }, [metrics, assistants, weeklyMetrics]);

  // Используем реальные данные из API
  const weeklyChartData = useMemo(() => {
    if (weeklyMetrics && weeklyMetrics.daily_stats) {
      // Используем реальные данные из API
      return weeklyMetrics.daily_stats.map(day => ({
        date: new Date(day.date),
        dayName: new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' }),
        messages: day.messages
      }));
    }

    // Fallback: создаем пустые данные за 7 дней
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push({
        date: date,
        dayName: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
        messages: 0
      });
    }
    return days;
  }, [weeklyMetrics]);

  // Реальное количество сообщений за неделю
  const actualWeeklyTotal = useMemo(() => {
    if (weeklyMetrics) {
      return weeklyMetrics.total_messages || 0;
    }
    return weeklyChartData.reduce((sum, day) => sum + day.messages, 0);
  }, [weeklyMetrics, weeklyChartData]);

  // Находим максимальное значение для масштабирования графика
  const maxMessages = Math.max(...weeklyChartData.map(d => d.messages), 1);

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

  // Проверяем, что есть либо ассистенты, либо активность пользователя за неделю
  const hasData = weeklyData.assistantsCount > 0 || actualWeeklyTotal > 0;

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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-[#6334E5]/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <FiBarChart2 className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-gray-900 text-sm font-semibold mb-2">Добро пожаловать!</h3>
            <p className="text-gray-600 text-sm mb-1">Здесь появится статистика ваших диалогов</p>
            <p className="text-sm text-gray-500 mb-4">
              Начните общение с ассистентами, и мы покажем аналитику здесь
            </p>
            {weeklyData.assistantsCount === 0 && (
              <button
                onClick={() => window.location.href = '/ai-assistant'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-[#6334E5] hover:from-blue-700 hover:to-[#5028c2] text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FiMessageSquare className="w-4 h-4" />
                Создать первого ассистента
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Сводка */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(actualWeeklyTotal)}
              </div>
              <div className="text-sm text-gray-500">
                сообщений за неделю
                {weeklyData.totalMessages > actualWeeklyTotal && (
                  <div className="text-xs text-gray-400 mt-1">
                    из {formatNumber(weeklyData.totalMessages)} за месяц
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-700">
                {weeklyData.assistantsCount}
              </div>
              <div className="text-sm text-gray-500">
                ассистентов
              </div>
            </div>
          </div>

          {/* График по дням */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-3">
              Активность по дням
            </div>
            <div className="flex items-end justify-between gap-1 h-20">
              {weeklyChartData.map((day, index) => {
                const height = maxMessages > 0 ? (day.messages / maxMessages) * 100 : 0;
                const isToday = index === weeklyChartData.length - 1;

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center group"
                  >
                    <div className="w-full relative flex items-end justify-center h-16">
                      <div
                        className={`w-full max-w-[24px] rounded-t-sm transition-all duration-300 ${
                          isToday
                            ? 'bg-gradient-to-t from-[#6334E5] to-blue-400'
                            : 'bg-gradient-to-t from-gray-300 to-gray-200 group-hover:from-[#6334E5]/70 group-hover:to-blue-400/70'
                        }`}
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${day.dayName}: ${day.messages} сообщений`}
                      />
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        {day.messages}
                      </div>
                    </div>
                    <div className={`text-xs mt-1 ${isToday ? 'font-semibold text-[#6334E5]' : 'text-gray-500'}`}>
                      {day.dayName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Дополнительная информация */}
          {weeklyData.avgResponseTime > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex justify-center text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{weeklyData.avgResponseTime}с</div>
                  <div className="text-gray-500">среднее время ответа</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Добавляем displayName для лучшей отладки
WeeklyStats.displayName = 'WeeklyStats';

export default WeeklyStats;