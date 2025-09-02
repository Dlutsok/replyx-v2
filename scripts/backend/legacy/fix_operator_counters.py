#!/usr/bin/env python3
"""
Скрипт для исправления счетчиков активных диалогов у операторов.
Синхронизирует active_chats в OperatorPresence с реальными данными из Dialog.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db
from database.models import OperatorPresence, Dialog

def fix_operator_counters():
    """Исправляет счетчики активных диалогов у всех операторов."""
    db = next(get_db())
    
    try:
        # Получаем всех операторов
        operators = db.query(OperatorPresence).all()
        
        print(f"🔧 Проверяем {len(operators)} операторов...")
        
        fixed_count = 0
        for operator in operators:
            # Подсчитываем реальное количество активных диалогов
            actual_active = db.query(Dialog).filter(
                Dialog.assigned_manager_id == operator.user_id,
                Dialog.handoff_status == 'active'
            ).count()
            
            if operator.active_chats != actual_active:
                print(f"👤 Оператор {operator.user_id}:")
                print(f"   Было: {operator.active_chats} активных диалогов")
                print(f"   Стало: {actual_active} активных диалогов")
                
                operator.active_chats = actual_active
                fixed_count += 1
        
        if fixed_count > 0:
            db.commit()
            print(f"✅ Исправлено {fixed_count} операторов")
        else:
            print("✅ Все счетчики корректны")
            
        # Показываем итоговую статистику
        print("\n📊 Текущая статистика:")
        for operator in operators:
            print(f"   Оператор {operator.user_id}: {operator.active_chats}/{operator.max_active_chats_web} диалогов")
    
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_operator_counters()