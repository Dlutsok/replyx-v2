import React from 'react';
import { 
  FiCpu, FiHardDrive, FiWifi, FiActivity,
  FiTrendingUp, FiTrendingDown, FiMinus,
  FiAlertCircle, FiRefreshCw
} from 'react-icons/fi';
import { usePerformanceMetrics, formatBytes, formatPercentage, formatLoadAverage } from '../../hooks/usePerformanceMetrics';
import styles from '../../styles/pages/AdminSystem.module.css';

// Компонент отдельной метрики
const MetricCard = ({ 
  title, 
  value, 
  percentage, 
  icon: IconComponent, 
  color = '#6366f1',
  details = [],
  isLoading = false,
  trend = null
}) => {
  const getColorClass = (percentage) => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 80) return 'warning';
    return 'normal';
  };

  const colorClass = getColorClass(percentage);
  
  if (isLoading) {
    return (
      <div className={styles.loadingCard}>
        <div className={styles.metricHeader}>
          <div className={`${styles.loadingSkeleton}`} style={{ width: '100px', height: '20px' }} />
          <div className={`${styles.loadingSkeleton}`} style={{ width: '60px', height: '32px' }} />
        </div>
        <div className={styles.progressBar}>
          <div className={`${styles.loadingSkeleton}`} style={{ width: '100%', height: '8px' }} />
        </div>
        <div style={{ display: 'grid', gap: '8px', marginTop: '12px' }}>
          <div className={`${styles.loadingSkeleton}`} style={{ width: '100%', height: '14px' }} />
          <div className={`${styles.loadingSkeleton}`} style={{ width: '80%', height: '14px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.healthCard}>
      <div className={styles.metricHeader}>
        <div className={styles.metricTitleSection}>
          <div className={styles.metricIcon} style={{ color }}>
            <IconComponent size={20} />
          </div>
          <h4 className={styles.heading3}>{title}</h4>
          {trend && (
            <div className={`${styles.trendIndicator} ${trend.direction}`}>
              {trend.direction === 'up' ? (
                <FiTrendingUp size={14} />
              ) : trend.direction === 'down' ? (
                <FiTrendingDown size={14} />
              ) : (
                <FiMinus size={14} />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div className={`${styles.metricValue} ${colorClass === 'critical' ? styles.critical : colorClass === 'warning' ? styles.warning : ''}`}>
          {value}
        </div>
      </div>

      <div className={styles.progressBar}>
        <div 
          className={`${styles.progressFill} ${styles[colorClass]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {details.length > 0 && (
        <div className={styles.metricDetails}>
          {details.map((detail, index) => (
            <div key={index} className={styles.metricDetail}>
              <span className={styles.bodyTextMuted}>{detail.label}</span>
              <span className={styles.bodyText}>{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Основной компонент PerformanceMetrics
const PerformanceMetrics = ({ autoRefresh = true }) => {
  const { metrics, isLoading, error, lastUpdated, refetch } = usePerformanceMetrics({ autoRefresh });
  // Обработка данных для отображения
  const getPerformanceData = () => {
    if (!metrics) {
      return {
        cpu: { value: '0%', percentage: 0, details: [] },
        memory: { value: '0%', percentage: 0, details: [] },
        network: { value: 'N/A', percentage: 0, details: [] },
        disk: { value: '0%', percentage: 0, details: [] }
      };
    }

    return {
      cpu: {
        value: formatPercentage(metrics.cpu.usage_percent),
        percentage: metrics.cpu.usage_percent,
        details: [
          { label: 'Ядер', value: `${metrics.cpu.cores}` },
          { label: 'Загрузка за 1 мин', value: formatLoadAverage(metrics.cpu.load_avg_1m) },
          { label: 'Загрузка за 5 мин', value: formatLoadAverage(metrics.cpu.load_avg_5m) }
        ],
        trend: metrics.cpu.usage_percent > 80 ? { direction: 'up', value: 'Высокая' } : 
               metrics.cpu.usage_percent < 20 ? { direction: 'down', value: 'Низкая' } : null
      },
      memory: {
        value: formatPercentage(metrics.memory.usage_percent),
        percentage: metrics.memory.usage_percent,
        details: [
          { label: 'Использовано', value: formatBytes(metrics.memory.used) },
          { label: 'Доступно', value: formatBytes(metrics.memory.available) },
          { label: 'Всего', value: formatBytes(metrics.memory.total) }
        ],
        trend: metrics.memory.usage_percent > 85 ? { direction: 'up', value: 'Критично' } : null
      },
      disk: {
        value: formatPercentage(metrics.disk.usage_percent),
        percentage: metrics.disk.usage_percent,
        details: [
          { label: 'Использовано', value: formatBytes(metrics.disk.used) },
          { label: 'Свободно', value: formatBytes(metrics.disk.free) },
          { label: 'Всего', value: formatBytes(metrics.disk.total) }
        ],
        trend: metrics.disk.usage_percent > 90 ? { direction: 'up', value: 'Заполнен' } : null
      },
      network: {
        value: 'Активно',
        percentage: 0,
        details: Object.keys(metrics.network).length > 0 ? [
          { label: 'Отправлено', value: formatBytes(metrics.network.bytes_sent || 0) },
          { label: 'Получено', value: formatBytes(metrics.network.bytes_recv || 0) }
        ] : [
          { label: 'Статус', value: 'Мониторинг недоступен' }
        ],
        trend: null
      }
    };
  };

  const performanceData = getPerformanceData();

  const metricsData = [
    {
      id: 'cpu',
      title: 'Процессор',
      icon: FiCpu,
      color: '#6366f1',
      ...performanceData.cpu
    },
    {
      id: 'memory',
      title: 'Память',
      icon: FiActivity,
      color: '#8b5cf6',
      ...performanceData.memory
    },
    {
      id: 'network',
      title: 'Сеть',
      icon: FiWifi,
      color: '#06b6d4',
      ...performanceData.network
    },
    {
      id: 'disk',
      title: 'Диск',
      icon: FiHardDrive,
      color: '#10b981',
      ...performanceData.disk
    }
  ];

  return (
    <div className={styles.metricsSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.heading2}>Метрики производительности</h2>
        <p className={styles.bodyTextMuted}>
          Текущая загрузка системных ресурсов в реальном времени
        </p>
      </div>
      
      <div className={styles.metricsGrid}>
        {metricsData.map((metric) => (
          <MetricCard
            key={metric.id}
            title={metric.title}
            value={metric.value}
            percentage={metric.percentage}
            icon={metric.icon}
            color={metric.color}
            details={metric.details}
            trend={metric.trend}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Дополнительная информация о состоянии системы */}
      {!isLoading && !error && lastUpdated && (
        <div className={styles.systemSummary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardHeader}>
              <h3 className={styles.heading3}>Системная информация</h3>
              <button 
                onClick={refetch} 
                className={styles.refreshButton}
                disabled={isLoading}
                title="Обновить метрики"
              >
                <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className={styles.summaryMetrics}>
              <div className={styles.summaryMetric}>
                <span className={styles.bodyTextMuted}>Последнее обновление</span>
                <span className={styles.metricValue}>
                  {lastUpdated.toLocaleTimeString('ru-RU')}
                </span>
              </div>
              <div className={styles.summaryMetric}>
                <span className={styles.bodyTextMuted}>Обновление</span>
                <span className={`${styles.metricValue} ${autoRefresh ? styles.success : styles.muted}`}>
                  {autoRefresh ? 'Автоматическое' : 'Ручное'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Состояние ошибки */}
      {error && (
        <div className={styles.errorCard}>
          <div className={styles.errorMessage}>
            <div className={styles.errorIcon}>
              <FiAlertCircle size={20} />
            </div>
            <div className={styles.errorContent}>
              <h3 className={styles.errorTitle}>Ошибка загрузки метрик</h3>
              <p className={styles.errorDescription}>{error}</p>
              <div className={styles.errorActions}>
                <button 
                  onClick={refetch} 
                  className={`${styles.actionButton} ${styles.primary}`}
                  disabled={isLoading}
                >
                  <FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                  Попробовать снова
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMetrics;