import { useState, useEffect, useCallback, useRef } from 'react';
import { useSystemAPI, SYSTEM_ENDPOINTS, REFRESH_INTERVALS } from './useSystemAPI';

/**
 * Хук для получения информации о системных процессах
 * Мониторинг активных процессов, воркеров и задач
 */
export const useSystemProcesses = ({ autoRefresh = true, interval = REFRESH_INTERVALS.PROCESSES } = {}) => {
  const [processes, setProcesses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'cpu_percent', direction: 'desc' });
  
  const { makeRequest, cleanup } = useSystemAPI();
  const intervalRef = useRef(null);

  const fetchProcesses = useCallback(async () => {
    try {
      setError(null);
      
      const data = await makeRequest(SYSTEM_ENDPOINTS.PROCESSES);
      setProcesses(data.processes || []);
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
    fetchProcesses();
  }, [fetchProcesses]);

  // Настройка auto-refresh
  useEffect(() => {
    if (autoRefresh && interval && !isLoading && !error) {
      intervalRef.current = setInterval(fetchProcesses, interval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, interval, fetchProcesses, isLoading, error]);

  // Первоначальная загрузка
  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      cleanup();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cleanup]);

  // Сортировка процессов
  const sortedProcesses = useCallback(() => {
    if (!processes.length) return [];
    
    return [...processes].sort((a, b) => {
      const { key, direction } = sortConfig;
      
      let aVal = a[key];
      let bVal = b[key];
      
      // Обработка числовых значений
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Обработка строковых значений
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        if (direction === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      }
      
      return 0;
    });
  }, [processes, sortConfig]);

  // Изменение сортировки
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  }, []);

  // Фильтрация процессов
  const filterProcesses = useCallback((filterOptions = {}) => {
    const {
      minCpu = 0,
      minMemory = 0,
      status = null,
      nameFilter = '',
    } = filterOptions;
    
    return sortedProcesses().filter(process => {
      if (process.cpu_percent < minCpu) return false;
      if (process.memory_percent < minMemory) return false;
      if (status && process.status !== status) return false;
      if (nameFilter && !process.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      
      return true;
    });
  }, [sortedProcesses]);

  // Агрегированная статистика процессов
  const processStats = useCallback(() => {
    if (!processes.length) {
      return {
        total: 0,
        running: 0,
        sleeping: 0,
        zombie: 0,
        avgCpu: 0,
        avgMemory: 0,
        totalCpu: 0,
        totalMemory: 0,
      };
    }

    const stats = processes.reduce((acc, process) => {
      acc.totalCpu += process.cpu_percent || 0;
      acc.totalMemory += process.memory_percent || 0;
      
      switch (process.status?.toLowerCase()) {
        case 'running':
          acc.running++;
          break;
        case 'sleeping':
        case 'idle':
          acc.sleeping++;
          break;
        case 'zombie':
          acc.zombie++;
          break;
      }
      
      return acc;
    }, {
      total: processes.length,
      running: 0,
      sleeping: 0,
      zombie: 0,
      totalCpu: 0,
      totalMemory: 0,
    });

    return {
      ...stats,
      avgCpu: stats.total > 0 ? stats.totalCpu / stats.total : 0,
      avgMemory: stats.total > 0 ? stats.totalMemory / stats.total : 0,
    };
  }, [processes]);

  // Топ процессов по потреблению ресурсов
  const getTopProcesses = useCallback((by = 'cpu', limit = 10) => {
    const sortKey = by === 'cpu' ? 'cpu_percent' : 'memory_percent';
    return [...processes]
      .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0))
      .slice(0, limit);
  }, [processes]);

  return {
    processes: sortedProcesses(),
    rawProcesses: processes,
    isLoading,
    error,
    lastUpdated,
    sortConfig,
    stats: processStats(),
    filterProcesses,
    getTopProcesses,
    handleSort,
    refetch,
  };
};

/**
 * Утилиты для форматирования данных процессов
 */
export const formatCpuPercent = (percent) => {
  return `${(percent || 0).toFixed(1)}%`;
};

export const formatMemoryPercent = (percent) => {
  return `${(percent || 0).toFixed(1)}%`;
};

export const getProcessStatusConfig = (status) => {
  const configs = {
    running: {
      color: '#10b981',
      bgColor: '#d1fae5',
      textColor: '#065f46',
      label: 'Выполняется'
    },
    sleeping: {
      color: '#6b7280',
      bgColor: '#f3f4f6',
      textColor: '#374151',
      label: 'Ожидание'
    },
    idle: {
      color: '#6b7280',
      bgColor: '#f3f4f6',
      textColor: '#374151',
      label: 'Простой'
    },
    zombie: {
      color: '#ef4444',
      bgColor: '#fee2e2',
      textColor: '#991b1b',
      label: 'Зомби'
    },
    stopped: {
      color: '#f59e0b',
      bgColor: '#fef3c7',
      textColor: '#92400e',
      label: 'Остановлен'
    }
  };
  
  return configs[status?.toLowerCase()] || {
    color: '#6b7280',
    bgColor: '#f9fafb',
    textColor: '#374151',
    label: status || 'Неизвестно'
  };
};

export const getResourceUsageStatus = (percent) => {
  if (percent >= 90) return 'critical';
  if (percent >= 70) return 'warning';
  if (percent >= 50) return 'moderate';
  return 'low';
};

export const formatProcessName = (name, maxLength = 30) => {
  if (!name) return 'Неизвестный процесс';
  
  if (name.length <= maxLength) {
    return name;
  }
  
  return name.substring(0, maxLength - 3) + '...';
};

/**
 * Предустановленные фильтры процессов
 */
export const PROCESS_FILTER_PRESETS = {
  HIGH_CPU: {
    minCpu: 10,
    minMemory: 0,
    status: null,
    nameFilter: '',
  },
  HIGH_MEMORY: {
    minCpu: 0,
    minMemory: 10,
    status: null,
    nameFilter: '',
  },
  ACTIVE_ONLY: {
    minCpu: 0,
    minMemory: 0,
    status: 'running',
    nameFilter: '',
  },
  PYTHON_PROCESSES: {
    minCpu: 0,
    minMemory: 0,
    status: null,
    nameFilter: 'python',
  },
};