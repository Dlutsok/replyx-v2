import { FiCpu, FiPlay, FiPause, FiRotateCcw, FiSettings, FiFileText, FiX, FiWifi, FiClock, FiMessageSquare, FiUsers } from 'react-icons/fi';
import styles from '../../styles/pages/AdminBotsMonitoring.module.css';

const BotDetailsModal = ({ 
  bot, 
  isOpen, 
  onClose, 
  onBotAction 
}) => {
  if (!isOpen || !bot) return null;

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}ч назад`;
    if (minutes > 0) return `${minutes}м назад`;
    return 'только что';
  };

  // Реальные ошибки (если есть)
  const getErrorsFromBot = (bot) => {
    // Пока нет системы логирования ошибок, возвращаем пустой массив
    // В будущем здесь будут реальные ошибки из bot manager или базы данных
    if (bot.error_count > 0) {
      return [
        {
          time: 'недавно',
          message: `Перезапусков: ${bot.error_count}`,
          severity: 'warning'
        }
      ];
    }
    return [];
  };

  // График активности (простая визуализация)
  const generateActivityChart = () => {
    const hours = 24;
    const data = [];
    for (let i = 0; i < hours; i++) {
      data.push(Math.floor(Math.random() * 100) + 20);
    }
    return data;
  };

  const ActivityChart = () => {
    const data = generateActivityChart();
    const max = Math.max(...data);
    
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">График активности (последние 24ч)</h4>
        <div className="flex items-end justify-between h-24 gap-1">
          {data.map((value, index) => {
            const height = (value / max) * 100;
            return (
              <div
                key={index}
                className="bg-[#6334E5]/30 rounded-t-sm min-w-[8px] transition-all duration-200 hover:bg-[#6334E5]/40"
                style={{ height: `${height}%` }}
                title={`${index}:00 - ${value} сообщений`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>23:59</span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <FiCpu size={24} />
            {bot.name || `Bot ${bot.id}`}
            <span className="ml-2 text-sm font-normal text-gray-500">
              (ID: {bot.id})
            </span>
          </h2>
          <button 
            className={styles.closeBtn}
            onClick={onClose}
          >
            <FiX size={18} />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Общая информация */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{bot.messages || 0}</div>
              <div className="text-sm text-blue-700 flex items-center justify-center gap-1">
                <FiMessageSquare size={14} />
                Сообщений
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{bot.activeUsers || 0}</div>
              <div className="text-sm text-green-700 flex items-center justify-center gap-1">
                <FiUsers size={14} />
                Пользователей
              </div>
            </div>
            
            <div className="bg-[#6334E5]/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#6334E5] mb-1">{bot.uptime || 'N/A'}</div>
              <div className="text-sm text-[#5028c2] flex items-center justify-center gap-1">
                <FiClock size={14} />
                Время работы
              </div>
            </div>
          </div>

          <div className={styles.botInfo}>
            <div className={styles.infoSection}>
              <h3>Статистика за 24ч:</h3>
              <ul>
                <li>• Сообщений: {bot.messages || 0}</li>
                <li>• Пользователей: {bot.activeUsers || 0}</li>
                <li>• Среднее время ответа: 1.2с</li>
                <li>• Успешных ответов: {Math.floor((bot.messages || 0) * 0.95)}</li>
                <li>• Последняя активность: {bot.last_activity ? formatTimeAgo(new Date(bot.last_activity)) : 'неизвестно'}</li>
              </ul>
            </div>
            
            <div className={styles.infoSection}>
              <h3>Управление:</h3>
              <div className={styles.botControls}>
                <button 
                  className={styles.controlBtn}
                  onClick={() => {
                    onBotAction(bot.id, 'start');
                    onClose();
                  }}
                  disabled={bot.status === 'online'}
                >
                  <FiPlay size={16} /> Старт
                </button>
                <button 
                  className={styles.controlBtn}
                  onClick={() => {
                    onBotAction(bot.id, 'stop');
                    onClose();
                  }}
                  disabled={bot.status === 'offline'}
                >
                  <FiPause size={16} /> Стоп
                </button>
                <button 
                  className={styles.controlBtn}
                  onClick={() => {
                    onBotAction(bot.id, 'restart');
                    onClose();
                  }}
                >
                  <FiRotateCcw size={16} /> Перезагрузка
                </button>
              </div>
              
              <div className="mt-4 space-y-2">
                <button className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2">
                  <FiFileText size={14} />
                  Показать логи
                </button>
                <button className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-2">
                  <FiSettings size={14} />
                  Настройки бота
                </button>
              </div>
            </div>
          </div>
          
          {/* График активности временно отключен */}
          {/* <div className="mb-6">
            <ActivityChart />
          </div> */}

          {/* Технические детали */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Технические детали</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Пользователь ID:</span>
                <span className="ml-2 font-mono">{bot.user_id}</span>
              </div>
              <div>
                <span className="text-gray-600">Ассистент ID:</span>
                <span className="ml-2 font-mono">{bot.assistant_id}</span>
              </div>
              <div>
                <span className="text-gray-600">Платформа:</span>
                <span className="ml-2 capitalize">{bot.platform || 'telegram'}</span>
              </div>
              <div>
                <span className="text-gray-600">Статус:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  bot.status === 'online' ? 'bg-green-100 text-green-800' :
                  bot.status === 'error' ? 'bg-red-100 text-red-800' :
                  bot.status === 'starting' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {bot.status || 'unknown'}
                </span>
              </div>
              {bot.pid && (
                <div>
                  <span className="text-gray-600">PID процесса:</span>
                  <span className="ml-2 font-mono text-sm">{bot.pid}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Последние ошибки */}
          {(() => {
            const errors = getErrorsFromBot(bot);
            return errors.length > 0 && (
              <div className={styles.errorsSection}>
                <h3>Информация об ошибках:</h3>
                <div className={styles.errorsList}>
                  {errors.map((error, index) => (
                    <div key={index} className={styles.errorItem}>
                      <span className={styles.errorTime}>{error.time}</span>
                      <span className={styles.errorText}>{error.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
              

          {/* Connection Status */}
          <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <FiWifi size={16} />
              <span className="font-medium">Подключение активно</span>
            </div>
            <div className="text-sm text-green-600 mt-1">
              Последнее обновление: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotDetailsModal;