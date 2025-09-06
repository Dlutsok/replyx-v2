# ReplyX Widget - Техническая архитектура (2025)

**Дата обновления:** 6 сентября 2025  
**Статус:** ✅ АКТУАЛЬНО  
**Версия системы:** SSE-based real-time messaging  

---

## 📋 Обзор

ReplyX Widget - это встраиваемый чат-компонент для веб-сайтов, обеспечивающий real-time общение с AI ассистентами и операторами поддержки через современную SSE (Server-Sent Events) архитектуру.

### ✅ Ключевые особенности
- **SSE-based real-time messaging** - стабильная доставка сообщений
- **Автоматическое переподключение** - встроенная устойчивость к разрывам сети
- **Умная обработка событий** - предотвращение дублирования сообщений
- **Поддержка handoff** - передача диалогов операторам
- **Кроссбраузерная совместимость** - работает во всех современных браузерах

---

## 🏗️ Архитектура системы

### Frontend компоненты

#### 1. widget.js - Загрузчик виджета
**Файл:** `/frontend/public/widget.js`  
**Назначение:** Основной скрипт для инициализации и встраивания виджета

**Основные функции:**
- Валидация токенов (локальная и серверная)
- Создание iframe с чатом
- Управление темами и настройками отображения
- PostMessage коммуникация с родительским окном

**Режимы работы:**
```javascript
// Site режим (с авторизацией сайта)
const siteToken = "eyJhbGciOiJIUzI1NiI..."; // JWT токен с user_id и assistant_id

// Widget режим (гостевой)  
const assistantId = 3; // ID ассистента без авторизации
```

#### 2. chat-iframe.js - Интерфейс чата
**Файл:** `/frontend/pages/chat-iframe.js`  
**Назначение:** React компонент с полным интерфейсом чата

**Ключевые состояния:**
```javascript
const [dialogLoaded, setDialogLoaded] = useState(false);    // Диалог загружен
const [creatingDialog, setCreatingDialog] = useState(false); // Создание диалога
const [isOnline, setIsOnline] = useState(false);            // SSE статус
const [handoffStatus, setHandoffStatus] = useState('none'); // Статус handoff
```

**Логика выбора режима:**
```javascript
// SSE подключение
if (siteToken) {
  sseUrl = `${API_URL}/api/dialogs/${dialogId}/events?site_token=${siteToken}`;
} else if (assistantId) {
  sseUrl = `${API_URL}/api/dialogs/${dialogId}/events?assistant_id=${assistantId}&guest_id=${guestId}`;
}

// HTTP API отправка сообщений
if (siteToken) {
  url = `${API_URL}/api/site/dialogs/${dialogId}/messages?site_token=${siteToken}`;
} else {
  url = `${API_URL}/api/widget/dialogs/${dialogId}/messages?assistant_id=${assistantId}`;
}
```

### Backend архитектура

#### SSE Endpoints

```
/api/dialogs/{dialog_id}/events?token=JWT_TOKEN
├── Handler: dialog_events_stream
├── Auth: JWT токен для админ панели
├── Logs: [SSE Manager]
└── Использование: Admin панель

/api/dialogs/{dialog_id}/events?site_token=SITE_TOKEN
├── Handler: dialog_events_stream (site_token mode)
├── Auth: site_token с проверкой домена
├── Logs: [SSE Manager]
└── Использование: Виджеты с site_token

/api/dialogs/{dialog_id}/events?assistant_id=ID&guest_id=GUID
├── Handler: dialog_events_stream (widget mode)
├── Auth: assistant_id + guest_id
├── Logs: [SSE Manager]
└── Использование: Виджеты без site_token
```

#### HTTP API Endpoints

```
/api/dialogs/{dialog_id}/messages?token=JWT_TOKEN
├── Для admin панели
├── Авторизация: JWT токен в query
├── Публикация: Redis Pub/Sub → SSE

/api/site/dialogs/{dialog_id}/messages?site_token=SITE_TOKEN
├── Для site виджетов
├── Авторизация: site_token в query
├── Публикация: Redis Pub/Sub → SSE

/api/widget/dialogs/{dialog_id}/messages?assistant_id=ID&guest_id=GUID
├── Для widget режима
├── Авторизация: assistant_id + guest_id
├── Публикация: Redis Pub/Sub → SSE
```

#### SSE Manager
**Файл:** `/backend/services/sse_manager.py`

**Архитектура событий:**
```python
# Поток событий:
1. HTTP POST → сохранение сообщения в БД
2. publish_dialog_event() → Redis Pub/Sub
3. SSE Manager → получение из Redis
4. EventSource → доставка клиентам
```

**Пулы соединений:**
- `sse_connections: Dict[int, Set[str]]` - активные SSE клиенты по диалогам
- `client_queues: Dict[str, asyncio.Queue]` - очереди событий для каждого клиента

**Функции доставки сообщений:**
- `publish_dialog_event(dialog_id, event)` - публикация в Redis Pub/Sub
- `broadcast_event(dialog_id, event_data)` - рассылка всем SSE клиентам

---

## 🔄 Исправления от 6 сентября 2025

### ✅ Критические исправления

#### 1. Исправлен URL SSE подключения (frontend/config/api.js)
```javascript
// ❌ БЫЛО (неправильно):
return `${protocol}//${host}`; // localhost:3000 (фронтенд)

// ✅ СТАЛО (правильно):
if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) {
  return `${protocol}//localhost:8000`; // бэкенд
}
```

#### 2. Обновлен обработчик SSE событий (frontend/components/dialogs/DialogModal.js)
```javascript
// ❌ БЫЛО (старый формат):
if (data.id && data.sender && data.text) {

// ✅ СТАЛО (новый формат):
if (data.type === 'message:new' && data.message) {
  const message = data.message;
  // Обработка сообщения
}
```

#### 3. Устранено перезаписывание сообщений кэшем (DialogModal.js)
```javascript
// ❌ БЫЛО (полная перезапись):
setMessages(messagesData);

// ✅ СТАЛО (умное объединение):
const loadMessages = useCallback(async (forceReplace = false) => {
  if (forceReplace) {
    setMessages(messagesData); // только при первой загрузке
  } else {
    // Добавляем только новые сообщения
    setMessages(prevMessages => {
      const newMessages = messagesData.filter(newMsg => 
        !prevMessages.some(existingMsg => existingMsg.id === newMsg.id)
      );
      return [...prevMessages, ...newMessages];
    });
  }
});
```

#### 4. Унифицирована публикация событий (backend/api/site.py)
```python
# ❌ БЫЛО (двойная отправка):
await push_dialog_message(dialog_id, user_message_data)
await ws_push_site_dialog_message(dialog_id, user_message_data)

# ✅ СТАЛО (единый канал):
await publish_dialog_event(dialog_id, {
    "type": "message:new",
    "message": user_message_data
})
```

#### 5. Исправлена валидация токена виджета (backend/api/assistants.py)
```python
# ✅ ДОБАВЛЕНО:
# Для localhost в dev режиме пропускаем проверку хэша доменов
if is_development and current_domain and any(
    current_domain.startswith(local) for local in ['localhost:', '127.0.0.1:']
):
    logger.info(f"🚧 [DEV] Пропускаем проверку хэша доменов для localhost: {current_domain}")
```

---

## 🔄 Жизненный цикл виджета

### 1. Инициализация (widget.js)
```javascript
1. Валидация токена (локальная)
2. Получение настроек ассистента
3. Валидация токена (серверная) - ИСПРАВЛЕНО для localhost
4. Создание iframe с параметрами
5. Настройка postMessage коммуникации
```

### 2. Загрузка чата (chat-iframe.js)
```javascript
1. Парсинг URL параметров
2. Получение или создание guest_id
3. Поиск существующих диалогов
4. Создание нового диалога (если нужно)
5. Загрузка истории сообщений (forceReplace=true)
6. setDialogLoaded(true)
7. Подключение SSE к правильному URL (localhost:8000)
```

### 3. SSE подключение
```javascript
1. Ожидание dialogLoaded === true
2. Выбор правильного endpoint (API_URL/api/dialogs/.../events)
3. Установка EventSource соединения
4. Обработка событий (open, message, error)
5. Настройка автоматического переподключения браузером
```

### 4. Отправка сообщения
```javascript
1. Валидация (не пустое, не в процессе загрузки)
2. Добавление сообщения в UI (оптимистично)
3. HTTP POST к соответствующему endpoint
4. Публикация в Redis Pub/Sub (backend)
5. Real-time получение через SSE
6. Умная обработка дублей (предотвращение)
```

---

## 📊 Форматы сообщений SSE

### Новые сообщения
```json
{
  "type": "message:new",
  "message": {
    "id": 123,
    "sender": "user|assistant|manager",
    "text": "Текст сообщения",
    "timestamp": "2025-09-06T18:30:00Z"
  },
  "dialog_id": 1,
  "source": "backend"
}
```

### Системные события
```json
{
  "type": "message_received",
  "message": "Ваше сообщение получено. Оператор ответит в ближайшее время.",
  "timestamp": "2025-09-06T18:30:00Z",
  "dialog_id": 1,
  "source": "backend"
}
```

### Handoff события
```json
{
  "type": "handoff_started|handoff_released",
  "dialog_id": 1,
  "message": "Оператор подключился",
  "timestamp": "2025-09-06T18:30:00Z"
}
```

---

## 🔧 Диагностика и отладка

### Проверка SSE подключения
```bash
# Прямое подключение к SSE
curl -N "http://localhost:8000/api/dialogs/1/events?token=JWT_TOKEN"

# Для виджета
curl -N "http://localhost:8000/api/dialogs/1/events?assistant_id=3&guest_id=test-guid"

# Проверка здоровья SSE
curl "http://localhost:8000/api/sse/health"
```

### Логи для мониторинга
```bash
# SSE подключения и события
docker logs replyx-backend | grep -E "(SSE Manager|📢|📤|✅)"

# Публикация событий
docker logs replyx-backend | grep -E "(WIDGET→ADMIN|publish_dialog_event)"

# Проверка Redis Pub/Sub
redis-cli PSUBSCRIBE "ws:dialog:*"
```

### Типичные проблемы и решения

#### SSE подключается к неправильному хосту
- **Проблема:** EventSource подключается к localhost:3000 вместо localhost:8000
- **Решение:** ✅ Исправлено в frontend/config/api.js
- **Проверка:** В Network tab должен быть запрос к localhost:8000

#### Сообщения не появляются в админке
- **Проблема:** События публикуются, но не доходят до админки
- **Решение:** ✅ Исправлено - админка теперь слушает правильный формат событий
- **Проверка:** В консоли админки должны быть логи "📨 [АДМИН SSE] Получено событие"

#### Дублирование сообщений
- **Проблема:** Сообщения появляются несколько раз
- **Решение:** ✅ Исправлено - убрана двойная публикация, добавлена проверка дублей
- **Проверка:** Каждое сообщение должно появляться только один раз

#### Кэш перезаписывает новые сообщения
- **Проблема:** После отправки сообщения оно исчезает
- **Решение:** ✅ Исправлено - loadMessages теперь делает умное объединение
- **Проверка:** Новые сообщения должны сохраняться после загрузки истории

---

## 🔐 Безопасность

### Site Token (обновлено)
```javascript
// JWT структура
{
  "user_id": 6,
  "assistant_id": 3, 
  "type": "site",
  "allowed_domains": "127.0.0.1:3000,127.0.0.1:3001,localhost:3000,localhost:3001,stencom.ru",
  "domains_hash": "7591f2985e2698b4e19dc972a9e10da421b68f33...",
  "issued_at": 1757183956,
  "widget_version": 1
}
```

### Валидация (исправлена)
- **Локальная:** проверка структуры токена и домена
- **Серверная:** проверка подписи и валидности
- **Dev режим:** localhost домены автоматически добавляются в allowed_domains
- **Prod режим:** строгая проверка доменов по хэшу

---

## 📈 Мониторинг

### Ключевые метрики
- SSE подключения активные
- Время отклика на сообщения  
- Частота переподключений
- Ошибки авторизации
- Redis Pub/Sub throughput

### Логи для мониторинга (обновлены)
```
🔍 [WIDGET TOKEN] Проверяем токен для домена: localhost:3000
🚧 [DEV] Пропускаем проверку хэша доменов для localhost: localhost:3000
🚀 [WIDGET→ADMIN] Отправляем сообщение от user в диалоге 1
✅ [WIDGET→ADMIN] Сообщение пользователя опубликовано в Redis: dialog_id=1, message_id=123
📢 [SSE Manager] Получено Redis Pub/Sub событие для dialog 1
📤 [SSE Manager] Отправляем 1 клиентам для диалога 1
📨 [АДМИН SSE] Получено событие: {type: "message:new", message: {...}}
✅ [АДМИН SSE] Сообщение добавлено в состояние: 123
```

---

## 🌍 Совместимость

### Поддерживаемые браузеры
- Chrome 80+ ✅
- Firefox 75+ ✅
- Safari 13+ ✅
- Edge 80+ ✅

### Mobile поддержка  
- iOS Safari 13+ ✅
- Chrome Mobile 80+ ✅
- Samsung Internet 12+ ✅

### Proxy/CDN совместимость
- Nginx ✅ (настроен в nginx-sse.conf)
- Cloudflare ✅
- AWS CloudFront ✅
- Corporate proxies ✅ (через HTTP/2)

---

## 🎯 Версионность

- **widget_version: 1** - текущая стабильная версия
- **SSE migration** - завершена 6 сентября 2025
- **Обратная совместимость** с предыдущими токенами
- **Graceful degradation** для устаревших браузеров

---

**Последнее обновление:** 6 сентября 2025  
**Статус:** ✅ Протестировано и готово к продакшену  
**Критические исправления:** SSE URL routing, формат событий, предотвращение дублей, валидация токенов для dev режима

> 🎯 **Результат исправлений:** Сообщения от виджета теперь мгновенно появляются в админке без перезагрузки страницы!
