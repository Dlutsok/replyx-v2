import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState('light');

  // Функция для определения мобильного устройства
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= 768;
  };

  useEffect(() => {
    // Проверяем сохраненную тему или системные настройки
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    // На мобильных устройствах всегда используем светлую тему
    const isMobile = isMobileDevice();
    const initialTheme = isMobile ? 'light' : (savedTheme || systemTheme);

    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    // Если на мобильном устройстве была сохранена темная тема, очищаем её
    if (isMobile && savedTheme === 'dark') {
      localStorage.removeItem('theme');
    }
  }, []);

  const toggleTheme = () => {
    // На мобильных устройствах не разрешаем переключение темы
    if (isMobileDevice()) {
      return;
    }

    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return { theme, toggleTheme, isMobile: isMobileDevice() };
}; 