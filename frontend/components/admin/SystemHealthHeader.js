import { useState, useCallback } from 'react';
import { FiRefreshCw, FiMonitor, FiActivity, FiAlertCircle, FiCheck, FiClock } from 'react-icons/fi';
import styles from '../../styles/pages/AdminSystem.module.css';

const SystemHealthHeader = ({ 
  status = 'unknown', 
  lastUpdated, 
  isLoading, 
  onRefresh,
  responseTime,
  autoRefreshEnabled = true
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing || isLoading) return;
    
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, isLoading, onRefresh]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'healthy':
        return {
          color: '#10b981',
          bgColor: '#ecfdf5',
          textColor: '#065f46',
          text: 'Система работает',
          icon: FiCheck,
          className: styles.statusHealthy
        };
      case 'degraded':
        return {
          color: '#f59e0b',
          bgColor: '#fffbeb',
          textColor: '#92400e',
          text: 'Частичные неполадки',
          icon: FiAlertCircle,
          className: styles.statusDegraded
        };
      case 'error':
        return {
          color: '#ef4444',
          bgColor: '#fef2f2',
          textColor: '#991b1b',
          text: 'Системные ошибки',
          icon: FiAlertCircle,
          className: styles.statusError
        };
      default:
        return {
          color: '#6b7280',
          bgColor: '#f9fafb',
          textColor: '#374151',
          text: 'Проверка статуса...',
          icon: FiMonitor,
          className: styles.statusUnknown
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return 'Никогда';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      
      if (diffSecs < 60) {
        return `${diffSecs} сек. назад`;
      } else if (diffMins < 60) {
        return `${diffMins} мин. назад`;
      } else {
        return date.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch {
      return 'Неизвестно';
    }
  };

  return (
    <div className={styles.systemHeader}>
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <div className={styles.titleSection}>
            <div className={styles.titleIcon}>
              <FiActivity size={32} className="text-[#6334E5]" />
            </div>
            <div>
              <h1 className={styles.heading1}>Мониторинг системы</h1>
              <p className={styles.bodyText}>
                Состояние сервисов и производительность ChatAI
              </p>
            </div>
          </div>
          
          <div className={styles.statusSection}>
            <div className={`${styles.statusIndicator} ${statusConfig.className}`}>
              <div 
                className={`${styles.statusDot} ${status === 'healthy' || status === 'degraded' ? styles.animate : ''}`}
                style={{ backgroundColor: statusConfig.color }}
              />
              <StatusIcon size={16} style={{ color: statusConfig.color }} />
              <span 
                className={styles.statusText}
                style={{ color: statusConfig.textColor }}
              >
                {statusConfig.text}
              </span>
            </div>
            
            {responseTime && (
              <div className={styles.responseTime}>
                <FiClock size={14} />
                <span>{responseTime}ms</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.lastUpdated}>
            <div className={styles.bodyTextMuted}>
              Обновлено: {formatLastUpdated(lastUpdated)}
            </div>
            {autoRefreshEnabled && (
              <div className={styles.autoRefreshIndicator}>
                <div className={`${styles.statusDot} ${styles.animate}`} style={{ backgroundColor: '#10b981' }} />
                <span className={styles.bodyTextMuted}>Авто-обновление</span>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className={`${styles.actionButton} ${styles.primary}`}
            aria-label="Обновить данные системы"
          >
            <FiRefreshCw 
              size={16} 
              className={refreshing || isLoading ? 'animate-spin' : ''} 
            />
            {refreshing ? 'Обновление...' : 'Обновить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthHeader;