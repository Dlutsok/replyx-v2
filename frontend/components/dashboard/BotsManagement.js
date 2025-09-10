import { useState } from 'react';
import { createPortal } from 'react-dom';
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
    } finally {
      setActionLoading(prev => ({ ...prev, [bot.id]: false }));
    }
  };

  const copyBotToken = (token) => {
    navigator.clipboard.writeText(token);
    // TODO: Добавить toast уведомление
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Активен' : 'Остановлен';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
              <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
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
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
            <FiMessageSquare className="text-gray-600" size={14} />
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            Telegram боты ({bots.length})
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-6 h-6 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-150 flex items-center justify-center text-gray-500 hover:text-gray-700"
            title="Создать бота"
          >
            <FiPlus size={12} />
          </button>
          <button
            onClick={onRefresh}
            className="w-6 h-6 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-150 flex items-center justify-center text-gray-500 hover:text-gray-700"
            title="Обновить"
          >
            <FiRefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Список ботов */}
      {bots.length === 0 ? (
        <div className="text-center py-6">
          <FiMessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-3">У вас пока нет созданных ботов</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-150 flex items-center mx-auto border border-gray-300 hover:bg-gray-50"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Создать первого бота
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <div key={bot.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all duration-150">
              {/* Информация о боте */}
              <div className="flex flex-col items-center text-center mb-3">
                <div className="flex-shrink-0 mb-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <FiMessageSquare className="w-6 h-6 text-gray-600" />
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-gray-900 mb-1 truncate w-full">
                  {bot.assistant_name}
                </h4>

                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(bot.is_active)} mb-2`}>
                  {getStatusText(bot.is_active)}
                </span>
              </div>

              {/* Детали */}
              <div className="space-y-2 mb-3">
                <div className="text-xs text-gray-600 text-center">
                  <span className="text-gray-500">Платформа:</span> {bot.platform}
                </div>
                {bot.created_at && (
                  <div className="text-xs text-gray-600 text-center">
                    <span className="text-gray-500">Создан:</span> {new Date(bot.created_at).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>

              {/* Управление ботом */}
              <div className="flex items-center justify-center gap-1">
                {/* Кнопка включения/выключения */}
                <button
                  onClick={() => handleBotToggle(bot)}
                  disabled={actionLoading[bot.id]}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all duration-150 flex items-center ${
                    bot.is_active
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${actionLoading[bot.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {actionLoading[bot.id] ? (
                    <FiRefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  ) : bot.is_active ? (
                    <FiPause className="w-3 h-3 mr-1" />
                  ) : (
                    <FiPlay className="w-3 h-3 mr-1" />
                  )}
                  {bot.is_active ? 'Стоп' : 'Старт'}
                </button>

                {/* Кнопки действий */}
                <div className="flex gap-1">
                  {bot.bot_token && (
                    <button
                      onClick={() => copyBotToken(bot.bot_token)}
                      className="w-6 h-6 rounded border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-150 flex items-center justify-center text-gray-500 hover:text-gray-700"
                      title="Скопировать токен"
                    >
                      <FiCopy size={12} />
                    </button>
                  )}

                  <button
                    onClick={() => window.location.href = `/ai-assistant?assistant_id=${bot.assistant_id}`}
                    className="w-6 h-6 rounded border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-150 flex items-center justify-center text-gray-500 hover:text-gray-700"
                    title="Настройки ассистента"
                  >
                    <FiSettings size={12} />
                  </button>

                  <button
                    onClick={() => window.location.href = `/dialogs?assistant_id=${bot.assistant_id}`}
                    className="w-6 h-6 rounded border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-150 flex items-center justify-center text-gray-500 hover:text-gray-700"
                    title="Диалоги"
                  >
                    <FiExternalLink size={12} />
                  </button>
                </div>
              </div>

              {/* Дополнительная информация */}
              {bot.bot_token && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-center text-xs text-gray-500">
                    <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                      {bot.bot_token.substring(0, 8)}...{bot.bot_token.slice(-4)}
                    </code>
                    <button
                      onClick={() => copyBotToken(bot.bot_token)}
                      className="ml-1 p-1 text-gray-400 hover:text-gray-600 transition-all duration-150"
                      title="Копировать"
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
      {showCreateForm ? createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[102]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Создать нового бота
            </h3>
            <p className="text-gray-600 mb-4">
              Для создания бота перейдите в раздел управления ассистентами
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/ai-assistant'}
                className="flex-1 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-150 border border-gray-300 hover:bg-gray-50"
              >
                Перейти
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-150"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  );
};

export default BotsManagement;