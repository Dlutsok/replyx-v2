import { useState, useEffect, useCallback, useRef } from 'react';
import { useSystemAPI, SYSTEM_ENDPOINTS } from './useSystemAPI';

/**
 * Хук для получения системных логов с фильтрацией и пагинацией
 * Поддерживает real-time режим и экспорт
 */
export const useSystemLogs = ({ 
  initialFilters = {
    level: 'all',
    timeRange: '1h',
    search: '',
    limit: 50,
    offset: 0,
  },
  realTimeMode = false,
} = {}) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [totalLogs, setTotalLogs] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(realTimeMode);
  const [newLogsCount, setNewLogsCount] = useState(0);
  
  const { makeRequest, cleanup } = useSystemAPI();
  const intervalRef = useRef(null);
  const previousLogsRef = useRef([]);

  const fetchLogs = useCallback(async (currentFilters = filters, append = false) => {
    try {
      if (!append) {
        setError(null);
      }
      
      const queryParams = new URLSearchParams();
      
      // Добавляем параметры фильтрации
      if (currentFilters.level && currentFilters.level !== 'all') {
        queryParams.append('level', currentFilters.level);
      }
      if (currentFilters.search) {
        queryParams.append('search', currentFilters.search);
      }
      if (currentFilters.timeRange) {
        queryParams.append('time_range', currentFilters.timeRange);
      }
      if (currentFilters.limit) {
        queryParams.append('limit', currentFilters.limit.toString());
      }
      if (currentFilters.offset) {
        queryParams.append('offset', currentFilters.offset.toString());
      }

      const endpoint = `${SYSTEM_ENDPOINTS.LOGS}?${queryParams.toString()}`;
      const data = await makeRequest(endpoint);
      
      if (append) {
        setLogs(prevLogs => [...prevLogs, ...data.logs]);
      } else {
        setLogs(data.logs);
        
        // Подсчитываем новые логи для real-time режима
        if (isRealTimeEnabled && previousLogsRef.current.length > 0) {
          const newLogs = data.logs.filter(log => 
            !previousLogsRef.current.some(prevLog => prevLog.id === log.id)
          );
          setNewLogsCount(prev => prev + newLogs.length);
        }
        
        previousLogsRef.current = data.logs;
      }
      
      setTotalLogs(data.total);
      setHasMore(data.has_more);
      setLastUpdated(new Date());
      
      if (isLoading) {
        setIsLoading(false);
      }
    } catch (err) {
      if (err.message !== 'Request cancelled') {
        setError(err.message);
        setIsLoading(false);
      }
    }
  }, [makeRequest, isLoading, isRealTimeEnabled, filters]);

  const updateFilters = useCallback((newFilters) => {
    const updatedFilters = { ...filters, ...newFilters, offset: 0 };
    setFilters(updatedFilters);
    setIsLoading(true);
    fetchLogs(updatedFilters);
  }, [filters, fetchLogs]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    
    const nextOffset = filters.offset + filters.limit;
    const updatedFilters = { ...filters, offset: nextOffset };
    setFilters(updatedFilters);
    fetchLogs(updatedFilters, true);
  }, [hasMore, isLoading, filters, fetchLogs]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setNewLogsCount(0);
    fetchLogs();
  }, [fetchLogs]);

  const toggleRealTime = useCallback(() => {
    setIsRealTimeEnabled(prev => {
      const newValue = !prev;
      if (newValue) {
        // Сброс счетчика при включении real-time
        setNewLogsCount(0);
        previousLogsRef.current = logs;
      }
      return newValue;
    });
  }, [logs]);

  const exportLogs = useCallback(async (format = 'json') => {
    try {
      const exportFilters = { ...filters, limit: 1000, offset: 0 };
      const queryParams = new URLSearchParams();
      
      Object.entries(exportFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          queryParams.append(key, value.toString());
        }
      });
      
      queryParams.append('export', format);
      
      const endpoint = `${SYSTEM_ENDPOINTS.LOGS}?${queryParams.toString()}`;
      const data = await makeRequest(endpoint);
      
      // Создаем файл для скачивания
      const blob = new Blob([JSON.stringify(data.logs, null, 2)], {
        type: format === 'json' ? 'application/json' : 'text/plain'
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, [filters, makeRequest]);

  // Настройка real-time обновлений
  useEffect(() => {
    if (isRealTimeEnabled && !isLoading && !error) {
      intervalRef.current = setInterval(() => {
        fetchLogs();
      }, 10000); // Обновляем каждые 10 секунд в real-time режиме
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRealTimeEnabled, fetchLogs, isLoading, error]);

  // Первоначальная загрузка
  useEffect(() => {
    fetchLogs();
  }, []);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      cleanup();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cleanup]);

  return {
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
    exportLogs,
  };
};

/**
 * Утилиты для работы с логами
 */
export const formatLogTimestamp = (timestamp) => {
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

export const getLogLevelConfig = (level) => {
  const configs = {
    error: {
      color: '#ef4444',
      bgColor: '#fee2e2',
      textColor: '#991b1b',
      priority: 4
    },
    warn: {
      color: '#f59e0b',
      bgColor: '#fef3c7',
      textColor: '#92400e',
      priority: 3
    },
    warning: {
      color: '#f59e0b',
      bgColor: '#fef3c7',
      textColor: '#92400e',
      priority: 3
    },
    info: {
      color: '#0ea5e9',
      bgColor: '#e0f2fe',
      textColor: '#0c4a6e',
      priority: 2
    },
    debug: {
      color: '#6b7280',
      bgColor: '#f9fafb',
      textColor: '#374151',
      priority: 1
    }
  };
  
  return configs[level?.toLowerCase()] || configs.debug;
};

export const highlightSearchTerm = (text, searchTerm) => {
  if (!searchTerm) return text;
  
  const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Предустановленные фильтры
 */
export const LOG_FILTER_PRESETS = {
  ERRORS_ONLY: {
    level: 'error',
    timeRange: '1h',
    search: '',
    limit: 50,
    offset: 0,
  },
  WARNINGS_AND_ERRORS: {
    level: 'warn',
    timeRange: '6h',
    search: '',
    limit: 50,
    offset: 0,
  },
  RECENT_ACTIVITY: {
    level: 'all',
    timeRange: '1h',
    search: '',
    limit: 100,
    offset: 0,
  },
  DATABASE_LOGS: {
    level: 'all',
    timeRange: '24h',
    search: 'database',
    limit: 50,
    offset: 0,
  },
};