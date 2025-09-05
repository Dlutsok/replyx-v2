import React, { createContext, useState, useCallback } from 'react';
import NotificationContainer from '../components/ui/NotificationContainer';

// Создаем контекст для уведомлений
const NotificationContext = createContext(null);

// Провайдер уведомлений в стиле ReplyX
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  // Генерируем уникальный ID для уведомления
  const generateId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }, []);

  // Добавляем новое уведомление
  const addNotification = useCallback((notification) => {
    const id = generateId();
    const newNotification = {
      id,
      createdAt: Date.now(),
      autoClose: true,
      duration: 5000, // По умолчанию 5 секунд
      position: 'topRight',
      ...notification,
    };

    setNotifications(prev => [...prev, newNotification]);

    // Автоматическое закрытие
    if (newNotification.autoClose && newNotification.duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
      }, newNotification.duration);
    }

    return id;
  }, [generateId]);

  // Удаляем уведомление
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Очищаем все уведомления
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Вспомогательные методы для разных типов уведомлений
  const showSuccess = useCallback((message, options = {}) => {
    return addNotification({
      type: 'success',
      message,
      ...options
    });
  }, [addNotification]);

  const showError = useCallback((message, options = {}) => {
    return addNotification({
      type: 'error',
      message,
      duration: 7000, // Ошибки показываем дольше
      ...options
    });
  }, [addNotification]);

  const showWarning = useCallback((message, options = {}) => {
    return addNotification({
      type: 'warning',
      message,
      duration: 6000,
      ...options
    });
  }, [addNotification]);

  const showInfo = useCallback((message, options = {}) => {
    return addNotification({
      type: 'info',
      message,
      ...options
    });
  }, [addNotification]);

  const showLoading = useCallback((message, options = {}) => {
    return addNotification({
      type: 'loading',
      message,
      autoClose: false, // Loading уведомления не закрываются автоматически
      ...options
    });
  }, [addNotification]);

  // Обновляем существующее уведомление (полезно для loading состояний)
  const updateNotification = useCallback((id, updates) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, ...updates }
          : notification
      )
    );
  }, []);

  const contextValue = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning, 
    showInfo,
    showLoading,
    updateNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </NotificationContext.Provider>
  );
}


export default NotificationContext;