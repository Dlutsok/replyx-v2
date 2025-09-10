#!/usr/bin/env python3
"""
Скрипт для очистки диалогов пользователя
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from database import SessionLocal, models

def clear_user_dialogs(user_email: str):
    """Очистить все диалоги для указанного пользователя"""
    db = SessionLocal()
    try:
        # Найти пользователя по email
        user = db.query(models.User).filter(models.User.email == user_email).first()
        if not user:
            print(f"❌ Пользователь с email '{user_email}' не найден")
            return False
        
        print(f"✅ Найден пользователь: ID={user.id}, email={user.email}, name={user.first_name}")
        
        # Найти все диалоги пользователя
        dialogs = db.query(models.Dialog).filter(models.Dialog.user_id == user.id).all()
        dialog_count = len(dialogs)
        
        if dialog_count == 0:
            print("ℹ️  У пользователя нет диалогов")
            return True
        
        print(f"📋 Найдено {dialog_count} диалогов для удаления")
        
        # Показать информацию о диалогах перед удалением
        for dialog in dialogs:
            print(f"  - Dialog ID {dialog.id}: started={dialog.started_at}, guest_id={dialog.guest_id}, telegram_chat_id={dialog.telegram_chat_id}")
        
        # Подтверждение удаления (автоматическое для скрипта)
        print(f"\n⚠️  ВНИМАНИЕ: Удаляю {dialog_count} диалогов для пользователя {user_email}")
        print("🚀 Операция подтверждена автоматически")
        
        # Сначала удалить все связанные записи handoff_audit
        total_handoff_audit = 0
        for dialog in dialogs:
            handoff_records = db.query(models.HandoffAudit).filter(models.HandoffAudit.dialog_id == dialog.id).all()
            handoff_count = len(handoff_records)
            total_handoff_audit += handoff_count
            if handoff_count > 0:
                print(f"🗑️  Удаляю {handoff_count} записей handoff_audit из диалога {dialog.id}")
                for record in handoff_records:
                    db.delete(record)
        
        if total_handoff_audit > 0:
            print(f"🗑️  Удалено {total_handoff_audit} записей handoff_audit")
        
        # Затем удалить все сообщения в диалогах
        total_messages = 0
        for dialog in dialogs:
            messages = db.query(models.DialogMessage).filter(models.DialogMessage.dialog_id == dialog.id).all()
            message_count = len(messages)
            total_messages += message_count
            if message_count > 0:
                print(f"🗑️  Удаляю {message_count} сообщений из диалога {dialog.id}")
                for message in messages:
                    db.delete(message)
        
        print(f"🗑️  Удалено {total_messages} сообщений из всех диалогов")
        
        # Теперь удалить сами диалоги
        for dialog in dialogs:
            print(f"🗑️  Удаляю диалог {dialog.id}")
            db.delete(dialog)
        
        # Сохранить изменения
        db.commit()
        
        print(f"✅ Успешно удалены все {dialog_count} диалогов и {total_messages} сообщений для пользователя {user_email}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при удалении диалогов: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Использование: python clear_user_dialogs.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    success = clear_user_dialogs(email)
    sys.exit(0 if success else 1)