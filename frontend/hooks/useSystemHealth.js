import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL } from '../config/api';

export const useSystemHealth = (options = {}) => {
  const {
    autoRefresh = false,
    interval = 30000, // 30 секунд по умолчанию
    onError = null
  } = options;

  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const fetchHealthData = useCallback(async (silent = false) => {
    try {
      // Отменяем предыдущий запрос если он еще выполняется
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setHealthData(data);
      setLastUpdated(new Date().toISOString());
      setError(null);
      
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Запрос был отменен, игнорируем
      }

      const errorMessage = err.message || 'Ошибка загрузки данных системы';
      
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }
      
      return null;
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [onError]);

  // Функция для принудительного обновления данных
  const refetch = useCallback(() => {
    return fetchHealthData(false);
  }, [fetchHealthData]);

  // Функция для тихого обновления (без индикатора загрузки)
  const silentRefetch = useCallback(() => {
    return fetchHealthData(true);
  }, [fetchHealthData]);

  // Первоначальная загрузка данных
  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Настройка автоматического обновления
  useEffect(() => {
    if (!autoRefresh || !interval || interval <= 0) {
      return;
    }

    intervalRef.current = setInterval(() => {
      silentRefetch();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, interval, silentRefetch]);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Вспомогательные функции для работы со статусами
  const getOverallStatus = useCallback(() => {
    if (!healthData) return 'unknown';
    return healthData.status || 'unknown';
  }, [healthData]);

  const getSystemStatusColor = useCallback((status) => {
    switch (status) {
      case 'healthy':
        return '#10b981'; // green
      case 'degraded':
        return '#f59e0b'; // yellow
      case 'error':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  }, []);

  const getCheckStatus = useCallback((checkName) => {
    if (!healthData?.checks?.[checkName]) {
      return { status: 'unknown', details: 'Нет данных' };
    }
    return healthData.checks[checkName];
  }, [healthData]);

  const isSystemHealthy = useCallback(() => {
    return getOverallStatus() === 'healthy';
  }, [getOverallStatus]);

  const hasErrors = useCallback(() => {
    return getOverallStatus() === 'error';
  }, [getOverallStatus]);

  const hasDegradedServices = useCallback(() => {
    return getOverallStatus() === 'degraded';
  }, [getOverallStatus]);

  const getResponseTime = useCallback(() => {
    return healthData?.response_time_ms || 0;
  }, [healthData]);

  const getHealthSummary = useCallback(() => {
    if (!healthData?.summary) return null;
    return healthData.summary;
  }, [healthData]);

  return {
    // Основные данные
    healthData,
    isLoading,
    error,
    lastUpdated,

    // Функции для обновления
    refetch,
    silentRefetch,

    // Вспомогательные функции
    getOverallStatus,
    getSystemStatusColor,
    getCheckStatus,
    isSystemHealthy,
    hasErrors,
    hasDegradedServices,
    getResponseTime,
    getHealthSummary
  };
};

// Дополнительный хук для метрик производительности
export const useSystemMetrics = () => {
  const [metricsData, setMetricsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/metrics`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMetricsData(data);
      
    } catch (err) {
      setError(err.message || 'Ошибка загрузки метрик системы');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metricsData,
    isLoading,
    error,
    refetch: fetchMetrics
  };
};

export default useSystemHealth;