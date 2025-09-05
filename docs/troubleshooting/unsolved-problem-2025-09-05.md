# Нерешенная проблема - 5 сентября 2025

## Краткое описание
WebSocket real-time сообщения теперь работают корректно, но появилась новая проблема с отправкой сообщений из виджета - `net::ERR_CONNECTION_RESET` при POST запросах.

## Статус проблемы
- **Дата выявления:** 5 сентября 2025
- **Статус:** Нерешена
- **Критичность:** Высокая (пользователи не могут отправлять сообщения)

## Что исправлено
✅ **WebSocket подключения работают стабильно:**
- Добавлены логи для `site_dialog_websocket_endpoint` 
- Видны подключения с префиксом `[Site]`
- Real-time получение сообщений работает корректно

## Текущая проблема

### Симптомы
1. **WebSocket сообщения приходят в реальном времени** ✅
2. **НО отправка сообщений не работает** ❌

### Ошибка в браузере
```
POST https://replyx.ru/api/widget/dialogs/1/messages?assistant_id=3&guest_id=89b7360b-c925-43a8-8773-f4718e0b8254 net::ERR_CONNECTION_RESET
```

### Логи браузера (работающая часть)
```javascript
// ✅ WebSocket сообщения приходят
📨 [Widget] WebSocket message received: {type: 'typing_start'}
📨 [Widget] WebSocket message received: {type: 'typing_stop'}
📨 [Widget] WebSocket message received: {message: {...}}
📨 [Widget] Manager message received: {id: 73, sender: 'manager', text: 'хзм'}

// ❌ Отправка сообщений не работает  
POST https://replyx.ru/api/widget/dialogs/1/messages?assistant_id=3&guest_id=... net::ERR_CONNECTION_RESET
```

### Логи сервера (WebSocket работает)
```
🔌 [Site] WebSocket connection attempt for dialog 1
✅ [Site] WebSocket accepted for dialog 1  
🔌 [Site] WebSocket подключён к диалогу 1
📊 [Site] Total connections for dialog 1: 1
```

## Анализ проблемы

### Возможные причины
1. **Неправильный endpoint для отправки:** виджет пытается отправить через `/api/widget/dialogs/1/messages` вместо `/api/site/dialogs/1/messages`

2. **Проблема маршрутизации:** 
   - WebSocket использует `/ws/site/dialogs/{id}` (работает)
   - HTTP API использует `/api/widget/dialogs/{id}/messages` (не работает)

3. **Различие в авторизации:**
   - WebSocket: `site_token` в query параметре
   - HTTP API: возможно другой способ авторизации

### Архитектурные несоответствия
В коде виджета есть две ветки:
```javascript
// WebSocket подключение
if (siteToken) {
  wsUrl = `${wsApiUrl}/ws/site/dialogs/${dialogId}?site_token=${siteToken}`;
} else if (assistantId) {
  wsUrl = `${wsApiUrl}/ws/widget/dialogs/${dialogId}?assistant_id=${assistantId}`;
}
```

Но для HTTP API, возможно, используется только:
```javascript
// HTTP отправка сообщений
POST /api/widget/dialogs/${dialogId}/messages?assistant_id=${assistantId}
```

## Что нужно проверить

### 1. Серверные логи при отправке сообщения
```bash
docker logs deployed-backend-1 --tail=10
```

### 2. Доступные API endpoints
Проверить существуют ли:
- `/api/site/dialogs/{id}/messages` (для site_token)
- `/api/widget/dialogs/{id}/messages` (для assistant_id)

### 3. Frontend логика выбора endpoint
В `frontend/pages/chat-iframe.js` найти функцию отправки сообщений и проверить:
- Как выбирается endpoint для HTTP запросов
- Соответствует ли выбор WebSocket и HTTP endpoints

## Следующие шаги
1. Проанализировать логику выбора HTTP endpoint в frontend коде
2. Проверить доступность `/api/widget/dialogs/{id}/messages` endpoint на сервере
3. Убедиться что авторизация корректно передается в HTTP запросах
4. Возможно нужно использовать `/api/site/dialogs/{id}/messages` когда есть `site_token`

## Контекст работы
- **Окружение:** Production (replyx.ru)
- **Пользователь:** Виджет на сайте stencom.ru с `site_token`
- **WebSocket:** Работает через `/ws/site/dialogs/1?site_token=...`
- **HTTP API:** Не работает через `/api/widget/dialogs/1/messages?assistant_id=...`

## История исправлений
- **17:49 MSK** - Добавлены логи в `site_dialog_websocket_endpoint`
- **17:53 MSK** - Подтвержден fix WebSocket подключений
- **17:56 MSK** - Выявлена проблема с HTTP API для отправки сообщений