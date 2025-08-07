import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/router';
import API_CONFIG, { createApiUrl } from '../config/api';

// Контекст авторизации
const AuthContext = createContext();

// Публичные маршруты (не требуют авторизации)
const PUBLIC_ROUTES = [
  '/',
  '/landing',
  '/login',
  '/register', 
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/oauth-redirect',
  '/accept-invitation',
  '/terms',
  '/privacy',
  '/chat-iframe'  // Добавляем iframe чат как публичный маршрут
];

// Хук для использования контекста авторизации
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Провайдер авторизации
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Мгновенная проверка localStorage при каждом рендере
  const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('token') : false;

  // Проверка токена при загрузке
  useEffect(() => {
    // Быстрая предварительная проверка токена
    const token = localStorage.getItem('token');
    if (token) {
      // Если токен есть, предположительно пользователь авторизован
      setIsAuthenticated(true);
    }
    
    checkAuth();
  }, []);

  // Проверка авторизации на изменении маршрута
  useEffect(() => {
    const handleRouteChange = (url) => {
      const currentPath = url.split('?')[0]; // Убираем query parameters
      const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
      
      if (!isPublicRoute && !isAuthenticated && !isLoading) {
            console.warn('Route protection triggered, FORCING redirect:', currentPath);
            window.location.replace('/landing');
          }
    };

    const handleRouteChangeStart = (url) => {
      const currentPath = url.split('?')[0];
      const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
      
      // Предварительная проверка при начале перехода
      if (!isPublicRoute && !isAuthenticated && !isLoading) {
            console.warn('Blocking navigation to protected route:', currentPath);
            window.location.replace('/landing');
            throw 'Route change aborted - redirecting to landing'; // Прерываем навигацию
          }
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [isAuthenticated, isLoading, router]);

  // Принудительная защита: мгновенная проверка localStorage
  useEffect(() => {
    if (!isLoading) {
      const currentPath = router.pathname;
      const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
      
      // Если нет токена и мы на защищенной странице - мгновенный редирект
      if (!hasToken && !isPublicRoute) {
        console.warn('No token found, FORCING redirect to landing from:', currentPath);
        window.location.replace('/landing');
        return;
      }
      
      // Если нет авторизации в состоянии, но есть на защищенной странице
      if (!isAuthenticated && !isPublicRoute && hasToken) {
        console.warn('Authentication state lost but token exists, FORCING redirect from:', currentPath);
        window.location.replace('/landing');
      }
    }
  }, [isAuthenticated, isLoading, hasToken, router]);

  // Функция для обновления активности пользователя
  const updateActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(createApiUrl(API_CONFIG.ENDPOINTS.USER.UPDATE_ACTIVITY), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsLoading(false);
        redirectIfNeeded();
        return;
      }

      // Проверяем токен на сервере
      const response = await fetch(createApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('role', userData.role);
        localStorage.setItem('currentBalance', userData.plan || 'free');
        // Обновляем активность при успешной проверке
        await updateActivity();
      } else {
        // Токен недействителен
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const redirectIfNeeded = () => {
    const currentPath = router.pathname;
    const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
    
    // Для публичных маршрутов - проверяем токен немедленно
    if (isPublicRoute && isAuthenticated) {
      // Исключения: oauth-redirect должен завершить процесс авторизации
      if (currentPath !== '/oauth-redirect') {
        router.replace('/dashboard');
        return;
      }
    }
    
    // Для приватных маршрутов - немедленно перенаправляем на landing
    if (!isPublicRoute && !isAuthenticated) {
      console.warn('Unauthorized access to private route:', currentPath);
      router.replace('/landing');
    }
  };

  // Автоматическое обновление активности каждые 2 минуты
  useEffect(() => {
    if (user) {
      const interval = setInterval(updateActivity, 2 * 60 * 1000); // 2 минуты
      return () => clearInterval(interval);
    }
  }, [user]);

  // Обновление активности при активности пользователя (клики, движение мыши)
  useEffect(() => {
    if (user) {
      let activityTimer;
      
      const resetActivityTimer = () => {
        clearTimeout(activityTimer);
        activityTimer = setTimeout(updateActivity, 30000); // Обновляем через 30 секунд после активности
      };

      const handleActivity = () => {
        resetActivityTimer();
      };

      document.addEventListener('mousedown', handleActivity);
      document.addEventListener('mousemove', handleActivity);
      document.addEventListener('keypress', handleActivity);
      document.addEventListener('scroll', handleActivity);
      document.addEventListener('touchstart', handleActivity);

      return () => {
        clearTimeout(activityTimer);
        document.removeEventListener('mousedown', handleActivity);
        document.removeEventListener('mousemove', handleActivity);
        document.removeEventListener('keypress', handleActivity);
        document.removeEventListener('scroll', handleActivity);
        document.removeEventListener('touchstart', handleActivity);
      };
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const response = await fetch(createApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.plan); // Сохраняем план как роль временно
        localStorage.setItem('currentBalance', data.plan || 'free');
        
        // Устанавливаем состояние авторизации
        setIsAuthenticated(true);
        
        // Получаем данные пользователя
        await checkAuth();
        
        // Редиректим только если мы не на дашборде
        if (router.pathname !== '/dashboard') {
          router.push('/dashboard');
        }
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.detail || 'Неверный email или пароль.' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: 'Не удалось подключиться к серверу. Попробуйте снова позже.' 
      };
    }
  };

  const register = async (email, password, firstName) => {
    try {
      const response = await fetch(createApiUrl(API_CONFIG.ENDPOINTS.AUTH.REGISTER), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          first_name: firstName 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        return { 
          success: true, 
          message: 'Регистрация успешна! Проверьте почту и введите код подтверждения.' 
        };
      } else {
        return { 
          success: false, 
          error: data.detail || 'Ошибка регистрации' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: 'Не удалось подключиться к серверу. Попробуйте снова позже.' 
      };
    }
  };

  const logout = async () => {
    // КРИТИЧНО: Немедленно блокируем интерфейс и очищаем состояние
    setIsAuthenticated(false);
    setUser(null);
    setIsLoading(true); // Показываем загрузку для блокировки UI
    
    // Немедленная очистка localStorage
    const keysToRemove = ['token', 'role', 'currentBalance', 'currentPlan', 'userId', 'userEmail'];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    
    try {
      const token = localStorage.getItem('token');
      
      // Вызываем серверный logout endpoint если токен был
      if (token) {
        await fetch(createApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGOUT), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    
    // ПРИНУДИТЕЛЬНОЕ перенаправление - немедленно без задержек
    window.location.replace('/landing');
  };

  // КРИТИЧНО: Мгновенная проверка на основе localStorage
  const effectiveIsAuthenticated = hasToken && isAuthenticated;

  const value = {
    user,
    isLoading,
    isAuthenticated: effectiveIsAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    updateActivity,
    publicRoutes: PUBLIC_ROUTES
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// HOC для защиты маршрутов
export const withAuth = (WrappedComponent, options = {}) => {
  return function ProtectedRoute(props) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();
    const { adminOnly = false } = options;

    useEffect(() => {
      // Проверка авторизации
      if (!isLoading && !isAuthenticated) {
        console.warn('Unauthorized access attempt to:', router.pathname);
        router.replace('/landing');
        return;
      }

      // Проверка прав админа если требуется
      if (!isLoading && isAuthenticated && adminOnly && user?.role !== 'admin') {
        console.warn('Admin access required for:', router.pathname);
        router.replace('/dashboard');
        return;
      }
    }, [isAuthenticated, isLoading, user, router, adminOnly]);

    // Показываем загрузку
    if (isLoading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#6366f1'
        }}>
          Проверка авторизации...
        </div>
      );
    }

    // Блокируем доступ неавторизованным
    if (!isAuthenticated) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#ef4444'
        }}>
          Доступ запрещен. Перенаправляем...
        </div>
      );
    }

    // Блокируем доступ не-админам к админским страницам
    if (adminOnly && user?.role !== 'admin') {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#ef4444'
        }}>
          Требуются права администратора. Перенаправляем...
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

export default useAuth;