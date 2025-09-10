import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config/api';

/**
 * Hook для работы с административными настройками системы
 * Предоставляет функции для загрузки, обновления и тестирования настроек
 */
export const useAdminSettings = (options = {}) => {
  const { 
    autoRefresh = false, 
    refreshInterval = 30000,
    category = null // Фильтр по категории
  } = options;

  // Состояние
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Получение настроек с сервера
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен аутентификации не найден');
      }

      const url = category 
        ? `${API_URL}/api/admin/settings?category=${category}`
        : `${API_URL}/api/admin/settings`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Группируем настройки по категориям для удобства использования
      const groupedSettings = {};
      data.categories?.forEach(categoryData => {
        groupedSettings[categoryData.category] = {};
        categoryData.settings?.forEach(setting => {
          groupedSettings[categoryData.category][setting.key] = {
            ...setting,
            originalValue: setting.value // Сохраняем оригинальное значение для отслеживания изменений
          };
        });
      });

      setSettings(groupedSettings);
      setLastUpdated(data.last_updated ? new Date(data.last_updated) : new Date());
      
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  // Обновление значения настройки локально (без сохранения)
  const updateSetting = useCallback((category, key, value) => {
    setSettings(prev => {
      if (!prev[category] || !prev[category][key]) {
        return prev;
      }

      return {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: {
            ...prev[category][key],
            value: value
          }
        }
      };
    });
  }, []);

  // Сохранение настроек на сервер
  const saveSettings = useCallback(async (categoriesToSave = null, showSuccessMessage = true) => {
    try {
      setIsSaving(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен аутентификации не найден');
      }

      // Собираем изменения для отправки
      const updates = [];
      const targetCategories = categoriesToSave || Object.keys(settings);

      targetCategories.forEach(cat => {
        if (!settings[cat]) return;
        
        Object.entries(settings[cat]).forEach(([key, setting]) => {
          if (setting.value !== setting.originalValue) {
            updates.push({
              category: cat,
              key: key,
              value: setting.value
            });
          }
        });
      });

      if (updates.length === 0) {
        if (showSuccessMessage) {
        }
        return { success: true, message: 'Нет изменений для сохранения', updatedCount: 0 };
      }

      // Отправляем массовое обновление
      const response = await fetch(`${API_URL}/api/admin/settings/bulk-update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Обновляем originalValue для сохраненных настроек
      setSettings(prev => {
        const updated = { ...prev };
        updates.forEach(update => {
          if (updated[update.category] && updated[update.category][update.key]) {
            updated[update.category][update.key].originalValue = update.value;
          }
        });
        return updated;
      });

      setLastUpdated(new Date());
      
      
      return { 
        success: true, 
        message: `Сохранено ${updates.length} настроек`, 
        updatedCount: updates.length,
        errors: result.errors
      };

    } catch (err) {
      setError(`Ошибка сохранения настроек: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  // Сохранение конкретной категории
  const saveCategorySettings = useCallback(async (categoryName) => {
    return await saveSettings([categoryName]);
  }, [saveSettings]);

  // Отмена изменений в настройке
  const resetSetting = useCallback((category, key) => {
    setSettings(prev => {
      if (!prev[category] || !prev[category][key]) {
        return prev;
      }

      return {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: {
            ...prev[category][key],
            value: prev[category][key].originalValue
          }
        }
      };
    });
  }, []);

  // Отмена всех изменений в категории
  const resetCategorySettings = useCallback((categoryName) => {
    if (!settings[categoryName]) return;

    setSettings(prev => {
      const resetCategory = {};
      Object.entries(prev[categoryName]).forEach(([key, setting]) => {
        resetCategory[key] = {
          ...setting,
          value: setting.originalValue
        };
      });

      return {
        ...prev,
        [categoryName]: resetCategory
      };
    });
  }, [settings]);

  // Тестирование настройки перед применением
  const testSetting = useCallback(async (category, key, testValue) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен аутентификации не найден');
      }

      const response = await fetch(`${API_URL}/api/admin/settings/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category,
          key,
          test_value: testValue
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (err) {
      return {
        success: false,
        message: `Ошибка тестирования: ${err.message}`
      };
    }
  }, []);

  // Получение доступных категорий настроек
  const getSettingsCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Токен аутентификации не найден');
      }

      const response = await fetch(`${API_URL}/api/admin/settings/categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.categories || [];

    } catch (err) {
      return [];
    }
  }, []);

  // Проверка наличия несохраненных изменений
  const hasUnsavedChanges = useCallback((categoryName = null) => {
    const categoriesToCheck = categoryName ? [categoryName] : Object.keys(settings);
    
    return categoriesToCheck.some(cat => {
      if (!settings[cat]) return false;
      return Object.values(settings[cat]).some(setting => 
        setting.value !== setting.originalValue
      );
    });
  }, [settings]);

  // Получение количества несохраненных изменений
  const getUnsavedChangesCount = useCallback((categoryName = null) => {
    const categoriesToCheck = categoryName ? [categoryName] : Object.keys(settings);
    
    return categoriesToCheck.reduce((count, cat) => {
      if (!settings[cat]) return count;
      return count + Object.values(settings[cat]).filter(setting => 
        setting.value !== setting.originalValue
      ).length;
    }, 0);
  }, [settings]);

  // Автоматическое обновление настроек
  useEffect(() => {
    fetchSettings();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchSettings, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSettings, autoRefresh, refreshInterval]);

  return {
    // Данные
    settings,
    isLoading,
    isSaving,
    error,
    lastUpdated,

    // Функции
    fetchSettings,
    updateSetting,
    saveSettings,
    saveCategorySettings,
    resetSetting,
    resetCategorySettings,
    testSetting,
    getSettingsCategories,

    // Утилиты
    hasUnsavedChanges,
    getUnsavedChangesCount,
    
    // Очистка ошибок
    clearError: () => setError(null)
  };
};

export default useAdminSettings;