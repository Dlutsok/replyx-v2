import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHeadphones, FiUser, FiMessageSquare, FiAlertCircle, FiUserCheck, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';

// DEBUG MODE: Максимальное логирование для диагностики проблемы с временем "3ч 5м"
// Ищем в консоли префиксы: 🚀 🔍 ⏰ 📝 🎯 🎨

const HandoffQueue = ({ dialogs = [], onTakeDialog, onCancel, isLoading = false }) => {
  const [queueDialogs, setQueueDialogs] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  // DEBUG: Логируем входящие данные
  console.log('🚀 HandoffQueue component rendered with:', {
    totalDialogs: dialogs.length,
    isLoading,
    currentTime: new Date().toISOString(),
    rawDialogs: dialogs
  });

  // Фильтруем диалоги, требующие оператора
  useEffect(() => {
    console.log('🔍 HandoffQueue: Processing dialogs:', dialogs.length);
    
    const handoffDialogs = dialogs.filter(dialog => 
      dialog.handoff_status === 'requested' || dialog.handoff_status === 'active'
    );
    
    console.log('🔍 HandoffQueue: Found handoff dialogs:', handoffDialogs.length);
    
    // DEBUG: Детальная информация по каждому диалогу
    handoffDialogs.forEach((dialog, index) => {
      console.log(`🔍 HandoffQueue Dialog #${index} (ID: ${dialog.id}):`);
      console.log('  - handoff_requested_at:', dialog.handoff_requested_at);
      console.log('  - last_message_at:', dialog.last_message_at);
      console.log('  - handoff_status:', dialog.handoff_status);
      console.log('  - Raw dialog object:', dialog);
      
      const timestampToUse = dialog.handoff_requested_at || dialog.last_message_at;
      console.log('  - Final timestamp for calculation:', timestampToUse);
      console.log('  - Timestamp parsed as Date:', new Date(timestampToUse));
    });
    
    // Сортируем по времени запроса (старые сначала)
    const sortedDialogs = handoffDialogs.sort((a, b) => 
      new Date(a.handoff_requested_at || a.last_message_at) - new Date(b.handoff_requested_at || b.last_message_at)
    );
    
    console.log('🔍 HandoffQueue: Sorted dialogs:', sortedDialogs.map(d => ({
      id: d.id,
      timestamp: d.handoff_requested_at || d.last_message_at,
      parsed: new Date(d.handoff_requested_at || d.last_message_at)
    })));
    
    setQueueDialogs(sortedDialogs);
  }, [dialogs]);

  // Автообновление времени каждые 30 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueDialogs(prev => [...prev]);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getWaitTimeInMinutes = (timestamp) => {
    console.log('⏰ getWaitTimeInMinutes called with timestamp:', timestamp);
    
    if (!timestamp) {
      console.log('⏰ No timestamp provided, returning 0');
      return 0;
    }
    
    try {
      const now = new Date();
      const time = new Date(timestamp);
      
      console.log('⏰ Current time (now):', now);
      console.log('⏰ Parsed timestamp (time):', time);
      console.log('⏰ Raw timestamp string:', timestamp);
      console.log('⏰ time.getTime():', time.getTime());
      console.log('⏰ now.getTime():', now.getTime());
      
      if (isNaN(time.getTime())) {
        console.log('⏰ Invalid time, returning 0');
        return 0;
      }
      
      const diffMs = now.getTime() - time.getTime();
      console.log('⏰ Time difference in milliseconds:', diffMs);
      
      if (diffMs < 0) {
        console.log('⏰ Negative difference (future timestamp), returning 0');
        return 0; // защита от future timestamps
      }
      
      const minutes = Math.floor(diffMs / (1000 * 60));
      console.log('⏰ Calculated minutes:', minutes);
      
      const result = Math.max(0, minutes);
      console.log('⏰ Final result:', result);
      
      return result;
      
    } catch (error) {
      console.warn('HandoffQueue: Invalid timestamp', timestamp, error);
      return 0;
    }
  };

  const formatWaitTime = (minutes) => {
    console.log('📝 formatWaitTime called with minutes:', minutes);
    
    if (minutes < 1) {
      console.log('📝 Returning: "только что"');
      return 'только что';
    }
    if (minutes === 1) {
      console.log('📝 Returning: "1 мин"');
      return '1 мин';
    }
    if (minutes < 60) {
      console.log('📝 Returning:', `${minutes} мин`);
      return `${minutes} мин`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    
    console.log('📝 Calculated hours:', hours);
    console.log('📝 Remaining minutes:', remainingMins);
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      console.log('📝 Calculated days:', days);
      console.log('📝 Returning:', `${days}д`);
      return `${days}д`;
    }
    
    const result = remainingMins > 0 ? `${hours}ч ${remainingMins}м` : `${hours}ч`;
    console.log('📝 Final formatted result:', result);
    return result;
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Недавно';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // в секундах

    if (diff < 60) return `${diff} сек назад`;
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return `${Math.floor(diff / 86400)} дн назад`;
  };

  const getReasonText = (reason) => {
    const reasonMap = {
      'keyword': 'Запросил оператора',
      'fallback': 'AI не смог ответить',
      'retries': 'Повторные неудачи',
      'manual': 'Ручной запрос'
    };
    return reasonMap[reason] || 'Неизвестная причина';
  };

  const getPriorityLevel = (minutes) => {
    if (minutes > 120) return 'urgent';   // Красный > 2 часов
    if (minutes > 30) return 'warning';   // Оранжевый > 30 минут
    return 'normal';                      // Фиолетовый < 30 минут
  };

  const getPriorityColor = (level) => {
    switch (level) {
      case 'urgent': return 'bg-red-500';
      case 'warning': return 'bg-orange-500';
      default: return 'bg-purple-500';
    }
  };

  const getPriorityTextColor = (level) => {
    switch (level) {
      case 'urgent': return 'text-red-600';
      case 'warning': return 'text-orange-600';
      default: return 'text-purple-600';
    }
  };

  const toggleExpanded = (dialogId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(dialogId)) {
      newExpanded.delete(dialogId);
    } else {
      newExpanded.add(dialogId);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'requested':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Ждёт оператора
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            У оператора
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  if (queueDialogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center bg-white rounded-xl border border-gray-200 shadow-sm">
        <FiHeadphones size={48} className="text-gray-400 mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Очередь пуста</h3>
        <p className="text-sm text-gray-500">Все диалоги обрабатываются автоматически</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Заголовок с градиентом */}
      <div className="mb-6">
        <h3 className="flex items-center gap-3 text-2xl font-bold mb-2">
          <FiHeadphones size={24} className="text-purple-600" />
          <span className="bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] bg-clip-text text-transparent">
            Очередь диалогов ({queueDialogs.length})
          </span>
        </h3>
        <p className="text-base text-gray-600">
          Диалоги, требующие помощи оператора
        </p>
      </div>

      {/* Список очереди */}
      <div className="space-y-4">
        <AnimatePresence>
          {queueDialogs.map((dialog, index) => {
            console.log(`🎯 Rendering dialog ${dialog.id}:`);
            console.log('  - handoff_requested_at:', dialog.handoff_requested_at);
            console.log('  - last_message_at:', dialog.last_message_at);
            console.log('  - Using timestamp:', dialog.handoff_requested_at || dialog.last_message_at);
            
            const waitMinutes = getWaitTimeInMinutes(dialog.handoff_requested_at || dialog.last_message_at);
            console.log(`🎯 Dialog ${dialog.id} calculated wait minutes:`, waitMinutes);
            
            const priorityLevel = getPriorityLevel(waitMinutes);
            const isExpanded = expandedItems.has(dialog.id);
            
            return (
              <motion.div
                key={dialog.id}
                className="bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                layout
              >
                {/* Горизонтальная раскладка элементов - адаптивная */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-4">
                  {/* Упрощенная секция приоритета */}
                  <div className="flex items-center gap-3">
                    {/* Цветной индикатор - компактнее */}
                    <div className={`w-3 h-8 rounded-full ${getPriorityColor(priorityLevel)}`} />
                    {/* Время - единственная цифра, более заметная */}
                    <div className="text-xl font-bold text-gray-900">
                      {(() => {
                        const formattedTime = formatWaitTime(waitMinutes);
                        console.log(`🎨 Displaying time for dialog ${dialog.id}:`, formattedTime);
                        return formattedTime;
                      })()}
                    </div>
                  </div>

                  {/* Основная информация */}
                  <div className="flex-1 min-w-0 order-1 sm:order-none">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(dialog.handoff_status)}
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold text-gray-900 truncate">
                        {dialog.name || dialog.telegram_username || `Диалог #${dialog.id}`}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{dialog.channel_type === 'telegram' ? '📱 Telegram' : '🌐 Сайт'}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(dialog.handoff_requested_at || dialog.last_message_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    {dialog.handoff_status === 'requested' ? (
                      <>
                        <button
                          className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
                          onClick={() => {
                            console.log('Take dialog button clicked for:', dialog.id);
                            onTakeDialog(dialog.id);
                          }}
                          disabled={isLoading}
                        >
                          <FiUserCheck size={16} />
                          Взять диалог
                        </button>
                        <button
                          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
                          onClick={() => onCancel && onCancel(dialog.id)}
                          disabled={isLoading}
                        >
                          <FiX size={16} />
                          Отменить
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-purple-600 font-medium">
                        <FiUser size={16} />
                        <span>В обработке</span>
                      </div>
                    )}
                    
                    <button
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 self-end sm:self-auto"
                      onClick={() => toggleExpanded(dialog.id)}
                    >
                      {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Развертываемые детали */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="px-4 pb-4 border-t border-gray-200"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="border-t border-gray-200 pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <FiAlertCircle size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Причина: {getReasonText(dialog.handoff_reason)}
                          </span>
                        </div>
                        
                        {dialog.last_message_text && (
                          <div className="bg-white rounded-xl border border-gray-200 p-3">
                            <div className="flex items-start gap-2">
                              <FiMessageSquare size={16} className="text-gray-400 mt-0.5" />
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Последнее сообщение:</div>
                                <div className="text-sm text-gray-700 leading-relaxed">
                                  {dialog.last_message_text.length > 150 
                                    ? `${dialog.last_message_text.slice(0, 150)}...` 
                                    : dialog.last_message_text
                                  }
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HandoffQueue;