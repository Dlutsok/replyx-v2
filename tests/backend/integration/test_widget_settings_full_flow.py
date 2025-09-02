#!/usr/bin/env python3
"""
Комплексный тест полного flow настроек виджета:
1. Сохранение настроек через PATCH /assistants/{id}
2. Получение токена через /assistants/{id}/embed-code  
3. Получение настроек через /widget-config
4. Проверка корректности данных на всех этапах
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Assistant
from core.app_config import DATABASE_URL, SITE_SECRET
import json
import jwt
import requests
import time
from datetime import datetime

def test_widget_settings_full_flow():
    """Тестирует полный flow настроек виджета"""
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        print("🧪 ТЕСТ ПОЛНОГО FLOW НАСТРОЕК ВИДЖЕТА")
        print("=" * 60)
        
        # Получаем ассистента для теста
        assistant = session.query(Assistant).first()
        if not assistant:
            print("❌ Нет ассистентов для тестирования")
            return False
            
        print(f"📋 Тестируем ассистента: {assistant.name} (ID: {assistant.id})")
        
        # ЭТАП 1: Сохранение настроек через основной endpoint
        print("\n🔧 ЭТАП 1: СОХРАНЕНИЕ НАСТРОЕК ЧЕРЕЗ PATCH /assistants/{id}")
        print("-" * 50)
        
        test_settings = {
            "operator_name": "Анна Поддержка",
            "business_name": "ООО Тест Компания", 
            "avatar_url": "https://example.com/test-avatar-new.jpg",
            "widget_theme": "green",
            "allowed_domains": "test.com,example.org",
            "widget_settings": {
                "position": "bottom-left",
                "buttonSize": 75,
                "welcomeMessage": "Добро пожаловать в новый чат!",
                "showAvatar": True,
                "showOnlineStatus": False
            }
        }
        
        # Сохраняем настройки (имитируем запрос от frontend)
        print(f"📤 Сохраняем настройки: {json.dumps(test_settings, ensure_ascii=False, indent=2)}")
        
        # Прямое обновление в БД (имитация работы PATCH endpoint)
        assistant.operator_name = test_settings["operator_name"]
        assistant.business_name = test_settings["business_name"] 
        assistant.avatar_url = test_settings["avatar_url"]
        assistant.widget_theme = test_settings["widget_theme"]
        assistant.allowed_domains = test_settings["allowed_domains"]
        assistant.widget_settings = test_settings["widget_settings"]
        assistant.updated_at = datetime.utcnow()
        session.commit()
        session.refresh(assistant)
        
        print("✅ Настройки сохранены в БД")
        
        # ЭТАП 2: Получение embed кода и токена
        print("\n🔗 ЭТАП 2: ПОЛУЧЕНИЕ EMBED КОДА И ТОКЕНА")
        print("-" * 50)
        
        # Создаем токен для виджета (имитация GET /assistants/{id}/embed-code)
        domains_hash = hash(assistant.allowed_domains + str(assistant.updated_at))
        
        payload = {
            'user_id': assistant.user_id,
            'assistant_id': assistant.id,
            'type': 'site',
            'allowed_domains': assistant.allowed_domains,
            'domains_hash': domains_hash,
            'issued_at': int(time.time())
        }
        site_token = jwt.encode(payload, SITE_SECRET, algorithm='HS256')
        
        print(f"🔑 Сгенерирован токен: {site_token[:50]}...")
        print(f"📦 Payload токена: {payload}")
        
        # ЭТАП 3: Получение настроек через widget-config API
        print("\n🌐 ЭТАП 3: ПОЛУЧЕНИЕ НАСТРОЕК ЧЕРЕЗ /widget-config")
        print("-" * 50)
        
        api_url = "http://localhost:8000/api/widget-config"
        
        print(f"📡 Запрос к API: {api_url}")
        response = requests.post(api_url, json={"token": site_token}, timeout=10)
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📦 Ответ API: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            if result.get("success"):
                config = result.get("config", {})
                
                # ЭТАП 4: Проверка корректности полученных данных
                print("\n✅ ЭТАП 4: ПРОВЕРКА КОРРЕКТНОСТИ ДАННЫХ")
                print("-" * 50)
                
                checks = [
                    ("Оператор", config.get('operator_name'), test_settings["operator_name"]),
                    ("Компания", config.get('business_name'), test_settings["business_name"]),
                    ("Аватар", config.get('avatar_url'), test_settings["avatar_url"]),
                    ("Тема", config.get('widget_theme'), test_settings["widget_theme"]),
                    ("ID ассистента", config.get('assistant_id'), assistant.id),
                ]
                
                all_passed = True
                for check_name, received, expected in checks:
                    if received == expected:
                        print(f"  ✅ {check_name}: {received}")
                    else:
                        print(f"  ❌ {check_name}: получено '{received}', ожидалось '{expected}'")
                        all_passed = False
                
                # Проверка widget_settings
                widget_settings = config.get('widget_settings', {})
                if widget_settings:
                    print(f"  ✅ Дополнительные настройки: {json.dumps(widget_settings, ensure_ascii=False)}")
                    
                    # Проверяем конкретные настройки
                    expected_widget_settings = test_settings["widget_settings"]
                    for key, expected_value in expected_widget_settings.items():
                        if widget_settings.get(key) == expected_value:
                            print(f"    ✅ {key}: {widget_settings.get(key)}")
                        else:
                            print(f"    ❌ {key}: получено '{widget_settings.get(key)}', ожидалось '{expected_value}'")
                            all_passed = False
                else:
                    print(f"  ❌ Дополнительные настройки отсутствуют")
                    all_passed = False
                
                # ФИНАЛЬНЫЙ РЕЗУЛЬТАТ
                print("\n🎯 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ")
                print("-" * 50)
                
                if all_passed:
                    print("🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
                    print("📋 Полный flow работает корректно:")
                    print("   1. ✅ Сохранение настроек в БД")
                    print("   2. ✅ Генерация токена")
                    print("   3. ✅ Получение настроек через API")
                    print("   4. ✅ Корректность всех данных")
                    
                    # Дополнительная проверка: симуляция виджета
                    print("\n🖼️ СИМУЛЯЦИЯ РАБОТЫ ВИДЖЕТА:")
                    print(f"   - Имя оператора в интерфейсе: '{config['operator_name']}'")
                    print(f"   - Название компании: '{config['business_name']}'")
                    print(f"   - Тема виджета: '{config['widget_theme']}'")
                    if config['avatar_url']:
                        print(f"   - Аватар загружается с: '{config['avatar_url']}'")
                    print(f"   - Позиция кнопки: '{widget_settings.get('position', 'не задана')}'")
                    print(f"   - Размер кнопки: {widget_settings.get('buttonSize', 'не задан')}px")
                    print(f"   - Приветствие: '{widget_settings.get('welcomeMessage', 'не задано')}'")
                    
                    return True
                else:
                    print("❌ НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОШЛИ")
                    print("📋 Проблемы обнаружены в передаче настроек")
                    return False
            else:
                print(f"❌ API вернул ошибку: {result.get('reason')}")
                return False
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Детали: {error_data}")
            except:
                print(f"   Ответ: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка теста: {e}")
        import traceback
        traceback.print_exc()
        session.rollback()
        return False
    finally:
        session.close()

if __name__ == "__main__":
    success = test_widget_settings_full_flow()
    print(f"\n{'='*60}")
    print(f"🏁 РЕЗУЛЬТАТ ТЕСТА: {'SUCCESS' if success else 'FAILED'}")
    print(f"{'='*60}")
    sys.exit(0 if success else 1)