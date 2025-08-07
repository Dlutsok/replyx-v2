import { useState, useEffect, useCallback } from 'react';
import { FiMessageCircle, FiUser, FiClock, FiExternalLink, FiRefreshCw, FiTool } from 'react-icons/fi';
import { useDialogActions, useWebSocket } from '../../hooks/useDashboardData';

const ActiveDialogs = ({ dialogs: initialDialogs, loading, onRefresh }) => {
  const [dialogs, setDialogs] = useState(initialDialogs || []);
  const [actionLoading, setActionLoading] = useState({});
  const { takeoverDialog, releaseDialog } = useDialogActions();

  // WebSocket для реального времени
  const handleWebSocketMessage = useCallback((message) => {
    if (message.type === 'new_dialog' || message.type === 'dialog_update') {
      setDialogs(prev => {
        const existingIndex = prev.findIndex(d => d.id === message.dialog.id);
        if (existingIndex >= 0) {
          // Обновляем существующий диалог
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...message.dialog };
          return updated;
        } else {
          // Добавляем новый диалог
          return [message.dialog, ...prev];
        }
      });
    }
  }, []);

  // Получаем токен для WebSocket соединения
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const wsUrl = token ? `ws://localhost:8000/ws/dialogs?token=${token}` : null;
  
  const { connected, disabled, lastError } = useWebSocket(wsUrl, handleWebSocketMessage, {
    maxReconnectAttempts: 3,
    reconnectInterval: 10000,
    autoReconnect: true
  });

  // Обновляем локальные диалоги при изменении props
  useEffect(() => {
    setDialogs(initialDialogs || []);
  }, [initialDialogs]);

  const handleTakeover = async (dialogId) => {
    setActionLoading(prev => ({ ...prev, [dialogId]: true }));
    
    try {
      const success = await takeoverDialog(dialogId);
      if (success) {
        setDialogs(prev => prev.map(dialog => 
          dialog.id === dialogId 
            ? { ...dialog, is_taken_over: 1 }
            : dialog
        ));
      }
    } catch (error) {
      console.error('Error taking over dialog:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [dialogId]: false }));
    }
  };

  const handleRelease = async (dialogId) => {
    setActionLoading(prev => ({ ...prev, [dialogId]: true }));
    
    try {
      const success = await releaseDialog(dialogId);
      if (success) {
        setDialogs(prev => prev.map(dialog => 
          dialog.id === dialogId 
            ? { ...dialog, is_taken_over: 0 }
            : dialog
        ));
      }
    } catch (error) {
      console.error('Error releasing dialog:', error);
    } finally {
      setActionLoading(prev => ({ ...prev, [dialogId]: false }));
    }
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays === 1) return 'вчера';
    return date.toLocaleDateString('ru-RU');
  };

  const getUserDisplayName = (dialog) => {
    if (dialog.name) return dialog.name;
    if (dialog.first_name && dialog.last_name) return `${dialog.first_name} ${dialog.last_name}`;
    if (dialog.first_name) return dialog.first_name;
    if (dialog.telegram_username) return `@${dialog.telegram_username}`;
    if (dialog.email) return dialog.email;
    return `Пользователь #${dialog.user_id}`;
  };

  const getDialogStatus = (dialog) => {
    if (dialog.is_taken_over) return { text: 'Перехвачен', color: 'bg-yellow-100 text-yellow-800' };
    if (dialog.auto_response) return { text: 'Авто-ответ', color: 'bg-green-100 text-green-800' };
    return { text: 'Активен', color: 'bg-blue-100 text-blue-800' };
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
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 w-20 bg-gray-200 rounded"></div>
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
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiMessageCircle className="mr-2 text-blue-600" />
            Активные диалоги ({dialogs.length})
          </h3>
          {connected && (
            <div className="ml-3 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
              <span className="text-xs text-green-600">В реальном времени</span>
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

      {/* Список диалогов */}
      {dialogs.length === 0 ? (
        <div className="text-center py-8">
          <FiMessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Активных диалогов пока нет</p>
          <p className="text-sm text-gray-400 mt-2">
            Новые диалоги появятся здесь автоматически
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {dialogs.map((dialog) => {
            const status = getDialogStatus(dialog);
            const displayName = getUserDisplayName(dialog);
            
            return (
              <div 
                key={dialog.id} 
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                {/* Информация о диалоге */}
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FiUser className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {displayName}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1">
                      <div className="flex items-center text-sm text-gray-500">
                        <FiClock className="w-3 h-3 mr-1" />
                        {formatTime(dialog.last_message_at || dialog.started_at)}
                      </div>
                      
                      {dialog.telegram_chat_id && (
                        <span className="text-xs text-gray-400">
                          Telegram
                        </span>
                      )}
                      
                      {dialog.guest_id && (
                        <span className="text-xs text-gray-400">
                          Веб-чат
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Действия */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {/* Кнопка перехвата/освобождения */}
                  {dialog.is_taken_over ? (
                    <button
                      onClick={() => handleRelease(dialog.id)}
                      disabled={actionLoading[dialog.id]}
                      className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors flex items-center"
                    >
                      {actionLoading[dialog.id] ? (
                        <FiRefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <FiTool className="w-4 h-4 mr-1" />
                      )}
                      Освободить
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTakeover(dialog.id)}
                      disabled={actionLoading[dialog.id]}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center"
                    >
                      {actionLoading[dialog.id] ? (
                        <FiRefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <FiTool className="w-4 h-4 mr-1" />
                      )}
                      Перехватить
                    </button>
                  )}

                  {/* Кнопка перехода к диалогу */}
                  <button
                    onClick={() => window.location.href = `/dialogs?dialog_id=${dialog.id}`}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Открыть диалог"
                  >
                    <FiExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}



      {/* Быстрые фильтры */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-500">Всего диалогов: {dialogs.length}</span>
            <span className="text-yellow-600">
              Перехваченных: {dialogs.filter(d => d.is_taken_over).length}
            </span>
            <span className="text-green-600">
              С авто-ответом: {dialogs.filter(d => d.auto_response).length}
            </span>
          </div>
          
          <button
            onClick={() => window.location.href = '/dialogs'}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Все диалоги →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveDialogs;