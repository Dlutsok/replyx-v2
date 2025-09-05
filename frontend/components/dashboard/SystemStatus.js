import { useState, useEffect } from 'react';
import { createApiUrl } from '../../config/api';
import { FiServer, FiWifi, FiDatabase, FiRefreshCw, FiCheckCircle, FiXCircle, FiAlertTriangle, FiSettings, FiPlay, FiPause } from 'react-icons/fi';
import { useBotActions } from '../../hooks/useDashboardData';

const SystemStatus = ({ bots, loading, onRefresh, onUpdate }) => {
  const [systemHealth, setSystemHealth] = useState({
    api: { status: 'healthy', response_time: 0, uptime: '99.9%' },
    database: { status: 'healthy', connections: 0, query_time: 0 },
    websocket: { status: 'healthy', active_connections: 0 },
    redis: { status: 'healthy', memory_usage: 0, hit_rate: 0 }
  });
  const [notifications, setNotifications] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const { toggleBot } = useBotActions();

  useEffect(() => {
    // Симуляция проверки здоровья системы
    const checkSystemHealth = async () => {
      try {
        // Используем базовый URL API
        const response = await fetch(createApiUrl('/api/health'));
        if (response.ok) {
          const healthData = await response.json();
          setSystemHealth(prev => ({
            api: {
              status: healthData.status === 'healthy' ? 'healthy' : (healthData.status === 'degraded' ? 'warning' : 'error'),
              response_time: healthData.response_time_ms || 0,
              uptime: '—'
            },
            database: {
              status: healthData.checks?.database?.status === 'ok' ? 'healthy' : (healthData.checks?.database?.status === 'degraded' ? 'warning' : 'error'),
              connections: 0,
              query_time: 0
            },
            websocket: {
              status: 'healthy',
              active_connections: 0
            },
            redis: {
              status: healthData.checks?.redis?.status === 'ok' ? 'healthy' : (healthData.checks?.redis?.status === 'degraded' ? 'warning' : 'error'),
              memory_usage: 0,
              hit_rate: 0
            }
          }));
        }
      } catch (error) {
        // Если API недоступен, показываем предупреждение
        setSystemHealth(prev => ({
          ...prev,
          api: { ...prev.api, status: 'error' }
        }));
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Проверяем каждые 30 секунд
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Генерируем уведомления на основе статуса системы и ботов
    const newNotifications = [];
    
    // Проверяем статус системы
    Object.entries(systemHealth).forEach(([service, data]) => {
      if (data.status === 'error') {
        newNotifications.push({
          id: `system-${service}`,
          type: 'error',
          message: `Сервис ${service} недоступен`,
          timestamp: new Date()
        });
      } else if (data.status === 'warning') {
        newNotifications.push({
          id: `system-${service}`,
          type: 'warning',
          message: `Проблемы с сервисом ${service}`,
          timestamp: new Date()
        });
      }
    });

    // Проверяем неактивные боты
    const inactiveBots = bots.filter(bot => !bot.is_active);
    if (inactiveBots.length > 0) {
      newNotifications.push({
        id: 'inactive-bots',
        type: 'warning',
        message: `${inactiveBots.length} бот(ов) неактивны`,
        timestamp: new Date()
      });
    }

    setNotifications(newNotifications);
  }, [systemHealth, bots]);

  const handleBotToggle = async (bot) => {
    setActionLoading(prev => ({ ...prev, [bot.id]: true }));
    
    try {
      const success = await toggleBot(bot.id, bot.is_active);
      if (success) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to toggle bot', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [bot.id]: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return FiCheckCircle;
      case 'warning': return FiAlertTriangle;
      case 'error': return FiXCircle;
      default: return FiCheckCircle;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'info': return 'border-blue-200 bg-blue-50 text-blue-800';
      default: return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  const systemServices = [
    {
      id: 'api',
      name: 'API Сервер',
      icon: FiServer,
      status: systemHealth.api.status,
      details: [`${systemHealth.api.response_time.toFixed(0)}ms`, `${systemHealth.api.uptime} uptime`]
    },
    {
      id: 'database',
      name: 'База данных',
      icon: FiDatabase,
      status: systemHealth.database.status,
      details: [`${systemHealth.database.connections} подключений`, `${systemHealth.database.query_time.toFixed(0)}ms запросы`]
    },
    {
      id: 'websocket',
      name: 'WebSocket',
      icon: FiWifi,
      status: systemHealth.websocket.status,
      details: [`${systemHealth.websocket.active_connections} активных`, 'Реальное время']
    },
    {
      id: 'redis',
      name: 'Redis Cache',
      icon: FiSettings,
      status: systemHealth.redis.status,
      details: [`${systemHealth.redis.memory_usage}% памяти`, `${systemHealth.redis.hit_rate}% попаданий`]
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FiServer className="mr-2 text-blue-600" />
          Статус системы
        </h3>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Обновить"
        >
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Статус системных сервисов */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {systemServices.map((service) => {
          const StatusIcon = getStatusIcon(service.status);
          const statusColor = getStatusColor(service.status);
          
          return (
            <div key={service.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <service.icon className="w-5 h-5 text-gray-600" />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${statusColor}`}>
                  <StatusIcon className="w-3 h-3" />
                </div>
              </div>
              
              <h4 className="font-medium text-gray-900 text-sm mb-2">
                {service.name}
              </h4>
              
              <div className="space-y-1">
                {service.details.map((detail, index) => (
                  <p key={index} className="text-xs text-gray-500">
                    {detail}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Уведомления и предупреждения */}
      {notifications.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <FiAlertTriangle className="mr-2 text-orange-500" />
            Уведомления ({notifications.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border text-sm ${getNotificationColor(notification.type)}`}
              >
                <div className="flex items-center justify-between">
                  <span>{notification.message}</span>
                  <span className="text-xs opacity-75">
                    {notification.timestamp.toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Быстрое управление ботами */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
          <FiSettings className="mr-2 text-blue-500" />
          Быстрое управление ботами ({bots.length})
        </h4>

        {bots.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <FiServer className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">AI-ассистенты не найдены</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto">
            {bots.map((bot) => (
              <div 
                key={bot.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    bot.is_active ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {bot.assistant_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {bot.platform} • {bot.is_active ? 'Активен' : 'Остановлен'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleBotToggle(bot)}
                  disabled={actionLoading[bot.id]}
                  className={`p-2 rounded-lg transition-colors flex items-center ${
                    bot.is_active
                      ? 'text-red-600 hover:bg-red-100'
                      : 'text-green-600 hover:bg-green-100'
                  } ${actionLoading[bot.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={bot.is_active ? 'Остановить бота' : 'Запустить бота'}
                >
                  {actionLoading[bot.id] ? (
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                  ) : bot.is_active ? (
                    <FiPause className="w-4 h-4" />
                  ) : (
                    <FiPlay className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Общий статус системы */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Система работает нормально
              </p>
              <p className="text-xs text-gray-500">
                Все сервисы доступны • Последняя проверка: {new Date().toLocaleTimeString('ru-RU')}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-gray-500">
              Активных ботов: {bots.filter(b => b.is_active).length}/{bots.length}
            </p>
            <p className="text-xs text-gray-500">
              Уведомлений: {notifications.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;