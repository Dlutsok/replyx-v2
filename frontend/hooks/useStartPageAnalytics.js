import { useEffect, useCallback, useRef } from 'react';
import smartProgressApi from '../utils/smartProgressApi';

/**
 * Хук для отслеживания аналитики на странице /start
 * Автоматически генерирует session_id и отправляет события
 */
export const useStartPageAnalytics = () => {
  const sessionId = useRef(null);
  const startTime = useRef(null);
  const hasTrackedPageView = useRef(false);

  // Генерация уникального session_id
  const generateSessionId = useCallback(() => {
    return 'start_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }, []);

  // Инициализация сессии
  useEffect(() => {
    if (!sessionId.current) {
      sessionId.current = generateSessionId();
      startTime.current = new Date();
      console.log('Start page analytics session initialized:', sessionId.current);
    }
  }, [generateSessionId]);

  // Отправка события
  const trackEvent = useCallback(async (eventType, stepId = null, actionType = null, metadata = null) => {
    if (!sessionId.current) return;

    try {
      const payload = {
        session_id: sessionId.current,
        event_type: eventType,
        step_id: stepId,
        action_type: actionType,
        metadata: metadata,
        user_agent: navigator.userAgent
      };

      await smartProgressApi.post('/api/start/events/track', payload);
      console.log('Analytics event tracked:', eventType, stepId, actionType);
    } catch (error) {
      console.warn('Failed to track analytics event:', error);
    }
  }, []);

  // Отслеживание просмотра страницы (только один раз за сессию)
  const trackPageView = useCallback(() => {
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      trackEvent('page_view', null, null, {
        referrer: document.referrer,
        page_url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  }, [trackEvent]);

  // Отслеживание клика по шагу
  const trackStepClick = useCallback((stepId, metadata = null) => {
    trackEvent('step_click', stepId, null, {
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }, [trackEvent]);

  // Отслеживание завершения шага
  const trackStepComplete = useCallback((stepId, metadata = null) => {
    trackEvent('step_complete', stepId, null, {
      timestamp: new Date().toISOString(),
      completion_time: new Date() - startTime.current,
      ...metadata
    });
  }, [trackEvent]);

  // Отслеживание действия пользователя
  const trackTaskAction = useCallback((stepId, actionType, metadata = null) => {
    trackEvent('task_action', stepId, actionType, {
      timestamp: new Date().toISOString(),
      time_since_start: new Date() - startTime.current,
      ...metadata
    });
  }, [trackEvent]);

  // Отслеживание выхода со страницы
  const trackPageLeave = useCallback(() => {
    if (sessionId.current && startTime.current) {
      const timeOnPage = new Date() - startTime.current;
      
      // Используем sendBeacon для надежной отправки при уходе со страницы
      const payload = JSON.stringify({
        session_id: sessionId.current,
        event_type: 'page_leave',
        metadata: {
          time_on_page: timeOnPage,
          timestamp: new Date().toISOString()
        },
        user_agent: navigator.userAgent
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/start/events/track', payload);
      } else {
        // Fallback для старых браузеров
        trackEvent('page_leave', null, null, {
          time_on_page: timeOnPage,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, [trackEvent]);

  // Установка обработчика для отслеживания ухода со страницы
  useEffect(() => {
    const handleBeforeUnload = () => {
      trackPageLeave();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackPageLeave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [trackPageLeave]);

  return {
    trackPageView,
    trackStepClick,
    trackStepComplete,
    trackTaskAction,
    trackEvent,
    sessionId: sessionId.current
  };
};

/**
 * Хук для более простого использования аналитики шагов
 */
export const useStepAnalytics = (stepId) => {
  const { trackStepClick, trackStepComplete, trackTaskAction } = useStartPageAnalytics();

  const handleStepClick = useCallback((metadata = null) => {
    trackStepClick(stepId, metadata);
  }, [trackStepClick, stepId]);

  const handleStepComplete = useCallback((metadata = null) => {
    trackStepComplete(stepId, metadata);
  }, [trackStepComplete, stepId]);

  const handleTaskAction = useCallback((actionType, metadata = null) => {
    trackTaskAction(stepId, actionType, metadata);
  }, [trackTaskAction, stepId]);

  return {
    handleStepClick,
    handleStepComplete,
    handleTaskAction
  };
};

export default useStartPageAnalytics;