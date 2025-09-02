#!/usr/bin/env python3
"""
Скрипт для удаления всех пользователей кроме админа
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from core.app_config import DATABASE_URL
from database.models import User, Dialog, DialogMessage, Document, UserKnowledge, KnowledgeEmbedding, BalanceTransaction, Assistant, DialogFeedback, DialogRating, MessageRating, BotInstance, AITokenUsage, ReferralCode, Referral, PromoCodeUsage, UserBalance
import os
from dotenv import load_dotenv

load_dotenv()

def cleanup_users():
    """Удаляет всех пользователей кроме админа"""
    
    print("🧹 Очистка базы данных от пользователей (кроме админа)")
    print("=" * 60)
    
    # Создаем подключение к БД
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Находим админа
        admin_emails = ['admin@example.com', 'admin@replyx.ru', 'moroooz13@ya.ru']
        
        admin_users = []
        for email in admin_emails:
            admin = db.query(User).filter(User.email == email.lower()).first()
            if admin:
                admin_users.append(admin)
                print(f"👑 Найден админ: {admin.email} (ID: {admin.id})")
        
        if not admin_users:
            print("❌ Админ не найден! Операция отменена.")
            return False
        
        admin_ids = [admin.id for admin in admin_users]
        
        # Получаем всех пользователей кроме админов
        users_to_delete = db.query(User).filter(~User.id.in_(admin_ids)).all()
        
        if not users_to_delete:
            print("✅ Нет пользователей для удаления (кроме админов)")
            return True
        
        print(f"\n📊 Найдено пользователей для удаления: {len(users_to_delete)}")
        
        user_ids_to_delete = [user.id for user in users_to_delete]
        
        # Показываем список пользователей для удаления
        for user in users_to_delete[:10]:  # Показываем первых 10
            print(f"   - {user.email} (ID: {user.id})")
        
        if len(users_to_delete) > 10:
            print(f"   ... и еще {len(users_to_delete) - 10} пользователей")
        
        # Подтверждение
        import sys
        if len(sys.argv) > 1 and sys.argv[1] == '--confirm':
            confirm = 'yes'
            print(f"\n⚠️  Удаляем {len(users_to_delete)} пользователей (автоподтверждение)...")
        else:
            confirm = input(f"\n⚠️  Удалить {len(users_to_delete)} пользователей? (yes/no): ")
        
        if confirm.lower() != 'yes':
            print("❌ Операция отменена")
            return False
        
        print("\n🗑️  Начинаем удаление...")
        
        # Удаляем связанные данные в правильном порядке
        
        # 1. Удаляем сообщения диалогов
        deleted_messages = db.query(DialogMessage).filter(
            DialogMessage.dialog_id.in_(
                db.query(Dialog.id).filter(Dialog.user_id.in_(user_ids_to_delete))
            )
        ).delete(synchronize_session=False)
        print(f"   🗑️  Удалено сообщений: {deleted_messages}")
        
        # 2. Удаляем диалоги
        deleted_dialogs = db.query(Dialog).filter(Dialog.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено диалогов: {deleted_dialogs}")
        
        # 3. Удаляем embeddings знаний (по doc_id, так как они связаны с документами)
        deleted_embeddings = db.query(KnowledgeEmbedding).filter(
            KnowledgeEmbedding.user_id.in_(user_ids_to_delete)
        ).delete(synchronize_session=False)
        print(f"   🗑️  Удалено embeddings: {deleted_embeddings}")
        
        # 4. Удаляем знания пользователей
        deleted_knowledge = db.query(UserKnowledge).filter(UserKnowledge.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено знаний: {deleted_knowledge}")
        
        # 5. Удаляем документы
        deleted_documents = db.query(Document).filter(Document.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено документов: {deleted_documents}")
        
        # 6. Удаляем рейтинги сообщений
        deleted_message_ratings = db.query(MessageRating).filter(
            MessageRating.message_id.in_(
                db.query(DialogMessage.id).filter(
                    DialogMessage.dialog_id.in_(
                        db.query(Dialog.id).filter(Dialog.user_id.in_(user_ids_to_delete))
                    )
                )
            )
        ).delete(synchronize_session=False)
        print(f"   🗑️  Удалено рейтингов сообщений: {deleted_message_ratings}")
        
        # 7. Удаляем рейтинги диалогов
        deleted_dialog_ratings = db.query(DialogRating).filter(
            DialogRating.dialog_id.in_(
                db.query(Dialog.id).filter(Dialog.user_id.in_(user_ids_to_delete))
            )
        ).delete(synchronize_session=False)
        print(f"   🗑️  Удалено рейтингов диалогов: {deleted_dialog_ratings}")
        
        # 8. Удаляем отзывы о диалогах
        deleted_feedback = db.query(DialogFeedback).filter(
            DialogFeedback.dialog_id.in_(
                db.query(Dialog.id).filter(Dialog.user_id.in_(user_ids_to_delete))
            )
        ).delete(synchronize_session=False)
        print(f"   🗑️  Удалено отзывов: {deleted_feedback}")
        
        # 9. Удаляем боты (bot instances) перед удалением ассистентов
        deleted_bots = db.query(BotInstance).filter(BotInstance.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено ботов: {deleted_bots}")
        
        # 10. Удаляем AI token usage записи
        deleted_ai_usage = db.query(AITokenUsage).filter(AITokenUsage.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено записей AI usage: {deleted_ai_usage}")
        
        # 11. Удаляем ассистентов пользователей
        deleted_assistants = db.query(Assistant).filter(Assistant.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено ассистентов: {deleted_assistants}")
        
        # 12. Удаляем транзакции баланса
        deleted_transactions = db.query(BalanceTransaction).filter(BalanceTransaction.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено транзакций: {deleted_transactions}")
        
        # 13. Удаляем использование промокодов
        deleted_promo_usage = db.query(PromoCodeUsage).filter(PromoCodeUsage.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено использований промокодов: {deleted_promo_usage}")
        
        # 14. Удаляем рефералы (как реферера, так и рефералы)
        deleted_referrals_made = db.query(Referral).filter(Referral.referrer_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        deleted_referrals_received = db.query(Referral).filter(Referral.referred_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено рефералов (сделанных/полученных): {deleted_referrals_made}/{deleted_referrals_received}")
        
        # 15. Удаляем реферальные коды
        deleted_referral_codes = db.query(ReferralCode).filter(ReferralCode.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено реферальных кодов: {deleted_referral_codes}")
        
        # 16. Удаляем балансы пользователей
        deleted_balances = db.query(UserBalance).filter(UserBalance.user_id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено балансов: {deleted_balances}")
        
        # 17. Удаляем пользователей
        deleted_users = db.query(User).filter(User.id.in_(user_ids_to_delete)).delete(synchronize_session=False)
        print(f"   🗑️  Удалено пользователей: {deleted_users}")
        
        # Сохраняем изменения
        db.commit()
        
        print(f"\n✅ Очистка завершена успешно!")
        print(f"📊 Статистика удаления:")
        print(f"   - Пользователей: {deleted_users}")
        print(f"   - Диалогов: {deleted_dialogs}")
        print(f"   - Сообщений: {deleted_messages}")
        print(f"   - Документов: {deleted_documents}")
        print(f"   - Знаний: {deleted_knowledge}")
        print(f"   - Embeddings: {deleted_embeddings}")
        print(f"   - Ассистентов: {deleted_assistants}")
        print(f"   - Транзакций: {deleted_transactions}")
        
        # Показываем оставшихся пользователей
        remaining_users = db.query(User).all()
        print(f"\n👥 Оставшиеся пользователи ({len(remaining_users)}):")
        for user in remaining_users:
            print(f"   - {user.email} (ID: {user.id})")
        
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
    print("🚀 Запуск очистки базы данных")
    print()
    
    success = cleanup_users()
    
    if success:
        cleanup_redis()
        print("\n🎉 Очистка базы данных завершена!")
        print("💡 Рекомендуется перезапустить backend сервер")
        sys.exit(0)
    else:
        print("\n💥 Очистка прервана с ошибками!")
        sys.exit(1)