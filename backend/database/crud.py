from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import text, func
from . import models, schemas
from passlib.context import CryptContext
import logging

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Users

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, role=user.role, status=user.status)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    print(f"[CRUD] Обновление пользователя {user_id}")
    user = get_user(db, user_id)
    if not user:
        print(f"[CRUD] Пользователь {user_id} не найден")
        return None
    
    print(f"[CRUD] Пользователь до обновления: id={user.id}")
    
    # Обновляем только переданные поля
    update_data = user_update.dict(exclude_unset=True)
    print(f"[CRUD] Данные для обновления: {update_data}")
    
    for field, value in update_data.items():
        if value is not None:
            print(f"[CRUD] Обновляем поле {field}: {getattr(user, field, 'НЕТ')} -> {value}")
            if field == 'password':
                # Хешируем пароль
                user.hashed_password = get_password_hash(value)
            elif hasattr(user, field):
                setattr(user, field, value)
    
    print(f"[CRUD] Пользователь после обновления: id={user.id}")
    db.commit()
    db.refresh(user)
    print(f"[CRUD] Пользователь после коммита: id={user.id}")
    return user

def delete_user(db: Session, user_id: int):
    """
    Безопасное удаление пользователя со всеми зависимыми записями.
    Удаляет записи в правильном порядке для соблюдения FK constraints.
    """
    user = get_user(db, user_id)
    if not user:
        return False
    
    try:
        print(f"[CRUD] Начинаем удаление пользователя {user_id} ({user.email})")
        
        # ЭТАП 1: Удаляем записи без FK зависимостей от других таблиц
        print("[CRUD] Этап 1: Очистка записей без FK зависимостей...")
        
        # Handoff audit (может ссылаться на dialog_id)
        db.execute(text("DELETE FROM handoff_audit WHERE user_id = :user_id"), {"user_id": user_id})
        
        # AI Token Usage
        db.execute(text("DELETE FROM ai_token_usage WHERE user_id = :user_id"), {"user_id": user_id})
        
        # Message ratings (зависят от dialog_messages)
        db.execute(text("""
            DELETE FROM message_ratings 
            WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)
        """), {"user_id": user_id})
        
        # Dialog ratings (зависят от dialogs)
        db.execute(text("DELETE FROM dialog_ratings WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)"), {"user_id": user_id})
        
        # Dialog feedback (зависят от dialogs/messages)
        db.execute(text("DELETE FROM dialog_feedback WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)"), {"user_id": user_id})
        
        # Training examples (зависят от dialogs)
        db.execute(text("DELETE FROM training_examples WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)"), {"user_id": user_id})
        
        # Dialog messages (зависят от dialogs)
        db.execute(text("DELETE FROM dialog_messages WHERE dialog_id IN (SELECT id FROM dialogs WHERE user_id = :user_id)"), {"user_id": user_id})
        
        print("[CRUD] Этап 2: Удаление основных связанных записей...")
        
        # ЭТАП 2: Удаляем основные связанные записи
        
        # Knowledge embeddings (зависят от documents/assistants)
        db.execute(text("DELETE FROM knowledge_embeddings WHERE user_id = :user_id"), {"user_id": user_id})
        
        # User knowledge (зависят от documents/assistants) 
        db.execute(text("DELETE FROM user_knowledge WHERE user_id = :user_id"), {"user_id": user_id})
        
        # Bot instances (зависят от assistants)
        db.execute(text("DELETE FROM bot_instances WHERE user_id = :user_id"), {"user_id": user_id})
        
        # Documents
        db.execute(text("DELETE FROM documents WHERE user_id = :user_id"), {"user_id": user_id})
        
        # Assistants  
        db.execute(text("DELETE FROM assistants WHERE user_id = :user_id"), {"user_id": user_id})
        
        # Dialogs (теперь можно безопасно удалить, все зависимые записи очищены)
        db.execute(text("DELETE FROM dialogs WHERE user_id = :user_id OR assigned_manager_id = :user_id"), {"user_id": user_id})
        
        print("[CRUD] Этап 3: Удаление токенов и настроек...")
        
        # ЭТАП 3: Токены и настройки
        db.execute(text("DELETE FROM telegram_tokens WHERE user_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM openai_tokens WHERE user_id = :user_id"), {"user_id": user_id})
        db.execute(text("DELETE FROM integration_tokens WHERE owner_id = :user_id"), {"user_id": user_id})
        
        # Training datasets
        db.execute(text("DELETE FROM training_datasets WHERE user_id = :user_id"), {"user_id": user_id})
        
        # Conversation patterns
        db.execute(text("DELETE FROM conversation_patterns WHERE user_id = :user_id"), {"user_id": user_id})
        
        # Organization features
        db.execute(text("DELETE FROM organization_features WHERE owner_id = :user_id"), {"user_id": user_id})
        
        print("[CRUD] Этап 4: Удаление финансовых записей...")
        
        # ЭТАП 4: Финансовые записи (КРИТИЧНО! Тут была ошибка)
        
        # Balance transactions (зависят от user_balances)
        db.execute(text("DELETE FROM balance_transactions WHERE user_id = :user_id"), {"user_id": user_id})
        
        
        # USER BALANCES - ЭТО БЫЛА ОСНОВНАЯ ПРОБЛЕМА!
        db.execute(text("DELETE FROM user_balances WHERE user_id = :user_id"), {"user_id": user_id})
        
        # Operator presence
        db.execute(text("DELETE FROM operator_presence WHERE user_id = :user_id"), {"user_id": user_id})
        
        print("[CRUD] Этап 5: Финальное удаление пользователя...")
        
        # ЭТАП 5: Наконец удаляем самого пользователя
        result = db.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_id})
        
        if result.rowcount == 0:
            print(f"[CRUD] ОШИБКА: Пользователь {user_id} не был удален")
            db.rollback()
            return False
            
        db.commit()
        print(f"[CRUD] Пользователь {user_id} успешно удален со всеми связанными записями")
        return True
        
    except Exception as e:
        print(f"[CRUD] ОШИБКА при удалении пользователя {user_id}: {str(e)}")
        db.rollback()
        raise e

# Tokens

def get_tokens(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.IntegrationToken).offset(skip).limit(limit).all()

def create_token(db: Session, token: schemas.TokenCreate, owner_id: int):
    db_token = models.IntegrationToken(name=token.name, token=token.token, owner_id=owner_id)
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

def delete_token(db: Session, token_id: int):
    token = db.query(models.IntegrationToken).filter(models.IntegrationToken.id == token_id).first()
    db.delete(token)
    db.commit()

# Telegram Token

def get_telegram_token(db: Session, user_id: int):
    return db.query(models.TelegramToken).filter(models.TelegramToken.user_id == user_id).first()

def set_telegram_token(db: Session, user_id: int, token: str):
    existing = get_telegram_token(db, user_id)
    if existing:
        existing.token = token
    else:
        new_token = models.TelegramToken(user_id=user_id, token=token)
        db.add(new_token)
    db.commit()
    return get_telegram_token(db, user_id)

# OpenAI Token

def get_openai_token(db: Session, user_id: int):
    return db.query(models.OpenAIToken).filter(models.OpenAIToken.user_id == user_id).first()

def set_openai_token(db: Session, user_id: int, token: str):
    existing = get_openai_token(db, user_id)
    if existing:
        existing.token = token
    else:
        new_token = models.OpenAIToken(user_id=user_id, token=token)
        db.add(new_token)
    db.commit()
    return get_openai_token(db, user_id)

# Documents

def get_user_documents(db: Session, user_id: int):
    """
    Optimized to avoid N+1 queries: eager loads user relationship and knowledge relationships
    """
    logger.debug(f"[CRUD] Fetching documents for user {user_id} with eager loading")
    
    return db.query(models.Document)\
        .options(
            joinedload(models.Document.user),
            selectinload(models.Document.knowledge)
        )\
        .filter(models.Document.user_id == user_id)\
        .order_by(models.Document.upload_date.desc())\
        .all()

def create_document(db: Session, user_id: int, filename: str, size: int):
    doc = models.Document(user_id=user_id, filename=filename, size=size)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def delete_document(db: Session, user_id: int, doc_id: int):
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == user_id).first()
    if doc:
        db.delete(doc)
        db.commit()
    return doc

# Assistants

def get_assistants(db: Session, user_id: int):
    """
    Optimized to avoid N+1 queries: eager loads user relationship and related data
    """
    logger.debug(f"[CRUD] Fetching assistants for user {user_id} with eager loading")
    
    return db.query(models.Assistant)\
        .options(joinedload(models.Assistant.user))\
        .filter(models.Assistant.user_id == user_id)\
        .order_by(models.Assistant.created_at.desc())\
        .all()

def get_assistant(db: Session, assistant_id: int):
    return db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()

def create_assistant(db: Session, user_id: int, assistant: schemas.AssistantCreate):
    db_assistant = models.Assistant(user_id=user_id, **assistant.dict())
    db.add(db_assistant)
    db.commit()
    db.refresh(db_assistant)
    return db_assistant

def update_assistant(db: Session, assistant_id: int, assistant_update: schemas.AssistantUpdate):
    assistant = get_assistant(db, assistant_id)
    for field, value in assistant_update.dict(exclude_unset=True).items():
        setattr(assistant, field, value)
    db.commit()
    db.refresh(assistant)
    return assistant

def delete_assistant(db: Session, assistant_id: int):
    """Удалить ассистента и связанные сущности безопасно, без загрузки больших колонок.

    Выполняем bulk delete для связанных таблиц, чтобы избежать ленивых загрузок
    полей типа embeddings, которые могут иметь несовместимый тип в среде.
    """
    # Удаляем связанные записи без загрузки объектов в сессию
    try:
        # Логи использования AI токенов, связанные с ассистентом
        db.query(models.AITokenUsage).filter(
            models.AITokenUsage.assistant_id == assistant_id
        ).delete(synchronize_session=False)

        # Embeddings
        db.query(models.KnowledgeEmbedding).filter(
            models.KnowledgeEmbedding.assistant_id == assistant_id
        ).delete(synchronize_session=False)

        # Пользовательские знания
        db.query(models.UserKnowledge).filter(
            models.UserKnowledge.assistant_id == assistant_id
        ).delete(synchronize_session=False)

        # Инстансы ботов
        db.query(models.BotInstance).filter(
            models.BotInstance.assistant_id == assistant_id
        ).delete(synchronize_session=False)

        # Отвязываем диалоги от ассистента, чтобы не нарушать FK
        db.query(models.Dialog).filter(
            models.Dialog.assistant_id == assistant_id
        ).update({models.Dialog.assistant_id: None}, synchronize_session=False)

        # Сам ассистент
        db.query(models.Assistant).filter(
            models.Assistant.id == assistant_id
        ).delete(synchronize_session=False)

        db.commit()
    except Exception:
        db.rollback()
        raise


# Dialogs optimized functions

def get_dialogs_optimized(db: Session, user_id: int = None, skip: int = 0, limit: int = 50):
    """
    Optimized dialogs fetching with eager loading to avoid N+1 queries
    """
    logger.debug(f"[CRUD] Fetching dialogs for user {user_id} with eager loading (skip={skip}, limit={limit})")
    
    query = db.query(models.Dialog)\
        .options(
            joinedload(models.Dialog.user),
            joinedload(models.Dialog.assistant),
            joinedload(models.Dialog.assigned_manager),
            # Load last message efficiently
            selectinload(models.Dialog.messages).joinedload(models.DialogMessage.dialog)
        )
    
    if user_id:
        query = query.filter(models.Dialog.user_id == user_id)
    
    return query.order_by(models.Dialog.started_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()


def get_dialog_with_messages_optimized(db: Session, dialog_id: int):
    """
    Optimized single dialog fetching with all messages and relationships
    """
    logger.debug(f"[CRUD] Fetching dialog {dialog_id} with messages and relationships")
    
    return db.query(models.Dialog)\
        .options(
            joinedload(models.Dialog.user),
            joinedload(models.Dialog.assistant),
            joinedload(models.Dialog.assigned_manager),
            selectinload(models.Dialog.messages)
        )\
        .filter(models.Dialog.id == dialog_id)\
        .first()


def get_users_with_stats_optimized(db: Session, skip: int = 0, limit: int = 100):
    """
    Optimized user fetching with statistics for admin panel
    """
    logger.debug(f"[CRUD] Fetching users with stats (skip={skip}, limit={limit})")
    
    # Use subqueries to avoid N+1 queries for statistics
    assistants_count = db.query(
        models.Assistant.user_id,
        func.count(models.Assistant.id).label('assistants_count')
    ).group_by(models.Assistant.user_id).subquery()
    
    dialogs_count = db.query(
        models.Dialog.user_id,
        func.count(models.Dialog.id).label('dialogs_count')
    ).group_by(models.Dialog.user_id).subquery()
    
    documents_count = db.query(
        models.Document.user_id,
        func.count(models.Document.id).label('documents_count')
    ).group_by(models.Document.user_id).subquery()
    
    return db.query(
        models.User,
        func.coalesce(assistants_count.c.assistants_count, 0).label('assistants_count'),
        func.coalesce(dialogs_count.c.dialogs_count, 0).label('dialogs_count'),
        func.coalesce(documents_count.c.documents_count, 0).label('documents_count')
    )\
    .outerjoin(assistants_count, models.User.id == assistants_count.c.user_id)\
    .outerjoin(dialogs_count, models.User.id == dialogs_count.c.user_id)\
    .outerjoin(documents_count, models.User.id == documents_count.c.user_id)\
    .order_by(models.User.created_at.desc())\
    .offset(skip)\
    .limit(limit)\
    .all()