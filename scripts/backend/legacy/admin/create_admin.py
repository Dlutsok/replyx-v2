#!/usr/bin/env python3
"""
Скрипт для создания администратора системы
"""

import sys
import os
# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from database import get_db, models, SessionLocal
from core.auth import get_password_hash
from sqlalchemy.orm import Session

def create_admin_user(email: str, password: str, first_name: str = "Admin"):
    """Создает пользователя с правами администратора"""
    
    db = SessionLocal()
    try:
        # Проверяем, существует ли уже такой пользователь
        existing_user = db.query(models.User).filter(models.User.email == email).first()
        if existing_user:
            print(f"❌ Пользователь с email {email} уже существует")
            if existing_user.role == 'admin':
                print(f"✅ Пользователь уже имеет права администратора")
            else:
                # Обновляем роль до admin
                existing_user.role = 'admin'
                db.commit()
                print(f"✅ Роль пользователя обновлена до admin")
            return
        
        # Создаем нового пользователя-администратора
        hashed_password = get_password_hash(password)
        
        admin_user = models.User(
            email=email,
            hashed_password=hashed_password,
            first_name=first_name,
            role='admin',  # Устанавливаем роль администратора
            status='active',
            is_email_confirmed=True,  # Подтверждаем email сразу
            welcome_bonus_received=True  # Не нужен бонус админу
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"✅ Администратор создан успешно:")
        print(f"   Email: {email}")
        print(f"   ID: {admin_user.id}")
        print(f"   Role: {admin_user.role}")
        print(f"   Status: {admin_user.status}")
        
    except Exception as e:
        print(f"❌ Ошибка создания администратора: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    print("🔧 Создание администратора системы ReplyX")
    print("=" * 50)
    
    if len(sys.argv) != 3:
        print("Использование: python create_admin.py <email> <password>")
        print("Пример: python create_admin.py admin@replyx.ru mypassword123")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    # Базовая валидация
    if '@' not in email:
        print("❌ Некорректный email адрес")
        sys.exit(1)
        
    if len(password) < 8:
        print("❌ Пароль должен содержать минимум 8 символов")
        sys.exit(1)
    
    print(f"Создаем администратора с email: {email}")
    
    # Создаем администратора
    create_admin_user(email, password)
    
    print("\n🚀 Теперь вы можете войти в админ-панель:")
    print(f"   1. Запустите backend: cd backend && uvicorn main:app --reload")
    print(f"   2. Запустите frontend: cd frontend && npm run dev")
    print(f"   3. Перейдите по адресу: http://localhost:3000/login")
    print(f"   4. Войдите с данными: {email} / {password}")
    print(f"   5. Админ-панель будет доступна в сайдбаре")

if __name__ == "__main__":
    main()