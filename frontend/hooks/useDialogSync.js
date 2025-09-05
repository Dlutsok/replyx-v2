import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getChannelType } from '../utils/dialogHelpers';
import { API_URL } from '../config/api';
import { useNotifications } from './useNotifications';

/**
 * Хук для синхронизации данных диалогов через polling или WebSocket
 */
export const useDialogSync = ({ enabled = true, interval = 30000, filters = {} }) => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const [dialogs, setDialogs] = useState([]);
  const [bots, setBots] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [errorCount, setErrorCount] = useState(0);
  
  // Pagination state - изменено на Load More систему
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalDialogs, setTotalDialogs] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [allDialogs, setAllDialogs] = useState([]); // Все загруженные диалоги
  const [handoffDialogs, setHandoffDialogs] = useState([]); // Диалоги в очереди handoff
  
  // Refs для предотвращения лишних вызовов
  const lastFiltersRef = useRef(null); // Начинаем с null для определения первой загрузки
  const lastLoadTimeRef = useRef(0);
  const debounceTimeoutRef = useRef(null);
  const isLoadingRef = useRef(false);
  const cacheRef = useRef(new Map()); // Кэш для API ответов
  const lastCacheCleanupRef = useRef(0);
  const loadingTimeoutRef = useRef(null);
  const initialLoadDoneRef = useRef(false); // Флаг завершения первоначальной загрузки
  
  // Минимальный интервал между запросами (debouncing)
  const MIN_REQUEST_INTERVAL = 1000; // 1 секунда
  const CACHE_TTL = 10000; // 10 секунд кэш (уменьшено для лучшей отзывчивости фильтров)
  const CACHE_CLEANUP_INTERVAL = 60000; // Очистка кэша каждую минуту

  // Функция очистки устаревшего кэша
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    
    for (const [key, { timestamp }] of cache.entries()) {
      if (now - timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }
    
    lastCacheCleanupRef.current = now;
  }, []);

  // Мониторинг производительности
  const performanceMetrics = useRef({
    apiCalls: 0,
    cacheHits: 0,
    errors: 0,
    avgResponseTime: 0
  });

  // Функция загрузки диалогов в очереди handoff (без фильтров поиска)
  const loadHandoffDialogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/dialogs?status=handoff_requested&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHandoffDialogs(data.items || []);
      }
    } catch (error) {
      console.error('Error loading handoff dialogs:', error);
    }
  }, []);

  // Загрузка данных с debouncing и rate limiting
  const loadData = useCallback(async (forceLoad = false, loadMore = false) => {
    const now = Date.now();
    const startTime = performance.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;

    performanceMetrics.current.apiCalls++;
    
    // Периодическая очистка кэша
    if (now - lastCacheCleanupRef.current > CACHE_CLEANUP_INTERVAL) {
      cleanupCache();
    }
    
    // Создаем ключ кэша на основе параметров запроса
    const pageToLoad = loadMore ? currentPage + 1 : currentPage;
    const cacheKey = JSON.stringify({ filters, page: pageToLoad, pageSize });
    const cached = cacheRef.current.get(cacheKey);
    
    // Проверяем кэш если не принудительная загрузка
    if (!forceLoad && cached && (now - cached.timestamp < CACHE_TTL)) {
      console.log('📦 [useDialogSync] Using cached data for key:', cacheKey);
      performanceMetrics.current.cacheHits++;

      const { data } = cached;
      
      if (loadMore) {
        // Добавляем к существующим диалогам
        setAllDialogs(prev => [...prev, ...data.dialogs]);
        setDialogs(prev => [...prev, ...data.dialogs]);
        setCurrentPage(pageToLoad);
        setLoadMoreLoading(false);
      } else {
        // Заменяем диалоги (обычная загрузка или первая загрузка)
        setDialogs(data.dialogs);
        setAllDialogs(data.dialogs);
        if (!loadMore) {
          setCurrentPage(1);
        }
      }
      
      setBots(data.bots);
      setChannels(data.channels);
      setTotalDialogs(data.totalDialogs);
      setHasNextPage(data.hasNextPage);
      setLastUpdate(new Date(cached.timestamp));
      setLoading(false);

      // Логируем метрики производительности
      const responseTime = performance.now() - startTime;
      console.log('📊 [useDialogSync] Cache hit performance:', {
        responseTime: `${responseTime.toFixed(2)}ms`,
        cacheHit: true,
        totalApiCalls: performanceMetrics.current.apiCalls,
        cacheHitRate: `${((performanceMetrics.current.cacheHits / performanceMetrics.current.apiCalls) * 100).toFixed(1)}%`
      });

      return;
    } else if (cached) {
      console.log('📦 [useDialogSync] Cache expired, refreshing data');
    } else {
      console.log('📦 [useDialogSync] No cache found for key:', cacheKey);
    }
    
    // Предотвращаем слишком частые вызовы
    if (!forceLoad && timeSinceLastLoad < MIN_REQUEST_INTERVAL) {
      console.log('🚦 [useDialogSync] Request throttled, too soon since last request');
      return;
    }
    
    // Предотвращаем одновременные запросы
    if (isLoadingRef.current && !forceLoad) {
      console.log('🚦 [useDialogSync] Request skipped, already loading');
      return;
    }
    
    console.log('🔄 [useDialogSync] loadData called at', new Date().toISOString());
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ [useDialogSync] No token found');
      setError('Не авторизован');
      setLoading(false);
      return;
    }
    
    isLoadingRef.current = true;
    lastLoadTimeRef.current = now;
    
    // Устанавливаем таймаут для защиты от зависания
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    loadingTimeoutRef.current = setTimeout(() => {
      console.error('⚠️ [useDialogSync] Loading timeout - forcing loading to false');
      setLoading(false);
      isLoadingRef.current = false;
      setError('Превышено время ожидания загрузки данных');
    }, 15000); // 15 секунд таймаут

    try {
      setError('');
      console.log('📡 [useDialogSync] Making API calls...', { 
        filters,
        cacheKey,
        currentPage,
        pageSize 
      });
      
      // Создаем параметры запроса с фильтрами
      const params = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: pageSize.toString(),
        sort_by: 'last_message_at', // Сортировка по времени последнего сообщения
        sort_order: 'desc' // Новые диалоги сначала
      });
      
      // Добавляем фильтры если они есть
      if (filters.search) params.append('search', filters.search);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.channel) params.append('channel', filters.channel);
      if (filters.assistant_id) params.append('assistant_id', filters.assistant_id.toString());
      if (filters.time_filter && filters.time_filter !== 'all') params.append('time_filter', filters.time_filter);
      
      console.log('🔍 [useDialogSync] Applied filters:', {
        search: filters.search || 'none',
        status: filters.status || 'all',
        channel: filters.channel || 'none',
        assistant_id: filters.assistant_id || 'none',
        time_filter: filters.time_filter || 'all',
        finalParams: params.toString()
      });
      
      const [dialogsRes, filtersRes] = await Promise.all([
        fetch(`${API_URL}/api/dialogs?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/dialogs/filters-data`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      console.log('📊 [useDialogSync] API responses:', {
        dialogsOk: dialogsRes.ok,
        dialogsStatus: dialogsRes.status,
        filtersOk: filtersRes.ok, 
        filtersStatus: filtersRes.status
      });

      if (!dialogsRes.ok || !filtersRes.ok) {
        const dialogsError = dialogsRes.ok ? null : await dialogsRes.text();
        const filtersError = filtersRes.ok ? null : await filtersRes.text();
        console.error('❌ [useDialogSync] API errors:', { dialogsError, filtersError });
        throw new Error('Ошибка загрузки данных');
      }

      const [dialogsData, filtersData] = await Promise.all([
        dialogsRes.json(),
        filtersRes.json()
      ]);

      console.log('📈 [useDialogSync] Data received:', {
        dialogsCount: Array.isArray(dialogsData) ? dialogsData.length : (dialogsData?.items?.length || 0),
        botsCount: Array.isArray(filtersData?.bots) ? filtersData.bots.length : 0,
        channelsCount: Array.isArray(filtersData?.channels) ? filtersData.channels.length : 0,
        dialogsType: typeof dialogsData,
        filtersType: typeof filtersData
      });

      // Обработка диалогов с поддержкой пагинации
      let processedDialogs = [];
      let total = 0;
      
      if (dialogsData.items && Array.isArray(dialogsData.items)) {
        // Новый API формат с пагинацией
        processedDialogs = dialogsData.items;
        total = dialogsData.total || 0;
        console.log('📄 [useDialogSync] Pagination data:', {
          page: dialogsData.page,
          total: dialogsData.total,
          pages: dialogsData.pages,
          limit: dialogsData.limit
        });
      } else if (Array.isArray(dialogsData)) {
        // Старый формат (массив)
        processedDialogs = dialogsData;
        total = dialogsData.length;
      }
      
      // Обновляем диалоги в зависимости от типа загрузки
      if (loadMore) {
        // Добавляем новые диалоги к существующим
        setAllDialogs(prev => [...prev, ...processedDialogs]);
        setDialogs(prev => [...prev, ...processedDialogs]);
        setCurrentPage(pageToLoad);
        setLoadMoreLoading(false);
      } else {
        // Заменяем диалоги (первая загрузка или новые фильтры)
        setDialogs(processedDialogs);
        setAllDialogs(processedDialogs);
        if (!loadMore) {
          setCurrentPage(1);
        }
      }
      
      setTotalDialogs(total);
      setHasNextPage(total > (loadMore ? allDialogs.length + processedDialogs.length : processedDialogs.length));
      
      // Обработка ботов и каналов из нового API
      setBots(Array.isArray(filtersData?.bots) ? filtersData.bots : []);
      setChannels(Array.isArray(filtersData?.channels) ? filtersData.channels : []);
      setLastUpdate(new Date());
      
      // Сбрасываем счетчик ошибок при успешной загрузке
      setErrorCount(0);
      setError('');
      
      // Загружаем диалоги в очереди handoff отдельно
      await loadHandoffDialogs();
      
      // Сохраняем данные в кэш
      const cacheData = {
        dialogs: processedDialogs,
        bots: Array.isArray(filtersData?.bots) ? filtersData.bots : [],
        channels: Array.isArray(filtersData?.channels) ? filtersData.channels : [],
        totalDialogs: total,
        hasNextPage: processedDialogs.length === pageSize
      };
      
      cacheRef.current.set(cacheKey, {
        data: cacheData,
        timestamp: now
      });
      
      console.log('✅ [useDialogSync] Data loaded successfully:', {
        finalDialogsCount: processedDialogs.length,
        finalBotsCount: Array.isArray(filtersData?.bots) ? filtersData.bots.length : 0,
        finalChannelsCount: Array.isArray(filtersData?.channels) ? filtersData.channels.length : 0,
        cached: true,
        sampleDialog: processedDialogs[0] ? {
          id: processedDialogs[0].id,
          handoff_status: processedDialogs[0].handoff_status,
          is_taken_over: processedDialogs[0].is_taken_over
        } : 'no dialogs'
      });

      // Логируем финальные метрики производительности
      const totalResponseTime = performance.now() - startTime;
      const currentAvgTime = performanceMetrics.current.avgResponseTime;
      const newAvgTime = (currentAvgTime * (performanceMetrics.current.apiCalls - 1) + totalResponseTime) / performanceMetrics.current.apiCalls;
      performanceMetrics.current.avgResponseTime = newAvgTime;

      console.log('📊 [useDialogSync] Final performance metrics:', {
        totalResponseTime: `${totalResponseTime.toFixed(2)}ms`,
        avgResponseTime: `${newAvgTime.toFixed(2)}ms`,
        cacheHitRate: `${((performanceMetrics.current.cacheHits / performanceMetrics.current.apiCalls) * 100).toFixed(1)}%`,
        totalApiCalls: performanceMetrics.current.apiCalls,
        totalErrors: performanceMetrics.current.errors
      });

    } catch (err) {
      console.error('❌ [useDialogSync] Error loading data:', err);
      const newErrorCount = errorCount + 1;
      setErrorCount(newErrorCount);
      performanceMetrics.current.errors++;
      
      // Если много ошибок подряд, увеличиваем интервал
      if (newErrorCount >= 3) {
        setError(`Ошибка загрузки данных (попытка ${newErrorCount}). Следующая попытка через ${Math.min(60, newErrorCount * 10)} секунд.`);
      } else {
        setError('Ошибка загрузки данных');
      }
    } finally {
      // Очищаем таймаут при завершении загрузки
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      setLoading(false);
      setLoadMoreLoading(false);
      isLoadingRef.current = false;
    }
  }, [filters, currentPage, pageSize]);

  // Функция инвалидации кэша
  const invalidateCache = useCallback(() => {
    console.log('🗑️ [useDialogSync] Cache invalidated');
    cacheRef.current.clear();
  }, []);

  // Debounced загрузка при изменении фильтров
  const debouncedLoadData = useCallback((immediate = false) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    if (immediate) {
      // Немедленная загрузка для первоначального запроса
      loadData(true);
    } else {
      debounceTimeoutRef.current = setTimeout(() => {
        loadData(true);
      }, 300); // 300ms debounce
    }
  }, [loadData]);
  
  // Мемоизация фильтров для предотвращения лишних обновлений
  const filtersString = useMemo(() => JSON.stringify(filters), [filters]);
  
  // Начальная загрузка и обновление при изменении фильтров
  useEffect(() => {
    const currentFiltersString = JSON.stringify(filters);
    const filtersChanged = lastFiltersRef.current !== null && lastFiltersRef.current !== currentFiltersString;
    const isInitialLoad = !initialLoadDoneRef.current;
    
    console.log('📋 [useDialogSync] Effect triggered:', {
      filtersChanged,
      isInitialLoad,
      initialLoadDone: initialLoadDoneRef.current,
      lastFilters: lastFiltersRef.current,
      currentFilters: currentFiltersString,
      loading,
      isLoadingRef: isLoadingRef.current
    });
    
    if (isInitialLoad) {
      // Первоначальная загрузка
      console.log('🔄 [useDialogSync] Initial load');
      lastFiltersRef.current = currentFiltersString;
      initialLoadDoneRef.current = true;
      // Немедленная загрузка для первоначального запроса
      debouncedLoadData(true);
    } else if (filtersChanged) {
      console.log('🔄 [useDialogSync] Filters changed, triggering debounced reload');
      lastFiltersRef.current = currentFiltersString;
      // Очищаем кэш при изменении фильтров
      invalidateCache();
      debouncedLoadData();
    } else {
      console.log('⏭️ [useDialogSync] No changes detected, skipping load');
    }
  }, [filtersString, currentPage, debouncedLoadData, invalidateCache]);

  // Polling для обновления данных с adaptive interval при ошибках
  useEffect(() => {
    if (!enabled || !interval) return;

    // Вычисляем динамический интервал на основе количества ошибок
    const dynamicInterval = errorCount >= 3 ? 
      Math.min(60000, interval + (errorCount * 10000)) : interval;

    const pollingTimer = setInterval(() => {
      if (!isLoadingRef.current) {
        loadData(false); // Не принудительная загрузка для polling
        setWsConnected(true); // Имитируем подключение
      }
    }, dynamicInterval);

    return () => {
      clearInterval(pollingTimer);
      setWsConnected(false);
    };
  }, [enabled, interval, errorCount]); // Убираем loadData и loading из зависимостей
  
  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Методы для работы с диалогами
  const takeoverDialog = useCallback(async (dialogId) => {
    const token = localStorage.getItem('token');
    console.log('Takeover dialog attempt:', dialogId);
    
    try {
      // Сначала проверяем статус диалога
      const statusResponse = await fetch(`${API_URL}/api/dialogs/${dialogId}/handoff/status`);
      let currentStatus = 'none';
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        currentStatus = statusData.status;
        console.log('Current dialog handoff status:', currentStatus);
      }
      
      // Если диалог не в состоянии 'requested', сначала запрашиваем handoff
      if (currentStatus !== 'requested') {
        console.log('Dialog not in requested state, requesting handoff first...');
        const requestResponse = await fetch(`${API_URL}/api/dialogs/${dialogId}/handoff/request`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason: 'manual',
            request_id: crypto.randomUUID()
          })
        });
        
        if (!requestResponse.ok) {
          const errorData = await requestResponse.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Ошибка запроса handoff');
        }
        
        console.log('Handoff requested successfully');
      }
      
      console.log('Making takeover request to:', `${API_URL}/api/dialogs/${dialogId}/handoff/takeover`);
      const response = await fetch(`${API_URL}/api/dialogs/${dialogId}/handoff/takeover`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      console.log('Takeover response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Takeover success:', result);
        invalidateCache(); // Инвалидируем кэш перед обновлением
        await loadData(true); // Принудительно обновляем данные
      } else {
        const errorData = await response.json();
        console.error('Takeover error response:', errorData);
        showError(`Ошибка взятия диалога: ${errorData.detail || 'Неизвестная ошибка'}`, { title: 'Ошибка' });
        throw new Error(errorData.detail || 'Не удалось взять диалог');
      }
    } catch (err) {
      console.error('Error taking over dialog:', err);
      showError(`Ошибка: ${err.message}`, { title: 'Ошибка' });
      throw err;
    }
  }, [loadData, invalidateCache]);

  const releaseDialog = useCallback(async (dialogId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/dialogs/${dialogId}/handoff/release`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      if (response.ok) {
        invalidateCache(); // Инвалидируем кэш перед обновлением
        await loadData(true); // Принудительно обновляем данные
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось отпустить диалог');
      }
    } catch (err) {
      console.error('Error releasing dialog:', err);
      throw err;
    }
  }, [loadData, invalidateCache]);

  const cancelHandoff = useCallback(async (dialogId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/dialogs/${dialogId}/handoff/cancel`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      if (response.ok) {
        invalidateCache(); // Инвалидируем кэш перед обновлением
        await loadData(true); // Принудительно обновляем данные
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Не удалось отменить запрос');
      }
    } catch (err) {
      console.error('Error cancelling handoff:', err);
      throw err;
    }
  }, [loadData, invalidateCache]);

  // Функция загрузки дополнительных диалогов (Load More)
  const loadMoreDialogs = useCallback(async () => {
    if (hasNextPage && !loadMoreLoading && !loading) {
      setLoadMoreLoading(true);
      try {
        await loadData(false, true); // loadMore = true
      } catch (error) {
        console.error('Error loading more dialogs:', error);
        setLoadMoreLoading(false);
      }
    }
  }, [hasNextPage, loadMoreLoading, loading, loadData]);

  // Функция перехода на определенную страницу (legacy, оставляем для совместимости)
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= Math.ceil(totalDialogs / pageSize) && page !== currentPage && !loading) {
      setCurrentPage(page);
    }
  }, [totalDialogs, pageSize, currentPage, loading]);

  // Функция сброса к первой странице
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);
  
  // Сбрасываем на первую страницу при изменении фильтров (без лишних перерендеров)
  useEffect(() => {
    const shouldReset = currentPage !== 1;
    if (shouldReset) {
      console.log('🔄 [useDialogSync] Resetting to page 1 due to filter change');
      setCurrentPage(1);
      // Очищаем кэш при сбросе пагинации
      invalidateCache();
    }
  }, [filtersString, invalidateCache]); // Используем мемоизированную строку фильтров

  return {
    // Данные
    dialogs, // Отфильтрованные диалоги
    allDialogs, // Все диалоги без фильтров (для HandoffQueue)
    handoffDialogs, // Диалоги в очереди handoff (независимо от фильтров)
    bots,
    channels,
    loading,
    error,
    
    // Состояние подключения
    wsConnected,
    lastUpdate,
    
    // Пагинация (Load More система)
    currentPage,
    totalDialogs,
    pageSize,
    totalPages: Math.ceil(totalDialogs / pageSize),
    hasNextPage,
    hasPrevPage: currentPage > 1,
    loadMoreLoading,
    
    // Методы
    loadData: () => loadData(true), // Всегда принудительная загрузка для ручных вызовов
    loadMoreDialogs, // Новая функция для Load More
    loadHandoffDialogs, // Функция загрузки очереди handoff
    goToPage,
    resetPagination,
    takeoverDialog,
    releaseDialog,
    cancelHandoff
  };
};