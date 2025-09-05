# Архитектура CSP Middleware для виджетной системы ReplyX

**Версия:** 2.0 (Backend-First Security)  
**Дата обновления:** 05 сентября 2025  
**Статус:** Production Ready ✅

## Обзор

CSP (Content Security Policy) Middleware обеспечивает динамическую генерацию заголовков безопасности для iframe виджетов на основе валидных JWT токенов. Архитектура построена по принципу "Backend-First Security" - все критические проверки выполняются на защищенном сервере.

## Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Website                           │
│  https://stencom.ru/                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │ iframe src="/chat-iframe?site_token=..."
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              middleware.js                                  ││
│  │                                                             ││
│  │ 1. Проверяет путь /chat-iframe                             ││
│  │ 2. Извлекает site_token из query                          ││  
│  │ 3. HTTP POST → /api/validate-widget-token                  ││
│  │ 4. Генерирует CSP на основе ответа                        ││
│  └─────────────────────┬───────────────────────────────────────┘│
└───────────────────────┼─────────────────────────────────────────┘
                        │ HTTP POST
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │         /api/validate-widget-token                          ││
│  │                                                             ││
│  │ 1. Декодирует JWT с SITE_SECRET                            ││
│  │ 2. Проверяет assistant_id в PostgreSQL                     ││
│  │ 3. Сравнивает актуальные домены с токеном                  ││
│  │ 4. Возвращает {valid: true, allowed_domains: "..."}        ││
│  └─────────────────────┬───────────────────────────────────────┘│
└───────────────────────┼─────────────────────────────────────────┘
                        │ SELECT allowed_domains
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                          │
│  assistants table: id, allowed_domains, updated_at             │
└─────────────────────────────────────────────────────────────────┘
```

## Компоненты системы

### 1. Frontend Middleware (`frontend/middleware.js`)

**Ответственность:**
- Перехват запросов к `/chat-iframe/*`
- Извлечение `site_token` из query параметров
- HTTP вызовы к backend API для валидации
- Генерация CSP заголовков на основе backend ответа

**Конфигурация:**
```javascript
const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

**Логика обработки:**
```javascript
// 1. Проверка пути
if (!pathname.startsWith('/chat-iframe')) {
    return NextResponse.next()
}

// 2. Валидация через backend
const response = await fetch(`${BACKEND_API_URL}/api/validate-widget-token`, {
    method: 'POST',
    body: JSON.stringify({ token: siteToken })
})

// 3. Генерация CSP
const dynamicCSP = generateCSPHeader(allowedDomains)
response.headers.set('Content-Security-Policy', dynamicCSP)
```

### 2. Backend API (`backend/api/assistants.py`)

**Endpoint:** `POST /api/validate-widget-token`

**Входные данные:**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "domain": "stencom.ru" // опционально
}
```

**Выходные данные:**
```json
{
    "valid": true,
    "assistant_id": 123,
    "allowed_domains": "stencom.ru,www.stencom.ru",
    "user_id": 456
}
```

**Логика валидации:**
1. JWT декодирование с `SITE_SECRET`
2. Проверка структуры токена (`assistant_id`, `allowed_domains`)
3. Поиск ассистента в БД
4. Сравнение актуальных доменов с токеном
5. Проверка срока действия (если указан `exp`)

### 3. Backend CSP Middleware (`backend/core/dynamic_csp_middleware.py`)

**Статус:** Deprecated (заменен на frontend middleware)

Ранее отвечал за динамическую генерацию CSP на backend стороне, но архитектура была изменена на frontend-based подход для лучшей производительности.

## Формат JWT токенов

### Структура payload
```json
{
    "user_id": 123,
    "assistant_id": 456,
    "type": "site",
    "allowed_domains": "stencom.ru,www.stencom.ru",
    "domains_hash": 1234567890,
    "issued_at": 1757081932,
    "exp": 1757085532  // опционально
}
```

### Генерация токенов
```python
# Используется в /api/assistants/{id}/embed-code
payload = {
    'user_id': current_user.id,
    'assistant_id': assistant_id,
    'allowed_domains': assistant.allowed_domains,
    'issued_at': int(time.time())
}
token = jwt.encode(payload, SITE_SECRET, algorithm='HS256')
```

## CSP заголовки

### Динамический CSP (валидный токен)
```
frame-ancestors 'self' https://replyx.ru https://www.replyx.ru https://stencom.ru https://www.stencom.ru http://stencom.ru;
default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;
script-src 'self' 'unsafe-inline' 'unsafe-eval' https:;
style-src 'self' 'unsafe-inline' https:;
img-src 'self' data: blob: https:;
connect-src 'self' https: wss: ws:;
font-src 'self' https:
```

### Ограничительный CSP (невалидный токен)
```
frame-ancestors 'self';
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' data:;
connect-src 'self'
```

## Конфигурация окружений

### Development (`.env`)
```env
BACKEND_API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
SITE_SECRET=your-site-secret-key
```

### Production (`Deployed/.env.production`)
```env
BACKEND_API_URL=http://backend:8000
SITE_SECRET=production-secret-key-here
```

## Безопасность

### Принципы безопасности

1. **Backend-First Validation**
   - Все JWT валидации происходят на protected backend
   - Frontend не имеет доступа к `SITE_SECRET`
   - Невозможно подделать валидацию на клиентской стороне

2. **Database Consistency**
   - Проверка актуальности доменов через БД
   - Защита от использования устаревших токенов
   - Синхронизация с изменениями в панели управления

3. **Minimal Attack Surface**
   - Frontend middleware - только прокси к backend API
   - Нет криптографических операций в браузере
   - Ограничительный CSP по умолчанию

### Защита от атак

**Replay Attack Protection:**
- Проверка актуальности доменов в БД
- Опциональная проверка срока действия токена

**Token Forgery Protection:**
- JWT подписывается секретом, доступным только backend
- Невозможность создания валидного токена без знания секрета

**Domain Hijacking Protection:**
- Проверка соответствия домена в токене текущим настройкам ассистента
- Автоматическая инвалидация при изменении доменов

## Производительность

### Кеширование
```javascript
// Можно добавить кеширование результатов валидации
const cacheKey = `widget_token_${tokenHash}`
const cachedResult = await redis.get(cacheKey)
if (cachedResult) return JSON.parse(cachedResult)
```

### Оптимизации
- Минимизация SQL запросов (индексы на `assistant_id`)
- Быстрый фолбэк на ограничительный CSP при ошибках
- Отсутствие блокирующих операций в middleware

## Мониторинг и логирование

### Ключевые метрики
- Время ответа `/api/validate-widget-token`
- Процент успешных валидаций токенов
- CSP нарушения в браузерах
- Частота ошибок недоступности backend

### Логирование
```javascript
// Frontend middleware
console.log(`✅ CSP: Разрешенные домены для assistant_id=${tokenInfo.assistant_id}: ${allowedDomains}`)

// Backend API
logger.info(f"Widget token validated successfully: assistant_id={assistant_id}")
```

## Troubleshooting

### Типичные проблемы

**1. CSP блокирует iframe**
```
Проверить: актуальность токена, корректность доменов, работоспособность /api/validate-widget-token
```

**2. Backend API недоступен**
```
Результат: применяется ограничительный CSP
Решение: проверить BACKEND_API_URL, доступность сервиса
```

**3. Токен невалидный**
```
Причины: истек срок, изменились домены, неверный SITE_SECRET
Решение: перегенерировать токен через /api/assistants/{id}/embed-code
```

### Диагностика

```bash
# Проверка backend API
curl -X POST http://localhost:8000/api/validate-widget-token \
  -H "Content-Type: application/json" \
  -d '{"token":"..."}'

# Проверка CSP заголовков  
curl -I "http://localhost:3000/chat-iframe?site_token=..."

# Логи frontend middleware
grep "CSP Middleware" frontend.log
```

## Миграция и совместимость

### От версии 1.0 (локальная валидация)
- ✅ Автоматическая миграция без изменения API
- ✅ Существующие токены остаются валидными
- ✅ Улучшенная безопасность без breaking changes

### Будущие изменения
- Добавление rate limiting для `/api/validate-widget-token`
- Кеширование результатов валидации
- Расширенная телеметрия и аналитика

---

**Поддержка:** [API Documentation](API_DOCUMENTATION.md) | [Security Report](SECURITY_INFRASTRUCTURE_FIX_REPORT.md)