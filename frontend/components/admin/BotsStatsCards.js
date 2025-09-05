import { FiActivity, FiMessageSquare, FiUsers, FiAlertTriangle, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import styles from '../../styles/pages/AdminBotsMonitoring.module.css';

const BotsStatsCards = ({ statsData }) => {
  const StatCard = ({ title, value, total, change, changeType, icon: Icon, color = 'blue' }) => (
    <div className={`${styles.statCard} ${styles[color]}`}>
      <div className={styles.statHeader}>
        <div className={styles.statIcon}>
          <Icon size={24} />
        </div>
        {change && (
          <div className={`${styles.statChange} ${styles[changeType]}`}>
            {changeType === 'positive' ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
      <div className={styles.statBody}>
        <h3 className={styles.statTitle}>{title}</h3>
        <div className={styles.statValue}>
          {value} {total && <span className={styles.statTotal}>из {total}</span>}
        </div>
      </div>
    </div>
  );

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  if (!statsData) {
    return (
      <div className={styles.statsGrid}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`${styles.statCard} ${styles.loading}`}>
            <div className={styles.statHeader}>
              <div className={styles.statIcon}>
                <div className={styles.iconSkeleton}></div>
              </div>
            </div>
            <div className={styles.statBody}>
              <div className={styles.titleSkeleton}></div>
              <div className={styles.valueSkeleton}></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Активных ботов',
      value: statsData.activeBots,
      total: statsData.totalBots,
      change: statsData.changes?.activeBots,
      changeType: statsData.changes?.activeBots > 0 ? 'positive' : 'negative',
      icon: FiActivity,
      color: 'green'
    },
    {
      title: 'Сообщений/час',
      value: formatNumber(statsData.messagesPerHour),
      change: statsData.changes?.messagesPerHour,
      changeType: statsData.changes?.messagesPerHour > 0 ? 'positive' : 'negative',
      icon: FiMessageSquare,
      color: 'blue'
    },
    {
      title: 'Активных юзеров',
      value: formatNumber(statsData.activeUsers),
      change: statsData.changes?.activeUsers,
      changeType: statsData.changes?.activeUsers > 0 ? 'positive' : 'negative',
      icon: FiUsers,
      color: 'purple'
    },
    {
      title: 'С ошибками',
      value: statsData.errorBots,
      change: statsData.changes?.errorBots,
      changeType: statsData.changes?.errorBots > 0 ? 'negative' : 'positive',
      icon: FiAlertTriangle,
      color: 'red'
    }
  ];

  return (
    <div className={styles.statsGrid}>
      {statsCards.map((card, index) => (
        <StatCard
          key={index}
          title={card.title}
          value={card.value}
          total={card.total}
          change={card.change}
          changeType={card.changeType}
          icon={card.icon}
          color={card.color}
        />
      ))}
    </div>
  );
};

export default BotsStatsCards;