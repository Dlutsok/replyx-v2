#!/usr/bin/env python3
"""
Тест webhook уведомлений от Tinkoff
"""
import requests
import json
import hashlib

# Конфигурация из .env
TINKOFF_SECRET_KEY = "lczutIQhGoZoZrgW"  # Из .env файла
TUNNEL_URL = "https://huge-terms-sell.loca.lt"  # Текущий туннель

def calculate_signature(data: dict) -> str:
    """Вычисление подписи для webhook как в backend коде"""
    # Исключаем поле подписи, пустые значения и None
    filtered_data = {k: v for k, v in data.items() 
                    if k not in ['token', 'Token'] and v is not None and str(v).strip() != ''}
    
    # Добавляем секретный ключ как Password
    filtered_data['Password'] = TINKOFF_SECRET_KEY
    
    # Сортируем по ключам и создаем строку конкатенации
    sorted_keys = sorted(filtered_data.keys())
    concatenated_values = [str(filtered_data[key]) for key in sorted_keys]
    concatenated_string = ''.join(concatenated_values)
    
    # Вычисляем SHA256 хэш
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

# Тестовые данные webhook (имитируем уведомление от Тинькофф)
webhook_data = {
    "TerminalKey": "1757348842151DEMO",
    "OrderId": "test_order_123",
    "Success": "true",
    "Status": "CONFIRMED",
    "PaymentId": "123456789",
    "ErrorCode": "0",
    "Amount": "10000",  # 100 руб в копейках
    "Pan": "430000******0777",
}

# Добавляем подпись
webhook_data["Token"] = calculate_signature(webhook_data)

print("🔗 Тестирование webhook endpoint...")
print(f"📡 Туннель URL: {TUNNEL_URL}")
print(f"📝 Тестовые данные webhook:")
print(json.dumps({k: v for k, v in webhook_data.items() if k != "Token"}, indent=2, ensure_ascii=False))
print(f"🔐 Подпись: {webhook_data['Token'][:16]}...")
print()

# Сначала проверим доступность туннеля
health_url = f"{TUNNEL_URL}/health"
print(f"🏥 Проверка здоровья туннеля: {health_url}")
try:
    health_response = requests.get(health_url, timeout=10)
    print(f"✅ Туннель доступен (статус: {health_response.status_code})")
    if health_response.status_code == 200:
        print(f"📊 Ответ: {health_response.json()['status']}")
except Exception as e:
    print(f"❌ Туннель недоступен: {e}")
    print("⚠️ Попробуем отправить webhook напрямую на localhost...")

print()

# Тестируем webhook endpoint
webhook_url = f"{TUNNEL_URL}/api/payments/tinkoff-notification"
print(f"📬 Отправка тестового webhook: {webhook_url}")

try:
    response = requests.post(webhook_url, json=webhook_data, timeout=30)
    print(f"📤 Ответ webhook endpoint (статус {response.status_code}):")
    
    if response.headers.get('content-type', '').startswith('application/json'):
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    else:
        print(response.text)
        
except requests.exceptions.RequestException as e:
    print(f"❌ Ошибка webhook запроса: {e}")
    print("🔄 Попробуем через localhost...")
    
    # Fallback на localhost
    localhost_webhook_url = "http://localhost:8000/api/payments/tinkoff-notification"
    try:
        response = requests.post(localhost_webhook_url, json=webhook_data, timeout=30)
        print(f"📤 Ответ localhost webhook (статус {response.status_code}):")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            print(json.dumps(response.json(), indent=2, ensure_ascii=False))
        else:
            print(response.text)
    except Exception as e2:
        print(f"❌ Ошибка localhost запроса: {e2}")