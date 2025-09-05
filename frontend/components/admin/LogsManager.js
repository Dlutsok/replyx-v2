import React, { useState, useCallback, useRef } from 'react';
import { 
  FiSearch, FiFilter, FiDownload, FiRefreshCw,
  FiAlertCircle, FiInfo, FiAlertTriangle, FiFileText,
  FiClock, FiPlay, FiPause
} from 'react-icons/fi';
import { 
  useSystemLogs, 
  formatLogTimestamp, 
  getLogLevelConfig, 
  LOG_FILTER_PRESETS 
} from '../../hooks/useSystemLogs';
import { useNotifications } from '../../hooks/useNotifications';
import styles from '../../styles/pages/AdminSystem.module.css';

// Компонент фильтров логов
const LogFilters = ({ filters, onFiltersChange, isRealTimeEnabled, onToggleRealTime }) => {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const searchTimeoutRef = useRef(null);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    
    // Debounce search (300ms)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value });
    }, 300);
  }, [filters, onFiltersChange]);

  const handleLevelChange = (level) => {
    onFiltersChange({ ...filters, level });
  };

  const handleTimeRangeChange = (timeRange) => {
    onFiltersChange({ ...filters, timeRange });
  };

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersRow}>
        {/* Поиск */}
        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <FiSearch size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Поиск в логах..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Фильтр по уровню */}
        <select
          value={filters.level || 'all'}
          onChange={(e) => handleLevelChange(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Все уровни</option>
          <option value="error">ERROR</option>
          <option value="warning">WARNING</option>
          <option value="info">INFO</option>
          <option value="debug">DEBUG</option>
        </select>

        {/* Временной диапазон */}
        <select
          value={filters.timeRange || '1h'}
          onChange={(e) => handleTimeRangeChange(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="1h">Последний час</option>
          <option value="6h">Последние 6 часов</option>
          <option value="24h">Последние 24 часа</option>
          <option value="7d">Последние 7 дней</option>
        </select>
      </div>

      <div className={styles.filtersActions}>
        {/* Real-time toggle */}
        <button
          onClick={onToggleRealTime}
          className={`${styles.actionButton} ${isRealTimeEnabled ? styles.primary : ''}`}
        >
          {isRealTimeEnabled ? (
            <>
              <FiPause size={14} />
              Остановить
            </>
          ) : (
            <>
              <FiPlay size={14} />
              Real-time
            </>
          )}
        </button>

        {/* Экспорт */}
        <button className={styles.actionButton}>
          <FiDownload size={14} />
          Экспорт
        </button>
      </div>
    </div>
  );
};

// Компонент отдельного лога
const LogEntry = ({ log, searchTerm }) => {
  const getLevelConfig = (level) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return {
          icon: FiAlertCircle,
          className: styles.logLevel + ' ' + styles.error,
          color: '#ef4444'
        };
      case 'warning':
      case 'warn':
        return {
          icon: FiAlertTriangle,
          className: styles.logLevel + ' ' + styles.warn,
          color: '#f59e0b'
        };
      case 'info':
        return {
          icon: FiInfo,
          className: styles.logLevel + ' ' + styles.info,
          color: '#0ea5e9'
        };
      default:
        return {
          icon: FiFileText,
          className: styles.logLevel,
          color: '#6b7280'
        };
    }
  };

  const levelConfig = getLevelConfig(log.level);
  const LevelIcon = levelConfig.icon;

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const highlightText = (text, term) => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className={styles.highlightText}>{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className={styles.logEntry}>
      <div className={styles.logHeader}>
        <div className={styles.logLevel}>
          <LevelIcon size={14} />
          <span className={levelConfig.className}>{log.level}</span>
        </div>
        <div className={styles.logTimestamp}>
          <FiClock size={12} />
          <span>{formatTimestamp(log.timestamp)}</span>
        </div>
      </div>
      
      <div className={styles.logMessage}>
        <div className={styles.monospace}>
          {highlightText(log.message, searchTerm)}
        </div>
        
        {log.details && (
          <div className={styles.logDetails}>
            <details className={styles.logDetailsContainer}>
              <summary className={styles.logDetailsSummary}>
                Детали
              </summary>
              <pre className={styles.logDetailsContent}>
                {typeof log.details === 'object' 
                  ? JSON.stringify(log.details, null, 2)
                  : log.details
                }
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

// Основной компонент LogsManager
const LogsManager = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const {
    logs,
    isLoading,
    error,
    filters,
    totalLogs,
    hasMore,
    lastUpdated,
    isRealTimeEnabled,
    newLogsCount,
    updateFilters,
    loadMore,
    refetch,
    toggleRealTime,
    exportLogs
  } = useSystemLogs({ realTimeMode: false });

  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const handleExportLogs = async (format = 'json') => {
    const result = await exportLogs(format);
    if (!result.success) {
      showError(`Ошибка экспорта: ${result.error}`, { title: 'Ошибка экспорта' });
    }
    setExportMenuOpen(false);
  };

  const applyPreset = (preset) => {
    updateFilters(preset);
    setPresetMenuOpen(false);
  };

  if (isLoading) {
    return (
      <div className={styles.logsContainer}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.heading2}>Системные логи</h2>
          <div className={styles.loadingSpinner} />
        </div>
        <div className={styles.logsContent}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={styles.loadingCard}>
              <div className={styles.loadingSkeleton} style={{ width: '100%', height: '60px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorCard}>
        <div className={styles.errorMessage}>
          <div className={styles.errorIcon}>
            <FiAlertCircle size={20} />
          </div>
          <div className={styles.errorContent}>
            <h3 className={styles.errorTitle}>Ошибка загрузки логов</h3>
            <p className={styles.errorDescription}>{error}</p>
            <div className={styles.errorActions}>
              <button 
                onClick={refetch} 
                className={`${styles.actionButton} ${styles.primary}`}
              >
                <FiRefreshCw size={14} />
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.logsContainer}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.heading2}>Системные логи</h2>
          <p className={styles.bodyTextMuted}>
            Просмотр и анализ событий системы в реальном времени
          </p>
        </div>
        
        {isRealTimeEnabled && newLogsCount > 0 && (
          <div className={styles.realTimeIndicator}>
            <div className={`${styles.statusDot} ${styles.animate}`} />
            <span>Новых записей: {newLogsCount}</span>
          </div>
        )}
      </div>

      <div className={styles.logsContent}>
        <LogFilters
          filters={filters}
          onFiltersChange={updateFilters}
          isRealTimeEnabled={isRealTimeEnabled}
          onToggleRealTime={toggleRealTime}
        />

        <div className={styles.logsListContainer}>
          <div className={styles.logsHeader}>
            <span className={styles.bodyTextMuted}>
              Найдено: {logs.length} из {totalLogs} записей
            </span>
            <button 
              onClick={refetch}
              className={styles.actionButton}
              disabled={isLoading}
            >
              <FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              Обновить
            </button>
          </div>

          <div className={styles.logsList}>
            {logs.length === 0 ? (
              <div className={styles.emptyState}>
                <FiFileText size={48} className="text-gray-300" />
                <h3 className={styles.heading3}>Логи не найдены</h3>
                <p className={styles.bodyTextMuted}>
                  Нет логов для выбранных фильтров или в выбранном временном диапазоне
                </p>
                <button 
                  onClick={() => updateFilters({ level: 'all', timeRange: '1h', search: '' })}
                  className={`${styles.actionButton} ${styles.primary}`}
                >
                  Очистить фильтры
                </button>
              </div>
            ) : (
              <>
                {logs.map((log) => (
                  <LogEntry 
                    key={log.id} 
                    log={log} 
                    searchTerm={filters.search}
                  />
                ))}
                {hasMore && (
                  <div className={styles.loadMoreContainer}>
                    <button 
                      onClick={loadMore}
                      className={`${styles.actionButton} ${styles.secondary}`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <FiRefreshCw size={14} className="animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        'Загрузить ещё'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogsManager;