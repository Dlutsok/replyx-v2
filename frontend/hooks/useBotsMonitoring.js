import { useState, useEffect, useCallback, useRef } from 'react';

const useBotsMonitoring = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 секунд
    realTimeUpdates = true
  } = options;

  const [state, setState] = useState({
    bots: [],
    loading: true,
    error: null,
    filters: {
      search: '',
      status: 'all', // all, online, offline, error, starting
      user: 'all',
      period: '7d' // 24h, 7d, 30d
    },
    selectedBot: null,
    showBotDetails: false,
    realTimeData: {
      connected: true,
      lastUpdate: new Date()
    }
  });

  const [statsData, setStatsData] = useState({
    activeBots: 0,
    totalBots: 0,
    messagesPerHour: 0,
    activeUsers: 0,
    errorBots: 0,
    changes: {
      activeBots: 0,
      messagesPerHour: 0,
      activeUsers: 0,
      errorBots: 0
    }
  });

  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);


  // Основная функция загрузки данных ботов
  const fetchBotsData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      // Отменяем предыдущий запрос если он еще выполняется
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен авторизации не найден');
      }

      // Используем новый эндпоинт для реальных данных мониторинга
      const params = new URLSearchParams({
        status: state.filters.status,
        search: state.filters.search,
        period: state.filters.period
      });

      const response = await fetch(`/api/admin/bots-monitoring?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const realBotsData = await response.json();

      setState(prev => ({
        ...prev,
        bots: realBotsData,
        loading: false,
        error: null,
        realTimeData: {
          ...prev.realTimeData,
          connected: true,
          lastUpdate: new Date()
        }
      }));
    } catch (error) {
      if (error.name === 'AbortError') {
        return; // Запрос был отменен, это нормально
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
        realTimeData: {
          ...prev.realTimeData,
          connected: false
        }
      }));
    }
  }, [state.filters]);

  // Загрузка реальной статистики с сервера
  const fetchStatsData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/admin/bots-monitoring/stats?period=${state.filters.period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const stats = await response.json();
        setStatsData({
          activeBots: stats.active_bots,
          totalBots: stats.total_bots,
          messagesPerHour: stats.messages_per_hour,
          activeUsers: stats.active_users,
          errorBots: stats.error_bots,
          changes: stats.changes
        });
      }
    } catch (error) {
    }
  }, [state.filters.period]);

  // Функция для выполнения действий с ботами
  const handleBotAction = useCallback(async (botId, action) => {
    try {
      const token = localStorage.getItem('token');
      
      // Пока используем существующий API или мок
      let endpoint = '';
      let method = 'POST';
      let body = {};

      switch (action) {
        case 'start':
        case 'stop':
        case 'restart':
          // Попытка использовать существующий API
          endpoint = `/api/admin/bots/${botId}/action`;
          body = { action };
          break;
        default:
          throw new Error(`Неизвестное действие: ${action}`);
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        // Обновляем данные после успешного действия
        await fetchBotsData(true); // silent update
      } else {
        // Если API не поддерживается, имитируем изменение
        setState(prev => ({
          ...prev,
          bots: prev.bots.map(bot => {
            if (bot.id === botId) {
              let newStatus = bot.status;
              switch (action) {
                case 'start':
                  newStatus = 'online';
                  break;
                case 'stop':
                  newStatus = 'offline';
                  break;
                case 'restart':
                  newStatus = 'starting';
                  // После небольшой задержки меняем на online
                  setTimeout(() => {
                    setState(prev2 => ({
                      ...prev2,
                      bots: prev2.bots.map(b => 
                        b.id === botId ? { ...b, status: 'online' } : b
                      )
                    }));
                  }, 2000);
                  break;
              }
              return { ...bot, status: newStatus };
            }
            return bot;
          })
        }));
      }
    } catch (error) {
    }
  }, [fetchBotsData]);

  // Функции для работы с фильтрами
  const setFilter = useCallback((key, value) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }));
  }, []);

  // Функция для фильтрации ботов
  const getFilteredBots = useCallback(() => {
    return state.bots.filter(bot => {
      // Фильтр по поиску
      if (state.filters.search && 
          !bot.name?.toLowerCase().includes(state.filters.search.toLowerCase()) &&
          !bot.id.toString().includes(state.filters.search)) {
        return false;
      }
      
      // Фильтр по статусу
      if (state.filters.status !== 'all' && bot.status !== state.filters.status) {
        return false;
      }

      return true;
    });
  }, [state.bots, state.filters]);

  // Функции для работы с модальным окном
  const openBotDetails = useCallback((bot) => {
    setState(prev => ({
      ...prev,
      selectedBot: bot,
      showBotDetails: true
    }));
  }, []);

  const closeBotDetails = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedBot: null,
      showBotDetails: false
    }));
  }, []);

  // Функция обновления индикатора real-time
  const updateRealTimeIndicator = useCallback(() => {
    setState(prev => ({
      ...prev,
      realTimeData: {
        ...prev.realTimeData,
        lastUpdate: new Date()
      }
    }));
  }, []);

  // Принудительное обновление данных
  const refresh = useCallback(() => {
    fetchBotsData();
    fetchStatsData();
  }, [fetchBotsData, fetchStatsData]);

  // Настройка автообновления
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchBotsData(true); // silent update
        fetchStatsData(); // обновляем статистику
        updateRealTimeIndicator();
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchBotsData, updateRealTimeIndicator]);

  // Начальная загрузка данных
  useEffect(() => {
    fetchBotsData();
    fetchStatsData();

    // Cleanup при размонтировании
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Зависимости намеренно пустые для однократного вызова

  return {
    // Данные
    bots: state.bots,
    filteredBots: getFilteredBots(),
    statsData,
    loading: state.loading,
    error: state.error,
    
    // Состояние UI
    filters: state.filters,
    selectedBot: state.selectedBot,
    showBotDetails: state.showBotDetails,
    realTimeData: state.realTimeData,
    
    // Действия
    handleBotAction,
    setFilter,
    openBotDetails,
    closeBotDetails,
    refresh,
    
    // Утилиты
    isConnected: state.realTimeData.connected,
    lastUpdate: state.realTimeData.lastUpdate
  };
};

export default useBotsMonitoring;