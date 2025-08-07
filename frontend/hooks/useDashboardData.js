import { useState, useEffect, useCallback, useRef } from 'react';

// Утилиты для форматирования
export const formatCurrency = (amount, currency = 'RUB') => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  };
  return new Date(date).toLocaleDateString('ru-RU', defaultOptions);
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const getTimeAgo = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays === 1) return 'вчера';
  return formatDate(date);
};

export const useDashboardData = () => {
  const [data, setData] = useState({
    metrics: null,
    bots: [],
    dialogs: [],
    balance: null,
    assistants: [],
    systemHealth: null,
    realtimeStats: null,
    loading: true,
    error: null
  });

  const fetchDataRef = useRef();

  // Создаём стабильную функцию для fetchData
  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Параллельные запросы к API
      const [metricsRes, botsRes, dialogsRes, balanceRes, assistantsRes, healthRes] = await Promise.all([
        fetch('http://localhost:8000/api/metrics?period=month', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/bot-instances', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/dialogs?limit=10', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/balance/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/assistants', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/health', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => ({ ok: false })) // Не блокируем загрузку, если health недоступен
      ]);

      const [metrics, bots, dialogs, balance, assistants, systemHealth] = await Promise.all([
        metricsRes.ok ? metricsRes.json() : null,
        botsRes.ok ? botsRes.json() : [],
        dialogsRes.ok ? dialogsRes.json() : { items: [] },
        balanceRes.ok ? balanceRes.json() : null,
        assistantsRes.ok ? assistantsRes.json() : [],
        healthRes.ok ? healthRes.json() : null
      ]);

      setData({
        metrics,
        bots,
        dialogs: dialogs.items || [],
        balance,
        assistants,
        systemHealth,
        realtimeStats: {
          activeUsers: Math.floor((metrics?.totalMessages || 0) / 50),
          messagesPerMinute: Math.floor((metrics?.periodMessages || 0) / 60),
          avgResponseTime: metrics?.avgResponseTime || 0,
          systemLoad: Math.floor(Math.random() * 30 + 20),
          activeBots: (bots || []).filter(bot => bot.is_active).length
        },
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  // Сохраняем ссылку на функцию
  fetchDataRef.current = fetchData;

  // Инициализация данных (только один раз)
  useEffect(() => {
    fetchDataRef.current();
  }, []); // Пустой массив зависимостей!

  // Автообновление каждые 2 минуты (отдельный useEffect)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDataRef.current();
    }, 120000);
    
    return () => {
      clearInterval(interval);
    };
  }, []); // Пустой массив зависимостей!

  // Обновление при фокусе (отдельный useEffect)
  useEffect(() => {
    const handleFocus = () => {
      fetchDataRef.current();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // Пустой массив зависимостей!

  return { ...data, refetch: fetchData };
};

// Новый хук для работы с уведомлениями
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  
  const addNotification = (type, message, duration = 5000) => {
    const id = Date.now();
    const notification = { id, type, message, timestamp: new Date() };
    
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Максимум 10 уведомлений
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  };
  
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const clearAllNotifications = () => {
    setNotifications([]);
  };
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications
  };
};

// Хук для работы с периодами метрик
export const useMetricsPeriod = (initialPeriod = 'month') => {
  const [period, setPeriod] = useState(initialPeriod);
  const [customDate, setCustomDate] = useState('');
  
  const updatePeriod = (newPeriod, date = '') => {
    setPeriod(newPeriod);
    if (newPeriod === 'custom') {
      setCustomDate(date);
    } else {
      setCustomDate('');
    }
  };
  
  const getPeriodLabel = () => {
    switch(period) {
      case 'day': return 'День';
      case 'week': return 'Неделя';
      case 'month': return 'Месяц';
      case 'custom': return customDate ? new Date(customDate).toLocaleDateString('ru-RU') : 'Выборочно';
      default: return 'Период';
    }
  };
  
  const getApiUrl = (baseUrl) => {
    let url = `${baseUrl}?period=${period}`;
    if (period === 'custom' && customDate) {
      url += `&date=${customDate}`;
    }
    return url;
  };
  
  return {
    period,
    customDate,
    updatePeriod,
    getPeriodLabel,
    getApiUrl
  };
};

export const useBotActions = () => {
  const [loading, setLoading] = useState({});
  const [lastAction, setLastAction] = useState(null);
  
  const toggleBot = async (botId, isActive) => {
    setLoading(prev => ({ ...prev, [botId]: true }));
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/api/bot-instances/${botId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !isActive })
      });
      const success = response.ok;
      setLastAction({ 
        type: 'toggle', 
        botId, 
        from: isActive, 
        to: !isActive, 
        success, 
        timestamp: new Date() 
      });
      return success;
    } catch (error) {
      console.error('Bot toggle error:', error);
      setLastAction({ 
        type: 'toggle', 
        botId, 
        success: false, 
        error: error.message, 
        timestamp: new Date() 
      });
      return false;
    } finally {
      setLoading(prev => ({ ...prev, [botId]: false }));
    }
  };

  const startBot = async (botId) => {
    setLoading(prev => ({ ...prev, [botId]: true }));
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/api/start-bot/${botId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const success = response.ok;
      setLastAction({ type: 'start', botId, success, timestamp: new Date() });
      return success;
    } catch (error) {
      console.error('Bot start error:', error);
      setLastAction({ type: 'start', botId, success: false, error: error.message, timestamp: new Date() });
      return false;
    } finally {
      setLoading(prev => ({ ...prev, [botId]: false }));
    }
  };

  const stopBot = async (botId) => {
    setLoading(prev => ({ ...prev, [botId]: true }));
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/api/stop-bot/${botId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const success = response.ok;
      setLastAction({ type: 'stop', botId, success, timestamp: new Date() });
      return success;
    } catch (error) {
      console.error('Bot stop error:', error);
      setLastAction({ type: 'stop', botId, success: false, error: error.message, timestamp: new Date() });
      return false;
    } finally {
      setLoading(prev => ({ ...prev, [botId]: false }));
    }
  };
  
  const bulkToggleBots = async (botIds, targetState) => {
    const results = [];
    for (const botId of botIds) {
      const result = await toggleBot(botId, !targetState);
      results.push({ botId, success: result });
    }
    return results;
  };

  return { toggleBot, startBot, stopBot, bulkToggleBots, loading, lastAction };
};

export const useDialogActions = () => {
  const [loading, setLoading] = useState({});
  const [lastAction, setLastAction] = useState(null);
  
  const takeoverDialog = async (dialogId) => {
    setLoading(prev => ({ ...prev, [dialogId]: true }));
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/api/dialogs/${dialogId}/takeover`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const success = response.ok;
      setLastAction({ type: 'takeover', dialogId, success, timestamp: new Date() });
      return success;
    } catch (error) {
      console.error('Dialog takeover error:', error);
      setLastAction({ type: 'takeover', dialogId, success: false, error: error.message, timestamp: new Date() });
      return false;
    } finally {
      setLoading(prev => ({ ...prev, [dialogId]: false }));
    }
  };

  const releaseDialog = async (dialogId) => {
    setLoading(prev => ({ ...prev, [dialogId]: true }));
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/api/dialogs/${dialogId}/release`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const success = response.ok;
      setLastAction({ type: 'release', dialogId, success, timestamp: new Date() });
      return success;
    } catch (error) {
      console.error('Dialog release error:', error);
      setLastAction({ type: 'release', dialogId, success: false, error: error.message, timestamp: new Date() });
      return false;
    } finally {
      setLoading(prev => ({ ...prev, [dialogId]: false }));
    }
  };

  return { takeoverDialog, releaseDialog, loading, lastAction };
};

export const useWebSocket = (url, onMessage, options = {}) => {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [disabled, setDisabled] = useState(false);
  
  const { maxReconnectAttempts = 3, reconnectInterval = 5000, autoReconnect = true } = options;

  const connect = useCallback(() => {
    if (!url || disabled) return;

    // Проверяем доступность backend перед подключением WebSocket
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/health', {
          method: 'GET',
          timeout: 3000
        });
        return response.ok;
      } catch (error) {
        console.warn('Backend недоступен:', error.message);
        return false;
      }
    };

    checkBackend().then(isBackendAvailable => {
      if (!isBackendAvailable) {
        console.warn('Backend недоступен, пропускаем WebSocket подключение');
        setLastError(new Error('Backend недоступен'));
        
        // Попробуем снова через некоторое время
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setDisabled(true);
        }
        return;
      }

      const websocket = new WebSocket(url);
      
      websocket.onopen = () => {
        console.log('WebSocket подключен:', url);
        setConnected(true);
        setWs(websocket);
        setReconnectAttempts(0);
        setLastError(null);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error('Ошибка парсинга WebSocket сообщения:', error);
        }
      };
      
      websocket.onclose = (event) => {
        console.log('WebSocket отключен:', url, 'Код:', event.code);
        setConnected(false);
        setWs(null);
        
        // Автоматическое переподключение только при неожиданном закрытии
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts && !event.wasClean && event.code !== 1000) {
          console.log(`Попытка переподключения... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.warn(`WebSocket отключен после ${maxReconnectAttempts} неудачных попыток`);
          setDisabled(true);
        }
      };
      
      websocket.onerror = (error) => {
        console.warn('WebSocket ошибка:', error);
        setLastError(error);
      };
    });

  }, [url, onMessage, autoReconnect, maxReconnectAttempts, reconnectInterval, reconnectAttempts]);

  useEffect(() => {
    const websocket = connect();
    
    return () => {
      if (websocket) {
        websocket.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);
  
  const sendMessage = (data) => {
    if (ws && connected) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  };
  
  const reconnect = () => {
    if (ws) {
      ws.close();
    }
    setReconnectAttempts(0);
    connect();
  };

  return { 
    ws, 
    connected, 
    reconnectAttempts, 
    lastError,
    disabled,
    sendMessage,
    reconnect
  };
};