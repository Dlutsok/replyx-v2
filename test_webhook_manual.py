#!/usr/bin/env python3
"""
Тест webhook'а Tinkoff для проверки обработки уведомлений
"""

import requests
import hashlib
import json

# Данные для тестирования webhook'а
WEBHOOK_URL = "http://localhost:8000/api/payments/tinkoff-notification"
SECRET_KEY = "lczutIQhGoZoZrgW"

def calculate_webhook_signature(data: dict) -> str:
    """Вычисление подписи для webhook как в коде проекта"""
    items = [(k, v) for k, v in data.items() 
             if k not in ['token', 'Token'] and v is not None and str(v).strip() != '']
    
    items.append(('Password', SECRET_KEY))
    items.sort(key=lambda kv: kv[0])
    
    normalized_values = []
    for _, v in items:
        if isinstance(v, bool):
            normalized_values.append('true' if v else 'false')
        else:
            normalized_values.append(str(v))
    
    concatenated_string = ''.join(normalized_values)
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

def test_successful_webhook():
    """Тест успешного webhook'а"""
    print("🧪 ТЕСТ УСПЕШНОГО WEBHOOK'А")
    print("=" * 50)
    
    # Данные успешного платежа (как от Tinkoff)
    webhook_data = {
        'TerminalKey': '1757348842151DEMO',
        'OrderId': 'replyx_1757561452_77961632',  # Из ваших логов
        'Success': True,
        'Status': 'CONFIRMED',
        'PaymentId': '123456789',
        'ErrorCode': '0',
        'Amount': 9500,  # 95 рублей в копейках
        'CardId': 'test_card_id',
        'Pan': '220138******0039',
        'ExpDate': '1225'
    }
    
    print(f"📋 Данные webhook:")
    for k, v in webhook_data.items():
        print(f"   {k}: {v}")
    
    # Вычисляем подпись
    token = calculate_webhook_signature(webhook_data.copy())
    webhook_data['Token'] = token
    
    print(f"\n🔐 Подпись: {token}")
    print(f"\n📡 Отправка webhook...")
    
    try:
        response = requests.post(
            WEBHOOK_URL,
            json=webhook_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📊 Ответ сервера:")
        print(f"   HTTP статус: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            result = response.json()
            print(f"   JSON: {json.dumps(result, ensure_ascii=False, indent=2)}")
        else:
            print(f"   Текст: {response.text}")
            
        if response.status_code == 200:
            print(f"\n✅ WEBHOOK ОБРАБОТАН УСПЕШНО!")
            print(f"💡 Проверьте логи backend для подтверждения пополнения баланса")
        else:
            print(f"\n❌ Ошибка обработки webhook")
            
    except Exception as e:
        print(f"❌ Ошибка запроса: {e}")

def main():
    print("🚀 ТЕСТИРОВАНИЕ WEBHOOK TINKOFF")
    print(f"🎯 URL: {WEBHOOK_URL}")
    print()
    
    test_successful_webhook()
    
    print(f"\n💡 ИНСТРУКЦИЯ:")
    print(f"1. Убедитесь что backend запущен на порту 8000")
    print(f"2. Проверьте логи backend после выполнения теста")
    print(f"3. Если webhook обработан успешно, баланс должен пополниться")

if __name__ == "__main__":
    main()

