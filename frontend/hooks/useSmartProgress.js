import { useState, useEffect, useCallback } from 'react';
import smartProgressApi from '../utils/smartProgressApi';

/**
 * Хук для умного отслеживания прогресса на странице /start
 * Проверяет реальное состояние пользователя вместо простого клика кнопок
 */
export const useSmartProgress = () => {
  const [progress, setProgress] = useState({
    step_1_completed: false,  // Создать ассистента
    step_2_completed: false,  // Загрузить документы
    step_3_completed: false,  // Установить виджет
    step_4_completed: false,  // Протестировать
    overall_progress: 0,
    user_authenticated: false,
    loading: true,
    error: null,
    details: {
      assistants_count: 0,
      documents_count: 0,
      dialogs_count: 0,
      widget_events_count: 0
    }
  });

  // Загрузка реального статуса прогресса
  const fetchProgressStatus = useCallback(async () => {
    try {
      setProgress(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await smartProgressApi.get('/api/start/progress/status');
      
      setProgress(prev => ({
        ...prev,
        ...response.data,
        loading: false
      }));
      
      
    } catch (error) {
      
      setProgress(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load progress status'
      }));
    }
  }, []);

  // Отметить копирование виджета
  const markWidgetCopied = useCallback(async () => {
    try {
      await smartProgressApi.post('/api/start/progress/mark-widget-copied');
      
      
      // Обновляем статус сразу локально для быстрого отклика
      setProgress(prev => ({
        ...prev,
        step_3_completed: true,
        overall_progress: Math.min(100, prev.overall_progress + (prev.step_3_completed ? 0 : 25))
      }));
      
      // Затем перезагружаем с сервера для точности
      setTimeout(fetchProgressStatus, 500);
    } catch (error) {
      
    }
  }, [fetchProgressStatus]);

  // Принудительное обновление статуса
  const refreshProgress = useCallback(() => {
    fetchProgressStatus();
  }, [fetchProgressStatus]);

  // Проверка, выполнен ли конкретный шаг
  const isStepCompleted = useCallback((stepId) => {
    switch (stepId) {
      case 1: return progress.step_1_completed;
      case 2: return progress.step_2_completed;
      case 3: return progress.step_3_completed;
      case 4: return progress.step_4_completed;
      default: return false;
    }
  }, [progress]);

  // Получить описание статуса шага
  const getStepStatus = useCallback((stepId) => {
    const completed = isStepCompleted(stepId);
    const details = progress.details || {};
    
    switch (stepId) {
      case 1:
        return {
          completed,
          title: completed ? 'Ассистент создан' : 'Создайте ассистента',
          subtitle: completed 
            ? `У вас есть ${details.assistants_count} ассистент(ов)` 
            : 'Настройте вашего AI-ассистента',
          icon: completed ? '✅' : '🤖',
          actionRequired: !completed
        };
      case 2:
        return {
          completed,
          title: completed ? 'Документы загружены' : 'Загрузите документы',
          subtitle: completed 
            ? `Загружено ${details.documents_count} документ(ов)` 
            : 'Добавьте знания для ассистента',
          icon: completed ? '✅' : '📄',
          actionRequired: !completed
        };
      case 3:
        return {
          completed,
          title: completed ? 'Виджет установлен' : 'Установите виджет',
          subtitle: completed 
            ? 'Виджет скопирован и активен' 
            : 'Скопируйте код на ваш сайт',
          icon: completed ? '✅' : '🔧',
          actionRequired: !completed
        };
      case 4:
        return {
          completed,
          title: completed ? 'Система протестирована' : 'Протестируйте систему',
          subtitle: completed 
            ? `Создано ${details.dialogs_count} диалог(ов)` 
            : 'Проверьте работу ассистента',
          icon: completed ? '✅' : '🧪',
          actionRequired: !completed
        };
      default:
        return {
          completed: false,
          title: 'Неизвестный шаг',
          subtitle: '',
          icon: '❓',
          actionRequired: true
        };
    }
  }, [isStepCompleted, progress.details]);

  // Получить следующий требуемый шаг
  const getNextStep = useCallback(() => {
    for (let stepId = 1; stepId <= 4; stepId++) {
      if (!isStepCompleted(stepId)) {
        return stepId;
      }
    }
    return null; // Все шаги завершены
  }, [isStepCompleted]);

  // Проверить, завершены ли все шаги
  const isAllStepsCompleted = useCallback(() => {
    return progress.step_1_completed && 
           progress.step_2_completed && 
           progress.step_3_completed && 
           progress.step_4_completed;
  }, [progress]);

  // Автоматическая загрузка при монтировании
  useEffect(() => {
    fetchProgressStatus();
  }, [fetchProgressStatus]);

  // Периодическое обновление (каждые 5 минут, если пользователь на странице)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchProgressStatus();
      }
    }, 300000); // 5 минут

    return () => clearInterval(interval);
  }, [fetchProgressStatus]);

  // Обновление при изменении видимости страницы
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchProgressStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchProgressStatus]);

  return {
    progress,
    isStepCompleted,
    getStepStatus,
    getNextStep,
    isAllStepsCompleted,
    markWidgetCopied,
    refreshProgress,
    fetchProgressStatus
  };
};

export default useSmartProgress;