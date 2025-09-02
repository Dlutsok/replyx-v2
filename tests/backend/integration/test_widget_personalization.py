#!/usr/bin/env python3
"""
Тестовый скрипт для проверки персонализации виджета

Этот скрипт проверяет полный цикл персонализации:
1. Обновление настроек ассистента
2. Получение конфигурации виджета  
3. Отображение результата
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Assistant
from core.app_config import DATABASE_URL
import json

def test_personalization():
    """Тестирует персонализацию виджета"""
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        print("🧪 ТЕСТ ПЕРСОНАЛИЗАЦИИ ВИДЖЕТА")
        print("=" * 50)
        
        # Получаем первого ассистента для теста
        assistant = session.query(Assistant).first()
        if not assistant:
            print("❌ Нет ассистентов для тестирования")
            return False
            
        print(f"📋 Тестируем ассистента: {assistant.name} (ID: {assistant.id})")
        
        # Показываем текущие настройки
        print("\n📊 ТЕКУЩИЕ НАСТРОЙКИ:")
        print(f"  Оператор: {getattr(assistant, 'operator_name', 'НЕ ЗАДАНО')}")
        print(f"  Компания: {getattr(assistant, 'business_name', 'НЕ ЗАДАНО')}")
        print(f"  Аватар: {getattr(assistant, 'avatar_url', 'НЕ ЗАДАНО')}")
        print(f"  Тема: {getattr(assistant, 'widget_theme', 'НЕ ЗАДАНО')}")
        print(f"  Дополнительно: {getattr(assistant, 'widget_settings', 'НЕ ЗАДАНО')}")
        
        # Обновляем настройки персонализации
        print("\n🔧 ОБНОВЛЕНИЕ НАСТРОЕК...")
        assistant.operator_name = "Тестовый Оператор"
        assistant.business_name = "Тестовая Компания"
        assistant.avatar_url = "https://example.com/avatar.jpg"
        assistant.widget_theme = "green"
        assistant.widget_settings = {
            "position": "bottom-left",
            "buttonSize": 60,
            "welcomeMessage": "Тестовое приветствие!"
        }
        
        session.commit()
        session.refresh(assistant)
        print("✅ Настройки обновлены в базе данных")
        
        # Проверяем обновленные настройки
        print("\n📊 ОБНОВЛЕННЫЕ НАСТРОЙКИ:")
        print(f"  Оператор: {assistant.operator_name}")
        print(f"  Компания: {assistant.business_name}")
        print(f"  Аватар: {assistant.avatar_url}")
        print(f"  Тема: {assistant.widget_theme}")
        print(f"  Дополнительно: {json.dumps(assistant.widget_settings, ensure_ascii=False, indent=2)}")
        
        # Тестируем widget-config API
        print("\n🌐 ТЕСТ WIDGET-CONFIG API:")
        
        # Имитируем создание токена (для теста используем простую структуру)
        import jwt
        from core.app_config import SITE_SECRET
        
        token_payload = {"assistant_id": assistant.id}
        test_token = jwt.encode(token_payload, SITE_SECRET, algorithm='HS256')
        
        # Имитируем API вызов widget-config
        from api.assistants import get_widget_config_by_token
        
        class MockDB:
            def query(self, model):
                return MockQuery(assistant)
        
        class MockQuery:
            def __init__(self, assistant):
                self._assistant = assistant
            
            def filter(self, *args):
                return self
                
            def first(self):
                return self._assistant
        
        mock_db = MockDB()
        token_data = {"token": test_token}
        
        result = get_widget_config_by_token(token_data, mock_db)
        
        print(f"  Результат API: {json.dumps(result, ensure_ascii=False, indent=2)}")
        
        if result.get("success"):
            config = result.get("config", {})
            print("\n✅ API РАБОТАЕТ КОРРЕКТНО:")
            print(f"  - Оператор: {config.get('operator_name')}")
            print(f"  - Компания: {config.get('business_name')}")
            print(f"  - Аватар: {config.get('avatar_url')}")
            print(f"  - Тема: {config.get('widget_theme')}")
            print(f"  - ID ассистента: {config.get('assistant_id')}")
        else:
            print(f"❌ API вернул ошибку: {result.get('reason')}")
            return False
            
        # Показываем, как выглядит URL виджета с параметрами
        print("\n🔗 ПРИМЕР URL ВИДЖЕТА С ПЕРСОНАЛИЗАЦИЕЙ:")
        base_url = "http://localhost:3000/chat-iframe"
        params = []
        
        if config.get('operator_name'):
            params.append(f"operator_name={config['operator_name'].replace(' ', '+')}")
        if config.get('business_name'):
            params.append(f"business_name={config['business_name'].replace(' ', '+')}")
        if config.get('avatar_url'):
            params.append(f"avatar_url={config['avatar_url']}")
        if config.get('widget_theme'):
            params.append(f"widget_theme={config['widget_theme']}")
            
        if params:
            widget_url = f"{base_url}?{'&'.join(params)}"
            print(f"  {widget_url}")
        else:
            print(f"  {base_url} (без персонализации)")
            
        print("\n🎉 ТЕСТ ЗАВЕРШЕН УСПЕШНО!")
        print("=" * 50)
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка теста: {e}")
        import traceback
        traceback.print_exc()
        session.rollback()
        return False
    finally:
        session.close()

if __name__ == "__main__":
    success = test_personalization()
    sys.exit(0 if success else 1)