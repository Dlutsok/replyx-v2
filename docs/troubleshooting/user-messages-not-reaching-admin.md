# Проблема: Сообщения пользователей не доходят до админки

## 📋 Описание проблемы

**Симптомы:**
- ✅ Сообщения от менеджера (админки) приходят в виджет на сайте
- ❌ Сообщения от пользователя (с сайта) НЕ приходят в админку
- ✅ WebSocket iframe валидация работает (нет 4003 ошибок)

**Из логов:**
```
📨 [Widget] WebSocket message received: {id: 177, sender: 'manager', text: '1'}  ✅ Приходит
📨 [Widget] WebSocket message received: {id: 178, sender: 'manager', text: '2'}  ✅ Приходит
```

НО в админке сообщения от пользователя не появляются.

## 🔍 Диагностика

### Проверить статистику WebSocket подключений:

```bash
curl -s "https://replyx.ru/api/websocket/stats" | jq .
```

**Ожидаемый результат для РАБОЧЕЙ системы:**
```json
{
  "connection_details": {
    "admin_connections": 1,     ← ДОЛЖНО быть > 0 когда админ открыт
    "site_connections": 1       ← > 0 когда виджет активен
  }
}
```

**Фактический результат (ПРОБЛЕМА):**
```json
{
  "connection_details": {
    "admin_connections": 0,     ← ❌ ПРОБЛЕМА: админ не подключён!
    "site_connections": 0
  }
}
```

## 🎯 Корневая причина

**Admin WebSocket connections = 0** — админка НЕ подключена к WebSocket для получения сообщений в реальном времени.

### Что происходит:
1. ✅ Пользователь отправляет сообщение через `/api/widget/dialogs/{id}/messages`
2. ✅ Код правильно сохраняет сообщение в БД
3. ✅ Код правильно вызывает `push_dialog_message(dialog_id, user_data)` для админки
4. ❌ НО функция `push_dialog_message()` не находит активных WebSocket подключений админки
5. ❌ Логирует: `"No ADMIN WebSocket connections found for dialog {dialog_id}"`
6. ❌ Сообщение не доставляется в админку

## ✅ Решение

### 1. Краткосрочное решение (ПРИМЕНЕНО)

Добавлено диагностическое логирование в `api/site.py`:

```python
# Диагностическое логирование для отладки доставки в админку
from services.websocket_manager import get_connection_stats
stats = get_connection_stats()
logger.info(
    f"[MSG_BROADCAST] dialog={dialog_id} sender=user "
    f"admin_conns={stats['connection_details']['admin_connections']} "
    f"site_conns={stats['connection_details']['site_connections']}"
)

# ОСНОВНОЙ broadcast в админку
await push_dialog_message(dialog_id, user_message_data)

# СТРАХОВОЧНЫЙ механизм: если админ не подключён, предупреждаем
if stats['connection_details']['admin_connections'] == 0:
    logger.warning(f"[MSG_BROADCAST] ❌ No admin connections for dialog {dialog_id} - user message may be lost!")
```

### 2. Операционное решение для менеджера

**Для получения сообщений от пользователей:**

1. 📱 **Открыть админку** в браузере
2. 🔍 **Найти нужный диалог** в списке диалогов 
3. 👆 **Кликнуть на диалог** — это автоматически подключит WebSocket
4. ✅ **Сообщения начнут приходить** в реальном времени

**Проверить что подключение работает:**
```bash
# После открытия диалога в админке:
curl -s "https://replyx.ru/api/websocket/stats" | jq .connection_details.admin_connections
# Должно вернуть: 1 (или больше)
```

### 3. Мониторинг (ДОБАВЛЕН)

В логах теперь появляются диагностические записи:

```bash
# УСПЕШНАЯ доставка:
[MSG_BROADCAST] dialog=1 sender=user admin_conns=1 site_conns=1

# ПРОБЛЕМА - админ не подключён:
[MSG_BROADCAST] ❌ No admin connections for dialog 1 - user message may be lost!
No ADMIN WebSocket connections found for dialog 1
```

**Алерт для настройки мониторинга:**
- Следить за `"No admin connections for dialog"` в логах
- Уведомлять менеджеров о необходимости открыть админку

## 🏗️ Долгосрочные улучшения

### 1. Push-уведомления для менеджеров
```python
# В будущем можно добавить:
if stats['connection_details']['admin_connections'] == 0:
    # Отправить push/email уведомление менеджеру
    await send_push_notification(
        dialog_id=dialog_id,
        message=f"Новое сообщение от пользователя в диалоге #{dialog_id}"
    )
```

### 2. Сохранение пропущенных сообщений
```python
# Можно добавить очередь пропущенных сообщений:
if stats['connection_details']['admin_connections'] == 0:
    await queue_message_for_later_delivery(dialog_id, user_message_data)
```

### 3. Автоматическое переподключение админки
```javascript
// В админке можно добавить:
// Автоматическое переподключение WebSocket при потере соединения
// Уведомления о новых сообщениях в title/фавиконе
```

## 📝 Чек-лист для менеджера

При жалобе "не приходят сообщения от пользователей":

- [ ] Открыта ли админка в браузере?
- [ ] Выбран ли диалог в админке?
- [ ] Проверить WebSocket статистику: `admin_connections > 0`?
- [ ] Найти в логах: `[MSG_BROADCAST] dialog=X sender=user admin_conns=?`
- [ ] Если `admin_conns=0` → открыть админку и подключиться к диалогу

## 🔧 Техническая информация

### Endpoints:
- **Пользователь** → `/api/widget/dialogs/{id}/messages` (sender: 'user')
- **Менеджер** → `/api/dialogs/{id}/messages` (sender: 'manager')

### WebSocket функции:
- `push_dialog_message()` → админка
- `push_site_dialog_message()` → виджет

### Файлы изменены:
- `backend/api/site.py` — добавлено диагностическое логирование
- `docs/troubleshooting/user-messages-not-reaching-admin.md` — данный документ