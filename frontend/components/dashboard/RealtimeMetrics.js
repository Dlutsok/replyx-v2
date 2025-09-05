import { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiUsers, FiMessageCircle, FiZap, FiRefreshCw, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { useWebSocket } from '../../hooks/useDashboardData';

const RealtimeMetrics = ({ metrics, loading, onRefresh }) => {
  const [realtimeData, setRealtimeData] = useState({
    activeUsers: 0,
    messagesPerMinute: 0,
    avgResponseTime: 0,
    systemLoad: 0,
    activeBots: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isFlashing, setIsFlashing] = useState({});

  // WebSocket для реального времени
  const handleWebSocketMessage = useCallback((message) => {
    if (message.type === 'realtime_metrics') {
      const newData = message.data;
      
      // Проверяем, какие метрики изменились для анимации
      const flashChanges = {};
      Object.keys(newData).forEach(key => {
        if (realtimeData[key] !== newData[key]) {
          flashChanges[key] = true;
        }
      });
      
      setIsFlashing(flashChanges);
      setTimeout(() => setIsFlashing({}), 1000);
      
      setRealtimeData(newData);
    }
    
    if (message.type === 'activity_event') {
      // Добавляем новое событие в список активности
      setRecentActivity(prev => [
        {
          id: Date.now(),
          type: message.event_type,
          description: message.description,
          timestamp: new Date(),
          platform: message.platform || 'telegram'
        },
        ...prev.slice(0, 9) // Оставляем только последние 10 событий
      ]);
    }
  }, [realtimeData]);

  const realtimeWsUrl = (() => {
    if (typeof window === 'undefined') return null;
    // Используем переменную окружения для определения backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
    const url = new URL(backendUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';
    return `${wsProtocol}://${url.host}/ws/realtime-metrics`;
  })();

  const { connected, disabled, lastError } = useWebSocket(realtimeWsUrl, handleWebSocketMessage, {
    maxReconnectAttempts: 3,
    reconnectInterval: 15000,
    autoReconnect: true
  });

  // Симуляция данных реального времени (для демонстрации)
  useEffect(() => {
    if (!connected) {
      const interval = setInterval(() => {
        setRealtimeData(prev => {
          const newData = {
            activeUsers: Math.max(0, prev.activeUsers + Math.floor((Math.random() - 0.5) * 3)),
            messagesPerMinute: Math.max(0, prev.messagesPerMinute + Math.floor((Math.random() - 0.5) * 5)),
            avgResponseTime: Math.max(0.5, prev.avgResponseTime + (Math.random() - 0.5) * 0.5),
            systemLoad: Math.max(0, Math.min(100, prev.systemLoad + (Math.random() - 0.5) * 10)),
            activeBots: Math.max(0, prev.activeBots + Math.floor((Math.random() - 0.5) * 1))
          };
          
          // Добавляем случайные события активности
          if (Math.random() < 0.3) {
            const events = [
              { type: 'new_dialog', description: 'Новый диалог начат', platform: 'telegram' },
              { type: 'message_sent', description: 'Сообщение отправлено', platform: 'webchat' },
              { type: 'bot_response', description: 'Бот ответил пользователю', platform: 'telegram' },
              { type: 'dialog_closed', description: 'Диалог завершен', platform: 'webchat' }
            ];
            
            const randomEvent = events[Math.floor(Math.random() * events.length)];
            setRecentActivity(prev => [
              {
                id: Date.now(),
                ...randomEvent,
                timestamp: new Date()
              },
              ...prev.slice(0, 9)
            ]);
          }
          
          return newData;
        });
      }, 5000); // Обновляем каждые 5 секунд
      
      return () => clearInterval(interval);
    }
  }, [connected]);

  // Инициализация базовых данных из общих метрик
  useEffect(() => {
    if (metrics && realtimeData.activeUsers === 0) {
      setRealtimeData({
        activeUsers: Math.floor((metrics.totalMessages || 0) / 10),
        messagesPerMinute: Math.floor((metrics.periodMessages || 0) / 60),
        avgResponseTime: metrics.avgResponseTime || 0,
        systemLoad: Math.floor(Math.random() * 30 + 20), // 20-50%
        activeBots: 3 // Можно получить из API ботов
      });
    }
  }, [metrics]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'new_dialog': return FiUsers;
      case 'message_sent': return FiMessageCircle;
      case 'bot_response': return FiZap;
      case 'dialog_closed': return FiActivity;
      default: return FiActivity;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'new_dialog': return 'text-blue-600 bg-blue-100';
      case 'message_sent': return 'text-green-600 bg-green-100';
      case 'bot_response': return 'text-purple-600 bg-purple-100';
      case 'dialog_closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSystemLoadColor = (load) => {
    if (load < 30) return 'text-green-600 bg-green-100';
    if (load < 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const realtimeMetrics = [
    {
      id: 'activeUsers',
      title: 'Активных пользователей',
      value: realtimeData.activeUsers,
      icon: FiUsers,
      color: 'text-blue-600 bg-blue-100',
      suffix: ''
    },
    {
      id: 'messagesPerMinute',
      title: 'Сообщений/мин',
      value: realtimeData.messagesPerMinute,
      icon: FiMessageCircle,
      color: 'text-green-600 bg-green-100',
      suffix: ''
    },
    {
      id: 'avgResponseTime',
      title: 'Время ответа',
      value: realtimeData.avgResponseTime,
      icon: FiZap,
      color: 'text-yellow-600 bg-yellow-100',
      suffix: 'с',
      format: (val) => val.toFixed(1)
    },
    {
      id: 'systemLoad',
      title: 'Нагрузка системы',
      value: realtimeData.systemLoad,
      icon: FiActivity,
      color: getSystemLoadColor(realtimeData.systemLoad),
      suffix: '%',
      format: (val) => Math.round(val)
    }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiActivity className="mr-2 text-green-600" />
            Метрики в реальном времени
          </h3>
          {connected && (
            <div className="ml-3 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
              <span className="text-xs text-green-600">Онлайн</span>
            </div>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Обновить"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Метрики в реальном времени */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {realtimeMetrics.map((metric) => (
          <div 
            key={metric.id}
            className={`bg-white border border-gray-200 rounded-lg p-4 transition-all duration-300 ${
              isFlashing[metric.id] ? 'ring-2 ring-blue-400 shadow-lg' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${metric.color}`}>
                <metric.icon className="w-4 h-4" />
              </div>
              {isFlashing[metric.id] && (
                <div className="text-green-600">
                  <FiTrendingUp className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {metric.format ? metric.format(metric.value) : metric.value}
              {metric.suffix}
            </div>
            <div className="text-xs text-gray-500 leading-tight">
              {metric.title}
            </div>
          </div>
        ))}
      </div>

      {/* Активность в реальном времени */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
            <FiZap className="mr-2 text-orange-500" />
            Последняя активность
          </h4>
          <span className="text-xs text-gray-500">
            Обновляется в реальном времени
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FiActivity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Ожидание активности...</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colorClasses = getActivityColor(activity.type);
              
              return (
                <div 
                  key={activity.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${colorClasses}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTime(activity.timestamp)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {activity.platform}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Статус подключения */}
      {!connected && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                Подключение к серверу потеряно. Показываются симуляционные данные.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeMetrics;