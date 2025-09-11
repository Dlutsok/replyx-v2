/**
 * Утилита для единообразного получения API URL
 * Используется во всех компонентах для избежания дублирования логики
 */

export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    
    // Всегда используем HTTPS для API в продакшене
    if (host === 'replyx.ru' || host === 'www.replyx.ru') {
      return `https://${host}`;
    }
    
    // Для localhost используем бэкенд на порту 8000
    if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) {
      const protocol = window.location.protocol;
      return `${protocol}//localhost:8000`;
    }
    
    // Для других хостов используем HTTPS если это не localhost
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 
      window.location.protocol : 'https:';
    return `${protocol}//${host}`;
  }
  
  // В тестовой среде используем localhost
  if (process.env.NODE_ENV === 'test') {
    return 'http://localhost:8000';
  }
  
  return process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
};

export default getApiUrl;