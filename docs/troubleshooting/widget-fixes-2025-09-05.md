# Исправления виджета WebSocket - 5 сентября 2025

## Резюме
Проведен полный анализ и исправление критических проблем с WebSocket соединениями в виджете ReplyX. Устранены основные причины нестабильной работы real-time сообщений.

## Исправленные проблемы

### 🚨 КРИТИЧНО: Неправильный routing WebSocket соединений
**Проблема:** Widget endpoint подключался к неправильному пулу соединений
**Файл:** `backend/services/websocket_manager.py`
**Строки:** 170, 173-175, 182-183

```python
# ❌ БЫЛО (неправильно):
ok = await _register_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)
print(f"📊 [Widget] Total connections for dialog {dialog_id}: {len(ws_site_connections[dialog_id])}")
await _unregister_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)

# ✅ СТАЛО (правильно):
ok = await _register_connection(ws_connections, ws_meta, dialog_id, websocket)  
print(f"📊 [Widget] Total connections for dialog {dialog_id}: {len(ws_connections[dialog_id])}")
await _unregister_connection(ws_connections, ws_meta, dialog_id, websocket)
```

**Последствие:** Widget соединения теперь правильно регистрируются в admin пуле (`ws_connections`), а не в site пуле (`ws_site_connections`)

### 🚨 КРИТИЧНО: Дублирующий WebSocket endpoint
**Проблема:** Конфликт двух одинаковых endpoints в разных файлах
**Файл:** `backend/api/site.py`
**Строки:** 25, 766-801

```python
# ❌ УДАЛЕНО:
from services.websocket_manager import ws_site_connections

@router.websocket("/ws/site/dialogs/{dialog_id}")
async def site_dialog_ws(...):
    # 35+ строк дублирующего кода
```

**Последствие:** Убран конфликт endpoints, остался только корректный в `api/websockets.py`

### ⚠️ ВАЖНО: Race condition при инициализации
**Проблема:** WebSocket подключался до полной загрузки диалога
**Файл:** `frontend/pages/chat-iframe.js` 
**Строки:** 742, 1044

```javascript
// ❌ БЫЛО:
if (dialogId && (siteToken || assistantId) && guestId) {
}, [dialogId, siteToken, assistantId, guestId, wsReconnectNonce]);

// ✅ СТАЛО:
if (dialogId && (siteToken || assistantId) && guestId && dialogLoaded) {
}, [dialogId, siteToken, assistantId, guestId, wsReconnectNonce, dialogLoaded]);
```

**Последствие:** WebSocket теперь подключается только после полной загрузки диалога

### ✅ УЛУЧШЕНИЕ: Добавлены логи site WebSocket
**Проблема:** Отсутствие логов подключений site WebSocket
**Файл:** `backend/services/websocket_manager.py`
**Строки:** 130-154

```python
# ✅ ДОБАВЛЕНО:
print(f"🔌 [Site] WebSocket connection attempt for dialog {dialog_id}")
print(f"✅ [Site] WebSocket accepted for dialog {dialog_id}")
print(f"🔌 [Site] WebSocket подключён к диалогу {dialog_id}")
print(f"📊 [Site] Total connections for dialog {dialog_id}: {len(ws_site_connections[dialog_id])}")
print(f"🔌 [Site] WebSocket отключён от диалога {dialog_id}")
print(f"📊 [Site] Remaining connections for dialog {dialog_id}: {len(ws_site_connections.get(dialog_id, []))}")
```

## Архитектура после исправлений

### WebSocket Endpoints и пулы соединений
```
/ws/dialogs/{id}?token=JWT_TOKEN
├── Handler: dialog_websocket_endpoint
├── Pool: ws_connections (admin соединения)
└── Logs: [Admin]

/ws/site/dialogs/{id}?site_token=SITE_TOKEN  
├── Handler: site_dialog_websocket_endpoint
├── Pool: ws_site_connections (site виджеты)
└── Logs: [Site]

/ws/widget/dialogs/{id}?assistant_id=ID
├── Handler: widget_dialog_websocket_endpoint  
├── Pool: ws_connections (widget соединения) ← ИСПРАВЛЕНО
└── Logs: [Widget]
```

### HTTP API Endpoints (без изменений)
```
/api/dialogs/{id}/messages?token=JWT_TOKEN
├── Для admin панели

/api/site/dialogs/{id}/messages?site_token=SITE_TOKEN
├── Для site виджетов

/api/widget/dialogs/{id}/messages?assistant_id=ID  
├── Для widget режима
```

### Frontend логика выбора (без изменений)
```javascript
// WebSocket подключение
if (siteToken) {
  wsUrl = `/ws/site/dialogs/${dialogId}?site_token=${siteToken}`;
} else if (assistantId) {
  wsUrl = `/ws/widget/dialogs/${dialogId}?assistant_id=${assistantId}`;
}

// HTTP отправка сообщений
if (siteToken) {
  url = `/api/site/dialogs/${dialogId}/messages?site_token=${siteToken}`;
} else if (assistantId) {  
  url = `/api/widget/dialogs/${dialogId}/messages?assistant_id=${assistantId}`;
}
```

## Результаты исправлений

### ✅ Что должно работать теперь:
1. **Стабильные WebSocket подключения** без быстрых разрывов
2. **Правильная доставка real-time сообщений** в нужные соединения
3. **Отсутствие конфликтов** между endpoints
4. **Корректная инициализация** (диалог загружен → WebSocket подключен)
5. **Видимость всех подключений** в логах сервера

### 📊 Диагностические логи после исправлений:
```
# Widget подключения (assistant_id режим)
🔌 [Widget] WebSocket connection attempt for dialog 1, assistant 3
✅ [Widget] WebSocket accepted for dialog 1
🔌 [Widget] WebSocket подключён к диалогу 1
📊 [Widget] Total connections for dialog 1: 1

# Site подключения (site_token режим)  
🔌 [Site] WebSocket connection attempt for dialog 1
✅ [Site] WebSocket accepted for dialog 1
🔌 [Site] WebSocket подключён к диалогу 1
📊 [Site] Total connections for dialog 1: 1

# Доставка сообщений
🔍 [WebSocketManager] Push to SITE/WIDGET dialog 1: 1 connections
✅ [WebSocketManager] Message sent via SITE/WIDGET WebSocket  
📊 [WebSocketManager] Sent to 1/1 SITE/WIDGET connections
```

## Инструкции по применению

### 1. Перезапуск сервисов
```bash
# Перезапуск backend для применения изменений
docker-compose restart deployed-backend-1

# Проверка статуса
docker logs deployed-backend-1 --tail=10
```

### 2. Проверка работоспособности
```bash
# Мониторинг WebSocket подключений
docker logs deployed-backend-1 --tail=50 | grep -E "(\[Site\]|\[Widget\]|\[Admin\])"

# Мониторинг доставки сообщений
docker logs deployed-backend-1 --tail=30 | grep -E "(WebSocketManager|Push to|Message sent)"
```

### 3. Тестирование
1. Открыть виджет на сайте
2. Проверить подключение WebSocket в Network tab браузера
3. Отправить сообщение из виджета  
4. Проверить real-time получение ответа
5. Проверить работу в admin панели

## Файлы изменений
- ✅ `backend/services/websocket_manager.py` - исправлен routing, добавлены логи
- ✅ `backend/api/site.py` - удален дублирующий endpoint  
- ✅ `frontend/pages/chat-iframe.js` - исправлена race condition
- ✅ `docs/troubleshooting/websocket-widget-issues.md` - документация диагностики
- ✅ `docs/troubleshooting/unsolved-problem-2025-09-05.md` - анализ проблемы
- ✅ `docs/troubleshooting/widget-fixes-2025-09-05.md` - этот документ

## Совместимость
- ✅ Обратная совместимость с существующими виджетами
- ✅ Работа в режиме `site_token` и `assistant_id`  
- ✅ Совместимость с admin панелью
- ✅ Правильная работа handoff функций

## История версий
- **5 сентября 2025, 18:00 MSK** - критические исправления WebSocket routing
- **5 сентября 2025, 17:50 MSK** - добавлены логи site WebSocket
- **5 сентября 2025, 17:40 MSK** - исправлена nginx конфигурация для WebSocket