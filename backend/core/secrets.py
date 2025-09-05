#!/usr/bin/env python3
"""
Утилиты для безопасного управления секретами
Поддерживает чтение секретов из файлов и переменных окружения
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def read_secret_file(path: str) -> Optional[str]:
    """
    Безопасно читает секрет из файла
    
    Args:
        path: Путь к файлу с секретом
        
    Returns:
        Содержимое файла (stripped) или None при ошибке
    """
    try:
        if not os.path.exists(path):
            logger.warning(f"Secret file not found: {path}")
            return None
            
        with open(path, 'r', encoding='utf-8') as f:
            secret = f.read().strip()
            
        if not secret:
            logger.warning(f"Secret file is empty: {path}")
            return None
            
        logger.debug(f"Successfully loaded secret from {path}")
        return secret
        
    except PermissionError:
        logger.error(f"Permission denied reading secret file: {path}")
        return None
    except UnicodeDecodeError:
        logger.error(f"Invalid encoding in secret file: {path}")
        return None
    except Exception as e:
        logger.error(f"Failed to read secret file {path}: {e}")
        return None


def get_secret(env_var: str, file_var: Optional[str] = None, default: Optional[str] = None) -> Optional[str]:
    """
    Получает секрет из переменных окружения или файлов (приоритет: файл > env > default)
    
    Args:
        env_var: Имя переменной окружения
        file_var: Имя переменной с путем к файлу (например: SECRET_KEY_FILE)
        default: Значение по умолчанию
        
    Returns:
        Значение секрета или None
        
    Examples:
        # Попробует прочитать из файла /run/secrets/db_password, затем из DB_PASSWORD
        password = get_secret('DB_PASSWORD', 'DB_PASSWORD_FILE')
        
        # Только из переменной окружения
        api_key = get_secret('OPENAI_API_KEY')
        
        # С fallback значением
        secret_key = get_secret('SECRET_KEY', 'SECRET_KEY_FILE', 'development-only-key')
    """
    
    # 1. Сначала пробуем прочитать из файла
    if file_var:
        file_path = os.getenv(file_var)
        if file_path:
            secret_from_file = read_secret_file(file_path)
            if secret_from_file:
                logger.debug(f"Using secret from file for {env_var}")
                return secret_from_file
    
    # 2. Затем из переменной окружения
    secret_from_env = os.getenv(env_var)
    if secret_from_env:
        logger.debug(f"Using secret from environment variable {env_var}")
        return secret_from_env
    
    # 3. Наконец, default значение
    if default is not None:
        logger.debug(f"Using default value for {env_var}")
        return default
    
    logger.warning(f"No secret found for {env_var}")
    return None


def get_required_secret(env_var: str, file_var: Optional[str] = None) -> str:
    """
    Получает обязательный секрет, вызывает SystemExit если не найден
    
    Args:
        env_var: Имя переменной окружения
        file_var: Имя переменной с путем к файлу
        
    Returns:
        Значение секрета
        
    Raises:
        SystemExit: Если секрет не найден
    """
    secret = get_secret(env_var, file_var)
    
    if secret is None:
        error_msg = f"CRITICAL: Required secret '{env_var}' not found!"
        if file_var:
            error_msg += f" Tried environment variable '{env_var}' and file from '{file_var}'"
        
        logger.critical(error_msg)
        raise SystemExit(error_msg)
    
    return secret


def validate_secrets() -> bool:
    """
    Валидирует наличие всех критических секретов при старте приложения
    
    Returns:
        True если все критические секреты найдены
    """
    critical_secrets = [
        ('SECRET_KEY', 'SECRET_KEY_FILE'),
        ('SITE_SECRET', 'SITE_SECRET_FILE'),
    ]
    
    missing_secrets = []
    
    for env_var, file_var in critical_secrets:
        try:
            get_required_secret(env_var, file_var)
            logger.info(f"✅ Critical secret '{env_var}' loaded successfully")
        except SystemExit:
            missing_secrets.append(env_var)
    
    if missing_secrets:
        logger.critical(f"❌ Missing critical secrets: {missing_secrets}")
        return False
    
    logger.info("✅ All critical secrets loaded successfully")
    return True


# Предустановленные функции для основных секретов
def get_secret_key() -> str:
    """Получает SECRET_KEY для JWT и шифрования"""
    return get_required_secret('SECRET_KEY', 'SECRET_KEY_FILE')


def get_site_secret() -> str:
    """Получает SITE_SECRET для подписи виджет-токенов"""
    return get_required_secret('SITE_SECRET', 'SITE_SECRET_FILE')


def get_db_password() -> Optional[str]:
    """Получает пароль базы данных"""
    return get_secret('DB_PASSWORD', 'DB_PASSWORD_FILE')


def get_openai_api_key() -> Optional[str]:
    """Получает API ключ OpenAI"""
    return get_secret('OPENAI_API_KEY', 'OPENAI_API_KEY_FILE')


def get_yandex_smtp_credentials() -> tuple[Optional[str], Optional[str]]:
    """Получает учетные данные для Yandex SMTP"""
    user = get_secret('YANDEX_SMTP_USER', 'YANDEX_SMTP_USER_FILE')
    password = get_secret('YANDEX_SMTP_PASS', 'YANDEX_SMTP_PASS_FILE')
    return user, password