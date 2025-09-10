#!/usr/bin/env python3
"""
Скрипт для отправки всех email шаблонов на указанный адрес
Позволяет просмотреть все доступные шаблоны писем ReplyX
"""

import sys
import os
from pathlib import Path

# Добавляем путь к backend модулям
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from integrations.email_service import email_service
    from templates.email_templates import EmailTemplates
    print("✓ Модули загружены успешно")
except ImportError as e:
    print(f"❌ Ошибка загрузки модулей: {e}")
    print("Убедитесь, что скрипт запускается из корневой директории проекта")
    sys.exit(1)

def send_all_templates_to_email(target_email: str):
    """Отправляет все email шаблоны на указанный адрес"""
    
    print(f"🚀 Отправляем все email шаблоны на {target_email}")
    print("=" * 60)
    
    templates_to_send = [
        {
            "name": "Приветственное письмо",
            "method": lambda: email_service.send_welcome_email(
                to_email=target_email,
                user_name="Тестовый Пользователь"
            )
        },
        {
            "name": "Восстановление пароля",
            "method": lambda: email_service.send_password_reset_email(
                to_email=target_email,
                reset_link="https://replyx.ru/reset-password?token=demo123",
                user_name="Тестовый Пользователь"
            )
        },
        {
            "name": "Подтверждение пополнения баланса",
            "method": lambda: email_service.send_payment_confirmation_email(
                to_email=target_email,
                amount=500.0,
                messages_count=100,
                current_balance=150,
                bonus_amount=50.0
            )
        },
        {
            "name": "Предупреждение о низком балансе",
            "method": lambda: email_service.send_low_balance_warning_email(
                to_email=target_email,
                remaining_messages=5
            )
        },
        {
            "name": "Уведомление о том, что баланс закончился",
            "method": lambda: email_service.send_balance_depleted_email(
                to_email=target_email
            )
        },
        {
            "name": "Уведомление оператору о запросе handoff",
            "method": lambda: email_service.send_handoff_notification(
                to_email=target_email,
                dialog_id=12345,
                reason="keyword",
                user_preview="Здравствуйте! Мне нужна помощь живого оператора с настройкой интеграции API...",
                timestamp="10.09.2025 14:30"
            )
        }
    ]
    
    successful_sends = 0
    failed_sends = 0
    
    for i, template in enumerate(templates_to_send, 1):
        print(f"📧 [{i}/{len(templates_to_send)}] Отправляем: {template['name']}")
        
        try:
            success = template['method']()
            if success:
                print(f"   ✅ Отправлено успешно")
                successful_sends += 1
            else:
                print(f"   ❌ Ошибка отправки")
                failed_sends += 1
        except Exception as e:
            print(f"   💥 Исключение: {e}")
            failed_sends += 1
        
        print()  # Пустая строка для разделения
    
    print("=" * 60)
    print(f"📊 Результат:")
    print(f"   ✅ Успешно отправлено: {successful_sends}")
    print(f"   ❌ Ошибок: {failed_sends}")
    print(f"   📧 Всего шаблонов: {len(templates_to_send)}")
    
    if successful_sends > 0:
        print(f"\n🎉 Проверьте почтовый ящик {target_email}!")
        print("💡 Некоторые письма могут попасть в папку 'Спам'")

def main():
    target_email = "dlutsok13@yandex.ru"
    
    print("🔧 ReplyX Email Templates Sender")
    print(f"📧 Целевая почта: {target_email}")
    print()
    
    # Проверяем конфигурацию email
    print("🔍 Проверяем конфигурацию email...")
    test_result = email_service.send_test_email(target_email)
    
    if test_result["success"]:
        print("✅ Тестовое письмо отправлено успешно")
        print(f"   SMTP: {test_result['server']}:{test_result['port']}")
        print(f"   Настройки: SSL={test_result['ssl']}, STARTTLS={test_result['starttls']}")
        print()
    else:
        print("❌ Ошибка отправки тестового письма")
        print(f"   SMTP: {test_result['server']}:{test_result['port']}")
        print("   Проверьте настройки SMTP в конфиге")
        
        # Все равно пытаемся отправить шаблоны
        print("\n⚠️  Все равно пытаемся отправить шаблоны...")
        print()
    
    # Отправляем все шаблоны
    send_all_templates_to_email(target_email)

if __name__ == "__main__":
    main()