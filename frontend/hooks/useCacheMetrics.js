import { useState, useEffect, useCallback, useRef } from 'react';
import { useSystemAPI, SYSTEM_ENDPOINTS, REFRESH_INTERVALS } from './useSystemAPI';

/**
 * Хук для получения метрик Redis кэша и управления им
 * Поддерживает auto-refresh и действия с кэшем
 */
export const useCacheMetrics = ({ autoRefresh = true, interval = REFRESH_INTERVALS.CACHE } = {}) => {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [clearingCache, setClearingCache] = useState(false);
  
  const { makeRequest, cleanup } = useSystemAPI();
  const intervalRef = useRef(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      
      const data = await makeRequest(SYSTEM_ENDPOINTS.CACHE);
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

  const clearCache = useCallback(async (cacheType = 'all') => {
    try {
      setClearingCache(true);
      setError(null);

      const response = await makeRequest(SYSTEM_ENDPOINTS.CACHE_CLEAR, {
        method: 'POST',
        body: JSON.stringify({ cache_type: cacheType }),
      });

      if (response.success) {
        // Обновляем метрики после очистки кэша
        setTimeout(() => {
          fetchMetrics();
        }, 1000);
        
        return {
          success: true,
          message: response.message,
          clearedKeys: response.cleared_keys,
        };
      } else {
        throw new Error(response.error || 'Ошибка очистки кэша');
      }
    } catch (err) {
      setError(err.message);
      return {
        success: false,
        error: err.message,
      };
    } finally {
      setClearingCache(false);
    }
  }, [makeRequest, fetchMetrics]);

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

    const stats = metrics.stats || {};
    
    return {
      status: metrics.status || 'unknown',
      is_available: metrics.is_available || false,
      hit_rate: stats.hit_rate || 0,
      memory_usage: stats.memory_usage || '0 MB',
      memory_usage_bytes: parseMemoryUsage(stats.memory_usage),
      total_keys: stats.total_keys || 0,
      expires_keys: stats.expires_keys || 0,
      connected_clients: stats.connected_clients || 0,
      error: metrics.error,
      isHealthy: metrics.status === 'healthy' && metrics.is_available,
    };
  }, [metrics]);

  return {
    metrics: processedMetrics(),
    rawMetrics: metrics,
    isLoading,
    error,
    lastUpdated,
    clearingCache,
    refetch,
    clearCache,
  };
};

/**
 * Утилита для парсинга использования памяти Redis
 */
const parseMemoryUsage = (memoryString) => {
  if (!memoryString) return 0;
  
  const match = memoryString.match(/^([\d.]+)\s*([KMGT]?B)$/i);
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
 * Утилиты для форматирования данных кэша
 */
export const formatHitRate = (rate) => {
  return `${(rate || 0).toFixed(1)}%`;
};

export const formatMemoryUsage = (usage) => {
  return usage || '0 MB';
};

export const formatKeysCount = (count) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export const getCacheHealthStatus = (metrics) => {
  if (!metrics || !metrics.is_available) return 'error';
  
  const hitRate = metrics.hit_rate || 0;
  const memoryBytes = metrics.memory_usage_bytes || 0;
  const maxMemory = 1024 * 1024 * 1024; // 1GB предполагаемый максимум
  
  if (hitRate < 50 || memoryBytes > maxMemory * 0.9) return 'critical';
  if (hitRate < 80 || memoryBytes > maxMemory * 0.7) return 'warning';
  return 'normal';
};

/**
 * Предустановки для очистки разных типов кэша
 */
export const CACHE_CLEAR_OPTIONS = [
  { value: 'all', label: 'Весь кэш', description: 'Очистить все ключи Redis' },
  { value: 'user_metrics', label: 'Пользовательские метрики', description: 'Кэш пользовательской аналитики' },
  { value: 'embeddings', label: 'Эмбеддинги', description: 'Векторные представления документов' },
  { value: 'sessions', label: 'Сессии', description: 'Пользовательские сессии и токены' },
];