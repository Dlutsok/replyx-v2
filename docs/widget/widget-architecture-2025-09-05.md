# ReplyX Widget - Техническая архитектура (обновлено 5 сентября 2025)

## Обзор

ReplyX Widget - это встраиваемый чат-компонент для веб-сайтов, обеспечивающий real-time общение с AI ассистентами и операторами поддержки.

## Архитектура системы

### Frontend компоненты

#### 1. widget.js - Загрузчик виджета
**Файл:** `/frontend/public/widget.js`
**Назначение:** Основной скрипт для инициализации и встраивания виджета

**Основные функции:**
- Валидация токенов (локальная и серверная)
- Создание iframe с чатом
- Управление темами и настройками отображения
- Postmessage коммуникация с родительским окном

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
const [isOnline, setIsOnline] = useState(false);            // WebSocket статус
const [handoffStatus, setHandoffStatus] = useState('none'); // Статус handoff
```

**Логика выбора режима:**
```javascript
// WebSocket подключение (строки 746-751)
if (siteToken) {
  wsUrl = `${wsApiUrl}/ws/site/dialogs/${dialogId}?site_token=${siteToken}`;
} else if (assistantId) {
  wsUrl = `${wsApiUrl}/ws/widget/dialogs/${dialogId}?assistant_id=${assistantId}`;
}

// HTTP API отправка сообщений (строки 1267, 1260)
if (siteToken) {
  url = `/api/site/dialogs/${dialogId}/messages?site_token=${siteToken}`;
} else {
  url = `/api/widget/dialogs/${dialogId}/messages?assistant_id=${assistantId}`;
}
```

### Backend архитектура

#### WebSocket Endpoints

```
/ws/dialogs/{dialog_id}?token=JWT_TOKEN
├── Handler: dialog_websocket_endpoint
├── Pool: ws_connections (admin/operator соединения)
├── Logs: [Admin]
└── Использование: Admin панель

/ws/site/dialogs/{dialog_id}?site_token=SITE_TOKEN
├── Handler: site_dialog_websocket_endpoint  
├── Pool: ws_site_connections (site виджеты)
├── Logs: [Site]
└── Использование: Виджеты с site_token

/ws/widget/dialogs/{dialog_id}?assistant_id=ASSISTANT_ID
├── Handler: widget_dialog_websocket_endpoint
├── Pool: ws_connections (widget соединения) ⚠️ Исправлено 5.09.2025
├── Logs: [Widget]
└── Использование: Виджеты без site_token
```

#### HTTP API Endpoints

```
/api/dialogs/{dialog_id}/messages?token=JWT_TOKEN
├── Для admin панели
├── Авторизация: JWT токен в query

/api/site/dialogs/{dialog_id}/messages?site_token=SITE_TOKEN
├── Для site виджетов
├── Авторизация: site_token в query

/api/widget/dialogs/{dialog_id}/messages?assistant_id=ASSISTANT_ID
├── Для widget режима
├── Авторизация: assistant_id + guest_id
```

#### WebSocket Manager
**Файл:** `/backend/services/websocket_manager.py`

**Пулы соединений:**
- `ws_connections: Dict[int, List[WebSocket]]` - admin и widget соединения
- `ws_site_connections: Dict[int, List[WebSocket]]` - site виджеты

**Функции доставки сообщений:**
- `push_dialog_message(dialog_id, message)` - в admin/widget соединения
- `push_site_dialog_message(dialog_id, message)` - в site соединения

## Исправления от 5 сентября 2025

### ✅ Критические исправления

#### 1. WebSocket Routing (websocket_manager.py:170-183)
```python
# БЫЛО (неправильно):
ok = await _register_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)

# СТАЛО (правильно):  
ok = await _register_connection(ws_connections, ws_meta, dialog_id, websocket)
```

#### 2. Удален дублирующий endpoint (api/site.py:766-801)
Удален конфликтующий `/ws/site/dialogs/{dialog_id}` endpoint из site.py

#### 3. Race condition fix (chat-iframe.js:742,1044)
```javascript
// БЫЛО:
if (dialogId && (siteToken || assistantId) && guestId) {

// СТАЛО:
if (dialogId && (siteToken || assistantId) && guestId && dialogLoaded) {
```

#### 4. Добавлены логи (websocket_manager.py:130-154)
Добавлены подробные логи для site WebSocket соединений

## Жизненный цикл виджета

### 1. Инициализация (widget.js)
```javascript
1. Валидация токена (локальная)
2. Получение настроек ассистента
3. Валидация токена (серверная)  
4. Создание iframe с параметрами
5. Настройка postMessage коммуникации
```

### 2. Загрузка чата (chat-iframe.js)
```javascript
1. Парсинг URL параметров
2. Получение или создание guest_id
3. Поиск существующих диалогов
4. Создание нового диалога (если нужно)
5. Загрузка истории сообщений
6. setDialogLoaded(true) ← Критично для WebSocket
7. Подключение WebSocket
```

### 3. WebSocket подключение
```javascript
1. Ожидание dialogLoaded === true
2. Выбор endpoint (site vs widget)
3. Установка WebSocket соединения
4. Обработка событий (open, message, close, error)
5. Настройка автоматического переподключения
```

### 4. Отправка сообщения
```javascript
1. Валидация (не пустое, не в процессе загрузки)
2. Добавление сообщения в UI
3. HTTP POST к соответствующему endpoint
4. Real-time получение ответа через WebSocket
5. Обновление UI
```

## Troubleshooting

### Диагностика WebSocket проблем
```bash
# Проверка всех WebSocket подключений
docker logs deployed-backend-1 --tail=50 | grep -E "(\[Site\]|\[Widget\]|\[Admin\])"

# Проверка доставки сообщений
docker logs deployed-backend-1 --tail=30 | grep -E "(WebSocketManager|Push to)"

# Мониторинг активных соединений
docker logs deployed-backend-1 --tail=20 | grep "Total connections"
```

### Типичные проблемы

#### WebSocket быстро отключается
- **Причина:** Race condition - WebSocket подключается до dialogLoaded
- **Решение:** Исправлено в chat-iframe.js:742

#### Сообщения не доставляются в real-time  
- **Причина:** Неправильный routing соединений
- **Решение:** Исправлено в websocket_manager.py:170

#### ERR_CONNECTION_RESET при отправке сообщений
- **Причина:** Nginx не настроен для WebSocket  
- **Решение:** Добавить location /ws/ в nginx.conf

#### "No SITE/WIDGET WebSocket connections found"
- **Причина:** Дублирующие endpoints или неправильные пулы
- **Решение:** Удален дублирующий endpoint в site.py

## Безопасность

### Site Token
```javascript
// JWT структура
{
  "user_id": 1,
  "assistant_id": 3, 
  "type": "site",
  "allowed_domains": "example.com",
  "domains_hash": "abc123...",
  "issued_at": 1725555533,
  "widget_version": "1"
}
```

### Валидация
- Локальная: проверка структуры токена и домена
- Серверная: проверка подписи и валидности
- CORS: динамическая проверка домена

## Мониторинг

### Ключевые метрики
- WebSocket подключения активные
- Время отклика на сообщения  
- Частота переподключений
- Ошибки авторизации

### Логи для мониторинга
```
🔌 [Site/Widget] WebSocket подключён к диалогу {id}
📊 [Site/Widget] Total connections for dialog {id}: {count}
✅ [WebSocketManager] Message sent via SITE/WIDGET WebSocket
⚠️ [WebSocketManager] No SITE/WIDGET WebSocket connections found
```

## Совместимость

### Поддерживаемые браузеры
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Mobile поддержка  
- iOS Safari 13+
- Chrome Mobile 80+
- Samsung Internet 12+

## Версионность

- **widget_version: "1"** - текущая стабильная версия
- Обратная совместимость с предыдущими версиями
- Graceful degradation для устаревших браузеров

---

**Последнее обновление:** 5 сентября 2025  
**Статус:** Протестировано и готово к продакшену  
**Критические исправления:** WebSocket routing, race conditions, дублирующие endpoints