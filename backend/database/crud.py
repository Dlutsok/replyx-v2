from sqlalchemy.orm import Session
from . import models, schemas
from passlib.context import CryptContext

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
    user = get_user(db, user_id)
    if not user:
        return False
    
    # 1. Удаляем все записи использования AI токенов пользователя
    db.query(models.AITokenUsage).filter(models.AITokenUsage.user_id == user_id).delete()
    
    # 2. Удаляем все записи использования AI токенов для assistants пользователя
    user_assistants = db.query(models.Assistant.id).filter(models.Assistant.user_id == user_id).subquery()
    db.query(models.AITokenUsage).filter(models.AITokenUsage.assistant_id.in_(user_assistants)).delete(synchronize_session=False)
    
    # 3. Удаляем связанные записи в правильном порядке
    
    # Feedback и ratings
    db.query(models.DialogFeedback).filter(
        models.DialogFeedback.dialog_id.in_(
            db.query(models.Dialog.id).filter(models.Dialog.user_id == user_id)
        )
    ).delete(synchronize_session=False)
    
    db.query(models.DialogRating).filter(
        models.DialogRating.dialog_id.in_(
            db.query(models.Dialog.id).filter(models.Dialog.user_id == user_id)
        )
    ).delete(synchronize_session=False)
    
    db.query(models.MessageRating).filter(
        models.MessageRating.dialog_id.in_(
            db.query(models.Dialog.id).filter(models.Dialog.user_id == user_id)
        )
    ).delete(synchronize_session=False)
    
    # Training examples
    db.query(models.TrainingExample).filter(
        models.TrainingExample.dialog_id.in_(
            db.query(models.Dialog.id).filter(models.Dialog.user_id == user_id)
        )
    ).delete(synchronize_session=False)
    
    # Dialog messages
    db.query(models.DialogMessage).filter(
        models.DialogMessage.dialog_id.in_(
            db.query(models.Dialog.id).filter(models.Dialog.user_id == user_id)
        )
    ).delete(synchronize_session=False)
    
    # Broadcast reads
    db.query(models.BroadcastRead).filter(models.BroadcastRead.user_id == user_id).delete()
    
    # Dialogs
    db.query(models.Dialog).filter(models.Dialog.user_id == user_id).delete()
    
    # User knowledge
    db.query(models.UserKnowledge).filter(models.UserKnowledge.user_id == user_id).delete()
    
    # Documents
    db.query(models.Document).filter(models.Document.user_id == user_id).delete()
    
    # Assistants (теперь можно безопасно удалять)
    db.query(models.Assistant).filter(models.Assistant.user_id == user_id).delete()
    
    # Bot instances
    db.query(models.BotInstance).filter(models.BotInstance.user_id == user_id).delete()
    
    # Training datasets
    db.query(models.TrainingDataset).filter(models.TrainingDataset.user_id == user_id).delete()
    
    # Conversation patterns
    db.query(models.ConversationPattern).filter(models.ConversationPattern.user_id == user_id).delete()
    

    
    # Broadcasts
    db.query(models.Broadcast).filter(models.Broadcast.user_id == user_id).delete()
    
    # Tokens
    db.query(models.IntegrationToken).filter(models.IntegrationToken.owner_id == user_id).delete()
    db.query(models.TelegramToken).filter(models.TelegramToken.user_id == user_id).delete()
    db.query(models.OpenAIToken).filter(models.OpenAIToken.user_id == user_id).delete()
    
    # 4. Наконец удаляем самого пользователя
    db.delete(user)
    db.commit()
    return True

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
    return db.query(models.Document).filter(models.Document.user_id == user_id).all()

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
    return db.query(models.Assistant).filter(models.Assistant.user_id == user_id).all()

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
    assistant = get_assistant(db, assistant_id)
    db.delete(assistant)
    db.commit()