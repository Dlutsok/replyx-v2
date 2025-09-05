# ChatAI MVP 11 - API Documentation

**Версия API:** v1  
**Базовый URL:** `https://api.replyx.ru` (production) | `http://localhost:8000` (development)  
**Дата:** 01 сентября 2025  

---

## 📋 Оглавление

1. [Аутентификация](#аутентификация)
2. [Пользователи](#пользователи)
3. [Ассистенты](#ассистенты)
4. [Диалоги](#диалоги)
5. [Документы и знания](#документы-и-знания)
6. [Биллинг](#биллинг)
7. [Административные API](#административные-api)
8. [WebSocket API](#websocket-api)
9. [Коды ошибок](#коды-ошибок)

---

## 🔐 Аутентификация

### Типы аутентификации

#### JWT Bearer Token
```http
Authorization: Bearer <jwt_token>
```

#### Site Token (для виджетов)
```http
X-Site-Token: <site_token>
```

### POST /api/auth/login
Аутентификация пользователя

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "is_admin": false,
    "balance": 1000.0
  }
}
```

### POST /api/auth/register
Регистрация нового пользователя

**Request:**
```json
{
  "email": "user@example.com", 
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```

### POST /api/auth/logout
Выход из системы (инвалидация токена)

---

## 👥 Пользователи

### GET /api/users/me
Получение информации о текущем пользователе

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe", 
  "is_admin": false,
  "balance": 1000.0,
  "welcome_bonus": 500.0,
  "plan": "trial",
  "onboarding_completed": true,
  "created_at": "2025-08-01T10:00:00Z"
}
```

### PUT /api/users/me
Обновление профиля пользователя

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Smith"
}
```

### POST /api/users/change-password
Смена пароля

**Request:**
```json
{
  "current_password": "old_password",
  "new_password": "new_password123"
}
```

---

## 🤖 Ассистенты

### GET /api/assistants
Получение списка ассистентов пользователя

**Response:**
```json
[
  {
    "id": 1,
    "name": "Техподдержка",
    "description": "Помощник по техническим вопросам",
    "system_prompt": "Ты техподдержка компании...",
    "ai_model": "gpt-3.5-turbo",
    "is_active": true,
    "telegram_bot_token": "1234567890:ABC...",
    "telegram_bot_username": "my_support_bot",
    "website_integration": true,
    "allowed_domains": ["example.com"],
    "created_at": "2025-08-01T10:00:00Z"
  }
]
```

### POST /api/assistants
Создание нового ассистента

**Request:**
```json
{
  "name": "Мой ассистент",
  "description": "Описание ассистента",
  "system_prompt": "Системный промпт для AI",
  "ai_model": "gpt-3.5-turbo",
  "telegram_bot_token": "1234567890:ABC...",
  "website_integration": true,
  "allowed_domains": ["example.com", "test.com"]
}
```

### PUT /api/assistants/{id}
Обновление ассистента

**Request:**
```json
{
  "name": "Обновленное имя",
  "system_prompt": "Новый промпт",
  "is_active": false
}
```

### DELETE /api/assistants/{id}
Удаление ассистента

---

## 💬 Диалоги

### GET /api/dialogs
Получение диалогов с фильтрацией

**Query Parameters:**
- `status` - статус диалога (active, archived)
- `handoff_status` - статус handoff (none, requested, active, released)
- `platform` - платформа (telegram, website)
- `limit` - лимит записей (по умолчанию 50)
- `offset` - смещение для пагинации

**Response:**
```json
{
  "dialogs": [
    {
      "id": 1,
      "assistant_id": 1,
      "platform": "telegram",
      "telegram_chat_id": "123456789",
      "telegram_username": "user123",
      "first_name": "John",
      "last_name": "Doe",
      "status": "active",
      "handoff_status": "none",
      "is_taken_over": false,
      "last_message": "Привет!",
      "last_message_time": "2025-09-01T12:00:00Z",
      "created_at": "2025-09-01T10:00:00Z"
    }
  ],
  "total": 25,
  "has_more": false
}
```

### GET /api/dialogs/{id}
Получение информации о диалоге

**Response:**
```json
{
  "id": 1,
  "assistant_id": 1,
  "assistant_name": "Техподдержка",
  "platform": "telegram", 
  "telegram_chat_id": "123456789",
  "telegram_username": "user123",
  "first_name": "John",
  "last_name": "Doe",
  "status": "active",
  "handoff_status": "none",
  "handoff_reason": null,
  "handoff_requested_at": null,
  "is_taken_over": false,
  "taken_over_by": null,
  "created_at": "2025-09-01T10:00:00Z"
}
```

### GET /api/dialogs/{id}/messages
Получение сообщений диалога

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "sender": "user",
      "text": "Привет!",
      "created_at": "2025-09-01T10:00:00Z"
    },
    {
      "id": 2,
      "sender": "assistant", 
      "text": "Привет! Как дела?",
      "created_at": "2025-09-01T10:01:00Z"
    },
    {
      "id": 3,
      "sender": "operator",
      "text": "Оператор Анна подключилась к диалогу",
      "operator_name": "Анна",
      "created_at": "2025-09-01T10:05:00Z"
    }
  ]
}
```

### POST /api/dialogs/{id}/messages
Отправка сообщения от оператора

**Request:**
```json
{
  "text": "Сообщение от оператора",
  "operator_name": "Анна"
}
```

### POST /api/dialogs/{id}/handoff/request
Запрос передачи оператору

**Request:**
```json
{
  "reason": "keyword",
  "last_user_text": "Хочу поговорить с оператором"
}
```

### POST /api/dialogs/{id}/handoff/take
Принятие диалога оператором

**Request:**
```json
{
  "operator_name": "Анна",
  "operator_id": 5
}
```

### POST /api/dialogs/{id}/handoff/release
Освобождение диалога оператором

---

## 📄 Документы и знания

### POST /api/documents/upload
Загрузка документа

**Request (multipart/form-data):**
- `file` - файл для загрузки
- `assistant_id` - ID ассистента

**Response:**
```json
{
  "id": 1,
  "filename": "document.pdf",
  "size": 1024000,
  "content_type": "application/pdf",
  "status": "processing",
  "assistant_id": 1,
  "created_at": "2025-09-01T10:00:00Z"
}
```

### GET /api/documents
Получение списка документов

**Response:**
```json
[
  {
    "id": 1,
    "filename": "document.pdf",
    "size": 1024000,
    "status": "completed",
    "chunks_count": 25,
    "assistant_id": 1,
    "created_at": "2025-09-01T10:00:00Z"
  }
]
```

### DELETE /api/documents/{id}
Удаление документа

### POST /api/qa-knowledge
Добавление Q&A записи

**Request:**
```json
{
  "assistant_id": 1,
  "question": "Как настроить бота?",
  "answer": "Для настройки бота перейдите в раздел...",
  "tags": ["настройка", "бот"]
}
```

### GET /api/qa-knowledge
Получение Q&A базы знаний

**Query Parameters:**
- `assistant_id` - ID ассистента
- `q` - поисковый запрос

---

## 💰 Биллинг

### GET /api/balance
Получение баланса пользователя

**Response:**
```json
{
  "balance": 1000.0,
  "welcome_bonus": 500.0,
  "total_spent": 250.0,
  "pending_transactions": 0,
  "currency": "RUB"
}
```

### GET /api/balance/transactions
История транзакций

**Query Parameters:**
- `limit` - лимит записей (по умолчанию 50)
- `offset` - смещение
- `type` - тип транзакции (debit, credit)

**Response:**
```json
{
  "transactions": [
    {
      "id": 1,
      "type": "debit",
      "amount": -10.0,
      "description": "Сообщение виджета",
      "service_type": "widget_message",
      "details": {
        "dialog_id": 1,
        "message_count": 2
      },
      "created_at": "2025-09-01T10:00:00Z"
    },
    {
      "id": 2,
      "type": "credit",
      "amount": 1000.0,
      "description": "Пополнение баланса",
      "created_at": "2025-09-01T09:00:00Z"
    }
  ],
  "total": 15
}
```

### POST /api/balance/top-up
Пополнение баланса

**Request:**
```json
{
  "amount": 1000.0,
  "payment_method": "card",
  "return_url": "https://example.com/success"
}
```

---

## 🔧 Административные API

### GET /api/admin/users
Получение списка пользователей (только админ)

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "is_admin": false,
      "balance": 1000.0,
      "total_spent": 250.0,
      "assistants_count": 3,
      "dialogs_count": 15,
      "created_at": "2025-08-01T10:00:00Z",
      "last_login_at": "2025-09-01T08:00:00Z"
    }
  ],
  "total": 150
}
```

### GET /api/admin/ai-tokens
Управление AI токенами

**Response:**
```json
[
  {
    "id": 1,
    "name": "Primary GPT-4",
    "token": "sk-...",
    "model_access": ["gpt-4", "gpt-3.5-turbo"],
    "daily_limit": 1000,
    "monthly_limit": 30000,
    "daily_usage": 145,
    "monthly_usage": 4250,
    "priority": 1,
    "is_active": true,
    "created_at": "2025-08-01T10:00:00Z"
  }
]
```

### POST /api/admin/ai-tokens
Создание AI токена

**Request:**
```json
{
  "name": "Backup GPT-3.5",
  "token": "sk-proj-...",
  "model_access": ["gpt-3.5-turbo"],
  "daily_limit": 500,
  "monthly_limit": 15000,
  "priority": 2,
  "notes": "Резервный токен"
}
```

### GET /api/admin/system/health
Статус системы

**Response:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "pool_size": 20,
    "active_connections": 5
  },
  "redis": {
    "connected": true,
    "memory_usage": "15.2MB"
  },
  "bot_manager": {
    "active_bots": 25,
    "total_processes": 8,
    "uptime": "5d 12h 30m"
  },
  "disk_usage": {
    "uploads": "2.1GB",
    "logs": "450MB",
    "available": "45.2GB"
  }
}
```

---

## 🔌 WebSocket API

### Подключение
```javascript
const ws = new WebSocket('wss://api.replyx.ru/ws/dialogs/{dialog_id}?token={jwt_token}');
```

### События диалогов

#### Новое сообщение
```json
{
  "type": "new_message",
  "dialog_id": 1,
  "message": {
    "id": 15,
    "sender": "assistant",
    "text": "Ответ ассистента",
    "created_at": "2025-09-01T12:00:00Z"
  },
  "seq": 1001,
  "timestamp": "2025-09-01T12:00:00Z"
}
```

#### Handoff события
```json
{
  "type": "handoff_requested",
  "dialog_id": 1,
  "reason": "keyword",
  "queue_position": 2,
  "seq": 1002,
  "timestamp": "2025-09-01T12:01:00Z"
}
```

```json
{
  "type": "handoff_started", 
  "dialog_id": 1,
  "manager": {
    "id": 5,
    "name": "Анна",
    "avatar": "https://..."
  },
  "seq": 1003,
  "timestamp": "2025-09-01T12:02:00Z"
}
```

#### Typing индикаторы
```json
{
  "type": "operator_typing",
  "dialog_id": 1,
  "operator_name": "Анна",
  "timestamp": "2025-09-01T12:03:00Z"
}
```

### Отправка сообщений
```json
{
  "type": "send_message",
  "text": "Сообщение от пользователя"
}
```

### Heartbeat
Клиент получает `__ping__`, отвечает `__pong__` для поддержания соединения.

---

## ⚠️ Коды ошибок

### HTTP статус коды

| Код | Описание | Примеры |
|-----|----------|---------|
| 200 | OK | Успешный запрос |
| 201 | Created | Ресурс создан |
| 400 | Bad Request | Некорректные данные |
| 401 | Unauthorized | Не авторизован |
| 403 | Forbidden | Нет прав доступа |
| 404 | Not Found | Ресурс не найден |
| 422 | Unprocessable Entity | Ошибка валидации |
| 429 | Too Many Requests | Rate limit превышен |
| 500 | Internal Server Error | Внутренняя ошибка |

### Формат ошибок
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные",
    "details": {
      "field": "email",
      "issue": "Неверный формат email"
    }
  }
}
```

### Специфичные коды ошибок

#### Аутентификация
- `INVALID_CREDENTIALS` - Неверный email или пароль
- `TOKEN_EXPIRED` - JWT токен истек
- `INSUFFICIENT_PERMISSIONS` - Недостаточно прав

#### Биллинг
- `INSUFFICIENT_BALANCE` - Недостаточно средств
- `INVALID_AMOUNT` - Некорректная сумма
- `PAYMENT_FAILED` - Ошибка платежа

#### Файлы
- `FILE_TOO_LARGE` - Файл превышает лимит
- `UNSUPPORTED_FORMAT` - Неподдерживаемый формат
- `VIRUS_DETECTED` - Обнаружен вирус
- `UPLOAD_QUOTA_EXCEEDED` - Превышена квота загрузок

#### Боты
- `INVALID_TELEGRAM_TOKEN` - Некорректный токен Telegram
- `BOT_ALREADY_EXISTS` - Бот с таким токеном уже существует
- `BOT_STARTUP_FAILED` - Ошибка запуска бота

---

## 🔍 Rate Limiting

### Лимиты по умолчанию

| Endpoint | Лимит | Период |
|----------|-------|--------|
| `/api/auth/login` | 5 запросов | 5 минут |
| `/api/documents/upload` | 10 файлов | 5 минут |
| `/api/balance/top-up` | 3 запроса | 10 минут |
| Общие API | 100 запросов | 1 минута |
| WebSocket | 50 сообщений | 1 минута |

### Заголовки rate limiting
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1693564800
```

---

## 📚 Примеры использования

### Создание и настройка бота

```javascript
// 1. Создание ассистента
const assistant = await fetch('/api/assistants', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Мой бот',
    system_prompt: 'Ты дружелюбный помощник',
    telegram_bot_token: '123456:ABC...'
  })
});

// 2. Загрузка знаний
const formData = new FormData();
formData.append('file', file);
formData.append('assistant_id', assistant.id);

await fetch('/api/documents/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### WebSocket диалог
```javascript
const ws = new WebSocket(`wss://api.replyx.ru/ws/dialogs/${dialogId}?token=${token}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'new_message':
      displayMessage(data.message);
      break;
    case 'handoff_requested':
      showHandoffNotification(data);
      break;
  }
};

// Отправка сообщения
ws.send(JSON.stringify({
  type: 'send_message',
  text: 'Привет!'
}));
```

---

## 📝 Changelog API

### v1.1 (Планируется)
- Добавление webhook endpoints для внешних интеграций
- Расширенная аналитика диалогов
- Bulk операции для управления ассистентами

### v1.0 (Текущая)
- Полная функциональность CRUD для всех ресурсов
- WebSocket real-time коммуникация
- Система handoff и биллинга
- Административные API

---

*Документация обновлена: 01 сентября 2025*  
*Версия API: 1.0*  
*Контакт: tech@replyx.ru*