// Конфигурация API
const resolveBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    
    // Всегда используем HTTPS для API в продакшене
    if (host === 'replyx.ru' || host === 'www.replyx.ru') {
      return `https://${host}`;
    }
    
    // Для localhost используем текущий протокол
    const protocol = window.location.protocol;
    return `${protocol}//${host}`;
  }
  
  // В тестовой среде используем localhost
  if (process.env.NODE_ENV === 'test') {
    return 'http://localhost:8000';
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

// Backend URL для API endpoints (используем ту же логику что и BASE_URL)
export const API_URL = resolveBaseUrl();

// Экспорт конфигурации
export default API_CONFIG;