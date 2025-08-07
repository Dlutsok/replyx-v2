#!/usr/bin/env python3
"""
Скрипт для тестирования получения никнеймов из Telegram
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_db
from database import models
from sqlalchemy.orm import Session

def test_dialog_fields():
    """Тестируем новые поля в диалогах"""
    db: Session = next(get_db())
    
    try:
        # Получаем все диалоги
        dialogs = db.query(models.Dialog).all()
        
        print(f"🔍 Найдено {len(dialogs)} диалогов")
        
        for dialog in dialogs[:5]:  # Показываем первые 5
            print(f"\n📞 Диалог #{dialog.id}:")
            print(f"   User ID: {dialog.user_id}")
            print(f"   Telegram username: {dialog.telegram_username or 'Не задан'}")
            print(f"   First name: {dialog.first_name or 'Не задан'}")
            print(f"   Last name: {dialog.last_name or 'Не задан'}")
            print(f"   Telegram chat ID: {dialog.telegram_chat_id or 'Не задан'}")
            
        # Статистика
        with_username = db.query(models.Dialog).filter(models.Dialog.telegram_username.isnot(None)).count()
        with_first_name = db.query(models.Dialog).filter(models.Dialog.first_name.isnot(None)).count()
        telegram_dialogs = db.query(models.Dialog).filter(models.Dialog.telegram_chat_id.isnot(None)).count()
        
        print(f"\n📊 Статистика:")
        print(f"   Всего диалогов: {len(dialogs)}")
        print(f"   С Telegram username: {with_username}")
        print(f"   С именем: {with_first_name}")
        print(f"   Telegram диалогов: {telegram_dialogs}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_dialog_fields()