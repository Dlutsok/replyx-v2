#!/usr/bin/env python3
"""
Скрипт для тестирования всех вариантов заголовков handoff уведомлений
"""

import sys
import os
from pathlib import Path

# Добавляем путь к backend модулям
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from integrations.email_service import email_service
    print("✓ EmailService загружен успешно")
except ImportError as e:
    print(f"❌ Ошибка загрузки EmailService: {e}")
    sys.exit(1)

def test_all_handoff_subjects(target_email: str = "dlutsok13@yandex.ru"):
    """Тестирует все варианты заголовков handoff уведомлений"""
    
    print(f"🚀 Тестируем все варианты handoff заголовков на {target_email}")
    print("=" * 80)
    
    test_cases = [
        {
            "name": "Клиент запросил оператора",
            "reason": "keyword",
            "user_text": "Здравствуйте! Мне нужна помощь оператора с настройкой API",
            "expected_subject": "ReplyX: Клиент запросил живого оператора (диалог #11111)"
        },
        {
            "name": "AI не смог ответить",
            "reason": "fallback", 
            "user_text": "Как настроить интеграцию с вашей системой через webhook?",
            "expected_subject": "ReplyX: Требуется помощь оператора (диалог #22222)"
        },
        {
            "name": "Повторные проблемы",
            "reason": "retries",
            "user_text": "Третий раз пытаюсь разобраться с этой ошибкой, помогите пожалуйста",
            "expected_subject": "ReplyX: Сложный случай - нужен оператор (диалог #33333)"
        },
        {
            "name": "Ручной запрос",
            "reason": "manual",
            "user_text": "Администратор вручную назначил оператора на этот диалог",
            "expected_subject": "ReplyX: Требуется оператор (диалог #44444)"
        }
    ]
    
    successful_sends = 0
    
    for i, case in enumerate(test_cases, 1):
        print(f"📧 [{i}/{len(test_cases)}] Тестируем: {case['name']}")
        print(f"   Причина: {case['reason']}")
        print(f"   Ожидаемый заголовок: {case['expected_subject']}")
        
        dialog_id = int(f"{i}{i}{i}{i}{i}")  # 11111, 22222, 33333, 44444
        
        try:
            success = email_service.send_handoff_notification(
                to_email=target_email,
                dialog_id=dialog_id,
                reason=case['reason'],
                user_preview=case['user_text'],
                timestamp="10.09.2025 16:00"
            )
            
            if success:
                print(f"   ✅ Отправлено успешно")
                successful_sends += 1
            else:
                print(f"   ❌ Ошибка отправки")
                
        except Exception as e:
            print(f"   💥 Исключение: {e}")
        
        print()  # Пустая строка между тестами
    
    print("=" * 80)
    print(f"📊 Результат: {successful_sends}/{len(test_cases)} писем отправлено")
    
    if successful_sends == len(test_cases):
        print("🎉 Все варианты заголовков отправлены успешно!")
        print(f"📬 Проверьте почтовый ящик {target_email}")
        print()
        print("🔍 В почте должны быть письма с заголовками:")
        for case in test_cases:
            dialog_id = test_cases.index(case) + 1
            dialog_id = int(f"{dialog_id}" * 5)
            expected = case['expected_subject'].replace('#11111', f'#{dialog_id}').replace('#22222', f'#{dialog_id}').replace('#33333', f'#{dialog_id}').replace('#44444', f'#{dialog_id}')
            print(f"   • {expected}")
        print()
        print("✨ Новые заголовки гораздо понятнее для операторов!")
    else:
        print("❌ Не все письма отправились")

def main():
    target_email = "dlutsok13@yandex.ru"
    
    print("🔧 ReplyX Handoff Subjects Tester")
    print(f"📧 Целевая почта: {target_email}")
    print()
    
    # Проверяем базовую конфигурацию email
    print("🔍 Проверяем конфигурацию email...")
    test_result = email_service.send_test_email(target_email)
    
    if not test_result["success"]:
        print("❌ Базовая настройка email не работает")
        return
    
    print("✅ Базовая настройка email работает")
    print()
    
    # Тестируем все варианты заголовков
    test_all_handoff_subjects(target_email)

if __name__ == "__main__":
    main()