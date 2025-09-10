#!/usr/bin/env python3
"""
Тестовый скрипт для проверки handoff уведомлений
Отправляет тестовое handoff уведомление на указанный email
"""

import sys
import os
from pathlib import Path
from datetime import datetime
import pytz

# Добавляем путь к backend модулям
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from integrations.email_service import email_service
    print("✓ EmailService загружен успешно")
except ImportError as e:
    print(f"❌ Ошибка загрузки EmailService: {e}")
    sys.exit(1)

def test_timezone_fix():
    """Тестирует исправление timezone в уведомлениях"""
    print("🕐 Тестируем исправление timezone...")

    # Проверяем UTC время
    utc_time = datetime.utcnow()
    print(f"   UTC время: {utc_time.strftime('%d.%m.%Y %H:%M')}")

    # Проверяем локальное время Москвы
    moscow_tz = pytz.timezone('Europe/Moscow')
    local_time = datetime.now(moscow_tz)
    print(f"   Московское время: {local_time.strftime('%d.%m.%Y %H:%M')}")

    # Вычисляем разницу
    time_diff = (local_time - utc_time.replace(tzinfo=None)).total_seconds() / 3600
    print(f"   Разница с UTC: {time_diff:.1f} часов")
    print("✅ Timezone исправлен!"    return True

def test_handoff_notification(target_email: str = "dlutsok13@yandex.ru"):
    """Тестирует отправку handoff уведомления"""

    print(f"🚀 Тестируем handoff уведомление на {target_email}")
    print("=" * 60)
    
    # Тестовые данные
    dialog_id = 99999
    reason = "keyword"  # Пользователь запросил оператора
    user_preview = "Здравствуйте! Мне нужна помощь живого оператора с настройкой интеграции API для моего проекта."
    timestamp = "10.09.2025 15:45"
    
    print(f"📧 Отправляем handoff уведомление:")
    print(f"   Dialog ID: {dialog_id}")
    print(f"   Причина: {reason}")
    print(f"   Сообщение пользователя: {user_preview[:50]}...")
    print(f"   Время: {timestamp}")
    print()
    
    try:
        # Отправляем уведомление
        success = email_service.send_handoff_notification(
            to_email=target_email,
            dialog_id=dialog_id,
            reason=reason,
            user_preview=user_preview,
            timestamp=timestamp
        )
        
        if success:
            print("✅ Handoff уведомление отправлено успешно!")
            print(f"📬 Проверьте почтовый ящик {target_email}")
            print("💡 Если письма нет в основной папке, проверьте 'Спам'")
            print()
            print("🔍 Письмо должно содержать:")
            print("   - Заголовок: [Handoff requested] Диалог #99999")
            print("   - Причину запроса оператора")
            print("   - Последнее сообщение пользователя")
            print("   - Ссылку на диалог в админке")
        else:
            print("❌ Ошибка отправки handoff уведомления")
            print("   Проверьте настройки SMTP в конфиге")
            
    except Exception as e:
        print(f"💥 Исключение при отправке: {e}")
        return False
    
    return success

def main():
    target_email = "dlutsok13@yandex.ru"
    
    print("🔧 ReplyX Handoff Notification Tester")
    print(f"📧 Целевая почта: {target_email}")
    print()
    
    # Проверяем базовую конфигурацию email
    print("🔍 Проверяем конфигурацию email...")
    test_result = email_service.send_test_email(target_email)
    
    if not test_result["success"]:
        print("❌ Базовая настройка email не работает")
        print(f"   SMTP: {test_result['server']}:{test_result['port']}")
        print("   Handoff уведомления тоже не будут работать")
        return
    
    print("✅ Базовая настройка email работает")
    print()
    
    # Тестируем handoff уведомление
    success = test_handoff_notification(target_email)
    
    print()
    print("=" * 60)
    if success:
        print("🎉 Тест завершен успешно!")
        print("Теперь handoff уведомления должны работать в продакшене")
    else:
        print("❌ Тест провалился")
        print("Нужно исправить проблемы с отправкой email")

if __name__ == "__main__":
    main()