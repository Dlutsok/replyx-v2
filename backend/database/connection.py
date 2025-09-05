from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

# 🔧 КОНФИГУРАЦИЯ БД ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
# Для production рекомендуется:
# - DB_HOST: адрес приватной сети БД
# - DB_SSL_MODE: require
# - DB_USER: отдельные роли (app_user для runtime, owner_user для миграций)
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'chat_ai')
DB_USER = os.getenv('DB_USER', 'dan')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')  # Пустой пароль по умолчанию для разработки
DB_SSL_MODE = os.getenv('DB_SSL_MODE', 'prefer')  # prefer для разработки, require для продакшена

# 🔧 НАСТРОЙКИ ПУЛА СОЕДИНЕНИЙ ДЛЯ ПРОДАКШЕНА
POOL_SIZE = int(os.getenv('DB_POOL_SIZE', '15'))  # Оптимизировано для одного инстанса
MAX_OVERFLOW = int(os.getenv('DB_MAX_OVERFLOW', '20'))  # Снижено для предотвращения переполнения
POOL_TIMEOUT = int(os.getenv('DB_POOL_TIMEOUT', '30'))  # Таймаут получения соединения
POOL_RECYCLE = int(os.getenv('DB_POOL_RECYCLE', '3600'))  # 1 час
ECHO_SQL = os.getenv('DB_ECHO', 'false').lower() == 'true'

# 🔧 ФОРМИРОВАНИЕ СТРОКИ ПОДКЛЮЧЕНИЯ
if DB_PASSWORD:
    SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode={DB_SSL_MODE}"
else:
    SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg2://{DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode={DB_SSL_MODE}"

logger.info(f"Подключение к БД: {DB_HOST}:{DB_PORT}/{DB_NAME} (пул: {POOL_SIZE}, overflow: {MAX_OVERFLOW})")
logger.info(f"SSL режим: {DB_SSL_MODE}, timeout: {POOL_TIMEOUT}s, recycle: {POOL_RECYCLE}s")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_size=POOL_SIZE,           # Размер пула соединений (оптимизирован для одного инстанса)
    max_overflow=MAX_OVERFLOW,     # Максимальное переполнение (предотвращает истощение соединений)
    pool_timeout=POOL_TIMEOUT,     # Таймаут получения соединения из пула
    pool_pre_ping=True,            # Проверка соединений перед использованием
    pool_recycle=POOL_RECYCLE,     # Переиспользование соединений
    echo=ECHO_SQL,                 # Логирование SQL (только для отладки)
    # 🔧 ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ ДЛЯ ПРОДАКШЕНА
    connect_args={
        "options": "-c timezone=UTC",  # Устанавливаем UTC
        "application_name": "ChatAI_Backend",  # Имя приложения в БД
        "connect_timeout": 10,  # Таймаут подключения
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Naming convention for consistent constraint names
NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s", 
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_N_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=NAMING_CONVENTION)
Base = declarative_base(metadata=metadata)

def get_db():
    """Получение сессии БД с обработкой ошибок"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Ошибка работы с БД: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def get_db_stats():
    """Получение статистики пула соединений"""
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "total_connections": pool.size() + pool.overflow()
    }