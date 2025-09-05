/**
 * 🛡️ CSRF PROTECTION HOOK
 * React хук для работы с CSRF токенами
 */

import { useState, useEffect, useCallback } from 'react';
import { createApiUrl } from '../config/api';

// Утилиты для работы с cookies
const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
  return null;
};

const setCookie = (name, value, options = {}) => {
  if (typeof document === 'undefined') return;
  
  let cookieString = `${name}=${value}`;
  
  if (options.maxAge) {
    cookieString += `; Max-Age=${options.maxAge}`;
  }
  
  if (options.path) {
    cookieString += `; Path=${options.path}`;
  }
  
  if (options.secure) {
    cookieString += `; Secure`;
  }
  
  if (options.sameSite) {
    cookieString += `; SameSite=${options.sameSite}`;
  }
  
  document.cookie = cookieString;
};

export const useCSRFProtection = () => {
  const [csrfToken, setCSRFToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Получение CSRF токена из cookie
  const getTokenFromCookie = useCallback(() => {
    return getCookie('csrftoken');
  }, []);
  
  // Получение CSRF токена с сервера
  const fetchCSRFToken = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Сначала проверяем cookie
      const cookieToken = getTokenFromCookie();
      if (cookieToken) {
        setCSRFToken(cookieToken);
        setIsLoading(false);
        return cookieToken;
      }
      
      // Если нет в cookie, получаем с сервера
      const response = await fetch(createApiUrl('/api/csrf-token'), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const token = data.csrf_token;
      
      // Сохраняем токен в состоянии и cookie
      setCSRFToken(token);
      setCookie('csrftoken', token, {
        maxAge: data.expires_in || 3600,
        path: '/',
        secure: window.location.protocol === 'https:',
        sameSite: 'strict'
      });
      
      return token;
      
    } catch (err) {
      console.error('🛡️ Ошибка получения CSRF токена:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getTokenFromCookie]);
  
  // Проверка валидности токена
  const isTokenValid = useCallback((token) => {
    if (!token) return false;
    
    // Простая проверка формата (токен должен быть достаточно длинным)
    return typeof token === 'string' && token.length > 32;
  }, []);
  
  // Обеспечение актуального токена
  const ensureToken = useCallback(async () => {
    const currentToken = csrfToken || getTokenFromCookie();
    
    if (isTokenValid(currentToken)) {
      return currentToken;
    }
    
    return await fetchCSRFToken();
  }, [csrfToken, getTokenFromCookie, isTokenValid, fetchCSRFToken]);
  
  // Создание заголовков с CSRF токеном
  const getCSRFHeaders = useCallback(async () => {
    const token = await ensureToken();
    
    if (!token) {
      throw new Error('Не удалось получить CSRF токен');
    }
    
    return {
      'X-CSRF-Token': token,
    };
  }, [ensureToken]);
  
  // Обертка для fetch с автоматическим добавлением CSRF токена
  const csrfFetch = useCallback(async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    
    // Для безопасных методов CSRF не нужен
    if (['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
      return fetch(url, {
        ...options,
        credentials: 'include',
      });
    }
    
    // Для небезопасных методов добавляем CSRF токен
    try {
      const csrfHeaders = await getCSRFHeaders();
      
      const headers = {
        ...options.headers,
        ...csrfHeaders,
      };
      
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers,
      });
      
    } catch (err) {
      console.error('🛡️ Ошибка добавления CSRF токена:', err);
      throw err;
    }
  }, [getCSRFHeaders]);
  
  // Обертка для отправки формы с CSRF токеном
  const submitFormWithCSRF = useCallback(async (url, formData, options = {}) => {
    try {
      const token = await ensureToken();
      
      if (!token) {
        throw new Error('Не удалось получить CSRF токен');
      }
      
      // Добавляем CSRF токен в FormData
      if (formData instanceof FormData) {
        formData.append('csrf_token', token);
      } else if (typeof formData === 'object') {
        formData.csrf_token = token;
      }
      
      const headers = {
        'X-CSRF-Token': token,
        ...options.headers,
      };
      
      return fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: formData instanceof FormData ? formData : JSON.stringify(formData),
        headers: formData instanceof FormData ? headers : {
          'Content-Type': 'application/json',
          ...headers,
        },
        ...options,
      });
      
    } catch (err) {
      console.error('🛡️ Ошибка отправки формы с CSRF токеном:', err);
      throw err;
    }
  }, [ensureToken]);
  
  // Получение токена для использования в JSX формах
  const getFormToken = useCallback(async () => {
    return await ensureToken();
  }, [ensureToken]);
  
  // Инициализация при монтировании компонента
  useEffect(() => {
    // Пытаемся получить токен из cookie при инициализации
    const cookieToken = getTokenFromCookie();
    if (cookieToken) {
      setCSRFToken(cookieToken);
    } else {
      // Если в cookie нет, получаем с сервера в фоне
      fetchCSRFToken();
    }
  }, [getTokenFromCookie, fetchCSRFToken]);
  
  // Периодическое обновление токена
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Обновляем токен каждые 30 минут (токен живет 1 час)
      fetchCSRFToken();
    }, 30 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchCSRFToken]);
  
  return {
    // Состояние
    csrfToken,
    isLoading,
    error,
    
    // Методы
    fetchCSRFToken,
    ensureToken,
    getCSRFHeaders,
    csrfFetch,
    submitFormWithCSRF,
    getFormToken,
    isTokenValid: isTokenValid(csrfToken),
    
    // Утилиты
    getCookie: getTokenFromCookie,
  };
};

// HOC для автоматической защиты компонентов
export const withCSRFProtection = (WrappedComponent) => {
  return function CSRFProtectedComponent(props) {
    const csrf = useCSRFProtection();
    
    return <WrappedComponent {...props} csrf={csrf} />;
  };
};

// Компонент для скрытого поля CSRF токена в формах
export const CSRFTokenInput = ({ name = 'csrf_token' }) => {
  const { csrfToken, getFormToken } = useCSRFProtection();
  const [token, setToken] = useState(csrfToken);
  
  useEffect(() => {
    if (!token) {
      getFormToken().then(setToken);
    }
  }, [token, getFormToken]);
  
  if (!token) {
    return null; // Или loading indicator
  }
  
  return (
    <input
      type="hidden"
      name={name}
      value={token}
    />
  );
};

// Хук для защищенного API клиента
export const useProtectedAPI = () => {
  const { csrfFetch, isLoading, error } = useCSRFProtection();
  
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const url = endpoint.startsWith('http') ? endpoint : createApiUrl(endpoint);
    return csrfFetch(url, options);
  }, [csrfFetch]);
  
  return {
    apiCall,
    isCSRFLoading: isLoading,
    csrfError: error,
  };
};

export default useCSRFProtection;