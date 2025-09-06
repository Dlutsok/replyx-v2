# ReplyX Widget - Руководство по диагностике SSE

**Дата создания:** 6 сентября 2025  
**Статус:** ✅ АКТУАЛЬНО  
**Применимо к:** SSE-based виджеты после миграции от WebSocket

---

## 🚨 Симптомы и быстрая диагностика

### "Сообщения от виджета не появляются в админке"

#### Быстрая проверка:
```bash
# 1. Проверить URL SSE подключения в браузере (Network tab)
# Должно быть: localhost:8000/api/dialogs/1/events
# НЕ должно быть: localhost:3000/api/dialogs/1/events

# 2. Проверить логи backend
docker logs replyx-backend | grep -E "(WIDGET→ADMIN|SSE Manager)" --tail=20

# 3. Проверить прямое SSE подключение
curl -N "http://localhost:8000/api/dialogs/1/events?assistant_id=3&guest_id=test"
```

#### Если проблема не решена:
- **Причина 1:** Админка подключается к фронтенду (3000) вместо бэкенда (8000)
- **Причина 2:** Обработчик SSE не понимает новый формат событий
- **Причина 3:** Кэш перезаписывает новые сообщения
- **Причина 4:** События публикуются в неправильный канал

---

## 🔍 Пошаговая диагностика

### Шаг 1: Проверка SSE подключения

#### В браузере (DevTools → Network):
```
✅ Правильно:
GET http://localhost:8000/api/dialogs/1/events?token=...
Status: 200
Type: eventsource

❌ Неправильно:
GET http://localhost:3000/api/dialogs/1/events?token=...
Status: 404 или CORS error
```

#### Исправление проблемы с URL:
```javascript
// Файл: frontend/config/api.js
// Проверить что localhost перенаправляется на :8000
if (host.startsWith('localhost:') || host.startsWith('127.0.0.1:')) {
  return `${protocol}//localhost:8000`; // бэкенд
}
```

### Шаг 2: Проверка формата событий SSE

#### В консоли браузера должны быть логи:
```javascript
✅ Правильно:
📨 [АДМИН SSE] Получено событие: {type: "message:new", message: {...}}
📥 [АДМИН SSE] Добавляем сообщение от user: текст сообщения
✅ [АДМИН SSE] Сообщение добавлено в состояние: 123

❌ Неправильно:
📨 [АДМИН SSE] Получено событие: {id: 123, sender: "user", text: "..."}
(Отсутствуют логи добавления сообщения)
```

#### Исправление обработчика событий:
```javascript
// Файл: frontend/components/dialogs/DialogModal.js
// Обновить обработчик для нового формата
if (data.type === 'message:new' && data.message) {
  const message = data.message;
  // Обработка сообщения
}
```

### Шаг 3: Проверка публикации событий в backend

#### Логи backend должны содержать:
```bash
✅ Правильно:
🚀 [WIDGET→ADMIN] Отправляем сообщение от user в диалоге 1
✅ [WIDGET→ADMIN] Сообщение пользователя опубликовано в Redis: dialog_id=1, message_id=123
📢 [SSE Manager] Получено Redis Pub/Sub событие для dialog 1
📤 [SSE Manager] Отправляем 1 клиентам для диалога 1

❌ Неправильно:
🚀 [WIDGET→ADMIN] Отправляем сообщение от user в диалоге 1
❌ [WIDGET→ADMIN] Ошибка публикации в Redis для dialog 1: ...
```

#### Проверка Redis Pub/Sub:
```bash
# Подключиться к Redis и слушать события
redis-cli PSUBSCRIBE "ws:dialog:*"

# Отправить сообщение из виджета - должно появиться событие:
pmessage ws:dialog:* ws:dialog:1 {"type":"message:new","message":{...}}
```

### Шаг 4: Проверка кэширования сообщений

#### Симптом: Сообщения появляются и исчезают
```javascript
// Проверить в консоли браузера:
🔄 [DialogModal] Полная замена сообщений: 10  // ← Это может быть проблемой
🔄 [DialogModal] Добавляем новые сообщения из API: 1  // ← Это правильно
```

#### Исправление логики загрузки:
```javascript
// Файл: frontend/components/dialogs/DialogModal.js
// loadMessages должна использовать forceReplace=true только при первой загрузке
loadMessages(true);  // При открытии диалога
loadMessages(false); // При перезагрузке после отправки
```

---

## 🛠️ Инструменты диагностики

### 1. Прямая проверка SSE
```bash
# Подключиться к SSE потоку напрямую
curl -N "http://localhost:8000/api/dialogs/1/events?token=JWT_TOKEN"

# Для виджета в гостевом режиме
curl -N "http://localhost:8000/api/dialogs/1/events?assistant_id=3&guest_id=test-guid"

# Должны появиться строки:
retry: 5000
: heartbeat
```

### 2. Отправка тестового сообщения
```bash
# Отправить сообщение через API
curl -X POST "http://localhost:8000/api/widget/dialogs/1/messages?assistant_id=3&guest_id=test" \
     -H "Content-Type: application/json" \
     -d '{"sender": "user", "text": "Тестовое сообщение"}'

# В SSE потоке должно появиться:
event: message
data: {"type":"message:new","message":{"id":123,"sender":"user","text":"Тестовое сообщение",...}}
```

### 3. Проверка здоровья SSE сервиса
```bash
# Проверка здоровья
curl "http://localhost:8000/api/sse/health"
# Ответ: {"status": "healthy", "connections": 0, "redis": "connected"}

# Статистика SSE
curl "http://localhost:8000/api/sse/stats" 
# Ответ: {"active_connections": 2, "events_sent": 15, "connection_details": {...}}
```

### 4. Мониторинг в реальном времени
```bash
# Логи SSE Manager
docker logs replyx-backend -f | grep -E "(SSE Manager|📢|📤|✅)"

# Логи публикации событий
docker logs replyx-backend -f | grep -E "(WIDGET→ADMIN|publish_dialog_event)"

# Все логи виджета
docker logs replyx-backend -f | grep "WIDGET"
```

---

## 🚀 Решения типичных проблем

### Проблема: "Connection failed with 403"
```bash
# Проверить валидацию токена
curl -X POST "http://localhost:8000/api/validate-widget-token" \
     -H "Content-Type: application/json" \
     -d '{"token":"YOUR_TOKEN", "domain":"localhost:3000"}'

# Если домен не разрешен, создать новый токен:
curl -X POST "http://localhost:8000/api/widgets" \
     -H "Authorization: Bearer ADMIN_JWT" \
     -H "Content-Type: application/json" \
     -d '{"assistant_id": 3}'
```

### Проблема: "Events not delivered"
```bash
# 1. Проверить Redis подключение
redis-cli ping
# Ответ: PONG

# 2. Проверить Redis Pub/Sub
redis-cli PSUBSCRIBE "ws:dialog:*"
# Отправить сообщение - должно появиться событие

# 3. Проверить SSE connections
curl "http://localhost:8000/api/sse/stats"
# active_connections должно быть > 0
```

### Проблема: "Widget отключается сразу после подключения"
```javascript
// Проверить в консоли виджета:
[ReplyX Widget] Серверная проверка: токен не актуален - domains changed

// Решение - создать новый токен с правильными доменами:
// В dev режиме localhost домены добавляются автоматически
```

### Проблема: "Дублирование сообщений"
```bash
# Проверить логи на двойную публикацию:
docker logs replyx-backend | grep -E "(publish_dialog_event)" | head -10

# Должно быть только одно событие на сообщение:
✅ [WIDGET→ADMIN] Сообщение пользователя опубликовано в Redis: dialog_id=1, message_id=123
```

---

## 📊 Проверочный чек-лист

### ✅ Frontend проверки
- [ ] SSE URL указывает на localhost:8000 (не 3000)
- [ ] EventSource подключается успешно (status 200)
- [ ] Обработчик событий поддерживает `{type: "message:new", message: {...}}`
- [ ] loadMessages использует forceReplace правильно
- [ ] В консоли есть логи "📨 [АДМИН SSE] Получено событие"

### ✅ Backend проверки  
- [ ] SSE endpoints отвечают (curl test)
- [ ] Redis Pub/Sub работает (PSUBSCRIBE test)
- [ ] События публикуются в правильный канал
- [ ] Логи содержат "✅ [WIDGET→ADMIN] Сообщение опубликовано в Redis"
- [ ] SSE Manager получает события из Redis

### ✅ Infrastructure проверки
- [ ] Nginx настроен для SSE (proxy_buffering off)
- [ ] Redis доступен и работает
- [ ] Нет CORS ошибок в браузере
- [ ] SSL/TLS работает корректно (если используется HTTPS)

---

## 🎯 Метрики для мониторинга

### Основные показатели
- **SSE подключения активные:** >0 при работающих виджетах
- **Время доставки сообщения:** <500ms от отправки до получения
- **Частота переподключений:** <1% от общего времени
- **Ошибки авторизации:** <1% от общих подключений

### Алерты
- SSE connections = 0 при активных пользователях
- Redis Pub/Sub недоступен
- Время отклика SSE >2 секунд
- Количество ошибок 5xx >10% за 5 минут

---

**Статус документа:** ✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ  
**Последнее обновление:** 6 сентября 2025  
**Применимо к:** ReplyX Widget v1 с SSE архитектурой

> 💡 **Совет:** При возникновении проблем начинайте диагностику с проверки URL SSE подключения в Network tab браузера. 90% проблем связаны с неправильным routing.
