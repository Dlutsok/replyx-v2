#!/usr/bin/env python3
"""
Тест доставки сообщений оператора в Telegram
"""
import asyncio
import requests
from services.bot_manager import send_operator_message_to_telegram
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_telegram_delivery():
    print("🧪 Тестирование доставки сообщений в Telegram")
    
    # 1. Проверяем доступность bot manager
    print("\n1. Проверка bot manager сервиса:")
    try:
        response = requests.get('http://localhost:3002', timeout=5)
        print(f"✅ Bot manager доступен: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Bot manager недоступен: {e}")
        return False
    
    # 2. Проверяем endpoint /send-operator-message
    print("\n2. Тест endpoint /send-operator-message:")
    try:
        test_data = {
            "telegram_chat_id": "123456789",  # Тестовый chat ID
            "text": "🧪 Тестовое сообщение оператора",
            "operator_name": "Тестовый оператор"
        }
        
        response = requests.post(
            'http://localhost:3002/send-operator-message',
            json=test_data,
            timeout=10
        )
        
        print(f"📤 HTTP Status: {response.status_code}")
        print(f"📤 Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            print("✅ Endpoint работает корректно")
        else:
            print(f"❌ Ошибка endpoint: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Ошибка при тестировании endpoint: {e}")
    
    # 3. Тест через bot_manager.py функцию
    print("\n3. Тест через send_operator_message_to_telegram:")
    try:
        await send_operator_message_to_telegram(
            telegram_chat_id="123456789",
            text="🧪 Тест через bot_manager функцию",
            operator_name="Тест оператор"
        )
        print("✅ Функция send_operator_message_to_telegram выполнена")
    except Exception as e:
        print(f"❌ Ошибка в send_operator_message_to_telegram: {e}")
        import traceback
        traceback.print_exc()
    
    # 4. Проверяем есть ли активные диалоги с telegram_chat_id
    print("\n4. Проверка активных Telegram диалогов:")
    try:
        response = requests.get('http://localhost:8000/api/dialogs', timeout=5)
        if response.status_code == 200:
            dialogs = response.json()
            telegram_dialogs = [d for d in dialogs if d.get('telegram_chat_id')]
            print(f"📊 Найдено {len(telegram_dialogs)} Telegram диалогов")
            
            for dialog in telegram_dialogs[:3]:  # Показываем первые 3
                print(f"  - Диалог {dialog['id']}: chat_id={dialog.get('telegram_chat_id')}, status={dialog.get('handoff_status', 'none')}")
        else:
            print(f"❌ Не удалось получить диалоги: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Ошибка получения диалогов: {e}")

if __name__ == "__main__":
    asyncio.run(test_telegram_delivery())