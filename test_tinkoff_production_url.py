#!/usr/bin/env python3
"""
Тест Tinkoff API с правильным URL для DEMO терминала
Согласно документации: тестовый терминал с DEMO отправляется на боевую среду!
"""

import hashlib
import requests
import json
from datetime import datetime
import uuid

# ВАЖНО: Для тестового терминала с DEMO используем БОЕВОЙ URL!
TERMINAL_KEY = "1757348842151DEMO"
SECRET_KEY = "lczutIQhGoZoZrgW"
PRODUCTION_URL = "https://securepay.tinkoff.ru/v2/"  # Боевая среда для DEMO терминала!
TEST_URL = "https://rest-api-test.tinkoff.ru/v2/"    # Тестовая среда для боевых терминалов

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
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

def test_api_url(api_url, url_name):
    """Тест API с указанным URL"""
    print(f"\n🧪 ТЕСТ {url_name}")
    print(f"📍 URL: {api_url}")
    print("=" * 60)
    
    order_id = f"test_{int(datetime.utcnow().timestamp())}"
    
    # Минимальный набор данных
    data = {
        'TerminalKey': TERMINAL_KEY,
        'Amount': 50000,  # 500 рублей как в логах
        'OrderId': order_id,
        'Description': f'Тест {url_name}',
        'CustomerKey': '6',
        'SuccessURL': 'http://localhost:3000/payment/success?order=' + order_id,
        'FailURL': 'http://localhost:3000/payment/error?order=' + order_id,
        'Language': 'ru',
        'PayType': 'O'
    }
    
    # Вычисляем подпись
    token = calculate_signature(data.copy())
    data['Token'] = token
    
    print(f"🔐 Подпись: {token}")
    
    # Отправляем запрос
    try:
        print(f"📡 Отправка запроса...")
        response = requests.post(
            f"{api_url}Init",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"📊 HTTP статус: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            result = response.json()
            print(f"📄 Ответ: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            if result.get('Success'):
                print(f"✅ УСПЕХ для {url_name}!")
                return True
            else:
                error_code = result.get('ErrorCode', 'UNKNOWN')
                message = result.get('Message', 'Неизвестная ошибка')
                details = result.get('Details', '')
                
                print(f"❌ ОШИБКА для {url_name}:")
                print(f"   Код: {error_code}")
                print(f"   Сообщение: {message}")
                print(f"   Детали: {details}")
                return False
        else:
            print(f"❌ Не-JSON ответ: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Исключение для {url_name}: {e}")
        return False

def main():
    print("🚀 ТЕСТ ПРАВИЛЬНОГО URL ДЛЯ DEMO ТЕРМИНАЛА")
    print(f"⏰ Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔑 Terminal: {TERMINAL_KEY}")
    print()
    
    print("📚 СОГЛАСНО ДОКУМЕНТАЦИИ TINKOFF:")
    print("   - Тестовый терминал (с DEMO) → БОЕВАЯ среда (securepay.tinkoff.ru)")
    print("   - Боевой терминал → ТЕСТОВАЯ среда (rest-api-test.tinkoff.ru)")
    print()
    
    # Тест 1: Текущий URL (неправильный?)
    test1_success = test_api_url(TEST_URL, "ТЕСТОВАЯ СРЕДА (rest-api-test)")
    
    # Тест 2: Правильный URL согласно документации
    test2_success = test_api_url(PRODUCTION_URL, "БОЕВАЯ СРЕДА (securepay) - ПРАВИЛЬНО!")
    
    print("\n" + "=" * 60)
    print("📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ")
    print("=" * 60)
    print(f"Тестовая среда (rest-api-test):  {'✅' if test1_success else '❌'}")
    print(f"Боевая среда (securepay):        {'✅' if test2_success else '❌'}")
    
    if test2_success and not test1_success:
        print(f"\n🎉 ПРОБЛЕМА НАЙДЕНА!")
        print(f"💡 Для тестового терминала с DEMO нужно использовать БОЕВОЙ URL:")
        print(f"   https://securepay.tinkoff.ru/v2/")
        print(f"   Вместо: https://rest-api-test.tinkoff.ru/v2/")
        print(f"\n🔧 ИСПРАВЛЕНИЕ В КОДЕ:")
        print(f"   TINKOFF_SANDBOX_API_URL = 'https://securepay.tinkoff.ru/v2/'")
    elif test1_success:
        print(f"\n✅ Текущая конфигурация работает")
    else:
        print(f"\n❌ Оба URL не работают - нужно связаться с поддержкой Tinkoff")

if __name__ == "__main__":
    main()
