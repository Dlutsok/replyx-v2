// Конфигурация API
const resolveBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const host = window.location.host;
    
    // Для продакшена используем тот же домен для API
    return `${protocol}//${host}`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
};

const API_CONFIG = {
  BASE_URL: resolveBaseUrl(),
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/login',
      REGISTER: '/api/register',
      LOGOUT: '/api/logout',
      ME: '/api/me',
      CHANGE_PASSWORD: '/api/auth/change-password'
    },
    USER: {
      UPDATE_ACTIVITY: '/api/update-activity'
    }
  }
};

// Функция для создания полного URL
export const createApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Backend URL для API endpoints
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';

// Экспорт конфигурации
export default API_CONFIG;