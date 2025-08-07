import { useState } from 'react';
import { FiPlay, FiPause, FiSettings, FiMessageSquare, FiRefreshCw, FiPlus, FiCopy, FiExternalLink } from 'react-icons/fi';
import { useBotActions } from '../../hooks/useDashboardData';

const BotsManagement = ({ bots, loading, onRefresh, onUpdate }) => {
  const [actionLoading, setActionLoading] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toggleBot, startBot, stopBot } = useBotActions();

  const handleBotToggle = async (bot) => {
    setActionLoading(prev => ({ ...prev, [bot.id]: true }));
    
    try {
      const success = await toggleBot(bot.id, bot.is_active);
      if (success) {
        onUpdate();
      }
    } catch (error) {
        console.error('Bot toggle failed:', error);
      }
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [bot.id]: false }));
    }
  };

  const handleBotStart = async (bot) => {
    setActionLoading(prev => ({ ...prev, [bot.id]: true }));
    
    try {
      const success = await startBot(bot.id);
      if (success) {
        onUpdate();
      }
    } catch (error) {
        console.error('Bot start failed:', error);
      }
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [bot.id]: false }));
    }
  };

  const handleBotStop = async (bot) => {
    setActionLoading(prev => ({ ...prev, [bot.id]: true }));
    
    try {
      const success = await stopBot(bot.id);
      if (success) {
        onUpdate();
      }
    } catch (error) {
        console.error('Bot stop failed:', error);
      }
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [bot.id]: false }));
    }
  };

  const copyBotToken = (token) => {
    navigator.clipboard.writeText(token);
    // TODO: Добавить toast уведомление
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Активен' : 'Остановлен';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FiMessageSquare className="mr-2 text-blue-600" />
          Telegram боты ({bots.length})
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Создать бота"
          >
            <FiPlus className="w-4 h-4" />
          </button>
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Обновить"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Список ботов */}
      {bots.length === 0 ? (
        <div className="text-center py-8">
          <FiMessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">У вас пока нет созданных ботов</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center mx-auto"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Создать первого бота
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bots.map((bot) => (
            <div key={bot.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-center justify-between">
                {/* Информация о боте */}
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      bot.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <FiMessageSquare className={`w-5 h-5 ${
                        bot.is_active ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {bot.assistant_name}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bot.is_active)}`}>
                        {getStatusText(bot.is_active)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500">
                        Платформа: {bot.platform}
                      </p>
                      {bot.created_at && (
                        <p className="text-sm text-gray-500">
                          Создан: {new Date(bot.created_at).toLocaleDateString('ru-RU')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Управление ботом */}
                <div className="flex items-center space-x-2">
                  {/* Кнопка включения/выключения */}
                  <button
                    onClick={() => handleBotToggle(bot)}
                    disabled={actionLoading[bot.id]}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center ${
                      bot.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } ${actionLoading[bot.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {actionLoading[bot.id] ? (
                      <FiRefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : bot.is_active ? (
                      <FiPause className="w-4 h-4 mr-1" />
                    ) : (
                      <FiPlay className="w-4 h-4 mr-1" />
                    )}
                    {bot.is_active ? 'Стоп' : 'Старт'}
                  </button>

                  {/* Кнопка копирования токена */}
                  {bot.bot_token && (
                    <button
                      onClick={() => copyBotToken(bot.bot_token)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Скопировать токен"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                  )}

                  {/* Кнопка настроек */}
                  <button
                    onClick={() => window.location.href = `/ai-assistant?assistant_id=${bot.assistant_id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Настройки ассистента"
                  >
                    <FiSettings className="w-4 h-4" />
                  </button>

                  {/* Кнопка перехода к диалогам */}
                  <button
                    onClick={() => window.location.href = `/dialogs?assistant_id=${bot.assistant_id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Диалоги"
                  >
                    <FiExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Дополнительная информация */}
              {bot.bot_token && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="mr-2">Токен:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded font-mono">
                      {bot.bot_token.substring(0, 10)}...{bot.bot_token.slice(-6)}
                    </code>
                    <button
                      onClick={() => copyBotToken(bot.bot_token)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <FiCopy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания бота */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Создать нового бота
            </h3>
            <p className="text-gray-600 mb-4">
              Для создания бота перейдите в раздел управления ассистентами
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.href = '/ai-assistant'}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Перейти
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotsManagement;