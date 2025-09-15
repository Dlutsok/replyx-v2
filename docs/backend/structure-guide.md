# Backend Structure Guide

## Обзор

Backend ChatAI MVP 9 использует Clean Architecture с четким разделением по слоям ответственности. Структура построена на принципах модульности, переиспользования и масштабируемости.

## Архитектура

### Технологический стек
- **Framework**: FastAPI (Python 3.9+)
- **Database**: PostgreSQL с SQLAlchemy ORM
- **Migrations**: Alembic
- **Cache**: Redis
- **Workers**: Node.js (изолированно)
- **AI**: OpenAI API, Embeddings
- **Security**: JWT, CSRF Protection, Rate Limiting

### Архитектурные принципы
- **Clean Architecture** - четкое разделение слоев
- **Separation of Concerns** - каждый модуль отвечает за свою область
- **Dependency Injection** - слабая связанность компонентов
- **Single Responsibility** - один класс = одна ответственность

## Структура проекта

```
backend/
├── main.py                    # 🚀 FastAPI application entry point
├── requirements.txt           # 📦 Python dependencies
├── alembic.ini               # ⚙️ Database migration config
├── start_production.sh       # 🛠️ Production deployment script
├── README.md                 # 📋 Backend documentation
├── .gitignore               # 🛡️ Git exclusions
│
├── api/                     # 🌐 API Layer - HTTP Endpoints
│   ├── __init__.py
│   ├── auth.py             # Authentication & authorization
│   ├── users.py            # User management
│   ├── dialogs.py          # Dialog/conversation management
│   ├── ai_chat.py          # AI chat functionality
│   ├── assistants.py       # AI assistant management
│   ├── documents.py        # Document upload/management
│   ├── balance.py          # Billing & balance
│   ├── admin.py            # Admin panel endpoints
│   ├── bots.py             # Bot management
│   ├── handoff.py          # Human handoff
│   ├── system.py           # System health & metrics
│   ├── tokens.py           # Token management
│   ├── email.py            # Email notifications
│   ├── promo.py            # Promotional features
│   ├── referral.py         # Referral system
│   ├── support.py          # Support system
│   ├── site.py             # Site-wide settings
│   └── websockets.py       # Real-time communication
│
├── services/               # 🔧 Service Layer - Business Logic
│   ├── __init__.py
│   ├── bot_manager.py      # Telegram bot orchestration
│   ├── balance_service.py  # Billing & payment logic
│   ├── embeddings_service.py # Vector embeddings
│   ├── document_service.py # Document processing
│   ├── handoff_service.py  # Human handoff logic
│   ├── websocket_manager.py # WebSocket connections
│   ├── operator_presence.py # Operator online status
│   ├── operator_message_cache.py # Message caching
│   ├── analytics_service.py # Analytics & metrics
│   ├── knowledge_control_service.py # Knowledge base
│   ├── legacy_bot_service.py # Legacy bot support
│   ├── promo_service.py    # Promotional logic
│   ├── referral_service.py # Referral logic
│   ├── trial_service.py    # Trial management
│   └── webhook_server.js   # Node.js webhook server
│
├── database/               # 🗄️ Database Layer - Data Access
│   ├── __init__.py
│   ├── connection.py       # Database connection & session
│   ├── models.py           # SQLAlchemy models
│   ├── schemas.py          # Pydantic schemas
│   ├── crud.py             # Database operations
│   ├── sql/               # Raw SQL queries
│   │   ├── db_cheatsheet.sql
│   │   ├── indexes.sql
│   │   └── performance_indexes.sql
│   └── utils/             # Database utilities
│       ├── backup.py      # Backup operations
│       ├── monitoring.py  # DB monitoring
│       └── transaction_manager.py # Transaction handling
│
├── core/                   # ⚙️ Core Layer - Configuration
│   ├── __init__.py
│   ├── app_config.py      # Application configuration
│   ├── auth.py            # Authentication core
│   ├── error_handler.py   # Global error handling
│   ├── security_headers.py # Security middleware
│   ├── csrf_protection.py # CSRF protection
│   └── site_auth.py       # Site authentication
│
├── ai/                     # 🤖 AI Layer - Intelligence
│   ├── __init__.py
│   ├── ai_providers.py    # AI provider integrations
│   ├── ai_token_manager.py # Token usage tracking
│   ├── ai_assistant.py    # AI assistant logic
│   ├── professional_prompts.py # Prompt templates
│   ├── formatted_responses.py # Response formatting
│   ├── prompt_variations.py # Prompt variations
│   └── training_system.py # AI training system
│
├── cache/                  # 🗂️ Cache Layer - Performance
│   ├── __init__.py
│   └── redis_cache.py     # Redis caching operations
│
├── integrations/          # 🔌 Integration Layer - External APIs
│   ├── __init__.py
│   └── email_service.py   # Email service integration
│
├── monitoring/            # 📊 Monitoring Layer - Observability
│   ├── __init__.py
│   ├── audit_logger.py    # Audit logging
│   ├── database_monitoring.py # DB performance
│   ├── rating_system.py   # Rating & feedback
│   ├── db_size_monitor.py # Database size monitoring
│   ├── db_size_cron.sh    # Monitoring cron job
│   └── setup_db_monitoring.sh # Setup script
│
├── security/              # 🛡️ Security Layer - Protection
│   ├── fail2ban_monitor.py # Intrusion detection
│   ├── fail2ban-chatai.conf # Fail2ban config
│   ├── jail.local         # Security rules
│   └── setup_fail2ban.sh  # Security setup
│
├── validators/            # ✅ Validation Layer - Input Safety
│   ├── __init__.py
│   ├── file_validator.py  # File upload validation
│   ├── input_validator.py # Input sanitization
│   └── rate_limiter.py    # Rate limiting
│
├── utils/                 # 🛠️ Utilities Layer - Helpers
│   ├── __init__.py
│   ├── bot_cleanup.py     # Bot maintenance
│   ├── knowledge_validator.py # Knowledge base validation
│   └── ipc.js            # Inter-process communication
│
├── templates/             # 📧 Templates Layer - Communication
│   └── email_templates.py # Email template system
│
├── schemas/               # 📋 Schema Layer - Data Contracts
│   ├── __init__.py
│   └── handoff.py        # Handoff schemas
│
├── alembic/              # 🔄 Migration Layer - Schema Evolution
│   ├── env.py            # Migration environment
│   ├── script.py.mako    # Migration template
│   └── versions/         # Migration files (50+ files)
│
├── scripts/              # 📜 Backend-specific scripts (moved to /scripts/backend/)
│   ├── __init__.py
│   ├── admin/           # 👥 User Management
│   │   ├── cleanup_users.py # User cleanup
│   │   └── create_admin.py  # Admin creation
│   ├── maintenance/     # 🔧 System Maintenance
│   │   ├── cleanup_uploads.py # File cleanup
│   │   ├── database_backup.py # DB backup
│   │   ├── system_monitor.py  # System monitoring
│   │   ├── fastapi_monitor.py # FastAPI monitoring
│   │   └── transaction_manager.py # Transaction tools
│   └── pids/           # Process IDs
│
┴ NOTE: Workers moved to project root (/workers/) for technology separation
│
└── data/                # 📊 Data Layer - Runtime Data (gitignored)
    ├── logs/           # Application logs
    ├── uploads/        # User uploads
    └── backups/        # Database backups
```

## Слои архитектуры

### 1. API Layer (`api/`)
**Ответственность**: HTTP endpoints, request/response handling, routing
- Принимает HTTP запросы
- Валидирует входные данные
- Вызывает сервисы
- Возвращает HTTP ответы

```python
# api/users.py
from services.balance_service import BalanceService
from database.schemas import UserCreate

@router.post("/users")
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    return await UserService.create_user(db, user)
```

### 2. Service Layer (`services/`)
**Ответственность**: Бизнес-логика, координация операций
- Реализует бизнес-процессы
- Координирует работу с базой данных
- Интегрируется с внешними сервисами
- Обрабатывает бизнес-правила

```python
# services/balance_service.py
class BalanceService:
    @staticmethod
    async def charge_for_message(user_id: int, message_cost: float):
        # Бизнес-логика списания средств
        ...
```

### 3. Database Layer (`database/`)
**Ответственность**: Доступ к данным, модели, схемы
- SQLAlchemy модели
- CRUD операции  
- Схемы Pydantic
- Управление транзакциями

```python
# database/models.py
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
```

### 4. Core Layer (`core/`)
**Ответственность**: Конфигурация приложения, базовые настройки
- Настройки приложения
- Аутентификация
- Middleware
- Глобальная обработка ошибок

## Работа с архитектурой

### Добавление нового API endpoint

1. **Создайте endpoint** в соответствующем файле `api/`
2. **Добавьте бизнес-логику** в `services/`
3. **При необходимости** создайте модели в `database/models.py`
4. **Добавьте схемы** в `database/schemas.py`

Пример:
```python
# 1. api/products.py
@router.post("/products")
async def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    return await ProductService.create_product(db, product)

# 2. services/product_service.py  
class ProductService:
    @staticmethod
    async def create_product(db: Session, product: ProductCreate):
        db_product = Product(**product.dict())
        db.add(db_product)
        db.commit()
        return db_product

# 3. database/models.py
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String)

# 4. database/schemas.py
class ProductCreate(BaseModel):
    name: str
```

### Работа с базой данных

#### Создание миграции
```bash
cd backend
alembic revision --autogenerate -m "Add products table"
alembic upgrade head
```

#### CRUD операции
```python
# database/crud.py
def create_product(db: Session, product: ProductCreate):
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product
```

### Работа с сервисами

#### Создание нового сервиса
```python
# services/notification_service.py
class NotificationService:
    def __init__(self, email_service: EmailService):
        self.email_service = email_service
    
    async def send_notification(self, user_id: int, message: str):
        user = await self.get_user(user_id)
        await self.email_service.send_email(user.email, message)
```

#### Dependency Injection
```python
# core/dependencies.py
def get_notification_service():
    email_service = EmailService()
    return NotificationService(email_service)

# api/notifications.py
@router.post("/notify")
async def send_notification(
    notification_service: NotificationService = Depends(get_notification_service)
):
    return await notification_service.send_notification(...)
```

## Конфигурация и настройка

### Переменные окружения
```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost/chatai
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
JWT_SECRET_KEY=your-secret-key
```

### Настройка приложения
```python
# core/app_config.py
class Settings:
    database_url: str = os.getenv("DATABASE_URL")
    redis_url: str = os.getenv("REDIS_URL")
    openai_api_key: str = os.getenv("OPENAI_API_KEY")

settings = Settings()
```

## Мониторинг и логирование

### Логирование
```python
import logging

logger = logging.getLogger(__name__)

def some_function():
    logger.info("Function called")
    try:
        # some logic
        pass
    except Exception as e:
        logger.error(f"Error occurred: {e}")
```

### Мониторинг
- **Database**: `monitoring/database_monitoring.py`
- **Performance**: `monitoring/rating_system.py`  
- **Security**: `security/fail2ban_monitor.py`

## Безопасность

### Аутентификация
```python
# core/auth.py
def get_current_user(token: str = Depends(oauth2_scheme)):
    # JWT token validation
    return user
```

### Валидация входных данных
```python
# validators/input_validator.py
def validate_email(email: str) -> bool:
    return re.match(r'^[^@]+@[^@]+\.[^@]+$', email) is not None
```

### Rate Limiting
```python
# validators/rate_limiter.py
@rate_limit(max_requests=100, window=3600)
async def api_endpoint():
    pass
```

## Развертывание

### Локальная разработка
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
python3 main.py
```

### Продакшн развертывание
```bash
cd backend
chmod +x start_production.sh
./start_production.sh
```

## Скрипты управления

### Управление пользователями
```bash
cd backend
# From project root:
python3 scripts/backend/admin/create_admin.py --email admin@example.com
python3 scripts/backend/admin/cleanup_users.py --inactive-days 90
```

### Обслуживание системы
```bash
cd backend
# From project root:
python3 scripts/backend/maintenance/database_backup.py
python3 scripts/backend/maintenance/cleanup_uploads.py --older-than 30
python3 scripts/backend/maintenance/system_monitor.py --check-health
```

## Workers (Node.js)

### Телеграм боты
```bash
cd backend/workers
npm install
node telegram/bot_worker.js
```

### Управление ботами
```bash
node telegram/reload_telegram_bot.js --bot-id 12345
node master/scalable_bot_manager.js --action restart
```

## Тестирование

### Unit тесты
```bash
cd backend
# From project root:
pytest tests/backend/unit/
```

### Integration тесты
```bash
cd backend  
# From project root:
pytest tests/backend/integration/
```

### API тесты
```bash
cd backend
# From project root:
pytest tests/backend/api/
```

## Лучшие практики

### Структура кода
- **Один файл = одна ответственность**
- **Слои не должны знать о верхних слоях**
- **Зависимости направлены внутрь архитектуры**
- **Бизнес-логика в сервисах, не в API**

### Именование
- **Файлы**: snake_case (`user_service.py`)
- **Классы**: PascalCase (`UserService`)
- **Функции**: snake_case (`create_user`)
- **Константы**: UPPER_CASE (`API_VERSION`)

### Импорты
- **Абсолютные импорты**: `from services.user_service import UserService`
- **Относительные только внутри пакета**: `from .models import User`
- **Группировка**: stdlib → third-party → local

### Обработка ошибок
```python
# Создавайте кастомные исключения
class UserNotFoundError(Exception):
    pass

# Обрабатывайте на уровне API
@router.get("/users/{user_id}")
async def get_user(user_id: int):
    try:
        return await UserService.get_user(user_id)
    except UserNotFoundError:
        raise HTTPException(status_code=404, detail="User not found")
```

## Миграционные задачи

### При добавлении нового функционала
1. **Создайте API endpoint** в соответствующем файле
2. **Реализуйте сервис** с бизнес-логикой
3. **Добавьте модели** если нужны новые таблицы
4. **Создайте миграцию** для изменений БД
5. **Добавьте тесты** для нового функционала
6. **Обновите документацию**

### При рефакторинге
1. **Сохраняйте обратную совместимость API**
2. **Делайте изменения пошагово**
3. **Тестируйте на каждом этапе**
4. **Обновляйте зависимости аккуратно**

## Troubleshooting

### Частые проблемы

**База данных не подключается**
```bash
# Проверьте подключение
python3 -c "from database.connection import engine; print('Connected:', engine.url)"
```

**Миграции не применяются**
```bash
alembic current  # Текущая версия
alembic heads    # Доступные версии
alembic upgrade head
```

**Import ошибки**
```bash
# Проверьте PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:/path/to/backend"
```

**Redis недоступен**
```bash
# Проверьте подключение к Redis
python3 -c "from cache.redis_cache import redis_client; redis_client.ping()"
```

---

*Документ создан: 2025-08-22*  
*Версия архитектуры: 2.0*  
*Автор: Система реорганизации ChatAI MVP 9*