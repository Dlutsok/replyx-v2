#!/usr/bin/env python3
"""
Скрипт для тестирования системы баланса
"""

import sys
import os
import requests
import json
from datetime import datetime, timedelta

# Добавляем путь к корню проекта
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_URL = "http://localhost:8000"

def test_balance_system():
    """Тестирование системы баланса"""
    print("🧪 Тестирование системы баланса...")
    
    # Данные для тестового пользователя
    test_email = "test_balance@example.com"
    test_password = "test123456"
    
    # 1. Регистрация тестового пользователя
    print("\n1. Регистрация тестового пользователя...")
    register_data = {
        "email": test_email,
        "password": test_password,
        "confirm_password": test_password
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
    if response.status_code == 201:
        print("✅ Пользователь зарегистрирован")
    elif response.status_code == 400 and "already exists" in response.text:
        print("ℹ️ Пользователь уже существует")
    else:
        print(f"❌ Ошибка регистрации: {response.text}")
        return
    
    # 2. Авторизация
    print("\n2. Авторизация...")
    login_data = {
        "username": test_email,
        "password": test_password
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", data=login_data)
    if response.status_code != 200:
        print(f"❌ Ошибка авторизации: {response.text}")
        return
    
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Авторизация успешна")
    
    # 3. Проверка начального баланса
    print("\n3. Проверка начального баланса...")
    response = requests.get(f"{BASE_URL}/api/balance/current", headers=headers)
    if response.status_code == 200:
        balance = response.json().get("balance", 0)
        print(f"✅ Начальный баланс: {balance} ₽")
    else:
        print(f"❌ Ошибка получения баланса: {response.text}")
        return
    
    # 4. Пополнение баланса
    print("\n4. Пополнение баланса на 500 ₽...")
    topup_data = {"amount": 500.0}
    response = requests.post(f"{BASE_URL}/api/balance/topup", json=topup_data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Баланс пополнен. Новый баланс: {result['new_balance']} ₽")
    else:
        print(f"❌ Ошибка пополнения: {response.text}")
        return
    
    # 5. Тестирование промокодов
    print("\n5. Тестирование промокодов...")
    
    # Проверка промокода WELCOME10
    promo_data = {"promo_code": "WELCOME10"}
    response = requests.post(f"{BASE_URL}/api/promo/validate", json=promo_data, headers=headers)
    if response.status_code == 200:
        result = response.json()
        if result.get("valid"):
            print(f"✅ Промокод WELCOME10 действителен. Скидка: {result.get('discount_amount')} ₽")
        else:
            print(f"❌ Промокод WELCOME10 недействителен: {result.get('message')}")
    else:
        print(f"❌ Ошибка проверки промокода: {response.text}")
    
    # 6. Тестирование реферальной системы
    print("\n6. Тестирование реферальной системы...")
    
    # Получение реферального кода
    response = requests.get(f"{BASE_URL}/api/referral/my-code", headers=headers)
    if response.status_code == 200:
        referral_code = response.json().get("code")
        print(f"✅ Реферальный код: {referral_code}")
    else:
        print(f"❌ Ошибка получения реферального кода: {response.text}")
    
    # Получение статистики рефералов
    response = requests.get(f"{BASE_URL}/api/referral/stats", headers=headers)
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ Статистика рефералов: {stats['total_referrals']} рефералов, заработано: {stats['total_earned']} ₽")
    else:
        print(f"❌ Ошибка получения статистики рефералов: {response.text}")
    
    # 7. Получение истории транзакций
    print("\n7. Получение истории транзакций...")
    response = requests.get(f"{BASE_URL}/api/balance/transactions", headers=headers)
    if response.status_code == 200:
        transactions = response.json()
        print(f"✅ Найдено {len(transactions)} транзакций")
        for i, tx in enumerate(transactions[:3]):  # Показываем только первые 3
            print(f"   {i+1}. {tx['transaction_type']}: {tx['amount']} ₽ ({tx['description']})")
    else:
        print(f"❌ Ошибка получения транзакций: {response.text}")
    
    # 8. Проверка цен на услуги
    print("\n8. Проверка цен на услуги...")
    response = requests.get(f"{BASE_URL}/api/balance/prices")
    if response.status_code == 200:
        prices = response.json()
        print(f"✅ Найдено {len(prices)} цен на услуги:")
        for price in prices:
            print(f"   - {price['service_type']}: {price['price']} ₽ ({price['description']})")
    else:
        print(f"❌ Ошибка получения цен: {response.text}")
    
    # 9. Тестирование списания средств
    print("\n9. Тестирование списания средств за AI сообщение...")
    
    # Проверяем достаточность средств
    response = requests.get(f"{BASE_URL}/api/balance/check/ai_message", headers=headers)
    if response.status_code == 200:
        result = response.json()
        if result.get("sufficient"):
            print(f"✅ Средств достаточно для AI сообщения. Баланс: {result['current_balance']} ₽")
        else:
            print(f"❌ Недостаточно средств для AI сообщения. Баланс: {result['current_balance']} ₽")
    else:
        print(f"❌ Ошибка проверки средств: {response.text}")
    
    print("\n🎉 Тестирование системы баланса завершено!")

def test_admin_functions():
    """Тестирование административных функций"""
    print("\n🔧 Тестирование административных функций...")
    
    # Здесь можно добавить тесты для админ функций
    # Создание промокодов, управление рефералами и т.д.
    
    print("ℹ️ Административные функции требуют отдельной настройки")

if __name__ == "__main__":
    try:
        test_balance_system()
        test_admin_functions()
    except KeyboardInterrupt:
        print("\n❌ Тестирование прервано пользователем")
    except Exception as e:
        print(f"\n❌ Ошибка при тестировании: {e}")
        import traceback
        traceback.print_exc() 