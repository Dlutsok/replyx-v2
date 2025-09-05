import { useState, useEffect, useCallback, useRef } from 'react';
import { useSystemAPI, SYSTEM_ENDPOINTS, REFRESH_INTERVALS } from './useSystemAPI';

/**
 * Хук для получения метрик базы данных PostgreSQL
 * Поддерживает auto-refresh и мониторинг состояния БД
 */
export const useDatabaseMetrics = ({ autoRefresh = true, interval = REFRESH_INTERVALS.DATABASE } = {}) => {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { makeRequest, cleanup } = useSystemAPI();
  const intervalRef = useRef(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      
      const data = await makeRequest(SYSTEM_ENDPOINTS.DATABASE);
      setMetrics(data);
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
  }, [makeRequest, isLoading]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    fetchMetrics();
  }, [fetchMetrics]);

  // Настройка auto-refresh
  useEffect(() => {
    if (autoRefresh && interval && !isLoading && !error) {
      intervalRef.current = setInterval(fetchMetrics, interval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, interval, fetchMetrics, isLoading, error]);

  // Первоначальная загрузка
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      cleanup();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cleanup]);

  // Преобразование данных в удобный формат
  const processedMetrics = useCallback(() => {
    if (!metrics) return null;

    return {
      database_size: metrics.database_size || '0 MB',
      database_size_bytes: parseSizeToBytes(metrics.database_size),
      tables_count: metrics.tables_count || 0,
      connections: {
        active: metrics.active_connections || 0,
        max: metrics.max_connections || 200 // Postgres default is usually 100-200
      },
      queries_per_second: metrics.queries_per_second || 0,
      large_tables: metrics.large_tables || [],
      status: metrics.status || 'unknown',
      error: metrics.error,
      isHealthy: metrics.status === 'healthy',
    };
  }, [metrics]);

  return {
    metrics: processedMetrics(),
    rawMetrics: metrics,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
};

/**
 * Утилита для парсинга размера в байты
 */
const parseSizeToBytes = (sizeString) => {
  if (!sizeString) return 0;
  
  const match = sizeString.match(/^([\d.]+)\s*([KMGT]?B)$/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024,
    'tb': 1024 * 1024 * 1024 * 1024,
  };
  
  return Math.round(value * (multipliers[unit] || 1));
};

/**
 * Утилиты для форматирования данных БД
 */
export const formatTableSize = (sizeString) => {
  return sizeString || '0 MB';
};

export const formatConnectionsUsage = (active, max = 100) => {
  const percentage = max > 0 ? (active / max) * 100 : 0;
  return {
    active,
    max,
    percentage: Math.min(percentage, 100),
    status: percentage > 80 ? 'critical' : percentage > 60 ? 'warning' : 'normal'
  };
};

export const getTableSizeStatus = (bytes) => {
  const gb = 1024 * 1024 * 1024;
  if (bytes > 10 * gb) return 'critical'; // >10GB
  if (bytes > 5 * gb) return 'warning';   // >5GB
  return 'normal';
};