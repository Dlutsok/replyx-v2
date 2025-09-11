#!/usr/bin/env python3
"""
Точная диагностика проблемы с T-Bank API
Сравнение нашего кода с эталонным запросом
"""

import hashlib
import requests
import json
from datetime import datetime
import uuid
import os

# Данные из .env
TERMINAL_KEY = "1757348842151DEMO"
SECRET_KEY = "lczutIQhGoZoZrgW"
SANDBOX_URL = "https://rest-api-test.tinkoff.ru/v2/"

def our_normalize_value(value):
    """Наша текущая нормализация"""
    if isinstance(value, bool):
        return 'true' if value else 'false'
    return str(value)

def our_calculate_signature(data: dict) -> str:
    """Наша текущая функция подписи"""
    # Исключаем поле подписи, пустые значения и None
    items = [(k, v) for k, v in data.items() 
             if k not in ['token', 'Token'] and v is not None and str(v).strip() != '']
    
    # Добавляем секретный ключ как Password
    items.append(('Password', SECRET_KEY))
    
    # Сортируем по ключам (ASCII сортировка)
    items.sort(key=lambda kv: kv[0])
    
    # Нормализуем значения и создаем строку конкатенации
    normalized_values = [our_normalize_value(v) for _, v in items]
    concatenated_string = ''.join(normalized_values)
    
    print(f"🔐 НАША ПОДПИСЬ:")
    print(f"   Ключи: {[k for k, _ in items if k != 'Password']}")
    print(f"   Значения: {normalized_values[:-1]}")  # Без пароля
    print(f"   Длина строки: {len(concatenated_string)}")
    
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

def etalon_calculate_signature(data: dict) -> str:
    """Эталонная функция подписи по документации T-Bank"""
    # Исключаем Token, Receipt и пустые значения
    items = []
    for k, v in data.items():
        if k in ['Token', 'Receipt']:  # Receipt исключается!
            continue
        if v is None or str(v).strip() == '':
            continue
        items.append((k, v))
    
    # Добавляем пароль
    items.append(('Password', SECRET_KEY))
    
    # Сортировка
    items.sort(key=lambda kv: kv[0])
    
    # Нормализация булевых
    normalized = []
    for _, v in items:
        if isinstance(v, bool):
            normalized.append('true' if v else 'false')
        else:
            normalized.append(str(v))
    
    concatenated = ''.join(normalized)
    
    print(f"🔐 ЭТАЛОННАЯ ПОДПИСЬ:")
    print(f"   Ключи: {[k for k, _ in items if k != 'Password']}")
    print(f"   Значения: {normalized[:-1]}")  # Без пароля
    print(f"   Длина строки: {len(concatenated)}")
    
    return hashlib.sha256(concatenated.encode('utf-8')).hexdigest()

def test_minimal_request():
    """Тест с минимальным набором полей"""
    print("=" * 60)
    print("🧪 ТЕСТ 1: МИНИМАЛЬНЫЙ ЗАПРОС")
    print("=" * 60)
    
    order_id = f"min_{int(datetime.utcnow().timestamp())}_{str(uuid.uuid4())[:8]}"
    
    # Минимальный набор обязательных полей
    data = {
        'TerminalKey': TERMINAL_KEY,
        'Amount': 10000,  # 100 рублей
        'OrderId': order_id,
        'Description': 'Минимальный тест'
    }
    
    print(f"📋 Минимальные данные: {data}")
    
    # Наша подпись
    our_token = our_calculate_signature(data.copy())
    
    # Эталонная подпись
    etalon_token = etalon_calculate_signature(data.copy())
    
    print(f"\n🔍 СРАВНЕНИЕ ПОДПИСЕЙ:")
    print(f"   Наша:     {our_token}")
    print(f"   Эталон:   {etalon_token}")
    print(f"   Совпадают: {'✅' if our_token == etalon_token else '❌'}")
    
    # Запрос к API
    data['Token'] = our_token
    
    try:
        response = requests.post(
            f"{SANDBOX_URL}Init",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"\n📡 ОТВЕТ API:")
        print(f"   HTTP: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   JSON: {json.dumps(result, ensure_ascii=False, indent=2)}")
            return result.get('Success', False)
        else:
            print(f"   Ошибка: {response.text}")
            return False
            
    except Exception as e:
        print(f"   Исключение: {e}")
        return False

def test_with_receipt():
    """Тест с Receipt объектом"""
    print("\n" + "=" * 60)
    print("🧪 ТЕСТ 2: С RECEIPT ОБЪЕКТОМ")
    print("=" * 60)
    
    order_id = f"receipt_{int(datetime.utcnow().timestamp())}_{str(uuid.uuid4())[:8]}"
    
    # Данные с Receipt
    data = {
        'TerminalKey': TERMINAL_KEY,
        'Amount': 10000,
        'OrderId': order_id,
        'Description': 'Тест с чеком',
        'Receipt': {
            'Email': 'test@example.com',
            'Taxation': 'usn_income',
            'Items': [{
                'Name': 'Тестовый товар',
                'Price': 10000,
                'Quantity': 1,
                'Amount': 10000,
                'Tax': 'none'
            }]
        }
    }
    
    print(f"📋 Данные с Receipt:")
    print(json.dumps(data, ensure_ascii=False, indent=2))
    
    # Наша подпись (не исключает Receipt)
    our_token = our_calculate_signature(data.copy())
    
    # Эталонная подпись (исключает Receipt)
    etalon_token = etalon_calculate_signature(data.copy())
    
    print(f"\n🔍 СРАВНЕНИЕ ПОДПИСЕЙ С RECEIPT:")
    print(f"   Наша (с Receipt):    {our_token}")
    print(f"   Эталон (без Receipt): {etalon_token}")
    print(f"   Совпадают: {'✅' if our_token == etalon_token else '❌'}")
    
    # Тест с эталонной подписью
    data['Token'] = etalon_token
    
    try:
        response = requests.post(
            f"{SANDBOX_URL}Init",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f"\n📡 ОТВЕТ API С ЭТАЛОННОЙ ПОДПИСЬЮ:")
        print(f"   HTTP: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   JSON: {json.dumps(result, ensure_ascii=False, indent=2)}")
            return result.get('Success', False)
        else:
            print(f"   Ошибка: {response.text}")
            return False
            
    except Exception as e:
        print(f"   Исключение: {e}")
        return False

def main():
    print(f"🚀 ДЕТАЛЬНАЯ ДИАГНОСТИКА T-BANK API")
    print(f"⏰ Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔑 Terminal: {TERMINAL_KEY}")
    print(f"🌐 URL: {SANDBOX_URL}")
    print()
    
    # Тест 1: Минимальный запрос
    min_works = test_minimal_request()
    
    # Тест 2: С Receipt
    receipt_works = test_with_receipt()
    
    print("\n" + "=" * 60)
    print("📊 ИТОГОВАЯ ДИАГНОСТИКА")
    print("=" * 60)
    print(f"Минимальный запрос: {'✅' if min_works else '❌'}")
    print(f"С Receipt объектом:  {'✅' if receipt_works else '❌'}")
    
    if not min_works and not receipt_works:
        print("\n🚨 ПРОБЛЕМА: API недоступен совсем")
        print("💡 Проверьте доступность терминала в T-Bank Business")
    elif min_works and not receipt_works:
        print("\n⚠️ ПРОБЛЕМА: Receipt обрабатывается неправильно")
        print("💡 Возможно Receipt нужно исключить из подписи или изменить структуру")
    elif receipt_works:
        print("\n🎉 ВСЕ РАБОТАЕТ: Receipt поддерживается")

if __name__ == "__main__":
    main()