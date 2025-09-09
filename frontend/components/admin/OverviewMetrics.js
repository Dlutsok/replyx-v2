import { FiUsers, FiUserCheck, FiMessageSquare, FiDollarSign, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { DESIGN_TOKENS } from '../../constants/designSystem';

const OverviewMetrics = ({ metrics, formatters, isLoading = false }) => {
  // Конфигурация метрик
  const metricsConfig = [
    {
      key: 'total_users',
      title: 'Всего пользователей',
      icon: FiUsers,
      color: 'blue',
      format: 'number',
      growthKey: 'user_growth'
    },
    {
      key: 'active_users_today',
      title: 'Активные пользователи',
      icon: FiUserCheck,
      color: 'green',
      format: 'number',
      growthKey: 'activity_growth'
    },
    {
      key: 'total_dialogs',
      title: 'Всего диалогов',
      icon: FiMessageSquare,
      color: 'purple',
      format: 'number',
      growthKey: 'dialog_growth'
    },
    {
      key: 'total_revenue',
      title: 'Общая выручка',
      icon: FiDollarSign,
      color: 'orange',
      format: 'currency',
      growthKey: 'revenue_growth'
    }
  ];

  // Цветовая схема для карточек
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-200'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-200'
    },
    purple: {
      bg: 'bg-[#6334E5]/10',
      icon: 'text-[#6334E5]',
      border: 'border-[#6334E5]/30'
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      border: 'border-orange-200'
    }
  };

  // Компонент загрузки карточки
  const LoadingCard = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
          <div className="w-16 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="w-20 h-4 bg-gray-200 rounded mb-2"></div>
        <div className="w-24 h-8 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  // Компонент одной метрики
  const MetricCard = ({ config }) => {
    const { title, icon: Icon, color, format, key, growthKey } = config;
    const colors = colorSchemes[color];
    
    if (!metrics) return <LoadingCard />;

    const value = metrics[key] || 0;
    const growth = metrics.growth_metrics?.[growthKey] || 0;
    const formattedValue = formatters[format](value);
    
    const isPositiveGrowth = growth > 0;
    const GrowthIcon = isPositiveGrowth ? FiTrendingUp : FiTrendingDown;
    const growthColorClass = isPositiveGrowth ? 'text-green-600' : 'text-red-600';

    return (
      <div className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
        {/* Заголовок с иконкой */}
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 ${colors.bg} ${colors.border} border rounded-xl flex items-center justify-center`}>
            <Icon size={20} className={colors.icon} />
          </div>
          
          {/* Индикатор изменения */}
          {growth !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${growthColorClass} bg-gray-50`}>
              <GrowthIcon size={12} />
              {formatters.percentage(Math.abs(growth))}
            </div>
          )}
        </div>

        {/* Заголовок метрики */}
        <h3 className="text-sm font-medium text-gray-600 mb-2">
          {title}
        </h3>

        {/* Значение метрики */}
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formattedValue}
        </div>

        {/* Дополнительная информация */}
        {growth !== 0 && (
          <p className="text-xs text-gray-500">
            {isPositiveGrowth ? 'Рост' : 'Снижение'} за выбранный период
          </p>
        )}
      </div>
    );
  };

  // Отображение скелета при загрузке
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingCard key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок секции */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Ключевые показатели
        </h2>
        <p className="text-sm text-gray-600">
          Основные метрики системы за выбранный период
        </p>
      </div>

      {/* Карточки метрик */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricsConfig.map((config) => (
          <MetricCard key={config.key} config={config} />
        ))}
      </div>

      {/* Дополнительные метрики (если есть) */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          {metrics.avgSessionDuration > 0 && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {Math.round(metrics.avgSessionDuration)} мин
              </div>
              <div className="text-sm text-gray-600">
                Средняя длительность сессии
              </div>
            </div>
          )}
          
          {metrics.conversionRate > 0 && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatters.percentage(metrics.conversionRate)}
              </div>
              <div className="text-sm text-gray-600">
                Конверсия в платных пользователей
              </div>
            </div>
          )}
          
          {metrics.churnRate > 0 && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formatters.percentage(metrics.churnRate)}
              </div>
              <div className="text-sm text-gray-600">
                Отток пользователей
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OverviewMetrics;