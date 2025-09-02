#!/usr/bin/env python3
"""
Скрипт для проверки и создания админского пользователя
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import Session
from database.models import User
from database import SessionLocal
from core.auth import get_password_hash

def check_admin_users():
    """Проверяем админских пользователей в базе"""
    db: Session = SessionLocal()
    
    try:
        # Ищем всех админов
        admin_users = db.query(User).filter(User.role == 'admin').all()
        
        print(f"Найдено администраторов: {len(admin_users)}")
        
        if admin_users:
            for admin in admin_users:
                print(f"  - ID: {admin.id}, Email: {admin.email}, Роль: {admin.role}, Статус: {admin.status}")
                print(f"    Подтвержден email: {admin.is_email_confirmed}")
        else:
            print("Администраторы не найдены!")
            
        # Проверяем всех пользователей
        all_users = db.query(User).all()
        print(f"\nВсего пользователей в базе: {len(all_users)}")
        
        for user in all_users[:5]:  # Показываем первые 5
            print(f"  - ID: {user.id}, Email: {user.email}, Роль: {user.role}")
            
        return admin_users
        
    finally:
        db.close()

def create_admin_user(email: str, password: str):
    """Создаем админского пользователя"""
    db: Session = SessionLocal()
    
    try:
        # Проверяем, существует ли пользователь
        existing_user = db.query(User).filter(User.email == email).first()
        
        if existing_user:
            print(f"Пользователь {email} уже существует. Обновляем роль на admin...")
            existing_user.role = 'admin'
            existing_user.is_email_confirmed = True
            existing_user.status = 'active'
        else:
            print(f"Создаем нового админа {email}...")
            hashed_password = get_password_hash(password)
            
            new_admin = User(
                email=email,
                hashed_password=hashed_password,
                role='admin',
                status='active',
                is_email_confirmed=True,
                first_name='Admin'
            )
            db.add(new_admin)
        
        db.commit()
        print("✅ Админский пользователь успешно создан/обновлен!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка создания админа: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("=== Проверка администраторов ===")
    admins = check_admin_users()
    
    if not admins:
        print("\n=== Создание администратора ===")
        email = input("Введите email для админа: ").strip()
        password = input("Введите пароль для админа: ").strip()
        
        if email and password:
            create_admin_user(email, password)
        else:
            print("Email и пароль обязательны!")
    
    print("\n=== Повторная проверка ===")
    check_admin_users()