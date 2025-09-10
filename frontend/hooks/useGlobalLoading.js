import { createContext, useContext, useState, useCallback } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Контекст для глобального loading
const GlobalLoadingContext = createContext();

/**
 * Провайдер глобального loading состояния
 */
export const GlobalLoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(null);

  // Установить loading для конкретного ключа
  const setLoading = useCallback((key, loading, text = '') => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading ? { loading: true, text } : undefined
    }));
  }, []);

  // Проверить loading для конкретного ключа
  const isLoading = useCallback((key) => {
    return !!loadingStates[key]?.loading;
  }, [loadingStates]);

  // Получить текст загрузки для конкретного ключа
  const getLoadingText = useCallback((key) => {
    return loadingStates[key]?.text || '';
  }, [loadingStates]);

  // Показать глобальный оверлей
  const showOverlay = useCallback((text = 'Загрузка...') => {
    setOverlayLoading({ text });
  }, []);

  // Скрыть глобальный оверлей
  const hideOverlay = useCallback(() => {
    setOverlayLoading(null);
  }, []);

  // Показать глобальный loading
  const showGlobalLoading = useCallback(() => {
    setGlobalLoading(true);
  }, []);

  // Скрыть глобальный loading
  const hideGlobalLoading = useCallback(() => {
    setGlobalLoading(false);
  }, []);

  // Проверить есть ли любой active loading
  const hasAnyLoading = Object.values(loadingStates).some(state => state?.loading) || globalLoading;

  const value = {
    setLoading,
    isLoading,
    getLoadingText,
    showOverlay,
    hideOverlay,
    showGlobalLoading,
    hideGlobalLoading,
    globalLoading,
    hasAnyLoading,
    loadingStates
  };

  return (
    <GlobalLoadingContext.Provider value={value}>
      {children}
      
      {/* Глобальный оверлей загрузки */}
      {overlayLoading && (
        <LoadingSpinner 
          overlay={true} 
          text={overlayLoading.text}
          size="lg"
        />
      )}
    </GlobalLoadingContext.Provider>
  );
};

/**
 * Хук для использования глобального loading
 */
export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

/**
 * Хук для автоматического управления loading состоянием
 */
export const useAsyncAction = () => {
  const { setLoading, showOverlay, hideOverlay } = useGlobalLoading();

  const executeAsync = useCallback(async (
    action, 
    options = {}
  ) => {
    const {
      key = 'default',
      text = '',
      useOverlay = false,
      onSuccess,
      onError,
      showSuccess = false,
      successText = 'Успешно выполнено!'
    } = options;

    try {
      if (useOverlay) {
        showOverlay(text);
      } else {
        setLoading(key, true, text);
      }

      const result = await action();

      if (showSuccess && onSuccess) {
        onSuccess(successText);
      }

      return result;
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
      }
      throw error;
    } finally {
      if (useOverlay) {
        hideOverlay();
      } else {
        setLoading(key, false);
      }
    }
  }, [setLoading, showOverlay, hideOverlay]);

  return { executeAsync };
};

/**
 * Хук для загрузки данных с автоматическим loading
 */
export const useAsyncData = (fetchFn, deps = [], options = {}) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { executeAsync } = useAsyncAction();

  const {
    key = 'data-fetch',
    text = 'Загрузка данных...',
    initialLoad = true
  } = options;

  const load = useCallback(async () => {
    try {
      const result = await executeAsync(fetchFn, {
        key,
        text,
        onError: (err) => setError(err)
      });
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err);
      return null;
    }
  }, [executeAsync, fetchFn, key, text]);

  // Автозагрузка при монтировании или изменении зависимостей
  useState(() => {
    if (initialLoad) {
      load();
    }
  }, deps);

  return { data, error, load, isLoading: (key) => useGlobalLoading().isLoading(key) };
};

export default useGlobalLoading;