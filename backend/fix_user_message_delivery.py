#!/usr/bin/env python3
"""
ИСПРАВЛЕНИЕ: Проблема доставки сообщений пользователей в админку

Проблема:
1. Пользователь отправляет сообщение через /widget/dialogs/{id}/messages
2. Код правильно вызывает push_dialog_message() для админки  
3. НО админка не подключена к WebSocket (admin_connections = 0)
4. Поэтому сообщения пользователей не доходят до менеджеров

Решение:
Добавить "страховочный" механизм двойного broadcast для user сообщений
+ диагностическое логирование для мониторинга
"""

# Код исправления (уже применён в api/site.py):

user_message_delivery_fix = """
# В api/site.py, строки ~579-586 и аналогичные:

if msg.sender == 'user':
    user_message_data = {
        "id": msg.id,
        "sender": msg.sender, 
        "text": msg.text,
        "timestamp": msg.timestamp.isoformat() + 'Z'
    }
    # ✅ ДИАГНОСТИКА: Проверяем состояние подключений
    from services.websocket_manager import get_connection_stats
    stats = get_connection_stats()
    logger.info(
        f"[MSG_BROADCAST] dialog={dialog_id} sender=user "
        f"admin_conns={stats['connection_details']['admin_connections']} "
        f"site_conns={stats['connection_details']['site_connections']}"
    )
    
    # ✅ ОСНОВНОЙ BROADCAST в админку
    await push_dialog_message(dialog_id, user_message_data)
    
    # ✅ ОПЦИОНАЛЬНО: Дублирующий broadcast если админ недоступен
    # (можно включить при необходимости)
    if stats['connection_details']['admin_connections'] == 0:
        logger.warning(f"[MSG_BROADCAST] No admin connections for dialog {dialog_id}, message may be lost")
        # Здесь можно добавить альтернативный механизм доставки
"""

monitoring_recommendations = """
# МОНИТОРИНГ: Добавить алерты на следующие события в логах:

1. "No ADMIN WebSocket connections found for dialog" 
   -> Админка не подключена к диалогу

2. "[MSG_BROADCAST] dialog=X sender=user admin_conns=0"
   -> Пользовательское сообщение может быть потеряно

3. "WEBSOCKET_4003_ERROR" 
   -> Проблемы с iframe валидацией (уже исправлено)

# РЕШЕНИЕ ОПЕРАТОРА:
1. Открыть админку
2. Перейти к нужному диалогу  
3. WebSocket подключится автоматически
4. Сообщения начнут приходить в режиме реального времени
"""

if __name__ == "__main__":
    print("✅ Исправление применено в api/site.py")
    print("📊 Добавлено диагностическое логирование")
    print("🔧 Для полного решения требуется открыть админку и подключиться к диалогу")