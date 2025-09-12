/**
 * Яндекс.Метрика для SPA (Single Page Application)
 * Правильное отслеживание переходов в личном кабинете
 */

export const ym = (...args) => {
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(...args);
  }
};

/**
 * Отправить виртуальный просмотр страницы (для SPA роутинга)
 */
export const ymHit = (url, options = {}) => {
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(104132878, 'hit', url, {
      title: document.title,
      referer: window.location.href,
      ...options
    });
  }
};

/**
 * Отправить цель (событие)
 */
export const ymReachGoal = (target, params = {}) => {
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(104132878, 'reachGoal', target, params);
  }
};

/**
 * Принудительная отправка данных (для критичных событий)
 */
export const ymNotBounce = () => {
  if (typeof window !== 'undefined' && window.ym) {
    window.ym(104132878, 'notBounce');
  }
};