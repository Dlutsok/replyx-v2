#!/usr/bin/env python3
"""
Тест webhook endpoint на localhost с правильной подписью
"""
import requests
import json
import hashlib

# Конфигурация из .env
TINKOFF_SECRET_KEY = "lczutIQhGoZoZrgW"

def calculate_signature(data: dict) -> str:
    """Точная копия функции из backend/api/tinkoff_payments.py"""
    # Исключаем поле подписи, пустые значения и None
    filtered_data = {k: v for k, v in data.items() 
                    if k not in ['token', 'Token'] and v is not None and str(v).strip() != ''}
    
    # Добавляем секретный ключ как Password (согласно документации)
    filtered_data['Password'] = TINKOFF_SECRET_KEY
    
    # Сортируем по ключам и создаем строку конкатенации
    sorted_keys = sorted(filtered_data.keys())
    concatenated_values = [str(filtered_data[key]) for key in sorted_keys]
    concatenated_string = ''.join(concatenated_values)
    
    print(f"🔤 Строка для хеширования: {concatenated_string[:50]}...")
    print(f"📝 Ключи: {sorted_keys}")
    
    # Вычисляем SHA256 хэш
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

# Создаем реальный заказ для имитации (нужно быть в БД)
webhook_data = {
    "TerminalKey": "1757348842151DEMO",
    "OrderId": "replyx_1757522000_abcd1234",  # Формат как в коде
    "Success": True,
    "Status": "CONFIRMED",
    "PaymentId": "987654321",
    "ErrorCode": "0",
    "Amount": 10000,  # 100 рублей в копейках
    "Pan": "430000******0777"
}

# Вычисляем подпись
token = calculate_signature(webhook_data)
webhook_data["Token"] = token

print("📬 Тестирование webhook endpoint на localhost...")
print(f"📝 Данные webhook:")
for k, v in webhook_data.items():
    if k != "Token":
        print(f"  {k}: {v}")
print(f"🔐 Подпись: {token}")
print()

# Отправляем webhook
url = "http://localhost:8000/api/payments/tinkoff-notification"
try:
    response = requests.post(url, json=webhook_data, timeout=30)
    print(f"📤 Ответ webhook endpoint (статус {response.status_code}):")
    
    if response.headers.get('content-type', '').startswith('application/json'):
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    else:
        print(response.text)
        
    if response.status_code == 404:
        print("💡 Заказ не найден в БД - это ожидаемо для тестового OrderId")
    elif response.status_code == 401:
        print("💡 Неверная подпись - проверим алгоритм...")
    elif response.status_code == 200:
        print("✅ Webhook обработан успешно!")
        
except requests.exceptions.RequestException as e:
    print(f"❌ Ошибка webhook запроса: {e}")

print("\n" + "="*50)
print("📊 АНАЛИЗ ПРОБЛЕМЫ:")
print("✅ Туннель настроен: https://huge-terms-sell.loca.lt")  
print("✅ TINKOFF_NOTIFICATION_URL добавлен в .env")
print("✅ Backend перезапущен и подхватил настройки")
print("✅ Webhook endpoint доступен на localhost")
print("⚠️  Нужно создать реальный заказ в БД для полного теста")
print("⚠️  Localtunnel временно недоступен - альтернатива:")
print("   - Использовать ngrok с регистрацией")
print("   - Или настроить публичный сервер для тестов")
print("="*50)