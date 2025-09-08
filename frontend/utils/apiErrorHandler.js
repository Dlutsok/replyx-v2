/**
 * Утилиты для обработки ошибок API
 */

/**
 * Очищает технические ошибки и заменяет их понятными пользователю
 * @param {string} message - Исходное сообщение об ошибке
 * @returns {string} Очищенное сообщение
 */
export function sanitizeTechnicalError(message) {
  if (!message || typeof message !== 'string') {
    return 'У нас возникли небольшие технические проблемы. Пожалуйста, попробуйте позже.';
  }

  const technicalPatterns = [
    // AI/Provider related errors
    /legacy fallback disabled/i,
    /new provider system/i,
    /check ai_providers_available/i,
    /\[ошибка анализа:/i,
    /model gpt-4o/i,
    /provider system should handle/i,
    
    // Database/SQL errors
    /postgresql/i,
    /sqlite/i,
    /mysql/i,
    /database connection/i,
    /sql error/i,
    /foreign key constraint/i,
    /unique constraint/i,
    
    // Python/Backend errors
    /traceback \(most recent call last\)/i,
    /file ".*\.py"/i,
    /python/i,
    /exception:/i,
    /attributeerror/i,
    /keyerror/i,
    /valueerror/i,
    /typeerror/i,
    /indexerror/i,
    /nameerror/i,
    
    // API/Network errors
    /internal server error/i,
    /500 internal/i,
    /502 bad gateway/i,
    /503 service/i,
    /504 gateway timeout/i,
    /connection refused/i,
    /connection timeout/i,
    /network error/i,
    /cors error/i,
    
    // Generic technical patterns
    /error:/i,
    /exception in/i,
    /stack trace/i,
    /at \w+\./i,
    /line \d+/i,
    /module '\w+'/i,
    /function \w+/i,
    /\w+\.\w+\(\)/i,
  ];

  // Проверяем, содержит ли сообщение технические паттерны
  const hasTechnicalError = technicalPatterns.some(pattern => pattern.test(message));
  
  if (hasTechnicalError) {
    return 'У нас возникли небольшие технические проблемы. Пожалуйста, попробуйте позже.';
  }

  // Специфические замены для частых случаев
  const replacements = [
    {
      pattern: /failed to fetch/i,
      replacement: 'Проблема с подключением. Проверьте интернет-соединение.'
    },
    {
      pattern: /timeout/i,
      replacement: 'Время ожидания истекло. Попробуйте позже.'
    },
    {
      pattern: /unauthorized/i,
      replacement: 'Необходима повторная авторизация.'
    },
    {
      pattern: /forbidden/i,
      replacement: 'Недостаточно прав доступа.'
    },
    {
      pattern: /not found/i,
      replacement: 'Запрашиваемый ресурс не найден.'
    },
    {
      pattern: /rate limit/i,
      replacement: 'Слишком много запросов. Попробуйте через минуту.'
    }
  ];

  let cleanMessage = message;
  
  for (const { pattern, replacement } of replacements) {
    if (pattern.test(cleanMessage)) {
      cleanMessage = replacement;
      break;
    }
  }

  return cleanMessage;
}

/**
 * Парсит ошибку API и возвращает человекочитаемое сообщение
 * @param {Object} data - Данные ответа от API
 * @param {string} defaultMessage - Сообщение по умолчанию
 * @returns {string} Сообщение об ошибке
 */
export function parseApiError(data, defaultMessage = 'Неизвестная ошибка') {
  if (!data) return sanitizeTechnicalError(defaultMessage);
  
  let rawMessage = '';
  
  // Если есть прямое поле message
  if (data.message && typeof data.message === 'string') {
    rawMessage = data.message;
  }
  
  // Если есть поле detail
  else if (data.detail) {
    // Если detail это строка
    if (typeof data.detail === 'string') {
      rawMessage = data.detail;
    }
    
    // Если detail это объект (например, rate limiting)
    else if (typeof data.detail === 'object') {
      // Проверяем различные поля в объекте detail
      if (data.detail.message) {
        rawMessage = data.detail.message;
      } else if (data.detail.error) {
        rawMessage = data.detail.error;
      }
    }
  }
  
  // Если есть поле error
  else if (data.error && typeof data.error === 'string') {
    rawMessage = data.error;
  }
  
  // Если ничего не найдено, используем сообщение по умолчанию
  if (!rawMessage) {
    rawMessage = defaultMessage;
  }
  
  // Очищаем техническое сообщение
  return sanitizeTechnicalError(rawMessage);
}

/**
 * Обрабатывает ответ fetch и возвращает данные или выбрасывает ошибку
 * @param {Response} response - Ответ fetch
 * @param {string} defaultErrorMessage - Сообщение об ошибке по умолчанию
 * @returns {Promise<Object>} Данные ответа
 * @throws {Error} Ошибка с человекочитаемым сообщением
 */
export async function handleApiResponse(response, defaultErrorMessage = 'Ошибка сервера') {
  let data = null;
  
  // Пытаемся получить данные ответа
  try {
    data = await response.json();
  } catch (jsonError) {
    // Если не удалось получить JSON, используем текст
    try {
      const text = await response.text();
      data = { detail: text || `HTTP ${response.status}` };
    } catch (textError) {
      data = { detail: `HTTP ${response.status}: ${response.statusText}` };
    }
  }
  
  if (response.ok) {
    return data;
  }
  
  // Обрабатываем специфичные коды статусов
  let errorMessage;
  switch (response.status) {
    case 400:
      errorMessage = parseApiError(data, 'Неверные данные запроса');
      break;
    case 401:
      errorMessage = 'Необходима авторизация. Пожалуйста, войдите в систему.';
      break;
    case 403:
      errorMessage = 'Недостаточно прав доступа';
      break;
    case 404:
      errorMessage = 'Запрашиваемый ресурс не найден';
      break;
    case 405:
      errorMessage = 'Метод не поддерживается сервером';
      break;
    case 409:
      errorMessage = parseApiError(data, 'Конфликт данных');
      break;
    case 422:
      errorMessage = parseApiError(data, 'Ошибка валидации данных');
      break;
    case 429:
      errorMessage = parseApiError(data, 'Слишком много запросов. Попробуйте позже.');
      break;
    case 500:
      errorMessage = 'Внутренняя ошибка сервера';
      break;
    case 502:
    case 503:
      errorMessage = 'Сервер временно недоступен';
      break;
    default:
      errorMessage = parseApiError(data, defaultErrorMessage);
  }
  
  const error = new Error(errorMessage);
  error.status = response.status;
  error.response = response;
  error.data = data;
  throw error;
}

/**
 * Выполняет API запрос с обработкой ошибок
 * @param {string} url - URL для запроса
 * @param {Object} options - Опции fetch
 * @param {string} defaultErrorMessage - Сообщение об ошибке по умолчанию
 * @returns {Promise<Object>} Данные ответа
 * @throws {Error} Ошибка с человекочитаемым сообщением
 */
export async function apiRequest(url, options = {}, defaultErrorMessage = 'Ошибка сервера') {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    return await handleApiResponse(response, defaultErrorMessage);
  } catch (error) {
    // Если это уже обработанная ошибка API, пробрасываем как есть
    if (error.message !== 'Failed to fetch') {
      throw error;
    }
    
    // Ошибка сети
    throw new Error('Не удалось подключиться к серверу. Проверьте интернет-соединение.');
  }
}

/**
 * Специальные обработчики для разных типов ошибок
 */
export const ErrorHandlers = {
  /**
   * Обработчик для ошибок аутентификации
   */
  auth: {
    login: (data) => parseApiError(data, 'Ошибка входа в систему'),
    register: (data) => parseApiError(data, 'Ошибка регистрации'),
    forgotPassword: (data) => parseApiError(data, 'Ошибка при отправке инструкций'),
    resetPassword: (data) => parseApiError(data, 'Ошибка при изменении пароля'),
    validateToken: (data) => parseApiError(data, 'Недействительный или истекший токен'),
  },
  
  /**
   * Обработчик для общих ошибок
   */
  common: {
    network: () => 'Не удалось подключиться к серверу. Попробуйте снова позже.',
    rateLimited: (data) => {
      if (data?.detail?.message) {
        return data.detail.message;
      }
      return 'Слишком много запросов. Попробуйте позже.';
    },
    serverError: () => 'Внутренняя ошибка сервера. Попробуйте позже.',
  }
};

/**
 * Выполняет API запрос с автоматическими ретраями для восстанавливаемых ошибок
 * @param {string} url - URL для запроса
 * @param {Object} options - Опции fetch
 * @param {Object} retryConfig - Настройки ретраев
 * @returns {Promise<Object>} Данные ответа
 */
export async function apiRequestWithRetry(url, options = {}, retryConfig = {}) {
  const {
    maxRetries = 2,
    initialDelay = 1000,
    maxDelay = 5000,
    backoffMultiplier = 2,
    retryCondition = (error) => {
      // Ретраим только сетевые ошибки и 5xx ошибки
      return !error.status || (error.status >= 500 && error.status < 600);
    }
  } = retryConfig;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest(url, options);
    } catch (error) {
      lastError = error;
      
      // Проверяем, нужно ли ретраить
      if (attempt < maxRetries && retryCondition(error)) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );
        
        console.warn(`API request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      break;
    }
  }
  
  throw lastError;
}

/**
 * Создает обработчик для конкретного контекста с показом уведомлений
 * @param {Function} showToast - Функция показа уведомлений
 * @param {string} context - Контекст операции
 * @returns {Function} Обработчик ошибок
 */
export function createErrorHandler(showToast, context = '') {
  return (error, customMessage = null) => {
    const message = customMessage || error.message || 'Произошла ошибка';
    const fullMessage = context ? `${context}: ${message}` : message;
    
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    
    if (showToast) {
      showToast(fullMessage, 'error');
    }
    
    return fullMessage;
  };
}

/**
 * Проверяет, является ли ошибка восстанавливаемой
 * @param {Error} error - Объект ошибки
 * @returns {boolean} true, если ошибка может быть восстановлена ретраем
 */
export function isRecoverableError(error) {
  // Сетевые ошибки
  if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
    return true;
  }
  
  // 5xx ошибки сервера
  if (error.status && error.status >= 500 && error.status < 600) {
    return true;
  }
  
  // Таймауты
  if (error.name === 'AbortError') {
    return true;
  }
  
  return false;
}

export default {
  sanitizeTechnicalError,
  parseApiError,
  handleApiResponse,
  apiRequest,
  apiRequestWithRetry,
  createErrorHandler,
  isRecoverableError,
  ErrorHandlers,
};