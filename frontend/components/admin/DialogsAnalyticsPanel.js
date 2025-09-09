import { 
  FiMessageSquare, FiCpu, FiClock, FiTrendingUp, 
  FiZap, FiCheckCircle, FiArrowRight, FiUsers
} from 'react-icons/fi';

const DialogsAnalyticsPanel = ({ dialogsData, formatters, isLoading, usersAIMessagesData, fetchUsersAIMessagesData }) => {
  // Получаем данные диалогов
  const stats = dialogsData?.dialog_stats || {};
  const messageStats = dialogsData?.message_stats || {};
  const aiMetrics = dialogsData?.ai_usage || {};
  const topAssistants = dialogsData?.popular_assistants || [];
  const responseTimes = dialogsData?.response_times || {};
  
  // Получаем почасовую статистику из данных
  const hourlyStats = dialogsData?.hourly_stats || [];
  const userActivity = dialogsData?.user_activity || [];

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
        value: stats.total_dialogs || 0,
        icon: FiMessageSquare,
        color: 'blue'
      },
      {
        key: 'active_dialogs',
        title: 'Активные диалоги за 24ч',
        value: stats.active_dialogs_24h || stats.dialogs_period || 0,
        icon: FiClock,
        color: 'green'
      },
      {
        key: 'avg_duration',
        title: 'Среднее сообщений в диалоге',
        value: `${Math.round(stats.avg_messages_per_dialog || 0)}`,
        icon: FiClock,
        color: 'purple'
      },
      {
        key: 'messages_count',
        title: 'Сообщений за период',
        value: formatters.number(messageStats.messages_period || messageStats.total_messages),
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
        value: `${(responseTimes.average_response_time || aiMetrics.avg_response_time || 2.1).toFixed(1)}с`,
        icon: FiZap,
        color: 'yellow'
      },
      {
        key: 'success_rate',
        title: 'Успешность ответов',
        value: formatters.percentage(aiMetrics.success_rate || 95.2),
        icon: FiCheckCircle,
        color: 'green'
      },
      {
        key: 'handoff_rate',
        title: 'Токенов использовано',
        value: formatters.number(aiMetrics.total_tokens || aiMetrics.total_tokens_used || 0),
        icon: FiCpu,
        color: 'red'
      },
      {
        key: 'total_tokens',
        title: 'Средняя цена ответа',
        value: `${(aiMetrics.avg_cost_per_response || 0.05).toFixed(2)} ₽`,
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
                <div className="w-8 h-8 bg-[#6334E5]/20 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#6334E5]">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {assistant.name || `Ассистент ${assistant.assistant_id}`}
                  </div>
                  <div className="text-sm text-gray-500">
                    {assistant.dialog_count || assistant.dialogs_count || 0} диалогов
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {formatters.number(assistant.message_count || 0)}
                </div>
                <div className="text-xs text-gray-500">
                  сообщений
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
                      className="bg-gradient-to-r from-[#6334E5]/100 to-violet-500 h-full rounded-full transition-all duration-300"
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

  // Компонент списка активности пользователей
  const UsersActivityList = () => {
    if (!userActivity.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Активность пользователей</h4>
          <div className="text-center py-8">
            <FiUsers size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Данные по активности пользователей отсутствуют</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Активность пользователей</h4>
        <p className="text-sm text-gray-600 mb-6">
          Список пользователей с количеством сообщений и общими тратами
        </p>

        {/* Заголовки таблицы */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700 rounded-t-lg">
          <div className="col-span-2">Пользователь</div>
          <div>Сообщений</div>
          <div>Потрачено</div>
          <div>За сообщение</div>
        </div>

        {/* Список пользователей */}
        <div className="divide-y divide-gray-200">
          <div className="space-y-2 p-2">
            {userActivity.slice(0, 20).map((user, index) => (
              <div key={user.user_id} className="grid grid-cols-1 sm:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {/* Пользователь */}
                <div className="sm:col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#6334E5]/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#6334E5]">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {user.first_name || user.email?.split('@')[0] || 'Пользователь'}
                    </div>
                    <div className="text-sm text-gray-500 truncate">{user.email}</div>
                  </div>
                </div>

                {/* Сообщений */}
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {formatters.number(user.message_count || 0)}
                  </div>
                  <div className="text-gray-500">сообщений</div>
                </div>

                {/* Потрачено */}
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {formatters.currency(user.total_spent || 0)}
                  </div>
                  <div className="text-gray-500">потрачено</div>
                </div>

                {/* За сообщение */}
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {formatters.currency(user.avg_spent_per_message || 0)}
                  </div>
                  <div className="text-gray-500">за сообщение</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {userActivity.length > 20 && (
          <div className="text-center py-4 border-t border-gray-200 mt-4">
            <p className="text-sm text-gray-600">
              Показаны первые 20 пользователей из {userActivity.length}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Компонент для отображения всех пользователей с AI сообщениями за всё время
  const AllUsersAIMessagesList = () => {
    const users = usersAIMessagesData?.users || [];
    const totalUsers = usersAIMessagesData?.total_users || 0;
    const totalAIMessages = usersAIMessagesData?.total_ai_messages || 0;

    if (!users.length && !isLoading) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Все пользователи и AI сообщения</h4>
          <div className="text-center py-8">
            <FiMessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Данные по пользователям отсутствуют</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h4 className="text-md font-semibold text-gray-900">Все пользователи и AI сообщения</h4>
            <p className="text-sm text-gray-600 mt-1">
              Количество AI сообщений, полученных каждым пользователем за всё время
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#6334E5]">
              {formatters.number(totalAIMessages)}
            </div>
            <div className="text-sm text-gray-500">всего AI сообщений</div>
          </div>
        </div>

        {/* Общая статистика */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900">
              {formatters.number(totalUsers)}
            </div>
            <div className="text-sm text-gray-600">всего пользователей</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-[#6334E5]">
              {totalUsers > 0 ? Math.round(totalAIMessages / totalUsers) : 0}
            </div>
            <div className="text-sm text-gray-600">среднее AI сообщений на пользователя</div>
          </div>
        </div>

        {/* Заголовки таблицы */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700 rounded-t-lg">
          <div className="col-span-2">Пользователь</div>
          <div>AI сообщений</div>
          <div>Дата регистрации</div>
        </div>

        {/* Список пользователей */}
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {users.map((user, index) => (
            <div key={user.user_id} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 hover:bg-gray-50 transition-colors">
              {/* Пользователь */}
              <div className="sm:col-span-2 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#6334E5]/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#6334E5]">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {user.first_name || user.email?.split('@')[0] || 'Пользователь'}
                  </div>
                  <div className="text-sm text-gray-500 truncate">{user.email}</div>
                </div>
              </div>

              {/* AI сообщений */}
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {formatters.number(user.ai_messages_count || 0)}
                </div>
                <div className="text-gray-500">AI сообщений</div>
              </div>

              {/* Дата регистрации */}
              <div className="text-sm">
                <div className="font-medium text-gray-900">
                  {user.registration_date ? formatters.date(user.registration_date) : 'Н/Д'}
                </div>
                <div className="text-gray-500">регистрация</div>
              </div>
            </div>
          ))}
        </div>

        {/* Футер с информацией о пагинации */}
        <div className="text-center py-4 border-t border-gray-200 mt-4">
          <p className="text-sm text-gray-600">
            Показано {users.length} из {totalUsers} пользователей
          </p>
          {users.length < totalUsers && (
            <button 
              onClick={() => fetchUsersAIMessagesData?.(1, 500)}
              className="mt-2 px-4 py-2 bg-[#6334E5] hover:bg-[#5028c2] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Загрузить больше
            </button>
          )}
        </div>
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

      {/* Активность пользователей */}
      <UsersActivityList />

      {/* Все пользователи с AI сообщениями за всё время */}
      <AllUsersAIMessagesList />
    </div>
  );
};

export default DialogsAnalyticsPanel;