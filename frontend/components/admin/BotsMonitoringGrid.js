import { FiCpu, FiPlay, FiPause, FiRotateCcw, FiMoreHorizontal } from 'react-icons/fi';
import styles from '../../styles/pages/AdminBotsMonitoring.module.css';

const BotsMonitoringGrid = ({ 
  bots, 
  onBotAction, 
  onBotDetails,
  loading = false 
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
      online: { text: 'Онлайн', color: 'green' },
      offline: { text: 'Оффлайн', color: 'gray' },
      error: { text: 'Ошибка', color: 'red' },
      starting: { text: 'Запуск', color: 'yellow' }
    };

    const config = statusConfig[status] || statusConfig.offline;
    
    return (
      <span className={`${styles.statusBadge} ${styles[config.color]}`}>
        <span className={styles.statusDot}></span>
        {config.text}
      </span>
    );
  };

  const BotActionsMenu = ({ bot }) => (
    <div className={styles.actionsMenu}>
      <button 
        className={styles.actionBtn}
        onClick={(e) => {
          e.stopPropagation();
          onBotAction(bot.id, bot.status === 'online' ? 'stop' : 'start');
        }}
        title={bot.status === 'online' ? 'Остановить' : 'Запустить'}
      >
        {bot.status === 'online' ? <FiPause size={16} /> : <FiPlay size={16} />}
      </button>
      <button 
        className={styles.actionBtn}
        onClick={(e) => {
          e.stopPropagation();
          onBotAction(bot.id, 'restart');
        }}
        title="Перезагрузить"
      >
        <FiRotateCcw size={16} />
      </button>
      <button 
        className={styles.actionBtn}
        onClick={(e) => {
          e.stopPropagation();
          onBotDetails(bot);
        }}
        title="Подробности"
      >
        <FiMoreHorizontal size={16} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.botsTable}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка данных ботов...</p>
        </div>
      </div>
    );
  }

  if (!bots || bots.length === 0) {
    return (
      <div className={styles.botsTable}>
        <div className={styles.emptyState}>
          <FiCpu size={48} />
          <h3>AI-ассистенты не найдены</h3>
          <p>Измените фильтры или создайте нового AI-ассистента</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.botsTable}>
      <div className={styles.tableHeader}>
        <div className={styles.headerCell} style={{ width: '80px' }}>Статус</div>
        <div className={styles.headerCell} style={{ width: '60px' }}>ID</div>
        <div className={styles.headerCell} style={{ width: '200px' }}>Имя бота</div>
        <div className={styles.headerCell} style={{ width: '180px' }}>Пользователь</div>
        <div className={styles.headerCell} style={{ width: '100px' }}>Сообщений</div>
        <div className={styles.headerCell} style={{ width: '120px' }}>Время работы</div>
        <div className={styles.headerCell} style={{ width: '80px' }}>Ошибки</div>
        <div className={styles.headerCell} style={{ width: '150px' }}>Последняя активность</div>
        <div className={styles.headerCell} style={{ width: '120px' }}>Действия</div>
      </div>

      <div className={styles.tableBody}>
        {bots.map(bot => (
          <div 
            key={bot.id} 
            className={styles.tableRow}
            onClick={() => onBotDetails(bot)}
          >
            <div className={styles.cell} style={{ width: '80px' }}>
              <StatusBadge status={bot.status} />
            </div>
            <div className={styles.cell} style={{ width: '60px' }}>
              #{bot.id}
            </div>
            <div className={styles.cell} style={{ width: '200px' }}>
              <strong>{bot.name || `Bot ${bot.id}`}</strong>
            </div>
            <div className={styles.cell} style={{ width: '180px' }}>
              {bot.user_email || `ID: ${bot.user_id}`}
            </div>
            <div className={styles.cell} style={{ width: '100px' }}>
              {bot.messages || 0}
            </div>
            <div className={styles.cell} style={{ width: '120px' }}>
              {bot.uptime}
            </div>
            <div className={styles.cell} style={{ width: '80px' }}>
              <span className={bot.errors > 0 ? styles.errorCount : styles.noErrors}>
                {bot.errors || 0}
              </span>
            </div>
            <div className={styles.cell} style={{ width: '150px' }}>
              {bot.last_activity ? formatTimeAgo(new Date(bot.last_activity)) : 'Неизвестно'}
            </div>
            <div className={styles.cell} style={{ width: '120px' }}>
              <BotActionsMenu bot={bot} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BotsMonitoringGrid;