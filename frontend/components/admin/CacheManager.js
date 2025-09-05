import React, { useState } from 'react';
import { 
  FiHardDrive, FiZap, FiTrash2, FiSettings, FiRefreshCw, 
  FiCheck, FiAlertCircle, FiChevronDown 
} from 'react-icons/fi';
import { useCacheMetrics } from '../../hooks/useCacheMetrics';
import styles from '../../styles/pages/AdminSystem.module.css';

// Опции очистки кэша
const CACHE_CLEAR_OPTIONS = [
  { value: 'all', label: 'Очистить весь кэш', description: 'Полная очистка всех кэшированных данных' },
  { value: 'dialogs', label: 'Кэш диалогов', description: 'Только диалоги и сообщения' },
  { value: 'users', label: 'Кэш пользователей', description: 'Данные пользователей и сессии' },
  { value: 'documents', label: 'Кэш документов', description: 'Кэшированные документы и эмбеддинги' }
];

const CacheManager = ({ autoRefresh = true }) => {
  const { metrics, isLoading, error, lastUpdated, refetch, clearCache } = useCacheMetrics({ autoRefresh });
  const [selectedClearType, setSelectedClearType] = useState('dialogs');
  const [clearingCache, setClearingCache] = useState(false);
  const [clearMessage, setClearMessage] = useState(null);

  const handleClearCache = async () => {
    setClearingCache(true);
    setClearMessage(null);

    try {
      await clearCache(selectedClearType);
      setClearMessage({
        type: 'success',
        text: `Кэш "${CACHE_CLEAR_OPTIONS.find(o => o.value === selectedClearType)?.label}" успешно очищен`
      });
      
      // Обновляем метрики после очистки
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (err) {
      setClearMessage({
        type: 'error', 
        text: `Ошибка очистки кэша: ${err.message}`
      });
    } finally {
      setClearingCache(false);
      
      // Скрываем сообщение через 3 секунды
      setTimeout(() => {
        setClearMessage(null);
      }, 3000);
    }
  };

  const formatKeysCount = (count) => {
    if (count > 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count > 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.heading2}>Управление кэшем</h2>
        <p className={styles.bodyTextMuted}>
          Redis кэш, статистика и управление ключами
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
                  <FiHardDrive size={24} />
                </div>
                <div>
                  <h3 className={styles.healthCardTitle}>Использование памяти</h3>
                  <p className={styles.healthCardSubtitle}>Redis память</p>
                </div>
              </div>
              <div className={styles.metricValue}>
                {metrics?.memory_usage || 'N/A'}
              </div>
            </div>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${metrics?.memory_usage_percent || 0}%` }} 
              />
            </div>
          </div>

          <div className={styles.healthCard}>
            <div className={styles.healthCardHeader}>
              <div className={styles.healthCardInfo}>
                <div className={styles.healthCardIcon}>
                  <FiZap size={24} />
                </div>
                <div>
                  <h3 className={styles.healthCardTitle}>Коэффициент попаданий</h3>
                  <p className={styles.healthCardSubtitle}>Cache hit rate</p>
                </div>
              </div>
              <div className={styles.metricValue}>
                {metrics?.hit_rate ? `${metrics.hit_rate}%` : 'N/A'}
              </div>
            </div>
          </div>

          <div className={styles.healthCard}>
            <div className={styles.healthCardHeader}>
              <div className={styles.healthCardInfo}>
                <div className={styles.healthCardIcon}>
                  <FiTrash2 size={24} />
                </div>
                <div>
                  <h3 className={styles.healthCardTitle}>Активные ключи</h3>
                  <p className={styles.healthCardSubtitle}>Всего ключей</p>
                </div>
              </div>
              <div className={styles.metricValue}>
                {formatKeysCount(metrics?.total_keys || 0)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Операции с кэшем */}
      {!isLoading && metrics?.isHealthy && (
        <div className={styles.cacheActions}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.heading3}>Операции с кэшем</h3>
            <p className={styles.bodyTextMuted}>
              Очистка различных типов кэшированных данных
            </p>
          </div>

          <div className={styles.cacheActionsContainer}>
            <div className={styles.cacheAction}>
              <label className={styles.actionLabel}>Тип очистки:</label>
              <div className={styles.selectContainer}>
                <select
                  value={selectedClearType}
                  onChange={(e) => setSelectedClearType(e.target.value)}
                  className={styles.cacheSelect}
                  disabled={clearingCache}
                >
                  {CACHE_CLEAR_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FiChevronDown size={16} className={styles.selectIcon} />
              </div>
            </div>

            <button
              onClick={handleClearCache}
              disabled={clearingCache || !metrics?.isHealthy}
              className={`${styles.clearCacheButton} ${clearingCache ? styles.loading : ''}`}
              title={CACHE_CLEAR_OPTIONS.find(o => o.value === selectedClearType)?.description}
            >
              {clearingCache ? (
                <>
                  <FiRefreshCw size={16} className="animate-spin" />
                  Очистка...
                </>
              ) : (
                <>
                  <FiTrash2 size={16} />
                  Очистить кэш
                </>
              )}
            </button>
          </div>

          {/* Сообщение о результате */}
          {clearMessage && (
            <div className={`${styles.resultMessage} ${styles[clearMessage.type]}`}>
              <div className={styles.messageIcon}>
                {clearMessage.type === 'success' ? (
                  <FiCheck size={16} />
                ) : (
                  <FiAlertCircle size={16} />
                )}
              </div>
              <span>{clearMessage.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Дополнительная статистика */}
      {!isLoading && lastUpdated && metrics && (
        <div className={styles.systemSummary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardHeader}>
              <h3 className={styles.heading3}>Детальная статистика</h3>
            </div>
            <div className={styles.summaryMetrics}>
              <div className={styles.summaryMetric}>
                <span className={styles.bodyTextMuted}>Ключи с истечением</span>
                <span className={styles.metricValue}>
                  {formatKeysCount(metrics.expires_keys || 0)}
                </span>
              </div>
              <div className={styles.summaryMetric}>
                <span className={styles.bodyTextMuted}>Подключенные клиенты</span>
                <span className={styles.metricValue}>
                  {metrics.connected_clients || 0}
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
              <h3 className={styles.errorTitle}>Ошибка загрузки кэш-метрик</h3>
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

export default CacheManager;