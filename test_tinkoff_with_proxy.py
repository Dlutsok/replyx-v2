#!/usr/bin/env python3
"""
Тест T-Bank API через прокси для проверки IP-блокировки
"""

import requests
import hashlib
import json
from datetime import datetime
import uuid

# Данные из .env
TERMINAL_KEY = "1757348842151DEMO"
SECRET_KEY = "lczutIQhGoZoZrgW"
SANDBOX_URL = "https://rest-api-test.tinkoff.ru/v2/"

# Прокси из OpenAI конфигурации
PROXY_URL = "http://GunetAyL:a7SdSv3i@154.196.24.180:63872"

def calculate_signature(data: dict) -> str:
    """Вычисление подписи для T-Bank API"""
    items = [(k, v) for k, v in data.items() 
             if k not in ['Token'] and v is not None and str(v).strip() != '']
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

def test_with_proxy():
    """Тест через прокси"""
    print("🌐 ТЕСТ T-BANK API ЧЕРЕЗ ПРОКСИ")
    print("=" * 50)
    
    order_id = f"proxy_test_{int(datetime.utcnow().timestamp())}_{str(uuid.uuid4())[:8]}"
    
    data = {
        'TerminalKey': TERMINAL_KEY,
        'OrderId': order_id,
        'Amount': 5000,  # 50 рублей
        'Description': 'Proxy test payment',
        'CustomerKey': 'proxy_test_123',
        'SuccessURL': 'https://example.com/success',
        'FailURL': 'https://example.com/fail',
        'Language': 'ru',
        'PayType': 'O'
    }
    
    token = calculate_signature(data)
    data['Token'] = token
    
    proxies = {
        'http': PROXY_URL,
        'https': PROXY_URL
    }
    
    print(f"🔗 Прокси: {PROXY_URL.split('@')[0]}@***")
    print(f"📋 OrderId: {order_id}")
    
    try:
        response = requests.post(
            f"{SANDBOX_URL}Init",
            json=data,
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'ReplyX-ProxyTest/1.0'
            },
            proxies=proxies,
            timeout=30
        )
        
        print(f"📨 Ответ через прокси:")
        print(f"   HTTP статус: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ JSON ответ:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            return result.get('Success', False)
        else:
            print(f"❌ HTTP ОШИБКА: {response.status_code}")
            print(f"   Текст: {response.text[:200]}...")
            return False
            
    except Exception as e:
        print(f"💥 ОШИБКА: {e}")
        return False

def test_direct_vs_proxy():
    """Сравнение прямого подключения и через прокси"""
    print(f"🚀 СРАВНИТЕЛЬНЫЙ ТЕСТ")
    print(f"⏰ Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Тест без прокси
    print("1️⃣ ПРЯМОЕ ПОДКЛЮЧЕНИЕ:")
    direct_works = False
    try:
        response = requests.get(SANDBOX_URL, timeout=10)
        print(f"   Доступность: {response.status_code}")
        direct_works = response.status_code != 403
    except Exception as e:
        print(f"   Ошибка: {e}")
    
    print()
    
    # Тест через прокси
    print("2️⃣ ЧЕРЕЗ ПРОКСИ:")
    proxy_works = test_with_proxy()
    
    print()
    print("=" * 50)
    print("📊 РЕЗУЛЬТАТЫ:")
    print(f"Прямое подключение: {'✅' if direct_works else '❌'}")
    print(f"Через прокси: {'✅' if proxy_works else '❌'}")
    
    if not direct_works and not proxy_works:
        print("\n🚨 ПРОБЛЕМА: API недоступен даже через прокси")
        print("💡 Скорее всего проблема с терминалом, а не с IP")
    elif not direct_works and proxy_works:
        print("\n⚠️ IP-БЛОКИРОВКА: Ваш IP заблокирован T-Bank")
        print("💡 Используйте VPN или обратитесь в поддержку")
    elif direct_works:
        print("\n🤔 IP НЕ ЗАБЛОКИРОВАН: Проблема в другом")

if __name__ == "__main__":
    test_direct_vs_proxy()