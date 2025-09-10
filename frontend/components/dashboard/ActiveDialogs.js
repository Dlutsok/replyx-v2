import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiMessageCircle, FiUser, FiClock, FiExternalLink, FiRefreshCw, FiTool, FiGlobe } from 'react-icons/fi';
import { useDialogActions, useWebSocket } from '../../hooks/useDashboardData';
import { getUserDisplayName as getDialogUserDisplayName } from '../../utils/dialogHelpers';

const ActiveDialogs = React.memo(({ dialogs: initialDialogs, loading, onRefresh }) => {
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
  const wsUrl = token
    ? (() => {
        if (typeof window === 'undefined') return null;
        // Используем переменную окружения для определения backend URL
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
        const url = new URL(backendUrl);
        const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';
        return `${wsProtocol}://${url.host}/ws/dialogs?token=${token}`;
      })()
    : null;
  
  const { connected, disabled, lastError } = useWebSocket(wsUrl, handleWebSocketMessage, {
    maxReconnectAttempts: 3,
    reconnectInterval: 30000, // Увеличено до 30 секунд
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
    } finally {
      setActionLoading(prev => ({ ...prev, [dialogId]: false }));
    }
  };

  // Мемоизация функций для предотвращения пересоздания при каждом рендере
  const formatTime = useCallback((dateString) => {
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
  }, []);

  const getUserDisplayName = useCallback((dialog) => {
    return getDialogUserDisplayName(dialog);
  }, []);

  const getDialogStatus = useCallback((dialog) => {
    if (dialog.is_taken_over) return { text: 'Перехвачен', color: 'bg-gray-100 text-gray-700', indicator: 'bg-yellow-400' };
    if (dialog.auto_response) return { text: 'Авто-ответ', color: 'bg-gray-100 text-gray-700', indicator: 'bg-blue-400' };
    return { text: 'Активен', color: 'bg-emerald-100 text-emerald-700', indicator: 'bg-emerald-400' };
  }, []);

  // Мемоизация статистики диалогов
  const dialogStats = useMemo(() => ({
    total: dialogs.length,
    takenOver: dialogs.filter(d => d.is_taken_over).length,
    autoResponse: dialogs.filter(d => d.auto_response).length
  }), [dialogs]);

  if (loading) {
        return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8">
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gray-200 rounded-lg"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
            <div className="h-3 bg-gray-200 rounded w-8"></div>
          </div>
          <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between p-2 sm:p-3 md:p-4 bg-white border border-gray-100 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-20 sm:w-24 mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded w-12 sm:w-16"></div>
                </div>
              </div>
              <div className="flex gap-1">
                <div className="h-4 sm:h-5 bg-gray-200 rounded w-12 sm:w-16"></div>
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8">
      {/* Компактный заголовок */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-3 lg:gap-3 xl:gap-4">
          <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiMessageCircle className="text-gray-600" size={12} />
          </div>
          <h3 className="text-sm sm:text-base md:text-lg lg:text-lg xl:text-xl font-semibold text-gray-900">Активные диалоги ({dialogs.length})</h3>
          {connected && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live</span>
            </div>
          )}
        </div>
        <button
          onClick={onRefresh}
          className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm active:scale-[0.95] active:rotate-180 transition-all duration-300 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:rotate-180 flex-shrink-0"
          title="Обновить данные"
        >
          <FiRefreshCw size={10} className="transition-transform duration-300" />
        </button>
      </div>

      {/* Вторичная подложка для списка диалогов */}
      <div className="bg-gray-50 rounded-lg px-2 sm:px-3 md:px-3 lg:px-4 xl:px-5 py-2 sm:py-2 md:py-3 lg:py-3 xl:py-4">
        {/* Список диалогов */}
        {dialogs.length === 0 ? (
          <div className="text-center py-6 sm:py-8 md:py-10 lg:py-12 xl:py-16">
            <FiMessageCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 xl:w-16 xl:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
            <p className="text-gray-600 text-sm sm:text-sm md:text-base lg:text-base xl:text-lg font-medium mb-2">Активных диалогов пока нет</p>
            <p className="text-sm text-gray-500 mb-3 sm:mb-4 max-w-xs mx-auto leading-relaxed">
              Новые диалоги появятся здесь автоматически при взаимодействии пользователей с вашими ассистентами
            </p>
            <button
              onClick={() => window.location.href = '/ai-assistant'}
              className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 md:px-5 md:py-3 lg:px-6 lg:py-3 xl:px-6 xl:py-3 bg-[#6334E5]/10 hover:bg-[#6334E5]/20 text-[#6334E5] rounded-lg text-sm font-medium transition-colors duration-150"
            >
              <FiMessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              Создать ассистента
            </button>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-2 md:space-y-3 lg:space-y-3 xl:space-y-3 max-h-48 sm:max-h-56 md:max-h-64 lg:max-h-72 xl:max-h-80 overflow-y-auto">
            {dialogs.map((dialog, index) => {
            const status = getDialogStatus(dialog);
            const displayName = getUserDisplayName(dialog);

            return (
              <div
                key={dialog.id}
                className="group flex flex-col gap-1 rounded-lg border border-gray-100 bg-white px-2 sm:px-3 md:px-3 lg:px-4 xl:px-4 py-2 sm:py-2 md:py-2 lg:py-3 xl:py-3 hover:bg-gray-50 transition-all duration-150"
              >
                {/* Верхняя строка - основная информация */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-2 md:gap-2 lg:gap-3 xl:gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-8 xl:h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FiUser className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-4 lg:h-4 xl:w-4 xl:h-4 text-gray-600" />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {displayName}
                    </span>
                  </div>

                  {/* Статус с фоном вместо линии */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-sm font-medium ${status.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.indicator}`}></span>
                      <span className="hidden sm:inline">{status.text}</span>
                      <span className="sm:hidden">{status.text.slice(0, 4)}...</span>
                    </span>

                    {/* Кнопка действий - видима всегда */}
                    <button
                      onClick={() => window.location.href = `/dialogs?dialog_id=${dialog.id}`}
                      className="w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-8 xl:h-8 rounded border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.95] transition-all duration-150 flex items-center justify-center text-gray-500 hover:text-gray-700 flex-shrink-0"
                      title="Открыть диалог"
                    >
                      <FiExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-4 lg:h-4 xl:w-4 xl:h-4" />
                    </button>
                  </div>
                </div>

                {/* Нижняя строка - второстепенная информация */}
                <div className="flex flex-col sm:flex-col md:flex-row lg:flex-row xl:flex-row items-start sm:items-start md:items-center lg:items-center xl:items-center justify-between gap-1 sm:gap-1 md:gap-2 lg:gap-2 xl:gap-2">
                  <div className="flex items-center gap-1 sm:gap-2 md:gap-2 lg:gap-2 xl:gap-3 text-sm text-gray-500 flex-wrap">
                    <div className="flex items-center">
                      <FiClock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-3.5 md:h-3.5 lg:w-3.5 lg:h-3.5 xl:w-3.5 xl:h-3.5 mr-1" />
                      <span className="truncate max-w-[80px] sm:max-w-[100px] md:max-w-none">
                        {formatTime(dialog.last_message_at || dialog.started_at)}
                      </span>
                    </div>

                    {dialog.telegram_chat_id && (
                      <div className="flex items-center gap-1">
                        <FiMessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-3.5 md:h-3.5 lg:w-3.5 lg:h-3.5 xl:w-3.5 xl:h-3.5" />
                        <span className="hidden sm:inline">Telegram</span>
                        <span className="sm:hidden">TG</span>
                      </div>
                    )}

                    {dialog.guest_id && (
                      <div className="flex items-center gap-1">
                        <FiGlobe className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-3.5 md:h-3.5 lg:w-3.5 lg:h-3.5 xl:w-3.5 xl:h-3.5" />
                        <span>Сайт</span>
                      </div>
                    )}
                  </div>

                  {/* Компактные действия - адаптивная видимость */}
                  <div className="flex md:opacity-0 md:group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 xl:opacity-0 xl:group-hover:opacity-100 items-center gap-1 transition-opacity duration-150">
                    {/* Кнопка перехвата/освобождения */}
                    {dialog.is_taken_over ? (
                      <button
                        onClick={() => handleRelease(dialog.id)}
                        disabled={actionLoading[dialog.id]}
                        className="px-1.5 py-1 sm:px-2 sm:py-1 md:px-2 md:py-1 lg:px-2 lg:py-1 xl:px-2 xl:py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 active:scale-[0.98] transition-all duration-150 flex items-center"
                      >
                        {actionLoading[dialog.id] ? (
                          <FiRefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-3.5 md:h-3.5 lg:w-3.5 lg:h-3.5 xl:w-3.5 xl:h-3.5 mr-1 animate-spin" />
                        ) : (
                          <FiTool className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-3.5 md:h-3.5 lg:w-3.5 lg:h-3.5 xl:w-3.5 xl:h-3.5 mr-1" />
                        )}
                        <span className="hidden sm:inline">Освободить</span>
                        <span className="sm:hidden">Осв.</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleTakeover(dialog.id)}
                        disabled={actionLoading[dialog.id]}
                        className="px-1.5 py-1 sm:px-2 sm:py-1 md:px-2 md:py-1 lg:px-2 lg:py-1 xl:px-2 xl:py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 active:scale-[0.98] transition-all duration-150 flex items-center"
                      >
                        {actionLoading[dialog.id] ? (
                          <FiRefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-3.5 md:h-3.5 lg:w-3.5 lg:h-3.5 xl:w-3.5 xl:h-3.5 mr-1 animate-spin" />
                        ) : (
                          <FiTool className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-3.5 md:h-3.5 lg:w-3.5 lg:h-3.5 xl:w-3.5 xl:h-3.5 mr-1" />
                        )}
                        <span className="hidden sm:inline">Перехватить</span>
                        <span className="sm:hidden">Перех.</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Компактная статистика */}
      <div className="mt-3 sm:mt-3 md:mt-4 lg:mt-4 xl:mt-4 pt-3 border-t border-gray-200">
        <div className="flex flex-col sm:flex-col md:flex-row lg:flex-row xl:flex-row items-start sm:items-start md:items-center lg:items-center xl:items-center justify-between gap-2 sm:gap-2 md:gap-3 lg:gap-3 xl:gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2 md:gap-3 lg:gap-3 xl:gap-3">
            <span className="text-gray-500">Всего: {dialogStats.total}</span>
            <span className="text-gray-600 hidden sm:inline">
              Перехваченных: {dialogStats.takenOver}
            </span>
            <span className="text-gray-600 hidden sm:inline">
              Авто-ответ: {dialogStats.autoResponse}
            </span>
            <span className="text-gray-600 sm:hidden">
              Перех.: {dialogStats.takenOver}
            </span>
            <span className="text-gray-600 sm:hidden">
              Авто: {dialogStats.autoResponse}
            </span>
          </div>

          <button
            onClick={() => window.location.href = '/dialogs'}
            className="text-gray-600 hover:text-gray-800 active:scale-[0.98] font-medium transition-all duration-150 whitespace-nowrap"
          >
            Все диалоги →
          </button>
        </div>
      </div>
    </div>
  );
});

// Добавляем displayName для лучшей отладки
ActiveDialogs.displayName = 'ActiveDialogs';

export default ActiveDialogs;