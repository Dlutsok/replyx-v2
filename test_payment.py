#!/usr/bin/env python3
"""
Тест создания платежа через Tinkoff API
"""
import requests
import json

# Тестовые данные для создания платежа
url = "http://localhost:8000/api/payments/create-payment"

# Получаем токен авторизации (нужно быть залогиненным)
auth_url = "http://localhost:8000/api/auth/login"
auth_data = {
    "username": "dlutsok13@ya.ru",  # Видим в логах что этот пользователь уже логинился
    "password": "your_password_here"  # Нужен реальный пароль
}

# Данные для платежа
payment_data = {
    "amount": 100.0,  # 100 рублей
    "description": "Тест пополнения баланса",
    "email": "test@example.com",
    "phone": "+79991234567"
}

print("🧪 Тестирование создания платежа через Tinkoff...")
print(f"📡 Backend URL: {url}")
print(f"💰 Сумма: {payment_data['amount']} руб.")
print()

# Пока без авторизации - просто покажем что происходит
try:
    response = requests.post(url, data=payment_data, timeout=30)
    print(f"📤 Ответ сервера (статус {response.status_code}):")
    
    if response.headers.get('content-type', '').startswith('application/json'):
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    else:
        print(response.text)
        
except requests.exceptions.RequestException as e:
    print(f"❌ Ошибка запроса: {e}")