from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import jwt

class UserBase(BaseModel):
    email: str
    role: str = 'user'
    status: str = 'active'
    first_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    ai_token: Optional[str] = None
    telegram_token: Optional[str] = None

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str
    role: str
    status: str
    created_at: datetime
    first_name: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    first_name: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class TokenValidationRequest(BaseModel):
    token: str

class TokenBase(BaseModel):
    name: str
    token: str

class TokenCreate(TokenBase):
    pass

class TokenRead(TokenBase):
    id: int
    created_at: str
    owner_id: int
    model_config = ConfigDict(
from_attributes=True)

class TelegramTokenBase(BaseModel):
    token: str

class TelegramTokenCreate(TelegramTokenBase):
    pass

class TelegramTokenRead(TelegramTokenBase):
    id: int
    user_id: int
    created_at: datetime
    model_config = ConfigDict(
from_attributes=True)

class OpenAITokenBase(BaseModel):
    token: str

class OpenAITokenCreate(OpenAITokenBase):
    pass

class OpenAITokenRead(OpenAITokenBase):
    id: int
    user_id: int
    created_at: datetime
    model_config = ConfigDict(
from_attributes=True)

class DocumentBase(BaseModel):
    filename: str
    size: int

class DocumentCreate(DocumentBase):
    pass

class DocumentRead(DocumentBase):
    id: int
    user_id: int
    upload_date: datetime
    model_config = ConfigDict(
from_attributes=True)

# Broadcast schemas removed - no longer needed

class ConfirmEmailRequest(BaseModel):
    email: str
    code: str

class ConfirmEmailResponse(BaseModel):
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = None

class AssistantBase(BaseModel):
    name: str
    ai_model: str = 'gpt-4o-mini'
    system_prompt: str = 'Добро пожаловать! Я Ваш AI-ассистент. Готов предоставить информацию и помочь с любыми вопросами на основе загруженных в мою базу знаний материалов. ВАЖНО: Я отвечаю исключительно на основе предоставленной Вами информации и всегда обращаюсь на «Вы». Чем могу быть полезен?'
    is_active: bool = True
    website_integration_enabled: bool = False
    allowed_domains: Optional[str] = None
    # Widget personalization fields
    operator_name: Optional[str] = 'Поддержка'
    business_name: Optional[str] = 'Наша компания'
    avatar_url: Optional[str] = None
    widget_theme: Optional[str] = 'blue'
    widget_settings: Optional[Dict[str, Any]] = None

class AssistantCreate(AssistantBase):
    pass

class AssistantUpdate(BaseModel):
    name: Optional[str]
    ai_model: Optional[str]
    system_prompt: Optional[str]
    is_active: Optional[bool]
    website_integration_enabled: Optional[bool]
    allowed_domains: Optional[str]
    # Widget personalization fields
    operator_name: Optional[str]
    business_name: Optional[str]
    avatar_url: Optional[str]
    widget_theme: Optional[str]
    widget_settings: Optional[Dict[str, Any]]

class AssistantRead(AssistantBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(
from_attributes=True)





# Схемы для системы баланса

class UserBalanceRead(BaseModel):
    id: int
    user_id: int
    balance: float
    total_spent: float
    total_topped_up: float
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
from_attributes=True)

class BalanceTransactionRead(BaseModel):
    id: int
    user_id: int
    amount: float
    transaction_type: str
    description: Optional[str] = None
    balance_before: float
    balance_after: float
    related_id: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(
from_attributes=True)

class BalanceTransactionDetailRead(BaseModel):
    """Детализированная информация о транзакции баланса"""
    id: int
    user_id: int
    amount: float
    transaction_type: str
    description: Optional[str] = None
    balance_before: float
    balance_after: float
    related_id: Optional[int] = None
    created_at: datetime
    
    # Дополнительная информация о связанной сущности
    related_info: Optional[dict] = None  # Информация о диалоге, сообщении, документе и т.д.
    
    model_config = ConfigDict(
from_attributes=True)

class TopUpBalanceRequest(BaseModel):
    amount: float

class ServicePriceRead(BaseModel):
    id: int
    service_type: str
    price: float
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
from_attributes=True)

class ServicePriceUpdate(BaseModel):
    price: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class BalanceStatsResponse(BaseModel):
    current_balance: float
    total_spent: float
    total_topped_up: float
    recent_transactions: List[BalanceTransactionRead]
    service_prices: List[ServicePriceRead]


# === Схемы для админской аналитики ===

class AdminAnalyticsOverview(BaseModel):
    """Общая статистика для администраторской панели"""
    total_users: int
    active_users_today: int
    total_dialogs: int
    total_messages: int
    total_revenue: float
    growth_metrics: Dict[str, float]

class AdminUserAnalytics(BaseModel):
    """Детальная статистика пользователей"""
    users: List[Dict[str, Any]]
    user_growth: Dict[str, int]
    activity_stats: Dict[str, Any]
    top_users: List[Dict[str, Any]]
    pagination: Dict[str, int]

class AdminDialogAnalytics(BaseModel):
    """Статистика диалогов и AI использования"""
    dialog_stats: Dict[str, int]
    message_stats: Dict[str, int]
    ai_usage: Dict[str, Any]
    popular_assistants: List[Dict[str, Any]]
    response_times: Dict[str, float]
    hourly_stats: Optional[List[Dict[str, Any]]] = []
    user_activity: Optional[List[Dict[str, Any]]] = []

class UsersAIMessagesStats(BaseModel):
    """Статистика AI сообщений для всех пользователей за всё время"""
    users: List[Dict[str, Any]]
    total_users: int
    total_ai_messages: int

class AdminRevenueAnalytics(BaseModel):
    """Финансовая аналитика"""
    total_revenue: float
    revenue_by_period: Dict[str, float]
    balance_stats: Dict[str, Any]
    transaction_stats: Dict[str, int]
    top_paying_users: List[Dict[str, Any]]
    revenue_growth: Dict[str, float]
    daily_revenue: Optional[List[Dict[str, Any]]] = []
    payment_methods: Optional[List[Dict[str, Any]]] = []

class AnalyticsDateRange(BaseModel):
    """Модель для фильтрации по датам"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    period: str = "week"  # day, week, month, year

class UserActivity(BaseModel):
    """Активность пользователя"""
    user_id: int
    email: str
    last_activity: Optional[datetime]
    total_dialogs: int
    total_messages: int
    balance: float
    registration_date: datetime

class DialogMetrics(BaseModel):
    """Метрики диалогов"""
    dialog_id: int
    user_id: int
    assistant_name: str
    messages_count: int
    duration_minutes: Optional[float]
    cost: float
    created_at: datetime

# === Схемы для аналитики страницы /start ===

class StartPageEventCreate(BaseModel):
    """Схема для создания события на странице /start"""
    session_id: str
    event_type: str  # page_view, step_click, step_complete, task_action
    step_id: Optional[int] = None  # ID шага (1-4)
    action_type: Optional[str] = None  # primary, secondary, skip
    metadata: Optional[Dict[str, Any]] = None  # Дополнительная информация
    user_agent: Optional[str] = None
    
class StartPageEventRead(BaseModel):
    """Схема для чтения события на странице /start"""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: Optional[int]
    session_id: str
    event_type: str
    step_id: Optional[int]
    action_type: Optional[str]
    event_metadata: Optional[str]  # JSON string
    user_agent: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

class StartPageAnalytics(BaseModel):
    """Аналитика по странице /start"""
    total_page_views: int
    unique_sessions: int
    steps_completion: Dict[str, int]  # step_id -> count
    conversion_rate: Dict[str, float]  # step_id -> percentage
    drop_off_rate: Dict[str, float]  # step_id -> percentage
    average_time_on_page: float
    most_popular_actions: List[Dict[str, Any]]
    user_flow: List[Dict[str, Any]]  # Последовательность действий

class StartPageFunnelAnalysis(BaseModel):
    """Анализ воронки страницы /start"""
    total_sessions: int
    step_1_views: int
    step_1_completion: int
    step_2_views: int
    step_2_completion: int
    step_3_views: int
    step_3_completion: int
    step_4_views: int
    step_4_completion: int
    full_completion_rate: float

# === Схемы для System API ===

class HealthCheckStatus(BaseModel):
    """Статус проверки health check"""
    status: str  # ok, error, degraded
    details: str

class HealthCheckResponse(BaseModel):
    """Полный ответ health check"""
    status: str  # healthy, degraded, error
    timestamp: str
    response_time_ms: float
    checks: Dict[str, HealthCheckStatus]
    summary: Dict[str, int]

class SystemLogEntry(BaseModel):
    """Системный лог"""
    id: int
    timestamp: str
    level: str  # info, warn, error, debug
    message: str
    source: str
    user_id: Optional[int] = None

class SystemLogsResponse(BaseModel):
    """Ответ с системными логами"""
    logs: List[SystemLogEntry]
    total: int
    has_more: bool
    filters: Dict[str, Any]
    pagination: Dict[str, Any]

class DatabaseTableInfo(BaseModel):
    """Информация о таблице БД"""
    table_schema: str
    table: str
    size: str
    bytes: int

class DatabaseInfoResponse(BaseModel):
    """Информация о базе данных"""
    database_size: str
    tables_count: int
    active_connections: int
    large_tables: List[DatabaseTableInfo]
    status: str
    error: Optional[str] = None

class CacheStatsInfo(BaseModel):
    """Статистика кэша"""
    hit_rate: float
    memory_usage: str
    total_keys: int
    expires_keys: int
    connected_clients: int
    # Дополнительные метрики
    total_commands_processed: int = 0
    keyspace_hits: int = 0
    keyspace_misses: int = 0
    uptime_in_seconds: int = 0
    redis_version: str = "Unknown"
    role: str = "Unknown"
    instantaneous_ops_per_sec: int = 0
    evicted_keys: int = 0
    expired_keys: int = 0

class CacheInfoResponse(BaseModel):
    """Информация о кэше Redis"""
    status: str  # healthy, error
    stats: CacheStatsInfo
    is_available: bool
    error: Optional[str] = None

class CacheClearResponse(BaseModel):
    """Ответ очистки кэша"""
    success: bool
    cleared_keys: int
    cache_type: str
    message: str
    error: Optional[str] = None

class CPUMetrics(BaseModel):
    """Метрики CPU"""
    usage_percent: float
    cores: int
    load_avg_1m: float
    load_avg_5m: float
    load_avg_15m: float

class MemoryMetrics(BaseModel):
    """Метрики памяти"""
    total: int
    available: int
    used: int
    usage_percent: float
    free: int

class DiskMetrics(BaseModel):
    """Метрики диска"""
    total: int
    used: int
    free: int
    usage_percent: float

class NetworkMetrics(BaseModel):
    """Метрики сети"""
    bytes_sent: int
    bytes_recv: int
    packets_sent: int
    packets_recv: int

class PerformanceMetricsResponse(BaseModel):
    """Ответ с метриками производительности"""
    cpu: CPUMetrics
    memory: MemoryMetrics
    disk: DiskMetrics
    network: Dict[str, Any]  # Может быть пустым
    timestamp: str
    error: Optional[str] = None

class ProcessInfo(BaseModel):
    """Информация о процессе"""
    pid: int
    name: str
    cpu_percent: float
    memory_percent: float
    status: str

class ProcessesResponse(BaseModel):
    """Ответ со списком процессов"""
    processes: List[ProcessInfo]
    total_processes: int
    error: Optional[str] = None


# === Схемы для SystemSettings API ===

class SystemSettingBase(BaseModel):
    """Базовая модель настройки системы"""
    category: str
    key: str
    value: Optional[str] = None
    data_type: str = 'string'  # string, boolean, integer, float, json
    is_sensitive: bool = False
    description: Optional[str] = None
    default_value: Optional[str] = None
    is_active: bool = True

class SystemSettingCreate(SystemSettingBase):
    """Создание новой настройки"""
    pass

class SystemSettingUpdate(BaseModel):
    """Обновление существующей настройки"""
    value: Optional[str] = None
    data_type: Optional[str] = None
    is_sensitive: Optional[bool] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SystemSettingRead(SystemSettingBase):
    """Чтение настройки системы"""
    id: int
    created_at: datetime
    updated_at: datetime
    updated_by: Optional[int] = None
    
    model_config = ConfigDict(
from_attributes=True)

class SystemSettingsGrouped(BaseModel):
    """Настройки, сгруппированные по категориям"""
    category: str
    settings: List[SystemSettingRead]
    description: Optional[str] = None

class AdminSettingsResponse(BaseModel):
    """Ответ с административными настройками"""
    categories: List[SystemSettingsGrouped]
    total_settings: int
    last_updated: Optional[datetime] = None

class AdminSettingsBulkUpdate(BaseModel):
    """Массовое обновление настроек"""
    updates: List[Dict[str, Any]]  # [{"category": "ai", "key": "openai_model", "value": "gpt-4o"}]
    
class AdminSettingsTestRequest(BaseModel):
    """Запрос тестирования настройки"""
    category: str
    key: str
    test_value: Optional[str] = None

class AdminSettingsTestResponse(BaseModel):
    """Результат тестирования настройки"""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None

# === Предустановленные категории настроек ===

class GeneralSettingsSchema(BaseModel):
    """Схема основных настроек системы"""
    system_name: str = "ReplyX"
    system_timezone: str = "Europe/Moscow"
    system_locale: str = "ru-RU"
    maintenance_mode: bool = False
    max_users: int = 10000
    max_dialogs_per_user: int = 100
    default_ai_model: str = "gpt-4o-mini"

class AIProviderSettingsSchema(BaseModel):
    """Схема настроек AI провайдеров"""
    openai_api_base: str = "https://api.openai.com/v1"
    openai_timeout: int = 30
    default_max_tokens: int = 2048
    fallback_model: str = "gpt-4o-mini"
    enable_token_rotation: bool = True
    token_usage_logging: bool = True

class EmailSettingsSchema(BaseModel):
    """Схема email настроек"""
    smtp_enabled: bool = True
    smtp_server: str = "smtp.yandex.ru"
    smtp_port: int = 465
    smtp_use_ssl: bool = True
    smtp_username: str = ""
    smtp_password: str = ""  # will be marked as sensitive
    from_email: str = ""
    from_name: str = "ChatAI"

class SecuritySettingsSchema(BaseModel):
    """Схема настроек безопасности"""
    jwt_expire_minutes: int = 1440  # 24 hours
    csrf_enabled: bool = True
    rate_limiting_enabled: bool = True
    max_login_attempts: int = 5
    password_min_length: int = 8
    require_email_confirmation: bool = True
    session_timeout_minutes: int = 60

class LimitsSettingsSchema(BaseModel):
    """Схема настроек лимитов"""
    max_file_size_mb: int = 10
    max_files_per_user: int = 50
    max_api_requests_per_minute: int = 60
    max_messages_per_dialog: int = 1000
    dialog_timeout_minutes: int = 30
    cleanup_old_dialogs_days: int = 90

class MaintenanceSettingsSchema(BaseModel):
    """Схема настроек обслуживания"""
    backup_enabled: bool = True
    backup_frequency_hours: int = 24
    log_level: str = "INFO"
    log_retention_days: int = 30
    metrics_enabled: bool = True
    health_check_enabled: bool = True


# QA Knowledge Schemas
class QAKnowledgeBase(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None
    keywords: Optional[str] = None
    importance: int = 10
    assistant_id: Optional[int] = None

class QAKnowledgeCreate(QAKnowledgeBase):
    pass

class QAKnowledgeUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[str] = None
    importance: Optional[int] = None
    assistant_id: Optional[int] = None
    is_active: Optional[bool] = None

class QAKnowledgeResponse(QAKnowledgeBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    usage_count: int
    last_used: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


# Contact Form Schemas
class ContactFormBase(BaseModel):
    name: str
    phone: str
    message: str

class ContactFormCreate(ContactFormBase):
    pass

class ContactFormResponse(BaseModel):
    message: str
    success: bool