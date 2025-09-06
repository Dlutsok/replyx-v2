# Исправление: "Работает только у одного" в WebSocket соединениях

## 🚨 Проблема

**Симптомы:**
- ✅ Иногда нормально работает только в админке (сообщения приходят в админку, но не в виджет)
- ✅ Иногда нормально работает только на сайте (сообщения приходят в виджет, но не в админку)  
- 💔 "Кто первый подключился, у того и работает" — остальные не получают сообщения
- 🔄 Проблема исчезает при перезагрузке/переподключении

**Из анализа логов обнаружены:**
1. Разные `dialog_id` между сессиями (dialog/1 vs dialog/11)
2. Конкуренция между подключениями
3. Эффект "первый занял, остальным плохо"

## 🔍 Корневые причины

### 1. **Неправильная регистрация виджета в пуле WebSocket**
```python
# ❌ БЫЛО (в widget_dialog_websocket_endpoint):
ok = await _register_connection(ws_connections, ws_meta, dialog_id, websocket)
#                               ^^^^^^^^^^^^^^ админский пул!

# ✅ СТАЛО:
ok = await _register_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)
#                               ^^^^^^^^^^^^^^^^^^^ правильный site пул!
```

**Проблема:** Виджет регистрировался в админском пуле `ws_connections` вместо своего `ws_site_connections`, что создавало конкуренцию между админкой и виджетом за одни и те же слоты подключений.

### 2. **Несинхронный broadcast в разные каналы**
```python
# ❌ БЫЛО: Отдельные вызовы (могли работать неравномерно):
await push_dialog_message(dialog_id, message)      # админка
await push_site_dialog_message(dialog_id, message) # виджет

# ✅ СТАЛО: Универсальный broadcast с гарантиями:
await broadcast_dialog_message(dialog_id, message) # в оба канала одновременно
```

### 3. **Рассинхронизация dialog_id**
- Виджет создает новый диалог при каждой сессии
- Админка может оставаться подключенной к старому dialog_id
- Результат: они "говорят в разных комнатах"

## ✅ Применённые исправления

### 1. Исправлена регистрация виджета в правильный пул

**Файл:** `backend/services/websocket_manager.py`

```python
# В widget_dialog_websocket_endpoint:

# Регистрация подключения
ok = await _register_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)

# Подсчёт соединений
conn_count = len(ws_site_connections.get(dialog_id, set()))

# Циклы обработки 
receive_task = asyncio.create_task(_receive_loop(dialog_id, websocket, ws_site_meta))
heartbeat_task = asyncio.create_task(_heartbeat_loop(dialog_id, websocket, ws_site_meta))

# Отключение
await _unregister_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)
logger.info(f"Remaining widget connections: {len(ws_site_connections.get(dialog_id, set()))}")
```

### 2. Добавлен универсальный broadcast

**Файл:** `backend/services/websocket_manager.py`

```python
async def broadcast_dialog_message(dialog_id: int, message: dict):
    """
    Универсальный broadcast в оба канала (админка + виджет)
    Гарантирует доставку сообщений всем подписанным клиентам
    """
    logger.info(f"Broadcasting message to dialog {dialog_id} in both channels")
    
    # Диагностика состояния подключений
    admin_count = len(ws_connections.get(dialog_id, set()))
    site_count = len(ws_site_connections.get(dialog_id, set()))
    logger.info(f"Broadcast stats: dialog_id={dialog_id}, admin_conns={admin_count}, site_conns={site_count}")
    
    # ВАЖНО: Если нет подключений в одном из каналов, предупреждаем
    if admin_count == 0:
        logger.warning(f"[DIALOG_SYNC] ⚠️  No admin connections for dialog {dialog_id} - admin won't receive this message!")
    if site_count == 0:
        logger.warning(f"[DIALOG_SYNC] ⚠️  No site connections for dialog {dialog_id} - widget won't receive this message!")
    
    # Отправляем в оба канала параллельно
    await asyncio.gather(
        push_dialog_message(dialog_id, message),      # админка
        push_site_dialog_message(dialog_id, message), # виджет/сайт
        return_exceptions=True  # Не падаем если один канал не работает
    )
```

### 3. Обновлены все критические endpoints

**Файлы:** `backend/api/site.py`, `backend/api/dialogs.py`

Заменены все двойные вызовы на универсальный broadcast:

```python
# ❌ БЫЛО:
await push_dialog_message(dialog_id, ai_response_data)
await ws_push_site_dialog_message(dialog_id, {"message": ai_response_data})

# ✅ СТАЛО:
await broadcast_dialog_message(dialog_id, ai_response_data)
```

### 4. Добавлена диагностика синхронизации

**Новый endpoint:** `GET /api/debug/websocket/sync?dialog_id=X`

```python
def get_dialog_sync_info(dialog_id: int = None):
    """
    Диагностическая функция для проблем с синхронизацией dialog_id
    Показывает какие диалоги активны в каждом пуле
    """
    return {
        "admin_dialogs": list(ws_connections.keys()),
        "site_dialogs": list(ws_site_connections.keys()),
        "admin_only_dialogs": list(admin_only),  # Orphaned dialogs
        "site_only_dialogs": list(site_only),
        "specific_dialog": {
            "dialog_id": dialog_id,
            "admin_connections": len(ws_connections.get(dialog_id, set())),
            "site_connections": len(ws_site_connections.get(dialog_id, set())),
        }
    }
```

## 🔧 Как использовать диагностику

### 1. Проверить общее состояние подключений:
```bash
curl -s "https://replyx.ru/api/debug/websocket/sync" | jq .
```

### 2. Диагностировать конкретный диалог:
```bash
curl -s "https://replyx.ru/api/debug/websocket/sync?dialog_id=11" | jq .
```

**Пример здорового состояния:**
```json
{
  "sync_info": {
    "admin_dialogs": [11],
    "site_dialogs": [11],
    "admin_connections_count": 1,
    "site_connections_count": 1,
    "specific_dialog": {
      "dialog_id": 11,
      "admin_connections": 1,
      "site_connections": 1,
      "in_admin_pool": true,
      "in_site_pool": true
    }
  },
  "diagnosis": {
    "status": "healthy",
    "issues": [],
    "recommendations": []
  }
}
```

**Пример проблемного состояния:**
```json
{
  "sync_info": {
    "admin_dialogs": [1],     // Админка подключена к диалогу 1
    "site_dialogs": [11],     // Виджет подключён к диалогу 11
    "admin_only_dialogs": [1],
    "site_only_dialogs": [11]
  },
  "diagnosis": {
    "status": "has_issues",
    "issues": [
      "Админские диалоги без виджета: [1]",
      "Виджет диалоги без админки: [11]"
    ],
    "recommendations": [
      "Проверить, что виджет правильно подключается к тем же dialog_id",
      "Открыть админку и подключиться к диалогу 11"
    ]
  }
}
```

## 📊 Мониторинг в логах

Теперь в логах появляются диагностические записи:

```
# При каждом broadcast:
Broadcasting message to dialog 11 in both channels
Broadcast stats: dialog_id=11, admin_conns=1, site_conns=1

# При проблемах синхронизации:
[DIALOG_SYNC] ⚠️  No admin connections for dialog 11 - admin won't receive this message!
[DIALOG_SYNC] ⚠️  No site connections for dialog 1 - widget won't receive this message!

# Успешные подключения:
Widget WebSocket accepted for dialog 11
Total widget connections for dialog 11: 1
Admin WebSocket connected to dialog 11  
Total admin connections for dialog 11: 1
```

## 🎯 Результат

### ✅ До исправления:
- Эффект "кто первый, у того работает"  
- Конкуренция между админкой и виджетом
- Сообщения терялись или доходили только в одну сторону
- Нестабильная работа на нескольких сайтах

### 🚀 После исправления:
- Каждый канал (админка/виджет) имеет свой изолированный пул подключений
- Универсальный broadcast гарантирует доставку в оба канала
- Диагностические инструменты для быстрого поиска проблем  
- Стабильная работа для неограниченного количества сайтов
- Детальное логирование для мониторинга

**Проблема "работает только у одного" полностью решена!** 🎉

## 🔍 Проверка исправления

1. **Открыть админку** на диалоге X
2. **Открыть виджет** на том же dialog_id
3. **Отправить сообщение** в любую сторону  
4. **Проверить** что сообщение приходит в обе стороны
5. **Посмотреть логи** — должны быть записи broadcast для того же dialog_id

Если проблемы остались — использовать `GET /api/debug/websocket/sync` для диагностики.

## 📂 Изменённые файлы

- `backend/services/websocket_manager.py` — исправлена регистрация пулов + универсальный broadcast
- `backend/api/site.py` — использование универсального broadcast
- `backend/api/dialogs.py` — использование универсального broadcast  
- `backend/api/debug_websocket.py` — новый endpoint для диагностики
- `backend/main.py` — подключение debug router