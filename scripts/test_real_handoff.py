#!/usr/bin/env python3
"""
Скрипт для тестирования реального handoff запроса через сервис
Создает тестовый диалог и отправляет handoff запрос
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Добавляем путь к backend модулям
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from database.connection import get_db
    from database import models
    from services.handoff_service import HandoffService
    from core.app_config import HANDOFF_RECIPIENTS
    print("✓ Модули загружены успешно")
except ImportError as e:
    print(f"❌ Ошибка загрузки модулей: {e}")
    sys.exit(1)

def create_test_dialog(db):
    """Создает тестовый диалог для handoff"""
    
    # Создаем тестового пользователя если не существует
    test_user = db.query(models.User).filter(models.User.email == "test@handoff.ru").first()
    if not test_user:
        from werkzeug.security import generate_password_hash
        test_user = models.User(
            email="test@handoff.ru",
            hashed_password=generate_password_hash("test123"),
            first_name="Test Handoff",
            role="user"
        )
        db.add(test_user)
        db.flush()
    
    # Создаем тестовый диалог
    test_dialog = models.Dialog(
        user_id=test_user.id,
        first_name="Test Handoff",
        handoff_status="none",
        is_taken_over=0
    )
    db.add(test_dialog)
    db.flush()
    
    # Добавляем тестовое сообщение от пользователя
    user_message = models.DialogMessage(
        dialog_id=test_dialog.id,
        sender="user",
        text="Здравствуйте! Мне очень нужна помощь живого оператора с настройкой API интеграции.",
        message_kind="text",
        timestamp=datetime.utcnow()
    )
    db.add(user_message)
    
    db.commit()
    return test_dialog

def test_handoff_with_real_service():
    """Тестирует handoff через настоящий HandoffService"""
    
    print("🚀 Тестируем реальный handoff запрос")
    print("=" * 60)
    
    db = next(get_db())
    
    try:
        # Создаем тестовый диалог
        print("📝 Создаем тестовый диалог...")
        test_dialog = create_test_dialog(db)
        print(f"✅ Диалог создан с ID: {test_dialog.id}")
        
        # Создаем handoff service
        handoff_service = HandoffService(db)
        
        # Проверяем настройки получателей
        print(f"📧 Получатели уведомлений: {HANDOFF_RECIPIENTS or 'админы из БД'}")
        
        # Отправляем handoff запрос
        print("📤 Отправляем handoff запрос...")
        result = handoff_service.request_handoff(
            dialog_id=test_dialog.id,
            reason="keyword",
            last_user_text="Здравствуйте! Мне очень нужна помощь живого оператора с настройкой API интеграции."
        )
        
        print(f"✅ Handoff запрос отправлен!")
        print(f"   Статус: {result.status}")
        print(f"   Запрошен в: {result.requested_at}")
        print(f"   Причина: {result.reason}")
        print(f"   Request ID: {result.request_id}")
        
        if result.queue_position:
            print(f"   Позиция в очереди: {result.queue_position}")
            print(f"   Ожидаемое время: {result.estimated_wait_minutes} минут")
        
        print()
        print("📬 Email уведомления должны быть отправлены!")
        print("🔍 Проверьте почтовый ящик dlutsok13@yandex.ru")
        
        # Очищаем тестовые данные
        print()
        print("🧹 Очищаем тестовые данные...")
        db.query(models.DialogMessage).filter(models.DialogMessage.dialog_id == test_dialog.id).delete()
        db.query(models.HandoffAudit).filter(models.HandoffAudit.dialog_id == test_dialog.id).delete()
        db.delete(test_dialog)
        db.commit()
        print("✅ Тестовые данные очищены")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    print("🔧 ReplyX Real Handoff Test")
    print()
    
    success = test_handoff_with_real_service()
    
    print()
    print("=" * 60)
    if success:
        print("🎉 Реальный handoff тест завершен успешно!")
        print("💬 Handoff уведомления теперь работают через сервис!")
        print("📧 Проверьте почту на наличие письма с заголовком:")
        print("   [Handoff requested] Диалог #XXXXX | keyword | ...")
    else:
        print("❌ Тест провалился")
        print("Нужно исправить проблемы с handoff service")

if __name__ == "__main__":
    main()