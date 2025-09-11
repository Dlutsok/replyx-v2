import { useCallback, useRef } from 'react';
import { API_URL } from '../config/api';

/**
 * Базовый хук для работы с System API endpoints
 * Обеспечивает единообразную работу с системными данными
 */
export const useSystemAPI = () => {
  const abortControllerRef = useRef(null);

  const makeRequest = useCallback(async (endpoint, options = {}) => {
    try {
      // Отменяем предыдущий запрос если он еще выполняется
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Создаем новый AbortController для текущего запроса
      abortControllerRef.current = new AbortController();

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      const response = await fetch(`${endpoint}`, {
        method: options.method || 'GET',
        credentials: 'include', // Включаем cookies
        headers: {
          'Content-Type': 'application/json',
          // Добавляем токен если есть
          ...(token && {
            Authorization: `Bearer ${token}`,
          }),
          ...options.headers,
        },
        signal: abortControllerRef.current.signal,
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { makeRequest, cleanup };
};

/**
 * System API endpoints configuration
 */
export const SYSTEM_ENDPOINTS = {
  HEALTH: '/api/health',
  PERFORMANCE: '/api/performance', 
  DATABASE: '/api/database',
  CACHE: '/api/cache',
  CACHE_CLEAR: '/api/cache/clear',
  LOGS: '/api/logs',
  PROCESSES: '/api/processes',
};

/**
 * Константы для интервалов обновления (в миллисекундах)
 */
export const REFRESH_INTERVALS = {
  PERFORMANCE: 5000,   // 5 секунд
  DATABASE: 10000,     // 10 секунд  
  CACHE: 15000,        // 15 секунд
  PROCESSES: 5000,     // 5 секунд
  LOGS: null,          // По запросу
};

