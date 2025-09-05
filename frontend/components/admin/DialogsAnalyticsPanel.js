import { 
  FiMessageSquare, FiCpu, FiClock, FiTrendingUp, 
  FiZap, FiCheckCircle, FiArrowRight
} from 'react-icons/fi';

const DialogsAnalyticsPanel = ({ dialogsData, formatters, isLoading }) => {
  // Получаем данные диалогов
  const stats = dialogsData?.dialog_stats || {};
  const messageStats = dialogsData?.message_stats || {};
  const aiMetrics = dialogsData?.ai_usage || {};
  const topAssistants = dialogsData?.popular_assistants || [];
  const responseTimes = dialogsData?.response_times || {};
  const hourlyStats = [];

  // Компонент загрузки
  const LoadingCard = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse">
      <div className="space-y-3">
        <div className="w-20 h-4 bg-gray-200 rounded"></div>
        <div className="w-16 h-8 bg-gray-200 rounded"></div>
        <div className="w-32 h-3 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  // Компонент статистики диалогов
  const DialogStats = () => {
    const dialogMetrics = [
      {
        key: 'total_dialogs',
        title: 'Всего диалогов',
        value: stats.total_dialogs,
        icon: FiMessageSquare,
        color: 'blue'
      },
      {
        key: 'active_dialogs',
        title: 'Активные диалоги',
        value: stats.active_dialogs,
        icon: FiClock,
        color: 'green'
      },
      {
        key: 'avg_duration',
        title: 'Средняя длительность',
        value: `${Math.round(stats.avg_duration || 0)} мин`,
        icon: FiClock,
        color: 'purple'
      },
      {
        key: 'messages_count',
        title: 'Сообщений за период',
        value: formatters.number(messageStats.total_messages),
        icon: FiMessageSquare,
        color: 'orange'
      }
    ];

    return (
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-900">Статистика диалогов</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dialogMetrics.map(metric => (
            <div key={metric.key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 bg-${metric.color}-100 rounded-lg flex items-center justify-center`}>
                  <metric.icon size={16} className={`text-${metric.color}-600`} />
                </div>
                <h5 className="text-sm font-medium text-gray-600">{metric.title}</h5>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {metric.value || '0'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Компонент метрик AI
  const AIMetrics = () => {
    const metrics = [
      {
        key: 'response_rate',
        title: 'Скорость ответа AI',
        value: `${(aiMetrics.average_response_time || 0).toFixed(1)}с`,
        icon: FiZap,
        color: 'yellow'
      },
      {
        key: 'success_rate',
        title: 'Успешность ответов',
        value: formatters.percentage(aiMetrics.success_rate),
        icon: FiCheckCircle,
        color: 'green'
      },
      {
        key: 'handoff_rate',
        title: 'Передача оператору',
        value: '0.0%',
        icon: FiArrowRight,
        color: 'red'
      },
      {
        key: 'total_tokens',
        title: 'Использовано токенов',
        value: formatters.number(aiMetrics.total_tokens_today),
        icon: FiCpu,
        color: 'purple'
      }
    ];

    return (
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-gray-900">AI Аналитика</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(metric => (
            <div key={metric.key} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 bg-${metric.color}-100 rounded-lg flex items-center justify-center`}>
                  <metric.icon size={16} className={`text-${metric.color}-600`} />
                </div>
                <h5 className="text-sm font-medium text-gray-600">{metric.title}</h5>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {metric.value || '0'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Компонент топ ассистентов
  const TopAssistants = () => {
    if (!topAssistants.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Топ AI-ассистентов</h4>
          <div className="text-center py-8">
            <FiCpu size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Данные по ассистентам отсутствуют</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Топ AI-ассистентов</h4>
        <div className="space-y-3">
          {topAssistants.map((assistant, index) => (
            <div key={assistant.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-semibold text-purple-600">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {assistant.name || `Ассистент ${assistant.id}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {assistant.dialogs_count} диалогов
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {formatters.percentage(assistant.success_rate)}
                </div>
                <div className="text-xs text-gray-500">
                  успешность
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Компонент почасовой активности
  const HourlyActivity = () => {
    const maxMessages = Math.max(...hourlyStats.map(h => h.messages_count || 0));
    
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Активность по часам</h4>
        {hourlyStats.length > 0 ? (
          <div className="space-y-2">
            {hourlyStats.map(hour => {
              const percentage = maxMessages > 0 ? (hour.messages_count / maxMessages) * 100 : 0;
              
              return (
                <div key={hour.hour} className="flex items-center gap-3">
                  <div className="w-12 text-sm text-gray-600">
                    {hour.hour}:00
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-violet-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm text-gray-900 text-right">
                    {hour.messages_count || 0}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiTrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Данные по часам отсутствуют</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingCard />
          <LoadingCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Заголовок */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Аналитика диалогов и AI
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Детальная статистика диалогов и работы AI-ассистентов
        </p>
      </div>

      {/* Статистика диалогов */}
      <DialogStats />

      {/* AI Метрики */}
      <AIMetrics />

      {/* Дополнительная аналитика */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopAssistants />
        <HourlyActivity />
      </div>
    </div>
  );
};

export default DialogsAnalyticsPanel;