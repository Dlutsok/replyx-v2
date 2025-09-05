# ADR-025: API URL Configuration Strategy

## Status
Accepted

## Date
2025-09-05

## Context

В последних коммитах были внесены критические изменения в стратегию конфигурации API URL, особенно для работы в различных средах (development, testing, production). Изменения затронули:

- `frontend/config/api.js`
- `frontend/pages/chat-iframe.js`
- Build конфигурации Docker containers

### Проблемы старой реализации:
1. **Жесткое кодирование**: URL были захардкожены в разных местах
2. **Проблемы с HTTPS**: некорректная работа в production environments  
3. **Test environment issues**: тесты падали из-за неправильных API endpoints
4. **Отсутствие fallback**: нет резервных механизмов при недоступности API

### Выявленные проблемы:
- `frontend/config/api.js`: не учитывал NODE_ENV для тестов
- `chat-iframe.js`: неправильное определение API URL в зависимости от хоста
- Тесты падали при использовании replyx.ru вместо localhost:8000

## Decision

Принята **многоуровневая стратегия конфигурации API URL** с приоритетами и fallback механизмами:

### 1. Priority-based Configuration
```javascript
// Определение API URL с приоритетами:
// 1. Явный параметр ?api=
// 2. Environment variables
// 3. HOST-based detection
// 4. Fallback defaults

const getApiUrl = () => {
  // Специальная обработка для тестов
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return 'http://localhost:8000';
  }
  
  // Browser environment
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const explicitApi = urlParams.get('api');
    if (explicitApi) return explicitApi;
    
    // Production vs localhost detection
    if (window.location.hostname !== 'localhost') {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
  }
  
  // Final fallback
  return process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
};
```

### 2. Environment-specific Handling
- **Test Environment**: принудительно использует `localhost:8000`
- **Development**: динамическое определение на основе hostname
- **Production**: HTTPS с корректным портом и протоколом

### 3. HTTPS Enforcement
```javascript
// Принудительное использование HTTPS в продакшене
const resolveBaseUrl = (url) => {
  if (url && !url.startsWith('http://localhost')) {
    return url.replace(/^http:/, 'https:');
  }
  return url;
};
```

### 4. Explicit Override Support
Поддержка явного указания API через URL параметры для debugging и integration:
```
https://replyx.ru/chat?api=http://localhost:8000
```

## Implementation Details

### Frontend Configuration (`frontend/config/api.js`)
```javascript
const getBaseUrl = () => {
  // Специальная обработка для тестовой среды
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    console.log('[API Config] Test environment detected, using localhost:8000');
    return 'http://localhost:8000';
  }
  
  // Если есть NEXT_PUBLIC_API_URL, используем его
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('[API Config] Using NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    return resolveBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  }
  
  // Fallback for production
  console.log('[API Config] Using fallback: https://replyx.ru');
  return 'https://replyx.ru';
};
```

### Chat iframe Dynamic Resolution
```javascript
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const explicitApi = urlParams.get('api');
    if (explicitApi) return explicitApi;
    
    // Host-based resolution for backend API
    if (window.location.hostname !== 'localhost') {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'https://replyx.ru';
};
```

### Docker Build Integration
```dockerfile
# Dockerfile поддерживает build-time API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
```

## Configuration Matrix

| Environment | Method | API URL | Fallback |
|-------------|--------|---------|----------|
| **Test** | NODE_ENV detection | `http://localhost:8000` | Hard-coded |
| **Development** | ENV var + hostname | `${protocol}://${hostname}:8000` | `https://replyx.ru` |
| **Production** | ENV var | `https://replyx.ru` | Same |
| **Debug** | URL parameter | `?api=http://custom-api.com` | Above rules |

## Consequences

### Positive:
✅ **Environment isolation**: тесты не ломаются из-за production API
✅ **Flexible debugging**: можно переопределить API через URL
✅ **HTTPS enforcement**: корректная работа в production
✅ **Fallback safety**: система работает даже при отсутствии конфигурации
✅ **Docker compatibility**: поддержка build-time конфигурации

### Negative:
⚠️ **Complexity**: более сложная логика определения URL
⚠️ **Debug overhead**: нужно понимать приоритеты при troubleshooting
⚠️ **Testing dependency**: тесты зависят от правильной конфигурации

### Risks:
🔴 **Mixed content**: HTTP API на HTTPS фронтенде может блокироваться браузером
🔴 **CORS issues**: неправильные URL могут привести к CORS ошибкам

## Testing Strategy

### Unit Tests
```javascript
describe('API URL Configuration', () => {
  test('uses localhost:8000 in test environment', () => {
    process.env.NODE_ENV = 'test';
    expect(getBaseUrl()).toBe('http://localhost:8000');
  });
  
  test('enforces HTTPS for non-localhost URLs', () => {
    expect(resolveBaseUrl('http://replyx.ru')).toBe('https://replyx.ru');
  });
  
  test('preserves localhost HTTP protocol', () => {
    expect(resolveBaseUrl('http://localhost:8000')).toBe('http://localhost:8000');
  });
});
```

### Integration Tests  
- Тестирование в различных browser environments
- Проверка CORS headers для всех supported API URLs
- Валидация fallback behavior при недоступности primary API

## Monitoring

### Metrics to Track:
- API call success rate by resolved URL
- Frequency of fallback usage
- CORS errors by environment
- Test environment stability

### Debug Logging:
```javascript
console.log('[API Config] Resolved API URL:', finalUrl);
console.log('[API Config] Environment:', process.env.NODE_ENV);
console.log('[API Config] Method used:', resolutionMethod);
```

## Security Considerations

### Allowed API URLs
Рассмотреть whitelist разрешенных API URLs для предотвращения injection attacks:

```javascript
const ALLOWED_API_HOSTS = [
  'localhost:8000',
  'replyx.ru',
  'api.replyx.ru'
];

const validateApiUrl = (url) => {
  const parsedUrl = new URL(url);
  return ALLOWED_API_HOSTS.includes(parsedUrl.host);
};
```

## Related ADRs

- ADR-024: WebSocket Reconnection Strategy (API URL влияет на WebSocket endpoints)
- ADR-002: Repository Structure (конфигурация в frontend/config/)

## Future Considerations

1. **Service Discovery**: автоматическое обнаружение API endpoints
2. **Load Balancer Support**: поддержка multiple API URLs для балансировки
3. **Environment Variables Validation**: проверка корректности API URLs на старте
4. **API Gateway Integration**: централизованная точка входа для всех API calls