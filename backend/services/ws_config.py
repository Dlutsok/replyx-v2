"""
WebSocket конфигурация для production развертывания
Центральное место для всех настроек WebSocket системы
"""
import os
from typing import Dict, Any

# Лимиты подключений
MAX_CONNECTIONS_PER_DIALOG = int(os.getenv('WS_MAX_CONNECTIONS_PER_DIALOG', '50'))
MAX_TOTAL_CONNECTIONS = int(os.getenv('WS_MAX_TOTAL_CONNECTIONS', '1000'))

# Heartbeat настройки
PING_INTERVAL_SECONDS = int(os.getenv('WS_PING_INTERVAL_SECONDS', '25'))
PONG_TIMEOUT_SECONDS = int(os.getenv('WS_PONG_TIMEOUT_SECONDS', '40'))

# Настройки безопасности
ALLOW_NO_ORIGIN_IN_DEV = os.getenv('ENVIRONMENT', 'development') == 'development'
REQUIRE_TOKEN_SIGNATURE_VALIDATION = os.getenv('WS_REQUIRE_TOKEN_SIGNATURE', 'true').lower() == 'true'

# Настройки производительности
CLEANUP_INTERVAL_SECONDS = int(os.getenv('WS_CLEANUP_INTERVAL_SECONDS', '300'))  # 5 минут
MAX_DIALOG_LOCKS = int(os.getenv('WS_MAX_DIALOG_LOCKS', '10000'))

# Настройки логирования
LOG_LEVEL = os.getenv('WS_LOG_LEVEL', 'INFO')
LOG_HEARTBEAT_EVENTS = os.getenv('WS_LOG_HEARTBEAT_EVENTS', 'false').lower() == 'true'

# Rate limiting для WebSocket endpoints
WS_RATE_LIMIT_PER_IP = int(os.getenv('WS_RATE_LIMIT_PER_IP', '100'))  # подключений в минуту
WS_RATE_LIMIT_WINDOW = int(os.getenv('WS_RATE_LIMIT_WINDOW', '60'))   # окно в секундах

# Message Queue настройки (для синхронизации с ws_message_queue.py)
ACK_TIMEOUT_SECONDS = int(os.getenv('WS_ACK_TIMEOUT_SECONDS', '10'))
MAX_RETRY_ATTEMPTS = int(os.getenv('WS_MAX_RETRY_ATTEMPTS', '3'))
MESSAGE_CLEANUP_INTERVAL_SECONDS = int(os.getenv('WS_MESSAGE_CLEANUP_INTERVAL', '60'))
MESSAGE_TTL_SECONDS = int(os.getenv('WS_MESSAGE_TTL_SECONDS', '300'))  # 5 минут

# LLM / тестовые флаги  
# Среда выполнения
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
IS_TEST_ENV = ENVIRONMENT.lower() in {"test", "ci"}

# Провайдер LLM и режимы фейка
LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'openai')  # fake|openai|anthropic|...
FAKE_LLM_MODE = os.getenv('FAKE_LLM_MODE', 'echo')  # echo|stub|script

# Глобальный рубильник внешнего IO (в тестах всегда включён)
BLOCK_EXTERNAL_IO = os.getenv('BLOCK_EXTERNAL_IO', 'false').lower() == 'true' or IS_TEST_ENV

def get_config() -> Dict[str, Any]:
    """Возвращает все настройки WebSocket в виде словаря"""
    return {
        'connections': {
            'max_per_dialog': MAX_CONNECTIONS_PER_DIALOG,
            'max_total': MAX_TOTAL_CONNECTIONS,
        },
        'heartbeat': {
            'ping_interval': PING_INTERVAL_SECONDS,
            'pong_timeout': PONG_TIMEOUT_SECONDS,
        },
        'security': {
            'allow_no_origin_in_dev': ALLOW_NO_ORIGIN_IN_DEV,
            'require_token_signature': REQUIRE_TOKEN_SIGNATURE_VALIDATION,
        },
        'performance': {
            'cleanup_interval': CLEANUP_INTERVAL_SECONDS,
            'max_dialog_locks': MAX_DIALOG_LOCKS,
        },
        'logging': {
            'level': LOG_LEVEL,
            'log_heartbeat': LOG_HEARTBEAT_EVENTS,
        },
        'rate_limiting': {
            'per_ip': WS_RATE_LIMIT_PER_IP,
            'window': WS_RATE_LIMIT_WINDOW,
        },
        'message_queue': {
            'ack_timeout': ACK_TIMEOUT_SECONDS,
            'max_retry_attempts': MAX_RETRY_ATTEMPTS,
            'cleanup_interval': MESSAGE_CLEANUP_INTERVAL_SECONDS,
            'message_ttl': MESSAGE_TTL_SECONDS,
        },
        'llm': {
            'environment': ENVIRONMENT,
            'is_test_env': IS_TEST_ENV,
            'provider': LLM_PROVIDER,
            'fake_mode': FAKE_LLM_MODE,
            'block_external_io': BLOCK_EXTERNAL_IO,
        },
    }

def is_production() -> bool:
    """Проверяет, запущено ли приложение в production режиме"""
    return os.getenv('ENVIRONMENT', 'development') == 'production'

def is_development() -> bool:
    """Проверяет, запущено ли приложение в development режиме"""
    return os.getenv('ENVIRONMENT', 'development') == 'development'

# Экспорт для удобства
__all__ = [
    'MAX_CONNECTIONS_PER_DIALOG',
    'MAX_TOTAL_CONNECTIONS', 
    'PING_INTERVAL_SECONDS',
    'PONG_TIMEOUT_SECONDS',
    'ALLOW_NO_ORIGIN_IN_DEV',
    'REQUIRE_TOKEN_SIGNATURE_VALIDATION',
    'ACK_TIMEOUT_SECONDS',
    'MAX_RETRY_ATTEMPTS',
    'MESSAGE_CLEANUP_INTERVAL_SECONDS',
    'MESSAGE_TTL_SECONDS',
    'WS_RATE_LIMIT_PER_IP',
    'WS_RATE_LIMIT_WINDOW',
    'ENVIRONMENT',
    'IS_TEST_ENV',
    'LLM_PROVIDER',
    'FAKE_LLM_MODE',
    'BLOCK_EXTERNAL_IO',
    'get_config',
    'is_production',
    'is_development'
]