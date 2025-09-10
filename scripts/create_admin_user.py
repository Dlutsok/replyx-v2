#!/usr/bin/env python3
"""
Скрипт для создания админского пользователя для получения handoff уведомлений
"""

import sys
import os
from pathlib import Path

# Добавляем путь к backend модулям
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from database.connection import get_db
    from database import models
    from werkzeug.security import generate_password_hash
    print("✓ Модули загружены успешно")
except ImportError as e:
    print(f"❌ Ошибка загрузки модулей: {e}")
    sys.exit(1)

def create_admin_user(email: str = "dlutsok13@yandex.ru"):
    """Создает админского пользователя или обновляет существующего"""
    
    db = next(get_db())
    
    try:
        # Проверяем существует ли пользователь
        existing_user = db.query(models.User).filter(models.User.email == email).first()
        
        if existing_user:
            print(f"👤 Пользователь {email} уже существует")
            print(f"   ID: {existing_user.id}")
            print(f"   Текущая роль: {existing_user.role}")
            
            # Обновляем роль на admin если не админ
            if existing_user.role != 'admin':
                existing_user.role = 'admin'
                db.commit()
                print(f"✅ Роль обновлена на 'admin'")
            else:
                print("✅ Already admin")
            
            return existing_user
        else:
            # Создаем нового админа
            print(f"👤 Создаем нового админа {email}")
            admin_user = models.User(
                email=email,
                hashed_password=generate_password_hash("admin123"),  # Временный пароль
                first_name="Admin",
                role="admin",
                status="active",
                is_email_confirmed=True
            )
            
            db.add(admin_user)
            db.commit()
            
            print(f"✅ Админ создан!")
            print(f"   ID: {admin_user.id}")
            print(f"   Email: {admin_user.email}")
            print(f"   Роль: {admin_user.role}")
            print(f"   Пароль: admin123 (смените его)")
            
            return admin_user
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def test_admin_handoff_recipients():
    """Проверяет список админов для handoff уведомлений"""
    
    db = next(get_db())
    
    try:
        # Ищем всех админов
        admins = db.query(models.User).filter(models.User.role == 'admin').all()
        
        print(f"📋 Найдено админов: {len(admins)}")
        
        recipients = []
        for admin in admins:
            print(f"   👤 {admin.email} (ID: {admin.id})")
            if admin.email:
                recipients.append(admin.email)
        
        print(f"📧 Email получателей handoff: {recipients}")
        return recipients
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return []
    finally:
        db.close()

def main():
    admin_email = "dlutsok13@yandex.ru"
    
    print("🔧 ReplyX Admin User Creator")
    print(f"📧 Создаем админа: {admin_email}")
    print()
    
    # Создаем или обновляем админа
    admin_user = create_admin_user(admin_email)
    
    if admin_user:
        print()
        print("📋 Проверяем список админов для handoff:")
        recipients = test_admin_handoff_recipients()
        
        print()
        if recipients:
            print("✅ Теперь handoff уведомления будут отправляться!")
            print("🚀 Можете тестировать handoff в системе")
        else:
            print("❌ Нет админов с email адресами для handoff уведомлений")
    else:
        print("❌ Не удалось создать админа")

if __name__ == "__main__":
    main()