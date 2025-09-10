import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiHeadphones, FiMessageSquare, FiUserCheck, FiX, FiChevronDown, FiGlobe, FiZap, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { getUserDisplayName } from '../../utils/dialogHelpers';

// ==================== UTILITIES ====================

  const getWaitTimeInMinutes = (timestamp) => {    
  if (!timestamp) return 0;
    
    try {
      const now = new Date();
      const time = new Date(timestamp);
      
    if (isNaN(time.getTime())) return 0;
      
      const diffMs = now.getTime() - time.getTime();
    if (diffMs < 0) return 0; // защита от future timestamps
      
      const minutes = Math.floor(diffMs / (1000 * 60));
      return Math.max(0, minutes);
      
    } catch (error) {
      return 0;
    }
  };

  const formatWaitTime = (minutes) => {    
  if (minutes < 1) return 'только что';
  if (minutes === 1) return '1 мин';
  if (minutes < 60) return `${minutes} мин`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}д`;
    }
    
    return remainingMins > 0 ? `${hours}ч ${remainingMins}м` : `${hours}ч`;
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
  if (minutes >= 60) return 'urgent';    // Красный ≥ 1 часа
  if (minutes >= 10) return 'warning';   // Оранжевый ≥ 10 минут
  return 'normal';                       // Серый < 10 минут
};

const getPriorityColors = (level) => {
  switch (level) {
    case 'urgent': return {
      accent: 'text-red-600'
    };
    case 'warning': return {
      accent: 'text-orange-600'
    };
    default: return {
      accent: 'text-gray-600'
    };
  }
};

const getPriorityInfo = (level) => {
    switch (level) {
    case 'urgent': return {
      label: 'Критический',
      time: '≥ 1 ч',
      icon: FiZap,
      color: 'text-red-500'
    };
    case 'warning': return {
      label: 'Важный',
      time: '≥ 10 мин',
      icon: FiClock,
      color: 'text-amber-500'
    };
    default: return {
      label: 'Обычный',
      time: '< 10 мин',
      icon: FiAlertTriangle,
      color: 'text-gray-500'
    };
  }
};

// ==================== COMPONENTS ====================

const Header = ({ count }) => (
  <div className="mb-4">
    {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
      <div className="flex items-center gap-3">
        <FiHeadphones className="text-gray-600" size={18} />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Очередь диалогов</h2>
          <p className="text-xs text-gray-600">Требуют внимания оператора</p>
        </div>
      </div>
      <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-[6px] border self-start sm:self-auto">
        {count} диалогов
      </span>
    </div>

    {/* Priority legend - Responsive */}
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-600">
      <span className="font-medium">Приоритеты:</span>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="flex items-center gap-1">
          <FiZap className="w-3 h-3 text-red-500 flex-shrink-0" />
          <span className="hidden sm:inline">Критический (≥ 1 ч)</span>
          <span className="sm:hidden">Крит.</span>
        </span>
        <span className="flex items-center gap-1">
          <FiClock className="w-3 h-3 text-orange-500 flex-shrink-0" />
          <span className="hidden sm:inline">Важный (≥ 10 мин)</span>
          <span className="sm:hidden">Важн.</span>
        </span>
        <span className="flex items-center gap-1">
          <FiAlertTriangle className="w-3 h-3 text-gray-500 flex-shrink-0" />
          <span className="hidden sm:inline">Обычный (&lt; 10 мин)</span>
          <span className="sm:hidden">Обыч.</span>
        </span>
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="bg-white rounded-[13px] border border-gray-200 p-6 text-center">
    <div className="w-10 h-10 bg-gray-100 rounded-[13px] flex items-center justify-center mx-auto mb-4">
      <FiHeadphones size={20} className="text-gray-600" />
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-2">
      Очередь пуста
    </h3>
    <p className="text-sm text-gray-600">
      Все запросы обрабатываются автоматически
    </p>
  </div>
);

const DialogCard = ({ dialog, isExpanded, onToggleExpanded, onTakeDialog, onCancel, isLoading }) => {
  const waitMinutes = getWaitTimeInMinutes(dialog.handoff_requested_at || dialog.last_message_at);
  const priorityLevel = getPriorityLevel(waitMinutes);
  const priorityColors = getPriorityColors(priorityLevel);
  const priorityInfo = getPriorityInfo(priorityLevel);
  const PriorityIcon = priorityInfo.icon;

  return (
    <div className={`rounded-[13px] border p-3 bg-white border-gray-200 hover:border-gray-300 transition-colors duration-150`}>
      {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Top row on mobile: Priority + Name + Channel */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Priority indicator */}
          <div className="flex-shrink-0">
            <PriorityIcon className={`w-4 h-4 ${priorityInfo.color}`} />
          </div>

          {/* Dialog name and channel */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {getUserDisplayName(dialog)}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              {dialog.channel_type === 'telegram' ? (
                <span>Telegram</span>
              ) : (
                <span>Сайт</span>
              )}
              <span className={`text-xs font-medium ${priorityColors.accent}`}>
                {priorityInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom row on mobile: Wait time + Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          {/* Wait time */}
          <div className="flex-shrink-0 text-right sm:text-right">
            <div className="text-sm font-bold text-gray-900">
              {formatWaitTime(waitMinutes)}
            </div>
            <div className="text-xs text-gray-500">ожидания</div>
          </div>

          {/* Actions - Responsive button sizes */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="px-3 py-1.5 sm:px-2.5 sm:py-1 bg-[#7C3AED] text-white text-xs font-medium rounded-[6px] border border-[#7C3AED] min-w-[60px] hover:bg-[#6D28D9] transition-colors duration-150"
              onClick={() => onTakeDialog(dialog.id)}
              disabled={isLoading}
            >
              Взять
            </button>
            <button
              className="px-3 py-1.5 sm:px-2.5 sm:py-1 border border-gray-300 text-gray-700 text-xs font-medium rounded-[6px] min-w-[60px] hover:bg-gray-50 transition-colors duration-150"
              onClick={() => onCancel && onCancel(dialog.id)}
              disabled={isLoading}
            >
              Отмена
            </button>

            <button
              className="p-1.5 sm:p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[6px] transition-colors duration-150"
              onClick={() => onToggleExpanded(dialog.id)}
            >
              <FiChevronDown size={12} className={isExpanded ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="space-y-2">
            <div className="text-xs">
              <span className="font-medium text-gray-900">Причина: </span>
              <span className="text-gray-600">{getReasonText(dialog.handoff_reason)}</span>
            </div>

            {dialog.last_message_text && (
              <div className="text-xs">
                <span className="font-medium text-gray-900">Сообщение: </span>
                <span className="text-gray-600">
                  {dialog.last_message_text.length > 80
                    ? `${dialog.last_message_text.slice(0, 80)}...`
                    : dialog.last_message_text
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const HandoffQueue = ({ dialogs = [], onTakeDialog, onCancel, isLoading = false }) => {
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Filter and sort dialogs
  const queueDialogs = useMemo(() => {
    const handoffDialogs = dialogs.filter(dialog =>
      dialog.handoff_status === 'requested'  // Только диалоги, ожидающие взятия оператором
    );

    // Sort by request time (oldest first)
    return handoffDialogs.sort((a, b) =>
      new Date(a.handoff_requested_at || a.last_message_at) -
      new Date(b.handoff_requested_at || b.last_message_at)
    );
  }, [dialogs]);

  // Auto-update wait times every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update wait times
      setExpandedItems(prev => new Set(prev));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const toggleExpanded = (dialogId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(dialogId)) {
      newExpanded.delete(dialogId);
    } else {
      newExpanded.add(dialogId);
    }
    setExpandedItems(newExpanded);
  };

  if (queueDialogs.length === 0) {
    return <EmptyState />;
  }
            
              return (
    <div className="bg-white rounded-[13px] border border-gray-200 p-3 sm:p-4 w-full">
      <Header count={queueDialogs.length} />

      <div className="space-y-3">
        {queueDialogs.map((dialog) => (
          <DialogCard
            key={dialog.id}
            dialog={dialog}
            isExpanded={expandedItems.has(dialog.id)}
            onToggleExpanded={toggleExpanded}
            onTakeDialog={onTakeDialog}
            onCancel={onCancel}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
};

export default HandoffQueue;