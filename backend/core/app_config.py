"""
Модуль конфигурации для централизованного управления переменными окружения
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Определяем путь к корню проекта (на уровень выше backend)
PROJECT_ROOT = Path(__file__).parent.parent.parent
ENV_PATH = PROJECT_ROOT / '.env'

# Загружаем переменные окружения из корневого .env файла
load_dotenv(dotenv_path=ENV_PATH, override=True)

# Основные настройки приложения
SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Настройки базы данных
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./test.db')

# Настройки CORS
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(',')

# Настройки email
YANDEX_SMTP_USER = os.getenv('YANDEX_SMTP_USER')
YANDEX_SMTP_PASS = os.getenv('YANDEX_SMTP_PASS')

# Настройки site/widget
SITE_SECRET = os.getenv('SITE_SECRET', 'site_secret_key')

# Настройки AI токенов
AI_TOKEN_POOL_SIZE = int(os.getenv('AI_TOKEN_POOL_SIZE', '10'))

# Настройки rate limiting
RATE_LIMIT_REQUESTS = int(os.getenv('RATE_LIMIT_REQUESTS', '100'))
RATE_LIMIT_WINDOW = int(os.getenv('RATE_LIMIT_WINDOW', '3600'))  # в секундах

# Настройки пробного периода
TRIAL_DURATION_DAYS = int(os.getenv('TRIAL_DURATION_DAYS', '7'))
TRIAL_MESSAGE_LIMIT = int(os.getenv('TRIAL_MESSAGE_LIMIT', '50'))

# Настройки внешних сервисов
BOT_SERVICE_URL = os.getenv('BOT_SERVICE_URL', 'http://localhost:3001')

# Настройки URL для виджетов и iframe
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')

# Настройки Yandex OAuth2
YANDEX_CLIENT_ID = os.getenv("YANDEX_CLIENT_ID")
YANDEX_CLIENT_SECRET = os.getenv("YANDEX_CLIENT_SECRET")
YANDEX_REDIRECT_URI = os.getenv("YANDEX_REDIRECT_URI", "http://localhost:8000/api/auth/yandex/callback")
FRONTEND_REDIRECT_URL = os.getenv("FRONTEND_REDIRECT_URL", "http://localhost:3000/oauth-redirect")