#!/usr/bin/env python3
"""
Скрипт для диагностики передачи email в Receipt для кассового чека
"""

import sys
import os
sys.path.append('backend')

from database.connection import get_db
from database.models import User, Payment
from sqlalchemy.orm import Session

def check_user_emails():
    """Проверяем есть ли email у пользователей"""
    print("=== ПРОВЕРКА EMAIL ПОЛЬЗОВАТЕЛЕЙ ===")
    
    db = next(get_db())
    
    try:
        # Получаем всех пользователей
        users = db.query(User).all()
        
        print(f"Всего пользователей в системе: {len(users)}")
        print()
        
        users_with_email = 0
        users_without_email = 0
        
        for user in users[:10]:  # Показываем первых 10
            if user.email and user.email.strip():
                users_with_email += 1
                print(f"✅ ID {user.id}: {user.email} (создан: {user.created_at.strftime('%Y-%m-%d')})")
            else:
                users_without_email += 1
                print(f"❌ ID {user.id}: EMAIL ОТСУТСТВУЕТ (создан: {user.created_at.strftime('%Y-%m-%d')})")
        
        print(f"\nИтого:")
        print(f"- С email: {users_with_email}")
        print(f"- Без email: {users_without_email}")
        
        if users_without_email > 0:
            print(f"\n⚠️ ПРОБЛЕМА: У {users_without_email} пользователей отсутствует email!")
            
    except Exception as e:
        print(f"Ошибка при проверке пользователей: {e}")
    finally:
        db.close()

def check_recent_payments():
    """Проверяем последние платежи и их customer_email"""
    print("\n=== ПРОВЕРКА ПОСЛЕДНИХ ПЛАТЕЖЕЙ ===")
    
    db = next(get_db())
    
    try:
        # Получаем последние 10 платежей
        payments = db.query(Payment).order_by(Payment.created_at.desc()).limit(10).all()
        
        print(f"Последние платежи:")
        print()
        
        for payment in payments:
            user = db.query(User).filter(User.id == payment.user_id).first()
            
            print(f"Платеж {payment.order_id}:")
            print(f"  - Пользователь ID: {payment.user_id}")
            print(f"  - Email пользователя: {user.email if user else 'НЕ НАЙДЕН'}")
            print(f"  - customer_email в платеже: {payment.customer_email}")
            print(f"  - Статус: {payment.status}")
            print(f"  - Создан: {payment.created_at}")
            print()
            
    except Exception as e:
        print(f"Ошибка при проверке платежей: {e}")
    finally:
        db.close()

def analyze_email_logic():
    """Анализируем логику передачи email"""
    print("=== АНАЛИЗ ЛОГИКИ ПЕРЕДАЧИ EMAIL ===")
    print()
    
    # Читаем код
    with open('backend/api/tinkoff_payments.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Проверяем ключевые строки
    lines = content.split('\n')
    
    print("Ключевые строки кода:")
    print()
    
    for i, line in enumerate(lines, 1):
        line_clean = line.strip()
        if any(keyword in line_clean for keyword in ['email: str = Form', 'user_email =', 'if email:', 'Email\':', 'logger.warning']):
            print(f"Строка {i}: {line_clean}")
    
    print()
    print("=== ВЫВОДЫ ===")
    print("1. В create_payment email не обязательный: email: str = Form(None)")
    print("2. Используется fallback: user_email = email or current_user.email") 
    print("3. Receipt создается только если email не пустой: if email:")
    print("4. Есть логирование: logger.warning если email пустой")

if __name__ == "__main__":
    print("🔍 ДИАГНОСТИКА ПЕРЕДАЧИ EMAIL ДЛЯ КАССОВОГО ЧЕКА")
    print("=" * 60)
    
    check_user_emails()
    check_recent_payments() 
    analyze_email_logic()
    
    print("\n📋 РЕКОМЕНДАЦИИ:")
    print("1. Проверьте логи backend на наличие '⚠️ Нет email для Receipt'")
    print("2. Убедитесь что у пользователей заполнен email при регистрации")
    print("3. Проверьте что current_user.email не None в момент создания платежа")
