#!/usr/bin/env python3
"""
Тестовый скрипт для проверки отправки сообщений оператора в Telegram
"""

import requests
import sys
import json
from typing import Optional

# Конфигурация
BOT_SERVICE_URL = "http://localhost:3002"
FASTAPI_URL = "http://127.0.0.1:8000"

def test_telegram_operator_message(telegram_chat_id: str, message: str) -> bool:
    """
    Тестирует отправку сообщения оператора в Telegram
    """
    print(f"🧪 Тестируем отправку сообщения в Telegram чат {telegram_chat_id}")
    print(f"📝 Сообщение: {message}")
    print("-" * 50)
    
    # 1. Проверяем доступность bot service
    print("1️⃣ Проверяем доступность Bot Service...")
    try:
        response = requests.get(f"{BOT_SERVICE_URL}/status", timeout=5)
        print(f"   ✅ Bot Service доступен (HTTP {response.status_code})")
    except Exception as e:
        print(f"   ❌ Bot Service недоступен: {e}")
        return False
    
    # 2. Проверяем доступность FastAPI
    print("2️⃣ Проверяем доступность FastAPI...")
    try:
        response = requests.get(f"{FASTAPI_URL}/docs", timeout=5)
        print(f"   ✅ FastAPI доступен (HTTP {response.status_code})")
    except Exception as e:
        print(f"   ❌ FastAPI недоступен: {e}")
        return False
    
    # 3. Пробуем получить диалог по telegram_chat_id
    print("3️⃣ Проверяем получение диалога...")
    try:
        response = requests.get(f"{FASTAPI_URL}/api/dialogs/by-telegram-chat/{telegram_chat_id}", timeout=10)
        if response.status_code == 200:
            dialog_data = response.json()
            print(f"   ✅ Диалог найден: assistant_id={dialog_data.get('assistant_id')}, bot_id={dialog_data.get('bot_id')}")
        else:
            print(f"   ⚠️ Диалог не найден (HTTP {response.status_code}): {response.text}")
            # Это не критично для теста, продолжаем
    except Exception as e:
        print(f"   ❌ Ошибка получения диалога: {e}")
        # Продолжаем тест без диалога
    
    # 4. Отправляем сообщение через Bot Service
    print("4️⃣ Отправляем сообщение через Bot Service...")
    try:
        payload = {
            "telegram_chat_id": telegram_chat_id,
            "text": message,
            "operator_name": "Тестовый оператор"
        }
        
        print(f"   📤 Отправляем POST на {BOT_SERVICE_URL}/send-operator-message")
        print(f"   📄 Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        
        response = requests.post(
            f"{BOT_SERVICE_URL}/send-operator-message",
            json=payload,
            timeout=15
        )
        
        print(f"   📥 Ответ: HTTP {response.status_code}")
        print(f"   📄 Содержимое: {response.text}")
        
        if response.status_code == 200:
            print(f"   ✅ Сообщение отправлено успешно!")
            return True
        else:
            print(f"   ❌ Ошибка отправки сообщения")
            return False
            
    except Exception as e:
        print(f"   ❌ Исключение при отправке: {e}")
        return False

def main():
    if len(sys.argv) != 3:
        print("Использование: python test_telegram_operator_message.py <telegram_chat_id> <message>")
        print("Пример: python test_telegram_operator_message.py 123456789 'Привет от оператора!'")
        sys.exit(1)
    
    telegram_chat_id = sys.argv[1]
    message = sys.argv[2]
    
    print("🚀 Запуск тестирования отправки сообщений оператора в Telegram")
    print(f"🤖 Telegram Chat ID: {telegram_chat_id}")
    print(f"💬 Сообщение: {message}")
    print("=" * 60)
    
    success = test_telegram_operator_message(telegram_chat_id, message)
    
    print("=" * 60)
    if success:
        print("✅ Тест ПРОЙДЕН: Сообщение отправлено успешно!")
        sys.exit(0)
    else:
        print("❌ Тест ПРОВАЛЕН: Не удалось отправить сообщение")
        sys.exit(1)

if __name__ == "__main__":
    main()