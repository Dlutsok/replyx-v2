#!/usr/bin/env python3
"""
Скрипт для очистки всех диалогов и связанных данных
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from core.app_config import DATABASE_URL
from database.models import Dialog, DialogMessage, DialogFeedback, DialogRating, MessageRating, HandoffAudit
import os
from dotenv import load_dotenv

load_dotenv()

def cleanup_dialogs():
    """Удаляет все диалоги и связанные данные"""
    
    print("🧹 Очистка всех диалогов из базы данных")
    print("=" * 50)
    
    # Создаем подключение к БД
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Получаем статистику перед удалением
        total_dialogs = db.query(Dialog).count()
        total_messages = db.query(DialogMessage).count()
        total_ratings = db.query(DialogRating).count()
        total_message_ratings = db.query(MessageRating).count()
        total_feedback = db.query(DialogFeedback).count()
        total_handoff_audit = db.query(HandoffAudit).count()
        
        print(f"📊 Статистика перед очисткой:")
        print(f"   - Диалогов: {total_dialogs}")
        print(f"   - Сообщений: {total_messages}")
        print(f"   - Рейтингов диалогов: {total_ratings}")
        print(f"   - Рейтингов сообщений: {total_message_ratings}")
        print(f"   - Отзывов: {total_feedback}")
        print(f"   - Записей handoff audit: {total_handoff_audit}")
        
        if total_dialogs == 0:
            print("✅ Диалоги отсутствуют, очистка не требуется")
            return True
        
        # Подтверждение
        if len(sys.argv) > 1 and sys.argv[1] == '--confirm':
            confirm = 'yes'
            print(f"\n⚠️  Очищаем все диалоги (автоподтверждение)...")
        else:
            confirm = input(f"\n⚠️  Удалить все {total_dialogs} диалогов? (yes/no): ")
        
        if confirm.lower() != 'yes':
            print("❌ Операция отменена")
            return False
        
        print("\n🗑️  Начинаем удаление...")
        
        # Удаляем связанные данные в правильном порядке
        
        # 1. Удаляем рейтинги сообщений
        deleted_message_ratings = db.query(MessageRating).delete(synchronize_session=False)
        print(f"   🗑️  Удалено рейтингов сообщений: {deleted_message_ratings}")
        
        # 2. Удаляем рейтинги диалогов
        deleted_dialog_ratings = db.query(DialogRating).delete(synchronize_session=False)
        print(f"   🗑️  Удалено рейтингов диалогов: {deleted_dialog_ratings}")
        
        # 3. Удаляем отзывы о диалогах
        deleted_feedback = db.query(DialogFeedback).delete(synchronize_session=False)
        print(f"   🗑️  Удалено отзывов: {deleted_feedback}")
        
        # 4. Удаляем записи handoff audit
        deleted_handoff_audit = db.query(HandoffAudit).delete(synchronize_session=False)
        print(f"   🗑️  Удалено записей handoff audit: {deleted_handoff_audit}")
        
        # 5. Удаляем сообщения диалогов
        deleted_messages = db.query(DialogMessage).delete(synchronize_session=False)
        print(f"   🗑️  Удалено сообщений: {deleted_messages}")
        
        # 6. Удаляем диалоги
        deleted_dialogs = db.query(Dialog).delete(synchronize_session=False)
        print(f"   🗑️  Удалено диалогов: {deleted_dialogs}")
        
        # Сохраняем изменения
        db.commit()
        
        print(f"\n✅ Очистка диалогов завершена успешно!")
        print(f"📊 Статистика удаления:")
        print(f"   - Диалогов: {deleted_dialogs}")
        print(f"   - Сообщений: {deleted_messages}")
        print(f"   - Рейтингов диалогов: {deleted_dialog_ratings}")
        print(f"   - Рейтингов сообщений: {deleted_message_ratings}")
        print(f"   - Отзывов: {deleted_feedback}")
        print(f"   - Записей handoff audit: {deleted_handoff_audit}")
        
        # Проверяем, что все удалено
        remaining_dialogs = db.query(Dialog).count()
        remaining_messages = db.query(DialogMessage).count()
        
        print(f"\n📊 Проверка после удаления:")
        print(f"   - Оставшихся диалогов: {remaining_dialogs}")
        print(f"   - Оставшихся сообщений: {remaining_messages}")
        
        if remaining_dialogs == 0 and remaining_messages == 0:
            print("✅ Все диалоги и сообщения успешно удалены")
        else:
            print("⚠️  Некоторые записи могли остаться")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при удалении: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def cleanup_redis():
    """Очищает Redis кеш"""
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.flushall()
        print("🗑️  Redis кеш очищен")
        return True
    except Exception as e:
        print(f"⚠️  Не удалось очистить Redis: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Запуск очистки диалогов")
    print()
    
    success = cleanup_dialogs()
    
    if success:
        cleanup_redis()
        print("\n🎉 Очистка диалогов завершена!")
        print("💡 Рекомендуется обновить страницу диалогов в браузере")
        sys.exit(0)
    else:
        print("\n💥 Очистка прервана с ошибками!")
        sys.exit(1)
