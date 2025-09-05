import React from 'react';
import { FiDatabase, FiActivity, FiBarChart, FiSettings, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useDatabaseMetrics } from '../../hooks/useDatabaseMetrics';
import styles from '../../styles/pages/AdminSystem.module.css';

const DatabaseMonitor = ({ autoRefresh = true }) => {
  const { metrics, isLoading, error, lastUpdated, refetch } = useDatabaseMetrics({ autoRefresh });
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.heading2}>Мониторинг базы данных</h2>
        <p className={styles.bodyTextMuted}>
          Состояние PostgreSQL, подключения и производительность запросов
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
              <div className={styles.progressBar}>
                <div className={`${styles.loadingSkeleton}`} style={{ width: '100%', height: '8px' }} />
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
                  <FiDatabase size={24} />
                </div>
                <div>
                  <h3 className={styles.healthCardTitle}>Подключения</h3>
                  <p className={styles.healthCardSubtitle}>Активные соединения</p>
                </div>
              </div>
              <div className={styles.metricValue}>
                {metrics?.connections?.active || 0}/{metrics?.connections?.max || 100}
              </div>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${((metrics?.connections?.active || 0) / (metrics?.connections?.max || 100)) * 100}%` }} 
              />
            </div>
          </div>

          <div className={styles.healthCard}>
            <div className={styles.healthCardHeader}>
              <div className={styles.healthCardInfo}>
                <div className={styles.healthCardIcon}>
                  <FiActivity size={24} />
                </div>
                <div>
                  <h3 className={styles.healthCardTitle}>Запросы/сек</h3>
                  <p className={styles.healthCardSubtitle}>Средняя нагрузка</p>
                </div>
              </div>
              <div className={styles.metricValue}>
                {metrics?.queries_per_second || 0}
              </div>
            </div>
          </div>

          <div className={styles.healthCard}>
            <div className={styles.healthCardHeader}>
              <div className={styles.healthCardInfo}>
                <div className={styles.healthCardIcon}>
                  <FiBarChart size={24} />
                </div>
                <div>
                  <h3 className={styles.healthCardTitle}>Размер БД</h3>
                  <p className={styles.healthCardSubtitle}>Общий размер</p>
                </div>
              </div>
              <div className={styles.metricValue}>
                {metrics?.database_size || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Большие таблицы */}
      {!isLoading && metrics?.large_tables && metrics.large_tables.length > 0 && (
        <div className={styles.dataSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.heading3}>Большие таблицы</h3>
            <p className={styles.bodyTextMuted}>
              Таблицы с наибольшим размером данных
            </p>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Схема</th>
                  <th>Таблица</th>
                  <th>Размер</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {metrics.large_tables.slice(0, 10).map((table, index) => {
                  const sizeStatus = table.bytes > 1024*1024*1024*5 ? 'warning' : 'normal'; // >5GB
                  return (
                    <tr key={index}>
                      <td className={styles.tableCell}>{table.schema}</td>
                      <td className={styles.tableCell}>
                        <code className={styles.tableName}>{table.table}</code>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={`${styles.sizeValue} ${sizeStatus === 'warning' ? styles.warning : ''}`}>
                          {table.size}
                        </span>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={`${styles.statusBadge} ${styles[sizeStatus]}`}>
                          {sizeStatus === 'warning' ? 'Большая' : 'Норма'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Дополнительная информация */}
      {!isLoading && !error && lastUpdated && (
        <div className={styles.systemSummary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardHeader}>
              <h3 className={styles.heading3}>Информация о подключении</h3>
              <button 
                onClick={refetch} 
                className={styles.refreshButton}
                disabled={isLoading}
                title="Обновить метрики БД"
              >
                <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className={styles.summaryMetrics}>
              <div className={styles.summaryMetric}>
                <span className={styles.bodyTextMuted}>Статус</span>
                <span className={`${styles.metricValue} ${metrics?.isHealthy ? styles.success : styles.error}`}>
                  {metrics?.status || 'Неизвестно'}
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
              <h3 className={styles.errorTitle}>Ошибка загрузки метрик БД</h3>
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

export default DatabaseMonitor;