import React from 'react';
import { FiClock, FiPlay, FiPause, FiSettings, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useSystemProcesses } from '../../hooks/useSystemProcesses';
import styles from '../../styles/pages/AdminSystem.module.css';

const TasksMonitor = ({ autoRefresh = true }) => {
  const { stats, isLoading, error, lastUpdated, refetch } = useSystemProcesses({ autoRefresh });

  const formatCpuPercent = (value) => `${(value || 0).toFixed(1)}%`;
  const formatMemoryPercent = (value) => `${(value || 0).toFixed(1)}%`;
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.heading2}>Мониторинг задач</h2>
        <p className={styles.bodyTextMuted}>
          Фоновые процессы, воркеры и очереди задач
        </p>
      </div>

      {isLoading ? (
        <div className={styles.metricsGrid}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.loadingCard}>
              <div className={styles.metricHeader}>
                <div className={`${styles.loadingSkeleton}`} style={{ width: '100px', height: '20px' }} />
                <div className={`${styles.loadingSkeleton}`} style={{ width: '60px', height: '32px' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.metricsGrid}>
          <div className={styles.healthCard}>
            <div className={styles.healthCardHeader}>
              <div className={styles.healthCardInfo}>
                <div className={styles.healthCardIcon}>
                  <FiPlay size={24} />
                </div>
                <div>
                  <h3 className={styles.healthCardTitle}>Активные процессы</h3>
                  <p className={styles.healthCardSubtitle}>Работающие процессы</p>
                </div>
              </div>
              <div className={styles.metricValue}>
                {stats?.running || 0}
              </div>
            </div>
          </div>

          <div className={styles.healthCard}>
            <div className={styles.healthCardHeader}>
              <div className={styles.healthCardInfo}>
                <div className={styles.healthCardIcon}>
                  <FiClock size={24} />
                </div>
                <div>
                  <h3 className={styles.healthCardTitle}>Средняя нагрузка CPU</h3>
                  <p className={styles.healthCardSubtitle}>Загрузка процессора</p>
                </div>
              </div>
              <div className={styles.metricValue}>
                {formatCpuPercent(stats?.avgCpu || 0)}
              </div>
            </div>
          </div>

          <div className={styles.healthCard}>
            <div className={styles.healthCardHeader}>
              <div className={styles.healthCardInfo}>
                <div className={styles.healthCardIcon}>
                  <FiPause size={24} />
                </div>
                <div>
                  <h3 className={styles.healthCardTitle}>Использование памяти</h3>
                  <p className={styles.healthCardSubtitle}>RAM процессов</p>
                </div>
              </div>
              <div className={styles.metricValue}>
                {formatMemoryPercent(stats?.avgMemory || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Дополнительная статистика */}
      {!isLoading && !error && lastUpdated && (
        <div className={styles.systemSummary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardHeader}>
              <h3 className={styles.heading3}>Статистика процессов</h3>
              <button 
                onClick={refetch} 
                className={styles.refreshButton}
                disabled={isLoading}
                title="Обновить статистику процессов"
              >
                <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className={styles.summaryMetrics}>
              <div className={styles.summaryMetric}>
                <span className={styles.bodyTextMuted}>Всего процессов</span>
                <span className={styles.metricValue}>
                  {stats?.total || 0}
                </span>
              </div>
              <div className={styles.summaryMetric}>
                <span className={styles.bodyTextMuted}>Статус системы</span>
                <span className={`${styles.metricValue} ${stats?.total > 0 ? styles.success : styles.error}`}>
                  {stats?.total > 0 ? 'Стабильно' : 'Проблемы'}
                </span>
              </div>
              <div className={styles.summaryMetric}>
                <span className={styles.bodyTextMuted}>Последнее обновление</span>
                <span className={styles.metricValue}>
                  {lastUpdated.toLocaleTimeString('ru-RU')}
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
              <h3 className={styles.errorTitle}>Ошибка загрузки статистики процессов</h3>
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

export default TasksMonitor;