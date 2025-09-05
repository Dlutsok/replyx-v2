from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

# 🔧 АВТООПРЕДЕЛЕНИЕ СРЕДЫ И КОНФИГУРАЦИИ БД
# Проверяем наличие .env файла в корне проекта для определения среды
current_dir = os.path.dirname(os.path.abspath(__file__))  # /path/to/backend/database
backend_dir = os.path.dirname(current_dir)                # /path/to/backend  
project_root = os.path.dirname(backend_dir)               # /path/to/project
env_file_path = os.path.join(project_root, '.env')

# Определяем среду по наличию .env файла
is_development = os.path.exists(env_file_path)
environment_name = "development" if is_development else "production"

logger.info(f"🔍 Detected environment: {environment_name}")
logger.info(f"🔍 Looking for .env at: {env_file_path} (exists: {is_development})")

# 🔧 КОНФИГУРАЦИЯ БД С АВТООПРЕДЕЛЕНИЕМ ДЕФОЛТОВ
if is_development:
    # Development defaults (локальная разработка с .env файлом)
    DEFAULT_DB_HOST = 'localhost'
    DEFAULT_DB_NAME = 'chat_ai' 
    DEFAULT_DB_USER = 'dan'  # Твой локальный пользователь
    DEFAULT_SSL_MODE = 'prefer'
else:
    # Production defaults (без .env файла, используем production настройки)
    DEFAULT_DB_HOST = '192.168.0.4'  # Из .env.production
    DEFAULT_DB_NAME = 'replyx_production'
    DEFAULT_DB_USER = 'gen_user'
    DEFAULT_SSL_MODE = 'require'

DB_HOST = os.getenv('DB_HOST', DEFAULT_DB_HOST)
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', DEFAULT_DB_NAME)
DB_USER = os.getenv('DB_USER', DEFAULT_DB_USER)
DB_PASSWORD = os.getenv('DB_PASSWORD', '')  # Пустой пароль по умолчанию для разработки
DB_SSL_MODE = os.getenv('DB_SSL_MODE', DEFAULT_SSL_MODE)

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

logger.info(f"🔗 Подключение к БД [{environment_name}]: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
logger.info(f"🔗 Параметры: SSL={DB_SSL_MODE}, пул={POOL_SIZE}, overflow={MAX_OVERFLOW}")
logger.info(f"🔗 Таймауты: connection={POOL_TIMEOUT}s, recycle={POOL_RECYCLE}s")

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