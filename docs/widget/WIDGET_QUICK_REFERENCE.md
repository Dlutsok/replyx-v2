# ReplyX Widget - Краткий справочник

**Дата:** 6 сентября 2025  
**Статус:** ✅ АКТУАЛЬНО  

---

## 🚀 Быстрый старт

### Создание виджета
```bash
# Создать новый токен виджета
curl -X POST "http://localhost:8000/api/widgets" \
     -H "Authorization: Bearer ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{"assistant_id": 3}'
```

### Встраивание на сайт
```html
<!-- Полученный embed_code -->
<script src="http://localhost:3000/widget.js?token=JWT_TOKEN&assistant_id=3&theme=%23ff0000&type=floating&host=http://localhost:3000" async></script>
```

---

## 🔧 Архитектура (упрощенно)

```
Виджет → HTTP POST → Backend API → Redis Pub/Sub → SSE Manager → Админка
   ↑                                                                 ↓
   └─────────────── SSE EventSource ←─────────────────────────────────┘
```

### Ключевые компоненты:
- **widget.js** - загрузчик виджета
- **chat-iframe.js** - интерфейс чата  
- **SSE Manager** - доставка событий
- **Redis Pub/Sub** - очередь событий

---

## 📡 API Endpoints

### SSE подключения
```
GET /api/dialogs/{id}/events?token=JWT_TOKEN              # Админка
GET /api/dialogs/{id}/events?site_token=SITE_TOKEN        # Site виджеты  
GET /api/dialogs/{id}/events?assistant_id=ID&guest_id=GUID # Widget режим
```

### HTTP сообщения
```
POST /api/dialogs/{id}/messages?token=JWT_TOKEN              # Админка
POST /api/site/dialogs/{id}/messages?site_token=SITE_TOKEN   # Site виджеты
POST /api/widget/dialogs/{id}/messages?assistant_id=ID       # Widget режим
```

---

## 🔍 Быстрая диагностика

### Проверка SSE подключения
```bash
# Прямое подключение
curl -N "http://localhost:8000/api/dialogs/1/events?assistant_id=3&guest_id=test"

# Должен вернуться поток:
retry: 5000
: heartbeat
```

### Отправка тестового сообщения
```bash
curl -X POST "http://localhost:8000/api/widget/dialogs/1/messages?assistant_id=3&guest_id=test" \
     -H "Content-Type: application/json" \
     -d '{"sender": "user", "text": "Тест"}'
```

### Проверка логов
```bash
# Логи виджета
docker logs replyx-backend | grep "WIDGET" --tail=10

# Логи SSE
docker logs replyx-backend | grep "SSE Manager" --tail=10
```

---

## 🚨 Решение частых проблем

### "Сообщения не доходят в админку"
```bash
# 1. Проверить URL в браузере (Network tab)
# Должно быть: localhost:8000/api/dialogs/1/events
# НЕ должно быть: localhost:3000/api/dialogs/1/events

# 2. Проверить формат событий в консоли
# Должно быть: {type: "message:new", message: {...}}
```

### "Widget отключается сразу"
```javascript
// В консоли виджета:
[ReplyX Widget] Серверная проверка: токен не актуален - domains changed

// Решение: создать новый токен (localhost домены добавятся автоматически)
```

### "Дублирование сообщений"
```bash
# Проверить отсутствие двойной публикации в логах:
docker logs replyx-backend | grep "publish_dialog_event" | head -5
# Должно быть только одно событие на сообщение
```

---

## 📊 Форматы сообщений

### Новое сообщение (SSE)
```json
{
  "type": "message:new",
  "message": {
    "id": 123,
    "sender": "user",
    "text": "Привет!",
    "timestamp": "2025-09-06T18:30:00Z"
  },
  "dialog_id": 1
}
```

### Системное событие (SSE)  
```json
{
  "type": "message_received",
  "message": "Ваше сообщение получено",
  "dialog_id": 1,
  "timestamp": "2025-09-06T18:30:00Z"
}
```

---

## 🛠️ Полезные команды

### Мониторинг в реальном времени
```bash
# Все события виджета
docker logs replyx-backend -f | grep -E "(WIDGET|SSE)"

# Redis Pub/Sub события
redis-cli PSUBSCRIBE "ws:dialog:*"

# Проверка здоровья
curl "http://localhost:8000/api/sse/health"
```

### Отладка в браузере
```javascript
// В DevTools Console проверить:
// 1. SSE подключение в Network tab
// 2. Логи в Console: "📨 [АДМИН SSE] Получено событие"
// 3. Отсутствие CORS ошибок
```

---

## ✅ Чек-лист работоспособности

- [ ] SSE URL = localhost:8000 (не 3000)
- [ ] EventSource status = 200 в Network tab
- [ ] В консоли есть логи "📨 [АДМИН SSE]"
- [ ] Backend логи содержат "✅ [WIDGET→ADMIN]"
- [ ] Redis Pub/Sub получает события
- [ ] Нет CORS ошибок
- [ ] Токен валидный для текущего домена

---

**Полная документация:**
- `docs/widget/WIDGET_ARCHITECTURE_2025.md` - детальная архитектура
- `docs/troubleshooting/WIDGET_SSE_TROUBLESHOOTING.md` - диагностика проблем
- `docs/realtime/sse-architecture.md` - SSE система

> 💡 **Главное правило:** Админка должна подключаться к бэкенду (localhost:8000), а не к фронтенду (localhost:3000)!
