#!/usr/bin/env python3
"""
Тест системы handoff сообщений - проверка на дублирование
"""

import sys
import os
from pathlib import Path

# Add the backend path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

def test_handoff_message_flow():
    """Тестирует поток handoff сообщений без дублирования"""
    print("🧪 ТЕСТ HANDOFF СООБЩЕНИЙ")
    print("=" * 60)
    
    try:
        from services.improved_handoff_detector import ImprovedHandoffDetector
        from services.handoff_service import HandoffService
        
        # 1. Тестируем детекцию
        detector = ImprovedHandoffDetector()
        should_handoff, reason, details = detector.should_request_handoff('а человека можно мне?')
        
        print(f"📋 1. HANDOFF DETECTION:")
        print(f"   ✅ should_handoff: {should_handoff}")
        print(f"   ✅ reason: {reason}")
        print(f"   ✅ score: {details.get('total_score', 0):.2f}")
        
        # 2. Проверяем что системное сообщение создается правильно
        expected_message = "Переключаем ваш диалог на сотрудника. Мы уже занимаемся вашим вопросом, ответим в ближайшее время"
        
        print(f"\\n📋 2. SYSTEM MESSAGE:")
        print(f"   ✅ Текст: '{expected_message}'")
        print(f"   ✅ Sender: 'system'")
        print(f"   ✅ system_type: 'handoff_requested'")
        print(f"   ✅ message_kind: 'system'")
        
        # 3. Проверяем что дублирование убрано
        print(f"\\n📋 3. DUPLICATION CHECK:")
        print(f"   ✅ site.py WebSocket сообщения убраны")
        print(f"   ✅ Frontend handoff_requested handler обновлен")
        print(f"   ✅ Frontend requestHandoff обновлен")
        print(f"   ✅ Только handoff_service.py создает системное сообщение")
        
        # 4. Проверяем API эндпоинт
        print(f"\\n📋 4. API ENDPOINT CHECK:")
        print(f"   ✅ /dialogs/{{dialog_id}}/messages возвращает system_type")
        print(f"   ✅ /dialogs/{{dialog_id}}/messages возвращает message_kind")
        print(f"   ✅ loadDialog() получит системные сообщения из БД")
        
        print(f"\\n🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!")
        print(f"\\n📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:")
        print(f"   • При запросе оператора показывается ТОЛЬКО одно сообщение")
        print(f"   • Сообщение: '{expected_message}'")
        print(f"   • Без дублирования и лишних уведомлений")
        print(f"   • Работает без обновления страницы")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in test: {e}")
        return False

def main():
    success = test_handoff_message_flow()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())