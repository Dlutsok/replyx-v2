"""
Модуль конфигурации для централизованного управления переменными окружения
Поддерживает безопасное чтение секретов из файлов
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from .secrets import (
    get_secret_key, get_site_secret, get_db_password, 
    get_openai_api_key, get_secret, validate_secrets
)

# Определяем пути к .env файлам
BACKEND_ROOT = Path(__file__).parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent
BACKEND_ENV_PATH = BACKEND_ROOT / '.env'
PROJECT_ENV_PATH = PROJECT_ROOT / '.env'
PRODUCTION_ENV_PATH = PROJECT_ROOT / '.env.production'

# Автоопределение среды и загрузка соответствующего .env файла
if PROJECT_ENV_PATH.exists():
    # Development - используем .env
    is_development = True
    environment_name = "development"
    load_dotenv(dotenv_path=PROJECT_ENV_PATH)
elif PRODUCTION_ENV_PATH.exists():
    # Production - используем .env.production
    is_development = False
    environment_name = "production"
    load_dotenv(dotenv_path=PRODUCTION_ENV_PATH)
else:
    # Fallback - переменные окружения системы
    is_development = False
    environment_name = "production"

# Основные настройки приложения (БЕЗОПАСНОЕ ЧТЕНИЕ СЕКРЕТОВ)
SECRET_KEY = get_secret_key()  # Читает из SECRET_KEY или SECRET_KEY_FILE
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Настройки базы данных (с автоопределением дефолтов)
DB_PASSWORD = get_db_password()  # Читает из DB_PASSWORD или DB_PASSWORD_FILE

if is_development:
    # Development defaults (с .env файлом)
    DEFAULT_DB_HOST = 'localhost'
    DEFAULT_DB_NAME = 'chat_ai'
    DEFAULT_DB_USER = 'dan'
else:
    # Production defaults (без .env файла)
    DEFAULT_DB_HOST = '192.168.0.4'
    DEFAULT_DB_NAME = 'replyx_production'
    DEFAULT_DB_USER = 'gen_user'

DB_HOST = os.getenv('DB_HOST', DEFAULT_DB_HOST)
DB_PORT = os.getenv('DB_PORT', '5432') 
DB_NAME = os.getenv('DB_NAME', DEFAULT_DB_NAME)
DB_USER = os.getenv('DB_USER', DEFAULT_DB_USER)

# Формируем DATABASE_URL с учетом файловых секретов
if DB_PASSWORD:
    DATABASE_URL = f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?sslmode=disable"
else:
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./test.db')

# Настройки CORS  
CORS_ORIGINS = [
    origin.strip() for origin in 
    os.getenv('CORS_ORIGINS', 'https://replyx.ru,https://www.replyx.ru,http://localhost:3000,http://localhost:3001').split(',')
    if origin.strip() != "*"
]

# Настройки email
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = int(os.getenv('SMTP_PORT', '25'))
SMTP_USERNAME = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
FROM_EMAIL = os.getenv('FROM_EMAIL')
FROM_NAME = os.getenv('FROM_NAME', 'ReplyX')

# URL для фронтенда (используется в email ссылках)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://replyx.ru')

# Настройки site/widget (БЕЗОПАСНОЕ ЧТЕНИЕ)
SITE_SECRET = get_site_secret()  # Читает из SITE_SECRET или SITE_SECRET_FILE

# OpenAI API Key (с поддержкой файловых секретов)
OPENAI_API_KEY = get_openai_api_key()  # Читает из OPENAI_API_KEY или OPENAI_API_KEY_FILE

# Настройки AI токенов
AI_TOKEN_POOL_SIZE = int(os.getenv('AI_TOKEN_POOL_SIZE', '10'))

# Настройки rate limiting
RATE_LIMIT_REQUESTS = int(os.getenv('RATE_LIMIT_REQUESTS', '100'))
RATE_LIMIT_WINDOW = int(os.getenv('RATE_LIMIT_WINDOW', '3600'))  # в секундах

# Настройки пробного периода
TRIAL_DURATION_DAYS = int(os.getenv('TRIAL_DURATION_DAYS', '7'))
TRIAL_MESSAGE_LIMIT = int(os.getenv('TRIAL_MESSAGE_LIMIT', '50'))

# Настройки внешних сервисов
BOT_SERVICE_URL = os.getenv('BOT_SERVICE_URL', 'http://localhost:3002')

# Настройки URL для виджетов и iframe
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://replyx.ru')
BACKEND_URL = os.getenv('BACKEND_URL', 'https://replyx.ru')

# Доверенные iframe хосты для WebSocket соединений
# Если WebSocket подключается из iframe на одном из этих доменов,
# то валидируем parent_origin вместо origin
WS_TRUSTED_IFRAME_HOSTS = [
    host.strip().lower() for host in 
    os.getenv('WS_TRUSTED_IFRAME_HOSTS', 'replyx.ru,www.replyx.ru,localhost:3000').split(',')
    if host.strip()
]

# Требовать валидную JWT подпись в production (рекомендуется)
WS_REQUIRE_TOKEN_SIGNATURE = os.getenv('WS_REQUIRE_TOKEN_SIGNATURE', 'false').lower() in ('true', '1', 'yes')


# RAG / embeddings settings
RAG_MAX_CONTEXT_TOKENS_BOT = int(os.getenv('RAG_MAX_CONTEXT_TOKENS_BOT', '1500'))
RAG_MAX_CONTEXT_TOKENS_WIDGET = int(os.getenv('RAG_MAX_CONTEXT_TOKENS_WIDGET', '1200'))
RAG_MIN_SIMILARITY = float(os.getenv('RAG_MIN_SIMILARITY', '0.5'))  # Понижено для Q&A
RAG_TOP_K_BOT = int(os.getenv('RAG_TOP_K_BOT', '5'))
RAG_TOP_K_WIDGET = int(os.getenv('RAG_TOP_K_WIDGET', '4'))

# Handoff (Human Operator) settings
HANDOFF_ENABLED = os.getenv('HANDOFF_ENABLED', 'true').lower() in ('true', '1', 'yes')
HANDOFF_RECIPIENTS = os.getenv('HANDOFF_RECIPIENTS')  # Список email через запятую, если None - ищем админов в БД

# Ключевые слова для автоматического запроса handoff
HANDOFF_KEYWORDS_RU = [
    keyword.strip() for keyword in os.getenv('HANDOFF_KEYWORDS_RU', 
    'оператор,человек,менеджер,поддержка,помощь,жалоба,проблема,живой,специалист,консультант').split(',')
]
HANDOFF_KEYWORDS_EN = [
    keyword.strip() for keyword in os.getenv('HANDOFF_KEYWORDS_EN',
    'operator,human,manager,support,help,complaint,problem,live,specialist,consultant').split(',')
]

# Пороги для автоматического handoff
HANDOFF_MAX_FALLBACKS = int(os.getenv('HANDOFF_MAX_FALLBACKS', '2'))  # Максимум fallback ответов подряд
HANDOFF_MAX_RETRIES = int(os.getenv('HANDOFF_MAX_RETRIES', '2'))  # Максимум коротких ответов подряд

# SLA по каналам (в минутах)
HANDOFF_SLA_WEB_MINUTES = int(os.getenv('HANDOFF_SLA_WEB_MINUTES', '5'))
HANDOFF_SLA_TELEGRAM_MINUTES = int(os.getenv('HANDOFF_SLA_TELEGRAM_MINUTES', '3'))

# Троттлинг и лимиты
HANDOFF_REQUEST_TTL_MINUTES = int(os.getenv('HANDOFF_REQUEST_TTL_MINUTES', '10'))  # TTL для повторных запросов
HANDOFF_EMAIL_COOLDOWN_MINUTES = int(os.getenv('HANDOFF_EMAIL_COOLDOWN_MINUTES', '10'))  # Не чаще 1 письма в N минут на диалог

# Система присутствия операторов
OPERATOR_OFFLINE_THRESHOLD_SECONDS = int(os.getenv('OPERATOR_OFFLINE_THRESHOLD_SECONDS', '90'))  # Авто-офлайн если нет heartbeat
OPERATOR_HEARTBEAT_INTERVAL_SECONDS = int(os.getenv('OPERATOR_HEARTBEAT_INTERVAL_SECONDS', '30'))  # Интервал heartbeat

# Вместимость операторов по умолчанию
OPERATOR_DEFAULT_MAX_CHATS_WEB = int(os.getenv('OPERATOR_DEFAULT_MAX_CHATS_WEB', '3'))
OPERATOR_DEFAULT_MAX_CHATS_TELEGRAM = int(os.getenv('OPERATOR_DEFAULT_MAX_CHATS_TELEGRAM', '5'))

# Фразы для детекции fallback
HANDOFF_FALLBACK_PATTERNS = [
    pattern.strip() for pattern in os.getenv('HANDOFF_FALLBACK_PATTERNS',
    'не могу ответить,не нашёл информации,обратитесь в поддержку,не знаю,затрудняюсь ответить,недостаточно информации,не понимаю,не уверен').split(',')
]