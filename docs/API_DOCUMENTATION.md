# ReplyX MVP 13 - API Documentation

**Версия API:** v1.3  
**Базовый URL:** `https://api.replyx.ru` (production) | `http://localhost:8000` (development)  
**Дата:** 11 сентября 2025  
**Последнее обновление:** Синхронизировано с кодовой базой MVP 13  

---

## 📋 Оглавление

1. [Аутентификация](#аутентификация)
2. [Пользователи](#пользователи)
3. [Ассистенты](#ассистенты)
4. [Диалоги](#диалоги)
5. [Handoff система](#handoff-система)
6. [Документы и знания](#документы-и-знания)
7. [Платежи (Tinkoff)](#платежи-tinkoff)
8. [Биллинг](#биллинг)
9. [Email система](#email-система)
10. [Server-Sent Events (SSE)](#server-sent-events-sse)
11. [Административные API](#административные-api)
12. [WebSocket API](#websocket-api)
13. [Система поддержки](#система-поддержки)
14. [Мониторинг и аналитика](#мониторинг-и-аналитика)
15. [Коды ошибок](#коды-ошибок)

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

## 🔄 Handoff система

Система передачи диалогов операторам с поддержкой идемпотентности и защитой от конкурентного доступа.

### POST /api/dialogs/{dialog_id}/handoff/request
Запрос передачи оператору с защитой от дублирования

**Request:**
```json
{
  "reason": "keyword",
  "request_id": "uuid-v4-string",
  "last_user_text": "Хочу поговорить с человеком"
}
```

**Response:**
```json
{
  "status": "requested",
  "dialog_id": 123,
  "reason": "keyword",
  "queue_position": 2,
  "estimated_wait_time": "5-10 минут",
  "request_id": "uuid-v4-string",
  "created_at": "2025-09-11T10:00:00Z"
}
```

**Rate limits:** Max 3 запроса в минуту на диалог

### POST /api/dialogs/{dialog_id}/handoff/takeover
Принятие диалога оператором с проверкой конкуренции

**Headers:** `Authorization: Bearer <jwt_token>`

**Request:**
```json
{
  "operator_comment": "Принимаю диалог в работу"
}
```

**Response:**
```json
{
  "status": "active",
  "dialog_id": 123,
  "operator": {
    "id": 5,
    "name": "Анна Смирнова",
    "email": "anna@company.com"
  },
  "taken_at": "2025-09-11T10:05:00Z"
}
```

### POST /api/dialogs/{dialog_id}/handoff/release
Освобождение диалога оператором

**Request:**
```json
{
  "resolution": "completed",
  "operator_comment": "Вопрос решен",
  "return_to_ai": true
}
```

### POST /api/dialogs/{dialog_id}/handoff/cancel
Отмена запроса передачи

**Request:**
```json
{
  "cancel_reason": "user_left",
  "comment": "Пользователь покинул чат"
}
```

### GET /api/operator/queue
Получение очереди handoff запросов для оператора

**Response:**
```json
{
  "queue": [
    {
      "dialog_id": 123,
      "user_info": {
        "name": "Иван Петров",
        "platform": "telegram"
      },
      "reason": "keyword",
      "wait_time": "00:05:30",
      "priority": "normal",
      "last_message": "Нужна помощь оператора",
      "created_at": "2025-09-11T10:00:00Z"
    }
  ],
  "total_in_queue": 5,
  "estimated_wait_time": "10-15 минут"
}
```

### POST /api/operator/heartbeat
Поддержание присутствия оператора в системе

**Request:**
```json
{
  "status": "available",
  "current_load": 3,
  "max_capacity": 5
}
```

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

## 💳 Платежи (Tinkoff)

Интеграция с эквайрингом Т-Банк для обработки платежей.

### POST /api/payments/create
Создание платежа в системе Т-Банк

**Request:**
```json
{
  "amount": 1000.00,
  "description": "Пополнение баланса",
  "return_url": "https://example.com/success",
  "fail_url": "https://example.com/failed",
  "customer_email": "user@example.com"
}
```

**Response:**
```json
{
  "payment_id": "2024091123",
  "payment_url": "https://securepay.tinkoff.ru/new/...",
  "amount": 1000.00,
  "status": "NEW",
  "terminal_key": "TestDemo",
  "created_at": "2025-09-11T10:00:00Z"
}
```

### GET /api/payments/{payment_id}/status
Получение статуса платежа

**Response:**
```json
{
  "payment_id": "2024091123",
  "status": "CONFIRMED",
  "amount": 1000.00,
  "success": true,
  "error_code": null,
  "details": {
    "pan": "430000******0777",
    "exp_date": "1122",
    "card_id": "12345"
  },
  "confirmed_at": "2025-09-11T10:05:00Z"
}
```

### POST /api/payments/webhook
Обработка уведомлений от Т-Банк (внутренний endpoint)

**Security:** Проверка IP whitelist и подписи

**Request (от T-Bank):**
```json
{
  "TerminalKey": "TestDemo",
  "OrderId": "2024091123",
  "Success": true,
  "Status": "CONFIRMED",
  "PaymentId": "987654321",
  "ErrorCode": "0",
  "Amount": 100000,
  "Pan": "430000******0777",
  "Token": "signature_hash"
}
```

### POST /api/payments/{payment_id}/refund
Возврат платежа (только для админов)

**Request:**
```json
{
  "amount": 500.00,
  "reason": "Возврат по запросу клиента"
}
```

### GET /api/payments/history
История платежей пользователя

**Query Parameters:**
- `limit` - лимит записей (default: 50)
- `offset` - смещение для пагинации
- `status` - фильтр по статусу (NEW, CONFIRMED, REJECTED, etc.)

**Response:**
```json
{
  "payments": [
    {
      "payment_id": "2024091123",
      "amount": 1000.00,
      "status": "CONFIRMED",
      "description": "Пополнение баланса",
      "created_at": "2025-09-11T10:00:00Z",
      "confirmed_at": "2025-09-11T10:05:00Z"
    }
  ],
  "total": 15,
  "has_more": false
}
```

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

## 📧 Email система

API для отправки и управления email уведомлениями.

### POST /api/email/test_send
Тестовая отправка email для диагностики SMTP

**Request:**
```json
{
  "to": "test@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Письмо успешно отправлено",
  "smtp_server": "smtp.yandex.ru",
  "sent_at": "2025-09-11T10:00:00Z"
}
```

### POST /api/email/confirm_email
Подтверждение email по коду

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email успешно подтвержден",
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "is_email_confirmed": true
  }
}
```

### POST /api/email/resend_confirmation
Повторная отправка кода подтверждения

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Rate limit:** 1 запрос в минуту на email

### POST /api/email/contact-form
Отправка сообщения через контактную форму

**Request:**
```json
{
  "name": "Иван Иванов",
  "email": "ivan@example.com",
  "subject": "Вопрос по тарифам",
  "message": "Подскажите про корпоративные тарифы",
  "phone": "+7-900-123-45-67"
}
```

---

## 📡 Server-Sent Events (SSE)

Real-time события через HTTP streams для виджетов и админ панели.

### GET /api/dialogs/{dialog_id}/events
SSE stream событий диалога

**Query Parameters:**
- `token` - JWT токен для админ панели
- `site_token` - Site token для авторизованных виджетов  
- `assistant_id` - ID ассистента для гостевого режима
- `guest_id` - ID гостя для статистики

**Headers:**
- `Last-Event-ID` - ID последнего полученного события для восстановления

**Response Stream:**
```
data: {"type": "connection.established", "client_id": "widget_123_abc", "timestamp": "2025-09-11T10:00:00Z"}

data: {"type": "dialog.message.created", "dialog_id": 123, "message": {"id": 456, "text": "Привет!", "sender": "user"}, "timestamp": "2025-09-11T10:01:00Z"}

data: {"type": "handoff.requested", "dialog_id": 123, "reason": "keyword", "queue_position": 2, "timestamp": "2025-09-11T10:02:00Z"}

data: __ping__
```

**Поддерживаемые события:**
- `connection.established` - Установлено соединение
- `dialog.message.created` - Новое сообщение в диалоге
- `handoff.requested` - Запрошена передача оператору
- `handoff.started` - Оператор принял диалог
- `handoff.released` - Диалог возвращен к ИИ
- `operator.typing` - Оператор печатает
- `connection.ping` - Heartbeat ping

### GET /api/sse/stats
Статистика SSE соединений (только админ)

**Response:**
```json
{
  "total_connections": 45,
  "connections_by_type": {
    "admin": 12,
    "widget": 28,
    "site": 5
  },
  "average_duration": "00:15:30",
  "events_sent_today": 1250
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

## 🎧 Система поддержки

API для работы с системой технической поддержки.

### POST /api/support/ticket
Создание тикета в службу поддержки

**Request:**
```json
{
  "subject": "Проблема с платежами",
  "message": "Не могу пополнить баланс через карту",
  "priority": "medium",
  "category": "billing",
  "user_email": "user@example.com",
  "attachments": ["screenshot.png"]
}
```

**Response:**
```json
{
  "ticket_id": "TICKET-2025-001234",
  "status": "created",
  "priority": "medium",
  "estimated_response_time": "2-4 часа",
  "created_at": "2025-09-11T10:00:00Z"
}
```

### GET /api/support/tickets
Список тикетов пользователя

**Query Parameters:**
- `status` - фильтр по статусу (open, in_progress, closed)
- `priority` - фильтр по приоритету (low, medium, high, urgent)

### POST /api/support/tickets/{ticket_id}/reply
Ответ на тикет

**Request:**
```json
{
  "message": "Дополнительная информация по проблеме",
  "attachments": ["details.txt"]
}
```

---

## 📊 Мониторинг и аналитика

API для мониторинга системы и получения аналитики.

### GET /api/system/health
Проверка состояния системы

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-11T10:00:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "response_time": "15ms",
      "active_connections": 25,
      "pool_size": 50
    },
    "redis": {
      "status": "healthy",
      "memory_usage": "45.2MB",
      "connected_clients": 12
    },
    "ai_providers": {
      "openai": {
        "status": "healthy",
        "response_time": "850ms",
        "success_rate": "99.5%"
      },
      "yandexgpt": {
        "status": "degraded", 
        "response_time": "2100ms",
        "success_rate": "95.2%"
      }
    },
    "websocket_gateway": {
      "status": "healthy",
      "active_connections": 156,
      "total_connections": 1024,
      "uptime": "5d 12h 30m"
    }
  }
}
```

### GET /api/admin/analytics/overview
Общая аналитика системы (только админ)

**Query Parameters:**
- `period` - период (day, week, month)
- `from_date` - начальная дата
- `to_date` - конечная дата

**Response:**
```json
{
  "period": "week",
  "metrics": {
    "total_users": 1245,
    "new_users": 89,
    "active_dialogs": 456,
    "total_messages": 12567,
    "revenue": {
      "total": 89450.50,
      "by_service": {
        "widget_messages": 45220.30,
        "telegram_messages": 32150.20,
        "balance_top_ups": 12080.00
      }
    },
    "ai_usage": {
      "total_tokens": 2450000,
      "cost": 1225.50,
      "by_model": {
        "gpt-4o-mini": 1800000,
        "gpt-4o": 450000,
        "yandexgpt": 200000
      }
    }
  }
}
```

### GET /api/admin/proxy/monitoring
Мониторинг AI прокси системы (только админ)

**Response:**
```json
{
  "proxy_pools": [
    {
      "pool_id": "openai-primary",
      "status": "healthy",
      "active_tokens": 8,
      "total_requests": 12450,
      "success_rate": 99.2,
      "avg_response_time": 850,
      "current_load": "medium"
    }
  ],
  "failover_stats": {
    "total_failovers": 23,
    "last_failover": "2025-09-11T09:45:00Z",
    "most_common_error": "rate_limit_exceeded"
  }
}
```

### POST /api/start-analytics/event
Отправка аналитического события

**Request:**
```json
{
  "event_type": "onboarding_step_completed",
  "user_id": 123,
  "session_id": "session_abc123",
  "properties": {
    "step": 2,
    "duration": 45,
    "source": "main_flow"
  }
}
```

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

#### Handoff система
- `HANDOFF_ALREADY_REQUESTED` - Запрос на передачу уже существует
- `HANDOFF_RATE_LIMIT` - Превышен лимит запросов на передачу
- `OPERATOR_CAPACITY_EXCEEDED` - Превышена максимальная нагрузка оператора
- `HANDOFF_CONFLICT` - Конфликт при принятии диалога (уже принят другим оператором)
- `HANDOFF_NOT_FOUND` - Запрос на handoff не найден

#### Платежи (Tinkoff)
- `PAYMENT_CREATION_FAILED` - Ошибка создания платежа в T-Bank
- `PAYMENT_NOT_FOUND` - Платеж не найден
- `INVALID_PAYMENT_AMOUNT` - Некорректная сумма платежа
- `PAYMENT_ALREADY_PROCESSED` - Платеж уже обработан
- `WEBHOOK_SIGNATURE_INVALID` - Некорректная подпись webhook
- `WEBHOOK_IP_NOT_ALLOWED` - IP адрес не в whitelist T-Bank

#### Email система
- `EMAIL_NOT_CONFIRMED` - Email не подтвержден
- `CONFIRMATION_CODE_EXPIRED` - Код подтверждения истек
- `EMAIL_SEND_FAILED` - Ошибка отправки email
- `SMTP_CONNECTION_FAILED` - Ошибка подключения к SMTP серверу

#### SSE соединения
- `SSE_AUTH_FAILED` - Ошибка авторизации SSE соединения
- `SSE_CONNECTION_LIMIT` - Превышен лимит SSE соединений
- `INVALID_LAST_EVENT_ID` - Некорректный Last-Event-ID

#### AI система
- `AI_PROVIDER_UNAVAILABLE` - AI провайдер недоступен
- `AI_TOKEN_LIMIT_EXCEEDED` - Превышен лимит AI токенов
- `AI_REQUEST_TIMEOUT` - Таймаут запроса к AI провайдеру
- `AI_PROXY_FAILOVER` - Сбой в системе прокси AI запросов

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

---

## 📝 Changelog API

### v1.3 (Текущая) - 11 сентября 2025
- ✅ Добавлена полная Handoff система с идемпотентностью
- ✅ Интеграция платежей Tinkoff с webhook обработкой
- ✅ Server-Sent Events (SSE) для real-time коммуникации
- ✅ Расширенная Email система с подтверждением
- ✅ Система поддержки и тикетинг
- ✅ Мониторинг AI прокси системы
- ✅ Аналитика и метрики производительности

### v1.2 (Предыдущая) - 05 сентября 2025
- Улучшенная система диалогов
- Оптимизация WebSocket соединений
- Обновленная система биллинга

### v1.1 (Планируется)
- GraphQL API для сложных запросов
- Webhook endpoints для внешних интеграций
- Расширенная система уведомлений
- Bulk операции для управления ассистентами

---

*Документация обновлена: 11 сентября 2025*  
*Версия API: 1.3*  
*Статус: Синхронизировано с MVP 13*  
*Контакт: tech@replyx.ru*