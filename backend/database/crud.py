from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import text, func
from . import models, schemas
from passlib.context import CryptContext
from typing import Optional
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

        # Start page events
        db.execute(text("DELETE FROM start_page_events WHERE user_id = :user_id"), {"user_id": user_id})

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

        # Payments (должны быть удалены перед balance_transactions, так как могут быть связаны)
        db.execute(text("DELETE FROM payments WHERE user_id = :user_id"), {"user_id": user_id})

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
    from constants.prompts import get_default_prompt

    # Преобразуем в словарь и применяем централизованный промпт если не задан
    assistant_data = assistant.dict()
    if not assistant_data.get('system_prompt'):
        assistant_data['system_prompt'] = get_default_prompt()

    db_assistant = models.Assistant(user_id=user_id, **assistant_data)
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


# ==========================================
# BLOG POSTS CRUD OPERATIONS
# ==========================================

def create_blog_post(db: Session, blog_post: schemas.BlogPostCreate):
    """Создать новую статью блога"""
    from slugify import slugify
    from transliterate import translit

    # Генерируем slug из заголовка, если не указан
    if not blog_post.slug:
        # Сначала транслитерируем русский текст в латиницу, потом делаем slug
        try:
            # reversed=True означает транслитерацию С русского НА латиницу
            transliterated = translit(blog_post.title, 'ru', reversed=True)
            slug = slugify(transliterated, allow_unicode=False)
        except:
            # Fallback к обычной slugify если транслитерация не работает
            slug = slugify(blog_post.title, allow_unicode=False)

        # Ограничиваем длину slug до 80 символов
        if len(slug) > 80:
            words = slug.split('-')
            truncated_slug = ''
            for word in words:
                if len(truncated_slug + '-' + word) <= 80:
                    if truncated_slug:
                        truncated_slug += '-' + word
                    else:
                        truncated_slug = word
                else:
                    break
            slug = truncated_slug

        # Проверяем уникальность slug
        counter = 1
        original_slug = slug
        while db.query(models.BlogPost).filter(models.BlogPost.slug == slug).first():
            slug = f"{original_slug}-{counter}"
            counter += 1
        blog_post.slug = slug

    # Создаем данные для модели
    post_data = blog_post.model_dump()

    # Логика планирования публикации
    from datetime import datetime
    import logging
    logger = logging.getLogger(__name__)

    if blog_post.scheduled_for:
        from datetime import timezone, timedelta

        # Получаем текущее время в UTC и MSK
        now_utc = datetime.utcnow()
        moscow_tz = timezone(timedelta(hours=3))  # MSK = UTC+3
        now_msk = now_utc.replace(tzinfo=timezone.utc).astimezone(moscow_tz).replace(tzinfo=None)

        # scheduled_for приходит из frontend в MSK времени (без timezone info)
        scheduled_for_msk = blog_post.scheduled_for.replace(tzinfo=None) if blog_post.scheduled_for.tzinfo else blog_post.scheduled_for

        # Конвертируем MSK время в UTC для сохранения в БД (PostgreSQL хранит в UTC)
        scheduled_for_utc = scheduled_for_msk.replace(tzinfo=moscow_tz).astimezone(timezone.utc).replace(tzinfo=None)

        logger.info(f"BLOG SCHEDULING DEBUG:")
        logger.info(f"  Frontend scheduled_for (MSK): {scheduled_for_msk}")
        logger.info(f"  Converted to UTC for DB: {scheduled_for_utc}")
        logger.info(f"  Current UTC time: {now_utc}")
        logger.info(f"  Current MSK time: {now_msk}")
        logger.info(f"  Is backdate? {scheduled_for_msk <= now_msk}")

        # Добавляем информацию о разнице времени
        time_diff = scheduled_for_msk - now_msk
        logger.info(f"  Time difference: {time_diff} (positive = future, negative = past)")
        logger.info(f"  Scheduled time in seconds from now: {time_diff.total_seconds()}")

        # Сравниваем MSK время с MSK временем
        if scheduled_for_msk <= now_msk:
            # Публикация задним числом - публикуем сразу с установленной датой
            post_data['is_published'] = True
            # ВАЖНО: Устанавливаем дату ЯВНО для публикации задним числом в UTC (как требует БД)
            publication_date = scheduled_for_utc
            # Устанавливаем начальные просмотры и лайки для "старых" статей
            post_data['views'] = blog_post.initial_views
            post_data['likes'] = blog_post.initial_likes
        else:
            # Запланированная публикация в будущем - сохраняем UTC время для БД
            post_data['is_published'] = False
            post_data['scheduled_for'] = scheduled_for_utc  # Сохраняем в UTC для БД
            post_data['views'] = 0  # Начальные значения при создании
            post_data['likes'] = 0
            publication_date = None  # Будет установлено по умолчанию при создании
    else:
        # Обычная публикация сейчас
        publication_date = None  # Будет установлено по умолчанию при создании
        post_data['views'] = blog_post.initial_views if blog_post.initial_views else 0
        post_data['likes'] = blog_post.initial_likes if blog_post.initial_likes else 0

    # Создаем объект БД
    db_blog_post = models.BlogPost(**post_data)

    # ВАЖНО: Устанавливаем дату ПОСЛЕ создания объекта, чтобы переопределить default
    if publication_date is not None:
        logger.info(f"Setting publication_date to: {publication_date}")
        db_blog_post.date = publication_date
        logger.info(f"Date set to: {db_blog_post.date}")

    db.add(db_blog_post)
    db.commit()
    db.refresh(db_blog_post)

    logger.info(f"Final blog post date after save: {db_blog_post.date}")
    return db_blog_post

def get_blog_post(db: Session, post_id: int):
    """Получить статью блога по ID"""
    return db.query(models.BlogPost).filter(models.BlogPost.id == post_id).first()

def get_blog_post_by_slug(db: Session, slug: str):
    """Получить статью блога по slug"""
    return db.query(models.BlogPost).filter(models.BlogPost.slug == slug).first()

def get_blog_posts(
    db: Session,
    skip: int = 0,
    limit: int = 10,
    published_only: bool = True,
    category: Optional[str] = None,
    featured_only: bool = False
):
    """Получить список статей блога с фильтрами"""
    query = db.query(models.BlogPost)

    if published_only:
        query = query.filter(models.BlogPost.is_published == True)

    if category:
        query = query.filter(models.BlogPost.category == category)

    if featured_only:
        query = query.filter(models.BlogPost.featured == True)

    return query.order_by(models.BlogPost.date.desc()).offset(skip).limit(limit).all()

def get_blog_posts_count(
    db: Session,
    published_only: bool = True,
    category: Optional[str] = None,
    featured_only: bool = False
):
    """Получить количество статей блога"""
    query = db.query(models.BlogPost)

    if published_only:
        query = query.filter(models.BlogPost.is_published == True)

    if category:
        query = query.filter(models.BlogPost.category == category)

    if featured_only:
        query = query.filter(models.BlogPost.featured == True)

    return query.count()

def update_blog_post(db: Session, post_id: int, blog_post: schemas.BlogPostUpdate):
    """Обновить статью блога"""
    db_blog_post = db.query(models.BlogPost).filter(models.BlogPost.id == post_id).first()
    if not db_blog_post:
        return None

    update_data = blog_post.model_dump(exclude_unset=True)

    # Обновляем slug если изменился заголовок и slug не передан явно
    if 'title' in update_data and 'slug' not in update_data:
        from slugify import slugify
        slug = slugify(update_data['title'])
        # Проверяем уникальность slug (исключая текущую статью)
        counter = 1
        original_slug = slug
        while db.query(models.BlogPost).filter(
            models.BlogPost.slug == slug,
            models.BlogPost.id != post_id
        ).first():
            slug = f"{original_slug}-{counter}"
            counter += 1
        update_data['slug'] = slug

    # Если slug передан явно, проверяем его уникальность
    if 'slug' in update_data and update_data['slug']:
        from slugify import slugify
        slug = slugify(update_data['slug'])
        counter = 1
        original_slug = slug
        while db.query(models.BlogPost).filter(
            models.BlogPost.slug == slug,
            models.BlogPost.id != post_id
        ).first():
            slug = f"{original_slug}-{counter}"
            counter += 1
        update_data['slug'] = slug

    for field, value in update_data.items():
        setattr(db_blog_post, field, value)

    db.commit()
    db.refresh(db_blog_post)
    return db_blog_post

def delete_blog_post(db: Session, post_id: int):
    """Удалить статью блога"""
    db_blog_post = db.query(models.BlogPost).filter(models.BlogPost.id == post_id).first()
    if not db_blog_post:
        return False

    db.delete(db_blog_post)
    db.commit()
    return True

def increment_blog_post_views(db: Session, post_id: int):
    """Увеличить счетчик просмотров статьи"""
    db_blog_post = db.query(models.BlogPost).filter(models.BlogPost.id == post_id).first()
    if db_blog_post:
        db_blog_post.views += 1
        db.commit()
        db.refresh(db_blog_post)
    return db_blog_post

def increment_blog_post_likes(db: Session, post_id: int):
    """Увеличить счетчик лайков статьи"""
    db_blog_post = db.query(models.BlogPost).filter(models.BlogPost.id == post_id).first()
    if db_blog_post:
        db_blog_post.likes += 1
        db.commit()
        db.refresh(db_blog_post)
    return db_blog_post

def get_blog_categories(db: Session):
    """Получить список всех категорий блога с количеством постов"""
    return db.query(
        models.BlogPost.category,
        func.count(models.BlogPost.id).label('count')
    ).filter(
        models.BlogPost.is_published == True
    ).group_by(models.BlogPost.category).all()

def get_featured_blog_posts(db: Session, limit: int = 3):
    """Получить рекомендуемые статьи"""
    return db.query(models.BlogPost).filter(
        models.BlogPost.is_published == True,
        models.BlogPost.featured == True
    ).order_by(models.BlogPost.date.desc()).limit(limit).all()

def get_random_blog_posts(db: Session, limit: int = 3, exclude_id: Optional[int] = None):
    """Получить случайные статьи"""
    from sqlalchemy import func

    query = db.query(models.BlogPost).filter(
        models.BlogPost.is_published == True
    )

    # Исключаем текущую статью, если указана
    if exclude_id:
        query = query.filter(models.BlogPost.id != exclude_id)

    # Используем RANDOM() для случайного порядка
    return query.order_by(func.random()).limit(limit).all()

def publish_scheduled_posts(db: Session):
    """Автоматическая публикация запланированных статей"""
    from datetime import datetime, timezone, timedelta
    import logging
    logger = logging.getLogger(__name__)

    # Получаем текущее время в UTC (БД хранит в UTC)
    now_utc = datetime.utcnow()
    moscow_tz = timezone(timedelta(hours=3))  # MSK = UTC+3
    now_msk = now_utc.replace(tzinfo=timezone.utc).astimezone(moscow_tz).replace(tzinfo=None)

    # Найти все статьи, которые должны быть опубликованы
    scheduled_posts = db.query(models.BlogPost).filter(
        models.BlogPost.scheduled_for.isnot(None),
        models.BlogPost.is_published == False
    ).all()

    logger.info(f"BLOG SCHEDULER CHECK:")
    logger.info(f"  Current UTC time: {now_utc}")
    logger.info(f"  Current MSK time: {now_msk}")
    logger.info(f"  Found {len(scheduled_posts)} scheduled posts to check")

    published_count = 0
    for post in scheduled_posts:
        # scheduled_for теперь хранится в UTC в БД
        scheduled_for_utc = post.scheduled_for.replace(tzinfo=None) if post.scheduled_for.tzinfo else post.scheduled_for
        # Конвертируем в MSK для отображения в логах
        scheduled_for_msk = scheduled_for_utc.replace(tzinfo=timezone.utc).astimezone(moscow_tz).replace(tzinfo=None)

        logger.info(f"  Checking post '{post.title[:50]}...':")
        logger.info(f"    Scheduled for (UTC in DB): {scheduled_for_utc}")
        logger.info(f"    Scheduled for (MSK display): {scheduled_for_msk}")
        logger.info(f"    Current time (UTC): {now_utc}")
        logger.info(f"    Ready to publish? {scheduled_for_utc <= now_utc}")

        # Сравниваем UTC время с UTC временем (как хранится в БД)
        if scheduled_for_utc <= now_utc:
            # Публикуем статью
            post.is_published = True
            post.date = scheduled_for_utc  # Устанавливаем дату в UTC как и хранится в БД
            post.views = post.initial_views if post.initial_views else 0
            post.likes = post.initial_likes if post.initial_likes else 0

            # Очищаем scheduled_for после публикации
            post.scheduled_for = None

            published_count += 1
            logger.info(f"    ✅ Published post: {post.title}")
        else:
            time_diff = scheduled_for_utc - now_utc
            logger.info(f"    ⏰ Post will be published in {time_diff}")

    if published_count > 0:
        db.commit()
        logger.info(f"  📝 Total published: {published_count} posts")

    return published_count

def get_scheduled_posts(db: Session):
    """Получить список запланированных к публикации статей"""
    from datetime import datetime

    now = datetime.utcnow()

    # Получаем все запланированные статьи и фильтруем в Python для обработки timezone
    scheduled_posts = db.query(models.BlogPost).filter(
        models.BlogPost.scheduled_for.isnot(None),
        models.BlogPost.is_published == False
    ).all()

    # Фильтруем только те, что в будущем
    future_posts = []
    for post in scheduled_posts:
        scheduled_for_naive = post.scheduled_for.replace(tzinfo=None) if post.scheduled_for.tzinfo else post.scheduled_for
        if scheduled_for_naive > now:
            future_posts.append(post)

    # Сортируем по дате
    future_posts.sort(key=lambda p: p.scheduled_for.replace(tzinfo=None) if p.scheduled_for.tzinfo else p.scheduled_for)

    return future_posts