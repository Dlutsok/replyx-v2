import React from 'react';
import { 
  FiServer, FiDatabase, FiHardDrive, FiFolder,
  FiCheck, FiAlertCircle, FiAlertTriangle, FiClock,
  FiTrendingUp, FiTrendingDown
} from 'react-icons/fi';
import styles from '../../styles/pages/AdminSystem.module.css';

// Компонент отдельной карточки системы
const HealthCard = ({ 
  title, 
  subtitle, 
  icon: IconComponent, 
  status, 
  metrics = [],
  isLoading = false 
}) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'ok':
        return {
          color: '#10b981',
          text: 'OK',
          className: styles.statusHealthy,
          icon: FiCheck
        };
      case 'degraded':
        return {
          color: '#f59e0b',
          text: 'Предупреждение',
          className: styles.statusDegraded,
          icon: FiAlertTriangle
        };
      case 'error':
        return {
          color: '#ef4444',
          text: 'Ошибка',
          className: styles.statusError,
          icon: FiAlertCircle
        };
      default:
        return {
          color: '#6b7280',
          text: 'Неизвестно',
          className: styles.statusUnknown,
          icon: FiClock
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  if (isLoading) {
    return (
      <div className={styles.loadingCard}>
        <div className={styles.healthCardHeader}>
          <div className={styles.healthCardInfo}>
            <div className={`${styles.loadingSkeleton} ${styles.healthCardIcon}`} />
            <div>
              <div className={`${styles.loadingSkeleton}`} style={{ width: '80px', height: '16px', marginBottom: '4px' }} />
              <div className={`${styles.loadingSkeleton}`} style={{ width: '120px', height: '14px' }} />
            </div>
          </div>
          <div className={`${styles.loadingSkeleton}`} style={{ width: '60px', height: '20px' }} />
        </div>
        <div className={styles.healthCardMetrics}>
          <div className={`${styles.loadingSkeleton}`} style={{ width: '100%', height: '14px' }} />
          <div className={`${styles.loadingSkeleton}`} style={{ width: '85%', height: '14px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.healthCard} ${statusConfig.className}`}>
      <div className={styles.healthCardHeader}>
        <div className={styles.healthCardInfo}>
          <div className={styles.healthCardIcon}>
            <IconComponent size={24} />
          </div>
          <div>
            <h3 className={styles.healthCardTitle}>{title}</h3>
            <p className={styles.healthCardSubtitle}>{subtitle}</p>
          </div>
        </div>
        <div className={styles.healthCardStatus}>
          <div 
            className={styles.statusDot}
            style={{ backgroundColor: statusConfig.color }}
          />
          <StatusIcon size={12} style={{ color: statusConfig.color }} />
          <span 
            className={styles.healthCardStatusText}
            style={{ color: statusConfig.color }}
          >
            {statusConfig.text}
          </span>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className={styles.healthCardMetrics}>
          {metrics.map((metric, index) => (
            <div key={index} className={styles.healthCardMetric}>
              <span className={styles.healthCardMetricLabel}>{metric.label}</span>
              <div className={styles.metricValueContainer}>
                <span className={styles.healthCardMetricValue}>{metric.value}</span>
                {metric.trend && (
                  <div className={`${styles.trendIndicator} ${metric.trend.direction}`}>
                    {metric.trend.direction === 'up' ? (
                      <FiTrendingUp size={12} className="text-green-500" />
                    ) : (
                      <FiTrendingDown size={12} className="text-red-500" />
                    )}
                    <span>{metric.trend.value}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Компонент ошибки загрузки
const ErrorState = ({ error, onRetry }) => (
  <div className={styles.errorCard}>
    <div className={styles.errorMessage}>
      <div className={styles.errorIcon}>
        <FiAlertCircle size={20} />
      </div>
      <div className={styles.errorContent}>
        <h3 className={styles.errorTitle}>
          Ошибка загрузки данных мониторинга
        </h3>
        <p className={styles.errorDescription}>
          {error || 'Не удалось получить статус системы. Проверьте соединение с сервером.'}
        </p>
        <div className={styles.errorActions}>
          <button 
            onClick={onRetry} 
            className={`${styles.actionButton} ${styles.primary}`}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Основной компонент SystemHealthOverview
const SystemHealthOverview = ({ data, isLoading, error }) => {
  
  // Функция для извлечения метрик из данных API
  const getSystemMetrics = (checkData) => {
    if (!checkData) return [];
    
    const metrics = [];
    
    // Для API - время ответа и статус
    if (checkData.api) {
      return [
        { label: 'Время ответа', value: `${data?.response_time_ms || 0}ms` },
        { label: 'Статус', value: checkData.api.details || 'Активен' }
      ];
    }
    
    // Для Database - подключения
    if (checkData.database) {
      return [
        { label: 'Подключение', value: checkData.database.status === 'ok' ? 'Активно' : 'Ошибка' },
        { label: 'Детали', value: checkData.database.details || 'PostgreSQL' }
      ];
    }
    
    // Для Redis - статистика кэша
    if (checkData.redis) {
      return [
        { label: 'Кэш', value: checkData.redis.status === 'ok' ? 'Работает' : 'Недоступен' },
        { label: 'Детали', value: checkData.redis.details || 'Redis cache' }
      ];
    }
    
    // Для файловой системы - доступность
    if (checkData.file_system) {
      return [
        { label: 'Доступность', value: checkData.file_system.status === 'ok' ? 'Доступна' : 'Ошибка' },
        { label: 'Детали', value: checkData.file_system.details || 'Файловая система' }
      ];
    }
    
    return metrics;
  };

  // Обработчик повторной попытки загрузки
  const handleRetry = () => {
    window.location.reload();
  };

  // Если есть ошибка, показываем состояние ошибки
  if (error && !isLoading) {
    return <ErrorState error={error} onRetry={handleRetry} />;
  }

  const systems = [
    {
      id: 'api',
      title: 'API',
      subtitle: 'FastAPI сервер',
      icon: FiServer,
      status: data?.checks?.api?.status || 'unknown',
      metrics: getSystemMetrics(data?.checks ? { api: data.checks.api } : null)
    },
    {
      id: 'database', 
      title: 'База данных',
      subtitle: 'PostgreSQL',
      icon: FiDatabase,
      status: data?.checks?.database?.status || 'unknown',
      metrics: getSystemMetrics(data?.checks ? { database: data.checks.database } : null)
    },
    {
      id: 'redis',
      title: 'Кэш',
      subtitle: 'Redis',
      icon: FiHardDrive,
      status: data?.checks?.redis?.status || 'unknown',
      metrics: getSystemMetrics(data?.checks ? { redis: data.checks.redis } : null)
    },
    {
      id: 'filesystem',
      title: 'Файловая система',
      subtitle: 'Хранилище данных',
      icon: FiFolder,
      status: data?.checks?.file_system?.status || 'unknown',
      metrics: getSystemMetrics(data?.checks ? { file_system: data.checks.file_system } : null)
    }
  ];

  return (
    <div className={styles.healthOverview}>
      {systems.map((system) => (
        <HealthCard
          key={system.id}
          title={system.title}
          subtitle={system.subtitle}
          icon={system.icon}
          status={system.status}
          metrics={system.metrics}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};

export default SystemHealthOverview;