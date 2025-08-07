import { useState, useEffect, useCallback } from 'react';
import { getChannelType } from '../utils/dialogHelpers';

/**
 * Хук для синхронизации данных диалогов через polling или WebSocket
 */
export const useDialogSync = ({ enabled = true, interval = 30000 }) => {
  const [dialogs, setDialogs] = useState([]);
  const [bots, setBots] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Загрузка данных
  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Не авторизован');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [dialogsRes, botsRes, channelsRes] = await Promise.all([
        fetch('http://localhost:8000/api/dialogs', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/bot-instances', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/metrics', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!dialogsRes.ok || !botsRes.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const [dialogsData, botsData, metricsData] = await Promise.all([
        dialogsRes.json(),
        botsRes.json(),
        channelsRes.ok ? channelsRes.json() : {}
      ]);

      // Обработка диалогов
      const processedDialogs = Array.isArray(dialogsData) ? dialogsData : dialogsData.items || [];
      setDialogs(processedDialogs);
      
      // Обработка ботов
      setBots(Array.isArray(botsData) ? botsData : []);
      
      // Создание каналов из диалогов
      const channelStats = {};
      processedDialogs.forEach(dialog => {
        const channelType = getChannelType(dialog);
        channelStats[channelType] = (channelStats[channelType] || 0) + 1;
      });
      
      const channelsData = [
        {
          type: 'telegram',
          name: 'Telegram',
          count: channelStats['telegram'] || 0
        },
        {
          type: 'website', 
          name: 'Сайт (Виджет)',
          count: channelStats['website'] || 0
        }
      ].filter(channel => channel.count > 0);
      
      setChannels(channelsData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, []);

  // Начальная загрузка
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling для обновления данных
  useEffect(() => {
    if (!enabled || !interval) return;

    const pollingTimer = setInterval(() => {
      if (!loading) {
        loadData();
        setWsConnected(true); // Имитируем подключение
      }
    }, interval);

    return () => {
      clearInterval(pollingTimer);
      setWsConnected(false);
    };
  }, [enabled, interval, loading, loadData]);

  // Методы для работы с диалогами
  const takeoverDialog = useCallback(async (dialogId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/api/dialogs/${dialogId}/takeover`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await loadData(); // Обновляем данные
      }
    } catch (err) {
      console.error('Error taking over dialog:', err);
      throw err;
    }
  }, [loadData]);

  const releaseDialog = useCallback(async (dialogId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:8000/api/dialogs/${dialogId}/release`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await loadData(); // Обновляем данные
      }
    } catch (err) {
      console.error('Error releasing dialog:', err);
      throw err;
    }
  }, [loadData]);

  return {
    // Данные
    dialogs,
    bots,
    channels,
    loading,
    error,
    
    // Состояние подключения
    wsConnected,
    lastUpdate,
    
    // Методы
    loadData,
    takeoverDialog,
    releaseDialog
  };
};