#!/usr/bin/env python3
"""
🛡️ Безопасный bootstrap-скрипт для создания первого администратора ReplyX

Использование:
  export FIRST_ADMIN_EMAIL="admin@your-domain.com"
  export FIRST_ADMIN_MODE="invite"  # или "interactive"
  export PUBLIC_APP_URL="https://replyx.your-domain.com"
  python scripts/admin_bootstrap.py

Особенности:
- Идемпотентный (безопасно запускать повторно)
- Не хранит пароли в репо/логах
- Invite-режим создаёт ссылку для самостоятельной установки пароля (рекомендуется)
- Interactive-режим запросит пароль безопасно через getpass
"""

import os
import sys
import secrets
from datetime import datetime, timedelta
from getpass import getpass
from sqlalchemy import select

# Добавляем backend к пути для импортов
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend')
sys.path.insert(0, backend_path)

from database.connection import SessionLocal
from database.models import User, UserBalance, BalanceTransaction
from core.auth import get_password_hash
from integrations.email_service import EmailService
from decimal import Decimal


def check_admin_exists(db) -> bool:
    """Проверяет, существует ли хотя бы один администратор"""
    admin_query = select(User).where(User.role == "admin")
    return db.execute(admin_query).first() is not None


def create_admin_balance(db, user: User, initial_balance: Decimal = Decimal('200000.00')):
    """Создаёт баланс для администратора с начальной суммой"""
    try:
        # Ensure user.id is available
        if not user.id:
            db.flush()  # Flush to get the user.id
        
        print(f"💰 Creating balance for user ID {user.id}")
        
        # Проверяем, есть ли уже баланс
        existing_balance = db.execute(select(UserBalance).where(UserBalance.user_id == user.id)).scalar_one_or_none()
        
        if existing_balance:
            print(f"💰 User already has balance: {existing_balance.balance} руб")
            return existing_balance
        
        # Создаём баланс
        user_balance = UserBalance(
            user_id=user.id,
            balance=initial_balance,
            total_topped_up=initial_balance,  # Считаем как пополнение
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(user_balance)
        db.flush()  # Ensure balance is saved before creating transaction
        
        # Создаём транзакцию пополнения
        transaction = BalanceTransaction(
            user_id=user.id,
            amount=initial_balance,
            transaction_type='admin_credit',  # Админское зачисление
            description='Начальный баланс администратора',
            balance_before=Decimal('0.00'),  # Было 0
            balance_after=initial_balance,   # Стало 200000
            created_at=datetime.now()
        )
        db.add(transaction)
        
        print(f"💰 Created admin balance: {initial_balance} руб")
        return user_balance
        
    except Exception as e:
        print(f"❌ Failed to create admin balance: {e}")
        import traceback
        traceback.print_exc()
        raise


def get_or_create_user(db, email: str) -> tuple[User, bool]:
    """Получает существующего пользователя или создаёт нового. Возвращает (user, was_created)"""
    user_query = select(User).where(User.email == email)
    user = db.execute(user_query).scalar_one_or_none()
    
    if user:
        return user, False
    
    # Создаём нового пользователя
    user = User(
        email=email,
        role="admin",
        status="active",
        is_email_confirmed=True,
        first_name="Admin",
        welcome_bonus_received=True,  # Админу бонус не нужен
        created_at=datetime.now(),
        last_activity=datetime.now(),
        hashed_password=get_password_hash(secrets.token_urlsafe(16))  # Временный случайный пароль
    )
    return user, True


def create_admin_interactive(db, email: str):
    """Создаёт администратора в интерактивном режиме с паролем"""
    user, was_created = get_or_create_user(db, email)
    
    # Запрашиваем пароль безопасно
    print(f"Creating admin: {email}")
    password = getpass("Set password (min 8 chars): ")
    
    if len(password) < 8:
        print("❌ Password too short (minimum 8 characters)", file=sys.stderr)
        sys.exit(3)
    
    # Устанавливаем пароль и очищаем токены сброса
    user.hashed_password = get_password_hash(password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.role = "admin"  # Гарантируем роль админа
    
    if was_created:
        db.add(user)
    
    db.commit()
    
    # Создаём баланс для админа
    create_admin_balance(db, user)
    db.commit()
    
    action = "created" if was_created else "promoted"
    print(f"✅ Admin {action}: {email} (password set interactively)")


def create_admin_invite(db, email: str, public_url: str, send_email: bool = False):
    """Создаёт администратора в invite-режиме с токеном для установки пароля"""
    user, was_created = get_or_create_user(db, email)
    
    # Генерируем безопасный токен для сброса пароля
    reset_token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(hours=24)
    
    # Устанавливаем токен сброса и роль админа
    # Если пользователь не был создан, у него уже есть хешированный пароль
    if was_created:
        # Для нового пользователя устанавливаем временный хеш
        user.hashed_password = get_password_hash(secrets.token_urlsafe(16))  # Временный случайный пароль
    
    user.password_reset_token = reset_token
    user.password_reset_expires = expires_at
    user.role = "admin"
    
    if was_created:
        db.add(user)
    
    db.commit()
    
    # Создаём баланс для админа
    create_admin_balance(db, user)
    db.commit()
    
    # Формируем ссылку для установки пароля
    reset_url = f"{public_url}/reset-password?token={reset_token}"
    
    action = "created" if was_created else "promoted"
    print(f"✅ Admin {action}: {email}")
    
    # Отправляем email если запрошено
    if send_email:
        try:
            email_service = EmailService()
            success = email_service.send_password_reset_email(email, reset_url, "Admin")
            if success:
                print(f"✉️ Email sent successfully to {email}")
            else:
                print(f"⚠️ Failed to send email, showing link instead:")
                print(f"   {reset_url}")
        except Exception as e:
            print(f"⚠️ Email sending failed ({e}), showing link instead:")
            print(f"   {reset_url}")
    else:
        print(f"📧 Send this one-time password setup link (valid 24h):")
        print(f"   {reset_url}")
        print(f"")
        print(f"💡 Admin can use this link to set their password securely.")


def main():
    print("🛡️  ReplyX Admin Bootstrap Script")
    print("=" * 50)
    
    # Читаем конфигурацию из переменных окружения
    admin_email = os.getenv("FIRST_ADMIN_EMAIL")
    admin_mode = os.getenv("FIRST_ADMIN_MODE", "invite").lower()
    public_url = os.getenv("PUBLIC_APP_URL", "http://localhost:3000")
    send_email = os.getenv("SEND_ADMIN_EMAIL", "false").lower() in ("true", "1", "yes")
    
    if not admin_email:
        print("❌ FIRST_ADMIN_EMAIL environment variable is required", file=sys.stderr)
        print("   Example: export FIRST_ADMIN_EMAIL='admin@your-domain.com'")
        sys.exit(1)
    
    if admin_mode not in ["invite", "interactive"]:
        print(f"❌ Invalid FIRST_ADMIN_MODE: {admin_mode}", file=sys.stderr)
        print("   Supported modes: 'invite' (recommended), 'interactive'")
        sys.exit(1)
    
    # Валидация email
    if "@" not in admin_email or "." not in admin_email.split("@")[1]:
        print(f"❌ Invalid email format: {admin_email}", file=sys.stderr)
        sys.exit(1)
    
    print(f"📧 Admin email: {admin_email}")
    print(f"🔧 Mode: {admin_mode}")
    if admin_mode == "invite":
        print(f"📨 Send email: {'Yes' if send_email else 'No (console output)'}")
    
    # Подключаемся к базе данных
    db = SessionLocal()
    try:
        # Идемпотентность: если админ уже существует, ничего не делаем
        if check_admin_exists(db):
            print("✅ Admin already exists — nothing to do.")
            print("   Bootstrap script completed successfully.")
            return
        
        print("📋 No admin found, creating first administrator...")
        
        # Создаём администратора в зависимости от режима
        if admin_mode == "interactive":
            create_admin_interactive(db, admin_email)
        else:  # invite mode
            create_admin_invite(db, admin_email, public_url, send_email)
        
        print("🚀 Admin bootstrap completed successfully!")
        
    except KeyboardInterrupt:
        print("\n❌ Bootstrap cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Bootstrap failed: {e}", file=sys.stderr)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()