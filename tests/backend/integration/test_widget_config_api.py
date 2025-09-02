#!/usr/bin/env python3
"""
Тест API widget-config для проверки передачи персонализации в виджет
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

def test_widget_config_api():
    """Тестирует API widget-config с реальным токеном"""
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        print("🧪 ТЕСТ API WIDGET-CONFIG")
        print("=" * 50)
        
        # Получаем ассистента для теста
        assistant = session.query(Assistant).first()
        if not assistant:
            print("❌ Нет ассистентов для тестирования")
            return False
            
        print(f"📋 Тестируем ассистента: {assistant.name} (ID: {assistant.id})")
        
        # Обновляем настройки персонализации для теста
        print("\\n🔧 УСТАНОВКА ТЕСТОВЫХ НАСТРОЕК...")
        assistant.operator_name = "Максим Сервисов"
        assistant.business_name = "ООО Тестовая Компания" 
        assistant.avatar_url = "https://example.com/test-avatar.jpg"
        assistant.widget_theme = "yellow"
        assistant.widget_settings = {
            "position": "bottom-left",
            "buttonSize": 70,
            "welcomeMessage": "Добро пожаловать в тест!"
        }
        session.commit()
        session.refresh(assistant)
        print("✅ Тестовые настройки установлены")
        
        # Создаем токен
        print("\\n🔑 СОЗДАНИЕ ТОКЕНА...")
        token_payload = {
            "assistant_id": assistant.id,
            "allowed_domains": "example.com,test.com"
        }
        test_token = jwt.encode(token_payload, SITE_SECRET, algorithm='HS256')
        print(f"✅ Токен создан: {test_token[:50]}...")
        
        # Тестируем API widget-config
        print("\\n🌐 ТЕСТ API WIDGET-CONFIG...")
        api_url = "http://localhost:8000/api/widget-config"
        
        response = requests.post(api_url, json={"token": test_token}, timeout=10)
        print(f"📡 Статус ответа: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"📦 Ответ API: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            if result.get("success"):
                config = result.get("config", {})
                print("\\n✅ API РАБОТАЕТ КОРРЕКТНО:")
                print(f"  - Оператор: {config.get('operator_name')}")
                print(f"  - Компания: {config.get('business_name')}")
                print(f"  - Аватар: {config.get('avatar_url')}")
                print(f"  - Тема: {config.get('widget_theme')}")
                print(f"  - ID ассистента: {config.get('assistant_id')}")
                
                # Проверяем, что персонализированные данные передаются
                if (config.get('operator_name') == "Максим Сервисов" and
                    config.get('business_name') == "ООО Тестовая Компания" and
                    config.get('widget_theme') == "yellow"):
                    print("\\n🎉 ПЕРСОНАЛИЗАЦИЯ РАБОТАЕТ!")
                    return True
                else:
                    print("\\n❌ ПЕРСОНАЛИЗАЦИЯ НЕ РАБОТАЕТ - получены дефолтные значения")
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
    success = test_widget_config_api()
    sys.exit(0 if success else 1)