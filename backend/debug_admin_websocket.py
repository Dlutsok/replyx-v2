#!/usr/bin/env python3
"""
Диагностический скрипт для проблемы доставки сообщений в админку
Проверяет состояние WebSocket подключений и возможность доставки сообщений
"""

import asyncio
import json
from services.websocket_manager import get_connection_stats, push_dialog_message

async def debug_admin_websocket_issue():
    """Диагностирует проблему с доставкой сообщений в админку"""
    print("🔍 [DEBUG] Диагностика проблемы доставки сообщений в админку")
    
    # 1. Проверяем статистику подключений
    stats = get_connection_stats()
    print(f"📊 [DEBUG] WebSocket статистика:")
    print(f"   - Admin connections: {stats['connection_details']['admin_connections']}")
    print(f"   - Site connections: {stats['connection_details']['site_connections']}")
    print(f"   - Total connections: {stats['total_connections']}")
    
    if stats['connection_details']['admin_connections'] == 0:
        print("❌ [DEBUG] ПРОБЛЕМА: Admin WebSocket connections = 0")
        print("   Решение: Открыть админку и подключиться к диалогу")
    else:
        print("✅ [DEBUG] Admin WebSocket подключения найдены")
    
    # 2. Тестовая отправка сообщения (если есть подключения)
    test_dialog_id = 1  # Замените на реальный ID диалога
    test_message = {
        "id": 999999,
        "sender": "user",
        "text": "[DEBUG TEST] Тестовое сообщение от пользователя",
        "timestamp": "2025-09-06T10:00:00.000Z"
    }
    
    print(f"\n📤 [DEBUG] Попытка отправки тестового сообщения в диалог {test_dialog_id}")
    try:
        await push_dialog_message(test_dialog_id, test_message)
        print("✅ [DEBUG] push_dialog_message() выполнен без ошибок")
        
        if stats['connection_details']['admin_connections'] > 0:
            print("✅ [DEBUG] Тестовое сообщение должно быть доставлено в админку")
        else:
            print("❌ [DEBUG] Тестовое сообщение НЕ доставлен (нет admin подключений)")
            
    except Exception as e:
        print(f"❌ [DEBUG] Ошибка при отправке: {e}")
    
    # 3. Проверяем очереди сообщений
    queue_stats = stats.get('message_queue', {})
    print(f"\n📬 [DEBUG] Очередь сообщений:")
    print(f"   - Pending messages: {queue_stats.get('pending_messages', 0)}")
    print(f"   - Processed messages: {queue_stats.get('processed_messages', 0)}")
    print(f"   - Registered websockets: {queue_stats.get('registered_websockets', 0)}")

if __name__ == "__main__":
    asyncio.run(debug_admin_websocket_issue())