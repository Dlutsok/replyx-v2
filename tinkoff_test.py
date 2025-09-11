#!/usr/bin/env python3
"""
Простая диагностика проблемы с Tinkoff API
"""

import hashlib
import requests
import json
from datetime import datetime
import uuid

# Тестовые данные из логов
TERMINAL_KEY = "1757348842151DEMO"
SECRET_KEY = "lczutIQhGoZoZrgW"
SANDBOX_URL = "https://rest-api-test.tinkoff.ru/v2/"

def calculate_signature(data: dict) -> str:
    """Функция подписи как в коде проекта"""
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
    
    print(f"🔐 Подпись:")
    print(f"   Ключи: {[k for k, _ in items if k != 'Password']}")
    print(f"   Значения: {normalized_values[:-1]}")  # Без пароля
    print(f"   Длина строки: {len(concatenated_string)}")
    
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

def test_simple_init():
    """Тест простого Init запроса"""
    print("🧪 Тест простого Init запроса")
    print("=" * 50)
    
    order_id = f"test_{int(datetime.utcnow().timestamp())}"
    
    # Минимальный набор данных
    data = {
        'TerminalKey': TERMINAL_KEY,
        'Amount': 50000,  # 500 рублей как в логах
        'OrderId': order_id,
        'Description': 'Тест пополнения баланса',
        'CustomerKey': '6',  # Как в логах
        'SuccessURL': 'http://localhost:3000/payment/success?order=' + order_id,
        'FailURL': 'http://localhost:3000/payment/error?order=' + order_id,
        'Language': 'ru',
        'PayType': 'O',
        'NotificationURL': 'https://51be9a6c19f2.ngrok-free.app/api/payments/tinkoff-notification'
    }
    
    print(f"📋 Данные запроса:")
    for k, v in data.items():
        print(f"   {k}: {v}")
    print()
    
    # Вычисляем подпись
    token = calculate_signature(data.copy())
    data['Token'] = token
    
    print(f"🔐 Подпись: {token}")
    print()
    
    # Отправляем запрос
    try:
        print("📡 Отправка запроса к Tinkoff...")
        response = requests.post(
            f"{SANDBOX_URL}Init",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📊 Ответ сервера:")
        print(f"   HTTP статус: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            result = response.json()
            print(f"   JSON: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            if not result.get('Success'):
                error_code = result.get('ErrorCode', 'UNKNOWN')
                message = result.get('Message', 'Неизвестная ошибка')
                details = result.get('Details', '')
                
                print(f"\n❌ ОШИБКА:")
                print(f"   Код: {error_code}")
                print(f"   Сообщение: {message}")
                print(f"   Детали: {details}")
                
                if error_code == '501':
                    print(f"\n💡 ДИАГНОСТИКА ОШИБКИ 501:")
                    print(f"   - Проверьте правильность TerminalKey: {TERMINAL_KEY}")
                    print(f"   - Убедитесь что терминал активен в T-Bank Business")
                    print(f"   - Проверьте что используется sandbox URL: {SANDBOX_URL}")
                    print(f"   - Возможно нужно активировать терминал в личном кабинете")
            else:
                print(f"\n✅ УСПЕХ: {result}")
                
        else:
            print(f"   Не-JSON ответ: {response.text}")
            
    except Exception as e:
        print(f"❌ Ошибка запроса: {e}")

def main():
    print("🚀 ДИАГНОСТИКА TINKOFF API")
    print(f"⏰ Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔑 Terminal: {TERMINAL_KEY}")
    print(f"🌐 URL: {SANDBOX_URL}")
    print()
    
    test_simple_init()

if __name__ == "__main__":
    main()
