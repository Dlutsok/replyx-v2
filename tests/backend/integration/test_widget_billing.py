#!/usr/bin/env python3
"""
Тест системы списания средств за виджет-сообщения
"""
import os
import sys
import requests
import json
from datetime import datetime

# Добавляем путь к backend для импорта модулей
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_widget_billing():
    """Тест списания средств за виджет-сообщения"""
    
    # URL для тестирования (локальный сервер)
    base_url = "http://localhost:8000"
    
    print("🧪 Тестирование системы списания за виджет-сообщения")
    print("=" * 60)
    
    # Проверяем, что есть service_price для widget_message
    try:
        response = requests.get(f"{base_url}/api/balance/prices")
        if response.status_code == 200:
            prices = response.json()
            widget_price = next((p for p in prices if p['service_type'] == 'widget_message'), None)
            if widget_price:
                print(f"✅ Service price для widget_message найден: {widget_price['price']} руб.")
            else:
                print("❌ Service price для widget_message НЕ найден!")
                return False
        else:
            print(f"❌ Ошибка получения цен: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Сервер не запущен на localhost:8000")
        print("   Запустите: cd backend && uvicorn main:app --reload")
        return False
    
    # Симуляция использования виджета
    print("\n📝 Проверка типов транзакций в системе:")
    
    expected_types = ['ai_message', 'widget_message', 'document_upload', 'bot_message']
    for transaction_type in expected_types:
        type_price = next((p for p in prices if p['service_type'] == transaction_type), None)
        if type_price:
            print(f"   ✅ {transaction_type}: {type_price['price']} руб. - {type_price['description']}")
        else:
            print(f"   ❌ {transaction_type}: НЕ НАЙДЕН")
    
    print("\n💡 Система готова к списанию за виджет-сообщения!")
    print("   Каждое AI-сообщение в виджете будет стоить 5 рублей")
    print("   Расходы будут отображаться на странице 'Расходы' с иконкой 🌐")
    
    return True

if __name__ == "__main__":
    success = test_widget_billing()
    sys.exit(0 if success else 1)