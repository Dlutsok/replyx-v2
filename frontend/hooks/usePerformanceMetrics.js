import { useState, useEffect, useCallback, useRef } from 'react';
import { useSystemAPI, SYSTEM_ENDPOINTS, REFRESH_INTERVALS } from './useSystemAPI';

/**
 * Хук для получения метрик производительности системы
 * Поддерживает auto-refresh и real-time обновления
 */
export const usePerformanceMetrics = ({ autoRefresh = true, interval = REFRESH_INTERVALS.PERFORMANCE } = {}) => {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { makeRequest, cleanup } = useSystemAPI();
  const intervalRef = useRef(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      
      const data = await makeRequest(SYSTEM_ENDPOINTS.PERFORMANCE);
      setMetrics(data);
      setLastUpdated(new Date());
      
      // Устанавливаем isLoading в false только при первой загрузке
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

  // Преобразование данных в удобный формат для компонентов
  const processedMetrics = useCallback(() => {
    if (!metrics) return null;

    return {
      cpu: {
        usage_percent: metrics.cpu?.usage_percent || 0,
        cores: metrics.cpu?.cores || 1,
        load_avg_1m: metrics.cpu?.load_avg_1m || 0,
        load_avg_5m: metrics.cpu?.load_avg_5m || 0,
        load_avg_15m: metrics.cpu?.load_avg_15m || 0,
      },
      memory: {
        total: metrics.memory?.total || 0,
        available: metrics.memory?.available || 0,
        used: metrics.memory?.used || 0,
        usage_percent: metrics.memory?.usage_percent || 0,
        free: metrics.memory?.free || 0,
      },
      disk: {
        total: metrics.disk?.total || 0,
        used: metrics.disk?.used || 0,
        free: metrics.disk?.free || 0,
        usage_percent: metrics.disk?.usage_percent || 0,
      },
      network: metrics.network || {},
      timestamp: metrics.timestamp,
      error: metrics.error,
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
 * Утилиты для форматирования метрик
 */
export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatPercentage = (value) => {
  return `${(value || 0).toFixed(1)}%`;
};

export const formatLoadAverage = (value) => {
  return (value || 0).toFixed(2);
};