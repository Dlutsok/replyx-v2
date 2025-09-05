from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Float, Boolean, func, Index, NUMERIC, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects import postgresql
from datetime import datetime
from .connection import Base
import importlib
Vector = None
try:
    _pgv = importlib.import_module('pgvector.sqlalchemy')  # type: ignore
    Vector = getattr(_pgv, 'Vector', None)
except Exception:
    Vector = None  # Тип будет задан в миграции; для рантайма без pgvector может использоваться Text

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    yandex_id = Column(String, unique=True, nullable=True)
    email = Column(String, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default='user')
    status = Column(String, default='active')
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)  # Отслеживание активности в ЛК
    is_email_confirmed = Column(Boolean, default=False)
    email_confirmation_code = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    
    # Поля для онбординга
    onboarding_completed = Column(Boolean, default=False)
    
    __table_args__ = (
        UniqueConstraint('email', name='uq_users_email'),
    )
    onboarding_step = Column(Integer, default=0)  # Текущий шаг онбординга (0-5)
    onboarding_started_at = Column(DateTime, nullable=True)
    onboarding_completed_at = Column(DateTime, nullable=True)
    onboarding_skipped = Column(Boolean, default=False)
    first_bot_created = Column(Boolean, default=False)
    first_message_sent = Column(Boolean, default=False)
    tutorial_tips_shown = Column(Text, nullable=True)  # JSON массив показанных подсказок
    welcome_bonus_received = Column(Boolean, default=False)  # Получен ли приветственный бонус
    
    # Поля для сброса пароля
    password_reset_token = Column(String, nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)
    
    tokens = relationship("IntegrationToken", back_populates="owner")

class IntegrationToken(Base):
    __tablename__ = 'integration_tokens'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey('users.id'))
    owner = relationship("User", back_populates="tokens")

class TelegramToken(Base):
    __tablename__ = 'telegram_tokens'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    token = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", backref="telegram_token")

class OpenAIToken(Base):
    __tablename__ = 'openai_tokens'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    token = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", backref="openai_token")

class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    filename = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    doc_hash = Column(String(64), nullable=True)
    user = relationship("User", backref="documents")

class UserKnowledge(Base):
    __tablename__ = 'user_knowledge'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    assistant_id = Column(Integer, ForeignKey('assistants.id'), nullable=True)  # Привязка к ассистенту
    doc_id = Column(Integer, ForeignKey('documents.id'))
    content = Column(Text, nullable=False)  # summary или исходник
    type = Column(String, default='summary')  # 'summary' или 'original'
    doc_type = Column(String, nullable=True)  # тип документа (инструкция, регламент и т.д.)
    importance = Column(Integer, default=10)  # важность документа от 1 до 10
    last_used = Column(DateTime, nullable=True)  # когда последний раз использовался в ответе
    usage_count = Column(Integer, default=0)  # сколько раз использовался в ответах
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = relationship('User', backref='knowledge')
    assistant = relationship('Assistant', backref='knowledge')
    document = relationship('Document', backref='knowledge')


class KnowledgeEmbedding(Base):
    """Embeddings для быстрого поиска релевантных фрагментов знаний"""
    __tablename__ = 'knowledge_embeddings'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    assistant_id = Column(Integer, ForeignKey('assistants.id'), nullable=True)
    doc_id = Column(Integer, ForeignKey('documents.id'), nullable=True)  # nullable for Q&A embeddings
    qa_id = Column(Integer, ForeignKey('qa_knowledge.id'), nullable=True)  # For Q&A knowledge embeddings
    chunk_index = Column(Integer, nullable=False)  # Порядковый номер чанка в документе
    chunk_text = Column(Text, nullable=False)  # Текст чанка
    # Используем pgvector, если доступен; иначе fallback на ARRAY(Float)
    embedding = Column(Vector(1536) if Vector else postgresql.ARRAY(Float), nullable=False)
    doc_type = Column(String, nullable=True)  # Тип документа
    importance = Column(Integer, default=10)  # Важность фрагмента
    token_count = Column(Integer, nullable=True)  # Количество токенов в чанке
    chunk_hash = Column(String(64), nullable=True)  # Хэш чанка для инкрементальной индексации
    source = Column(String, nullable=True)  # источник: 'document', 'confirmed_knowledge', 'website'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship('User', backref='embeddings')
    assistant = relationship('Assistant', backref='embeddings')
    document = relationship('Document', backref='embeddings')
    qa_knowledge = relationship('QAKnowledge', backref='embeddings')


class QueryEmbeddingCache(Base):
    """Кэш embeddings для популярных запросов пользователей"""
    __tablename__ = 'query_embeddings_cache'
    id = Column(Integer, primary_key=True, index=True)
    query_hash = Column(String(64), nullable=False, unique=True)  # MD5 хэш запроса
    query_text = Column(Text, nullable=False)  # Оригинальный текст запроса
    # Кэширующий вектор: pgvector при наличии, иначе ARRAY(Float)
    embedding = Column(Vector(1536) if Vector else postgresql.ARRAY(Float), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, default=datetime.utcnow)
    usage_count = Column(Integer, default=1)  # Счетчик использований

class StartPageEvent(Base):
    """События пользователей на странице /start для аналитики онбординга"""
    __tablename__ = 'start_page_events'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Может быть анонимным
    session_id = Column(String(64), nullable=False)  # Уникальный ID сессии браузера
    event_type = Column(String(50), nullable=False)  # page_view, step_click, step_complete, task_action
    step_id = Column(Integer, nullable=True)  # ID шага (1-4) из интерфейса
    action_type = Column(String(50), nullable=True)  # primary, secondary, skip
    event_metadata = Column(Text, nullable=True)  # JSON с дополнительной информацией
    user_agent = Column(String(512), nullable=True)  # User Agent браузера
    ip_address = Column(String(45), nullable=True)  # IP адрес пользователя
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship('User', backref='start_page_events')
    
    # Индексы для быстрых запросов аналитики
    __table_args__ = (
        Index('idx_start_events_user_created', 'user_id', 'created_at'),
        Index('idx_start_events_session_created', 'session_id', 'created_at'),
        Index('idx_start_events_type_created', 'event_type', 'created_at'),
        Index('idx_start_events_step_created', 'step_id', 'created_at'),
    )

class Dialog(Base):
    __tablename__ = 'dialogs'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    assistant_id = Column(Integer, ForeignKey('assistants.id'), nullable=True)  # Какой ассистент вел диалог
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)
    auto_response = Column(Integer, default=0)  # 1 если автоответ, 0 если нет

    first_response_time = Column(Float)  # Время первого ответа в секундах
    fallback = Column(Integer, default=0)  # 1 если был fallback
    is_taken_over = Column(Integer, default=0)  # 1 если диалог перехвачен менеджером
    telegram_chat_id = Column(String, nullable=True)  # Telegram chat id
    telegram_username = Column(String, nullable=True)  # Telegram username
    first_name = Column(String, nullable=True)  # Имя пользователя из Telegram
    last_name = Column(String, nullable=True)  # Фамилия пользователя из Telegram
    guest_id = Column(String, nullable=True, index=True)
    
    # Handoff fields
    handoff_status = Column(String, nullable=False, default='none')
    handoff_requested_at = Column(DateTime, nullable=True)
    handoff_started_at = Column(DateTime, nullable=True)
    handoff_resolved_at = Column(DateTime, nullable=True)
    handoff_reason = Column(String, nullable=True)
    assigned_manager_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    request_id = Column(String(36), nullable=True)
    
    user = relationship('User', foreign_keys=[user_id], backref='dialogs')
    assistant = relationship('Assistant', backref='dialogs')
    assigned_manager = relationship('User', foreign_keys=[assigned_manager_id], backref='managed_dialogs')

class DialogMessage(Base):
    __tablename__ = 'dialog_messages'
    id = Column(Integer, primary_key=True)
    dialog_id = Column(Integer, ForeignKey('dialogs.id'))
    sender = Column(String)  # 'user', 'assistant', 'manager'
    text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    delivered = Column(Integer, default=0)  # 1 если отправлено в Telegram
    
    # Handoff message fields
    message_kind = Column(String, nullable=False, default='user')  # 'user'|'assistant'|'operator'|'system'
    system_type = Column(String, nullable=True)  # 'handoff_requested'|'handoff_started'|'handoff_released'

    dialog = relationship('Dialog', backref='messages')

# Broadcast models removed - no longer needed

class Assistant(Base):
    __tablename__ = 'assistants'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    name = Column(String, nullable=False, default='AI-ассистент')
    ai_model = Column(String, default='gpt-4o-mini')
    system_prompt = Column(Text, default='Привет! Я ваш AI-помощник. Готов ответить на вопросы и помочь с любыми задачами. Чем могу быть полезен?')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    website_integration_enabled = Column(Boolean, default=False)  # Включена ли интеграция с сайтом
    allowed_domains = Column(Text, nullable=True)  # Разрешенные домены для виджета (через запятую)
    knowledge_version = Column(Integer, default=1)  # Версия знаний для lazy reload
    
    # Поля персонализации виджета
    operator_name = Column(String(255), nullable=True, default='Поддержка')  # Имя оператора
    business_name = Column(String(255), nullable=True, default='Наша компания')  # Название бизнеса
    avatar_url = Column(Text, nullable=True)  # URL аватара оператора
    widget_theme = Column(String(50), nullable=True, default='blue')  # Тема виджета
    widget_settings = Column(postgresql.JSON, nullable=True, default={})  # Дополнительные настройки виджета
    
    user = relationship('User', backref='assistants')

class TrainingDataset(Base):
    """Датасет для обучения AI на основе диалогов"""
    __tablename__ = 'training_datasets'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    total_examples = Column(Integer, default=0)
    quality_score = Column(Float, default=0.0)  # Оценка качества датасета
    user = relationship('User', backref='training_datasets')

class TrainingExample(Base):
    """Примеры для обучения из диалогов"""
    __tablename__ = 'training_examples'
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey('training_datasets.id'))
    dialog_id = Column(Integer, ForeignKey('dialogs.id'))
    user_message = Column(Text, nullable=False)  # Вопрос пользователя
    assistant_response = Column(Text, nullable=False)  # Ответ ассистента
    context = Column(Text)  # Контекст из предыдущих сообщений
    quality_rating = Column(Integer)  # Оценка качества от 1 до 5
    is_approved = Column(Boolean, default=False)  # Одобрен ли для обучения
    created_at = Column(DateTime, default=datetime.utcnow)
    feedback = Column(Text)  # Обратная связь от пользователя
    tags = Column(String)  # Теги для категоризации (JSON список)
    dataset = relationship('TrainingDataset', backref='examples')
    dialog = relationship('Dialog', backref='training_examples')

class ConversationPattern(Base):
    """Паттерны разговоров для улучшения ответов"""
    __tablename__ = 'conversation_patterns'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    pattern_type = Column(String, nullable=False)  # 'greeting', 'question', 'complaint', etc.
    user_input_pattern = Column(Text, nullable=False)  # Регулярное выражение или ключевые слова
    recommended_response = Column(Text, nullable=False)  # Рекомендуемый ответ
    confidence_score = Column(Float, default=0.0)  # Уверенность в паттерне
    usage_count = Column(Integer, default=0)  # Сколько раз использовался
    success_rate = Column(Float, default=0.0)  # Процент успешных использований
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    user = relationship('User', backref='conversation_patterns')

class DialogFeedback(Base):
    """Обратная связь по диалогам для улучшения качества"""
    __tablename__ = 'dialog_feedback'
    id = Column(Integer, primary_key=True, index=True)
    dialog_id = Column(Integer, ForeignKey('dialogs.id'))
    message_id = Column(Integer, ForeignKey('dialog_messages.id'))
    feedback_type = Column(String, nullable=False)  # 'positive', 'negative', 'correction'
    rating = Column(Integer)  # Оценка от 1 до 5
    comment = Column(Text)  # Комментарий пользователя
    suggested_response = Column(Text)  # Предложенный правильный ответ
    created_at = Column(DateTime, default=datetime.utcnow)
    dialog = relationship('Dialog', backref='feedback')
    message = relationship('DialogMessage', backref='feedback')

class DialogRating(Base):
    """Пользовательские оценки диалогов"""
    __tablename__ = 'dialog_ratings'
    id = Column(Integer, primary_key=True, index=True)
    dialog_id = Column(Integer, ForeignKey('dialogs.id'))
    rating = Column(Integer, nullable=False)  # 1-5 звезд
    rating_type = Column(String, default='overall')  # 'overall', 'helpfulness', 'accuracy', 'speed'
    comment = Column(Text)  # Необязательный комментарий
    rated_by = Column(String)  # 'user' или 'admin'
    telegram_message_id = Column(String)  # ID сообщения с кнопками в Telegram
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    dialog = relationship('Dialog', backref='user_ratings')

class MessageRating(Base):
    """Оценки отдельных сообщений ассистента"""
    __tablename__ = 'message_ratings'
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey('dialog_messages.id'))
    dialog_id = Column(Integer, ForeignKey('dialogs.id'))
    rating = Column(Integer, nullable=False)  # 1-5 звезд или лайк/дизлайк (1/5)
    rating_type = Column(String, default='thumbs')  # 'thumbs' (1/5), 'stars' (1-5)
    comment = Column(Text)  # Необязательный комментарий
    telegram_callback_data = Column(String)  # Данные callback для Telegram
    created_at = Column(DateTime, default=datetime.utcnow)
    message = relationship('DialogMessage', backref='ratings')
    dialog = relationship('Dialog', backref='message_ratings')

class BotInstance(Base):
    __tablename__ = 'bot_instances'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    assistant_id = Column(Integer, ForeignKey('assistants.id'))
    platform = Column(String, nullable=False, default='telegram')  # Только 'telegram'
    bot_token = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship('User', backref='bot_instances')
    assistant = relationship('Assistant', backref='bot_instances')

class AITokenPool(Base):
    """Пул AI токенов для умного распределения нагрузки"""
    __tablename__ = 'ai_token_pool'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Название токена для удобства
    token = Column(String, nullable=False, unique=True)  # OpenAI API ключ
    model_access = Column(String, default='gpt-4o,gpt-4o-mini')  # Доступные модели через запятую
    daily_limit = Column(Integer, default=10000)  # Лимит запросов в день
    monthly_limit = Column(Integer, default=300000)  # Лимит запросов в месяц
    current_daily_usage = Column(Integer, default=0)  # Текущее использование за день
    current_monthly_usage = Column(Integer, default=0)  # Текущее использование за месяц
    last_reset_daily = Column(DateTime, default=datetime.utcnow)  # Последний сброс дневного счетчика
    last_reset_monthly = Column(DateTime, default=datetime.utcnow)  # Последний сброс месячного счетчика
    priority = Column(Integer, default=1)  # Приоритет использования (1-высший, 10-низший)
    is_active = Column(Boolean, default=True)  # Активен ли токен
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, default=datetime.utcnow)  # Когда последний раз использовался
    error_count = Column(Integer, default=0)  # Количество ошибок подряд
    last_error = Column(DateTime, nullable=True)  # Время последней ошибки
    notes = Column(Text, nullable=True)  # Заметки администратора

class AITokenUsage(Base):
    """Логирование использования AI токенов"""
    __tablename__ = 'ai_token_usage'
    id = Column(Integer, primary_key=True, index=True)
    token_id = Column(Integer, ForeignKey('ai_token_pool.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    assistant_id = Column(Integer, ForeignKey('assistants.id'), nullable=True)
    model_used = Column(String, nullable=False)  # gpt-4, gpt-3.5-turbo и т.д.
    prompt_tokens = Column(Integer, default=0)  # Токены в запросе
    completion_tokens = Column(Integer, default=0)  # Токены в ответе
    total_tokens = Column(Integer, default=0)  # Общее количество токенов
    request_type = Column(String, default='chat')  # 'chat', 'embedding', 'completion'
    response_time = Column(Float, default=0.0)  # Время ответа в секундах
    success = Column(Boolean, default=True)  # Успешен ли запрос
    error_message = Column(Text, nullable=True)  # Сообщение об ошибке
    created_at = Column(DateTime, default=datetime.utcnow)
    token = relationship('AITokenPool', backref='usage_logs')
    user = relationship('User', backref='ai_usage_logs')
    assistant = relationship('Assistant', backref='ai_usage_logs')

 

 

 

# Организационные функции и интеграции
class OrganizationFeature(Base):
    """Функции организации (флаги доступа к модулям)"""
    __tablename__ = 'organization_features'
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # Владелец организации
    feature_name = Column(String, nullable=False)  # Название функции ('advanced_analytics', etc.)
    is_enabled = Column(Boolean, default=False)  # Включена ли функция
    config = Column(Text, nullable=True)  # JSON конфигурация функции
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship('User', backref='organization_features')

class UserBalance(Base):
    """Баланс пользователя"""
    __tablename__ = 'user_balances'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    balance = Column(NUMERIC(12, 2), default=0.00)  # Баланс в рублях
    total_spent = Column(NUMERIC(12, 2), default=0.00)  # Всего потрачено
    total_topped_up = Column(NUMERIC(12, 2), default=0.00)  # Всего пополнено
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship('User', backref='balance')

class BalanceTransaction(Base):
    """Транзакции баланса"""
    __tablename__ = 'balance_transactions'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    amount = Column(NUMERIC(12, 2), nullable=False)  # Сумма (положительная для пополнения, отрицательная для списания)
    transaction_type = Column(String, nullable=False)  # 'topup', 'ai_message', 'document_upload', 'bot_message'
    description = Column(String, nullable=True)  # Описание операции
    balance_before = Column(NUMERIC(12, 2), nullable=False)  # Баланс до операции
    balance_after = Column(NUMERIC(12, 2), nullable=False)  # Баланс после операции
    related_id = Column(Integer, nullable=True)  # ID связанной сущности (сообщения, документа и т.д.)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User', backref='balance_transactions')

class ServicePrice(Base):
    """Цены на услуги"""
    __tablename__ = 'service_prices'
    
    id = Column(Integer, primary_key=True, index=True)
    service_type = Column(String, nullable=False, unique=True)  # 'ai_message', 'document_upload', 'bot_message'
    price = Column(NUMERIC(12, 2), nullable=False)  # Цена в рублях
    description = Column(String, nullable=True)  # Описание услуги
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Payment(Base):
    """Платежи через Т-Банк"""
    __tablename__ = 'payments'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    order_id = Column(String, unique=True, nullable=False)  # Уникальный номер заказа для Т-Банк
    amount = Column(NUMERIC(12, 2), nullable=False)  # Сумма в рублях
    currency = Column(String(3), nullable=False, default='RUB')  # Валюта платежа
    status = Column(String, default='pending')  # 'pending', 'processing', 'success', 'failed', 'cancelled'
    payment_method = Column(String, default='tinkoff')  # Метод оплаты
    description = Column(String, nullable=True)  # Описание платежа
    tinkoff_payment_id = Column(String, nullable=True)  # ID платежа от Т-Банк (если вернется)
    success_url = Column(String, nullable=True)  # URL успешной оплаты
    fail_url = Column(String, nullable=True)  # URL неудачной оплаты
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)  # Время завершения платежа
    
    # Relationships
    user = relationship('User', backref='payments')


class OperatorPresence(Base):
    """Operator presence and availability tracking."""
    __tablename__ = 'operator_presence'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    status = Column(String, nullable=False, server_default='offline')
    last_heartbeat = Column(DateTime, nullable=True)
    max_active_chats_web = Column(Integer, nullable=False, server_default='3')
    max_active_chats_telegram = Column(Integer, nullable=False, server_default='5')
    active_chats = Column(Integer, nullable=False, server_default='0')
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    user = relationship('User', backref='operator_presence')


class HandoffAudit(Base):
    """Audit log for handoff state transitions."""
    __tablename__ = 'handoff_audit'
    
    id = Column(Integer, primary_key=True)
    dialog_id = Column(Integer, ForeignKey('dialogs.id'), nullable=False)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    reason = Column(String, nullable=True)
    request_id = Column(String(36), nullable=True)
    seq = Column(Integer, nullable=False)
    extra_data = Column(postgresql.JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    
    # Relationships
    dialog = relationship('Dialog', backref='handoff_audit')
    user = relationship('User', backref='handoff_audit')


class SystemSettings(Base):
    """Системные настройки для админ панели."""
    __tablename__ = 'system_settings'
    
    id = Column(Integer, primary_key=True)
    category = Column(String(50), nullable=False)  # general, ai, email, security, limits, maintenance
    key = Column(String(100), nullable=False)
    value = Column(Text, nullable=True)
    data_type = Column(String(20), default='string')  # string, boolean, integer, float, json
    is_sensitive = Column(Boolean, default=False)  # для паролей/токенов
    description = Column(Text, nullable=True)
    default_value = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Constraints
    __table_args__ = (
        # Уникальная связка category + key
        UniqueConstraint('category', 'key', name='uq_system_settings_category_key'),
        {'postgresql_with_oids': False}
    )
    
    # Relationships
    updated_by_user = relationship('User', backref='system_settings_updates')


class QAKnowledge(Base):
    """База знаний в формате вопрос-ответ для ассистентов"""
    __tablename__ = 'qa_knowledge'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    assistant_id = Column(Integer, ForeignKey('assistants.id'), nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String, nullable=True)  # Категория для группировки
    keywords = Column(String, nullable=True)  # Ключевые слова для поиска
    importance = Column(Integer, default=10)  # Важность от 1 до 10
    usage_count = Column(Integer, default=0)  # Сколько раз использовался
    last_used = Column(DateTime, nullable=True)  # Когда последний раз использовался
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship('User', backref='qa_knowledge')
    assistant = relationship('Assistant', backref='qa_knowledge')