import { FiCpu, FiPlay, FiPause, FiRotateCcw, FiMoreHorizontal, FiMessageSquare, FiClock, FiAlertTriangle } from 'react-icons/fi';

const BotStatusCard = ({ 
  bot, 
  onBotAction, 
  onBotDetails 
}) => {

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}ч назад`;
    if (minutes > 0) return `${minutes}м назад`;
    return 'только что';
  };

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      online: { text: 'Онлайн', color: '#10b981' },
      offline: { text: 'Оффлайн', color: '#6b7280' },
      error: { text: 'Ошибка', color: '#ef4444' },
      starting: { text: 'Запуск', color: '#f59e0b' }
    };

    const config = statusConfig[status] || statusConfig.offline;
    
    return (
      <div 
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: config.color }}
      >
        <div 
          className="w-2 h-2 rounded-full bg-white opacity-80"
        />
        {config.text}
      </div>
    );
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onBotDetails(bot)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#6334E5]/20 to-[#6334E5]/30 rounded-lg flex items-center justify-center">
            <FiCpu className="text-[#6334E5]" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">
              {bot.name || `Bot ${bot.id}`}
            </h3>
            <p className="text-sm text-gray-500">ID: {bot.id}</p>
          </div>
        </div>
        <StatusBadge status={bot.status} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <FiMessageSquare className="text-blue-500" size={16} />
          </div>
          <div className="font-semibold text-gray-900">{bot.messages || 0}</div>
          <div className="text-xs text-gray-500">Сообщений</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <FiClock className="text-green-500" size={16} />
          </div>
          <div className="font-semibold text-gray-900">{bot.uptime}</div>
          <div className="text-xs text-gray-500">Время работы</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <FiAlertTriangle className={bot.errors > 0 ? "text-red-500" : "text-gray-400"} size={16} />
          </div>
          <div className={`font-semibold ${bot.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {bot.errors || 0}
          </div>
          <div className="text-xs text-gray-500">Ошибки</div>
        </div>
      </div>

      {/* User and Activity Info */}
      <div className="text-sm text-gray-600 mb-4">
        <div className="flex justify-between mb-1">
          <span>Пользователь:</span>
          <span className="font-medium">ID: {bot.user_id}</span>
        </div>
        <div className="flex justify-between">
          <span>Активность:</span>
          <span className="font-medium">{formatTimeAgo(bot.lastActivity)}</span>
        </div>
      </div>

      {/* Actions */}
      <div 
        className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={() => onBotAction(bot.id, bot.status === 'online' ? 'stop' : 'start')}
          title={bot.status === 'online' ? 'Остановить' : 'Запустить'}
        >
          {bot.status === 'online' ? <FiPause size={14} /> : <FiPlay size={14} />}
          {bot.status === 'online' ? 'Стоп' : 'Старт'}
        </button>
        
        <button 
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          onClick={() => onBotAction(bot.id, 'restart')}
          title="Перезагрузить"
        >
          <FiRotateCcw size={14} />
          Рестарт
        </button>
        
        <button 
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#5028c2] bg-[#6334E5]/20 rounded-lg hover:bg-[#6334E5]/30 transition-colors"
          onClick={() => onBotDetails(bot)}
          title="Подробности"
        >
          <FiMoreHorizontal size={14} />
          Детали
        </button>
      </div>
    </div>
  );
};

export default BotStatusCard;