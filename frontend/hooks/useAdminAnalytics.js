import { useState, useEffect, useCallback } from 'react';

export const useAdminAnalytics = (period = '7d', activeTab = 'overview') => {
  // State для разных типов данных
  const [overviewData, setOverviewData] = useState(null);
  const [usersData, setUsersData] = useState(null);
  const [dialogsData, setDialogsData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [usersAIMessagesData, setUsersAIMessagesData] = useState(null);
  
  // UI состояния
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Пагинация для пользователей
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit] = useState(20);
  
  // API утилиты
  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  });

  const handleApiError = (error, context) => {
    setError(`Ошибка загрузки данных: ${context}`);
    return null;
  };

  // Загрузка обзорных метрик
  const fetchOverviewData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/analytics/overview?period=${period}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setOverviewData(data);
      return data;
    } catch (error) {
      return handleApiError(error, 'обзорная аналитика');
    }
  }, [period]);

  // Загрузка данных пользователей
  const fetchUsersData = useCallback(async (page = usersPage) => {
    try {
      const response = await fetch(
        `/api/admin/analytics/users?period=${period}&page=${page}&limit=${usersLimit}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setUsersData(data);
      return data;
    } catch (error) {
      return handleApiError(error, 'аналитика пользователей');
    }
  }, [period, usersPage, usersLimit]);

  // Загрузка данных диалогов
  const fetchDialogsData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/analytics/dialogs?period=${period}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setDialogsData(data);
      return data;
    } catch (error) {
      return handleApiError(error, 'аналитика диалогов');
    }
  }, [period]);

  // Загрузка финансовых данных
  const fetchRevenueData = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/analytics/revenue?period=${period}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setRevenueData(data);
      return data;
    } catch (error) {
      return handleApiError(error, 'финансовая аналитика');
    }
  }, [period]);

  // Загрузка данных пользователей с AI сообщениями
  const fetchUsersAIMessagesData = useCallback(async (page = 1, limit = 100) => {
    try {
      const response = await fetch(`/api/admin/analytics/users-ai-messages?page=${page}&limit=${limit}`, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setUsersAIMessagesData(data);
      return data;
    } catch (error) {
      return handleApiError(error, 'статистика AI сообщений пользователей');
    }
  }, []);

  // Универсальная загрузка данных для активной вкладки
  const loadDataForTab = useCallback(async (tab) => {
    setIsLoading(true);
    setError(null);
    
    try {
      switch (tab) {
        case 'overview':
          await fetchOverviewData();
          break;
        case 'users':
          await Promise.all([fetchOverviewData(), fetchUsersData()]);
          break;
        case 'dialogs':
          await Promise.all([fetchOverviewData(), fetchDialogsData(), fetchUsersAIMessagesData()]);
          break;
        case 'revenue':
          await Promise.all([fetchOverviewData(), fetchRevenueData()]);
          break;
        default:
          await fetchOverviewData();
      }
    } catch (error) {
      setError('Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  }, [fetchOverviewData, fetchUsersData, fetchDialogsData, fetchRevenueData]);

  // Обновление данных при изменении периода или вкладки
  useEffect(() => {
    loadDataForTab(activeTab);
  }, [period, activeTab, loadDataForTab]);

  // Обновление страницы пользователей
  const handleUsersPageChange = useCallback((newPage) => {
    setUsersPage(newPage);
    fetchUsersData(newPage);
  }, [fetchUsersData]);

  // Ручное обновление данных
  const refreshData = useCallback(() => {
    loadDataForTab(activeTab);
  }, [loadDataForTab, activeTab]);

  // Форматирование данных для UI
  const formatters = {
    currency: (amount) => new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0),

    number: (num) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num?.toString() || '0';
    },

    percentage: (num) => `${(num || 0).toFixed(1)}%`,

    date: (dateString) => new Date(dateString).toLocaleDateString('ru-RU'),

    datetime: (dateString) => new Date(dateString).toLocaleString('ru-RU')
  };

  // Вычисляемые значения для метрик
  const metrics = overviewData ? {
    total_users: overviewData.total_users || 0,
    active_users_today: overviewData.active_users_today || 0,
    total_dialogs: overviewData.total_dialogs || 0,
    total_revenue: overviewData.total_revenue || 0,
    
    // Изменения (growth) - используем правильную структуру
    growth_metrics: overviewData.growth_metrics || {},
    
    // Дополнительные метрики
    avgSessionDuration: overviewData.avg_session_duration || 0,
    conversionRate: overviewData.conversion_rate || 0,
    churnRate: overviewData.churn_rate || 0
  } : null;

  // Возврат всех данных и методов
  return {
    // Данные
    overviewData,
    usersData,
    dialogsData,
    revenueData,
    usersAIMessagesData,
    metrics,
    
    // UI состояния
    isLoading,
    error,
    
    // Пагинация пользователей
    usersPage,
    usersLimit,
    handleUsersPageChange,
    
    // Методы управления
    refreshData,
    loadDataForTab,
    fetchUsersAIMessagesData,
    
    // Форматирование
    formatters,
    
    // Утилиты
    clearError: () => setError(null)
  };
};

export default useAdminAnalytics;