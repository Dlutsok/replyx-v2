// Конфигурация API
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/login',
      REGISTER: '/api/register',
      LOGOUT: '/api/logout',
      ME: '/api/me',
      CHANGE_PASSWORD: '/api/auth/change-password',
      YANDEX_LOGIN: '/api/auth/yandex/login'
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

// Экспорт конфигурации
export default API_CONFIG;