# Диагностика проблем с WebSocket виджетом

## Обнаруженные проблемы

### Проблема 1: WebSocket 404 ошибки
**Симптомы:**
- `net::ERR_CONNECTION_RESET` в браузере
- 404 ошибки на WebSocket endpoints в nginx логах
- Виджет не может установить WebSocket соединение

**Причина:** nginx не был настроен для проксирования WebSocket соединений

**Решение:** Добавлена конфигурация в `nginx/nginx.conf`:
```nginx
location /ws/ {
  proxy_pass         http://backend_up;
  proxy_http_version 1.1;
  proxy_set_header   Upgrade $http_upgrade;
  proxy_set_header   Connection "upgrade";
  proxy_read_timeout 86400s;
  proxy_send_timeout 86400s;
  proxy_buffering    off;
}
```

### Проблема 2: Отсутствие логов site WebSocket подключений
**Симптомы:**
- WebSocket соединения принимаются (видно в логах: `"WebSocket /ws/site/dialogs/X?site_token=..." [accepted]`)
- Но нет логов о регистрации соединений в WebSocketManager
- Сообщения не доставляются в real-time

**Причина:** Функция `site_dialog_websocket_endpoint` не логировала подключения/отключения, в отличие от `widget_dialog_websocket_endpoint`

**Решение:** Добавлены логи в `backend/services/websocket_manager.py` строки 130-154:
```python
print(f"🔌 [Site] WebSocket connection attempt for dialog {dialog_id}")
print(f"✅ [Site] WebSocket accepted for dialog {dialog_id}")
print(f"🔌 [Site] WebSocket подключён к диалогу {dialog_id}")
print(f"📊 [Site] Total connections for dialog {dialog_id}: {len(ws_site_connections[dialog_id])}")
# ... при отключении:
print(f"🔌 [Site] WebSocket отключён от диалога {dialog_id}")
print(f"📊 [Site] Remaining connections for dialog {dialog_id}: {len(ws_site_connections.get(dialog_id, []))}")
```

## WebSocket Endpoints в системе

### 1. Admin панель: `/ws/dialogs/{dialog_id}?token=JWT`
- Используется: admin панель
- Handler: `dialog_websocket_endpoint`
- Пул соединений: `ws_connections`
- Логи: `[Admin]` префикс

### 2. Site виджеты: `/ws/site/dialogs/{dialog_id}?site_token=`  
- Используется: виджеты с site_token
- Handler: `site_dialog_websocket_endpoint`
- Пул соединений: `ws_site_connections`
- Логи: `[Site]` префикс (после исправления)

### 3. Widget режим: `/ws/widget/dialogs/{dialog_id}?assistant_id=`
- Используется: виджеты без site_token
- Handler: `widget_dialog_websocket_endpoint`
- Пул соединений: `ws_site_connections` (тот же что и site!)
- Логи: `[Widget]` префикс

## Команды диагностики на сервере

### Проверка WebSocket соединений в логах
```bash
# Все WebSocket активности
docker logs replyx_backend_1 --tail=100 | grep -E "(WebSocket|websocket|WebSocketManager)"

# Только подключения/отключения
docker logs replyx_backend_1 --tail=50 | grep -E "(\[Admin\]|\[Site\]|\[Widget\])" 

# Проверка доставки сообщений
docker logs replyx_backend_1 --tail=50 | grep -E "(Push to|Message sent|connections found)"
```

### Проверка nginx WebSocket проксирования
```bash
# Проверка nginx конфигурации
docker exec replyx_nginx_1 nginx -t

# Перезагрузка nginx после изменений
docker-compose restart replyx_nginx_1
```

### Мониторинг активных соединений
```bash
# Количество активных WebSocket соединений
docker logs replyx_backend_1 --tail=20 | grep "Total connections"
docker logs replyx_backend_1 --tail=20 | grep "Remaining connections"
```

## Типичные проблемы и решения

### Соединения принимаются, но сообщения не доставляются
1. Проверьте что соединения регистрируются: ищите логи с "Total connections" 
2. Проверьте что WebSocketManager видит соединения: ищите "Available SITE/WIDGET dialogs"
3. Проверьте что нет ошибок "No SITE/WIDGET WebSocket connections found"

### Нестабильная работа WebSocket
1. Проверьте heartbeat логи: "__ping__" и "__pong__" сообщения
2. Проверьте nginx timeout настройки
3. Проверьте нет ли переподключений в логах browser console

### Работает локально, не работает на продакшене  
1. Проверьте nginx конфигурацию для WebSocket
2. Проверьте firewall/security group настройки
3. Проверьте SSL/TLS конфигурацию (ws:// vs wss://)

## Frontend логика выбора WebSocket endpoint

В `frontend/pages/chat-iframe.js` строки 746-752:
```javascript
if (siteToken) {
  // Приоритет токенному режиму
  wsUrl = `${wsApiUrl}/ws/site/dialogs/${dialogId}?site_token=${siteToken}`;
} else if (assistantId) {
  // Fallback на гостевой режим
  wsUrl = `${wsApiUrl}/ws/widget/dialogs/${dialogId}?assistant_id=${assistantId}`;
}
```

## Изменения для исправления

### Файл: `backend/services/websocket_manager.py`
- Добавлены логи в `site_dialog_websocket_endpoint` для видимости подключений
- Теперь все три endpoint'а (`dialog_websocket_endpoint`, `site_dialog_websocket_endpoint`, `widget_dialog_websocket_endpoint`) имеют консистентное логирование

### Файл: `nginx/nginx.conf` 
- Добавлен location `/ws/` с поддержкой WebSocket upgrade
- Настроены правильные timeouts и headers

## После применения изменений
1. Перезапустить backend: `docker-compose restart replyx_backend_1`
2. Перезапустить nginx: `docker-compose restart replyx_nginx_1`  
3. Проверить логи подключений с новыми префиксами `[Site]`