"""
Модуль аудита и логирования критических операций
"""
import logging
from logging.handlers import TimedRotatingFileHandler
import json
from datetime import datetime
from typing import Dict, Any, Optional, Union
from functools import wraps
import traceback
from pathlib import Path

from sqlalchemy.orm import Session
from database import models

# Настройка логгера для аудита
audit_logger = logging.getLogger('audit')
audit_handler = TimedRotatingFileHandler('logs/audit.log', when='midnight', backupCount=14, encoding='utf-8')
audit_handler.setLevel(logging.INFO)

# Формат для аудит логов
audit_formatter = logging.Formatter(
    '%(asctime)s | %(levelname)s | %(user_id)s | %(operation)s | %(status)s | %(details)s'
)
audit_handler.setFormatter(audit_formatter)
audit_logger.addHandler(audit_handler)
audit_logger.setLevel(logging.INFO)

# Создаем директорию для логов если не существует
Path('logs').mkdir(exist_ok=True)


class AuditLogger:
    """Класс для логирования критических операций"""
    
    # Критические операции для обязательного логирования
    CRITICAL_OPERATIONS = {
        'user_register': 'Регистрация пользователя',
        'user_login': 'Вход в систему',
        'user_logout': 'Выход из системы',
        'user_delete': 'Удаление пользователя',
        'user_update_plan': 'Изменение тарифного плана',
        'document_upload': 'Загрузка документа',
        'document_delete': 'Удаление документа',
        'knowledge_create': 'Создание знания',
        'knowledge_delete': 'Удаление знания',
        'assistant_create': 'Создание ассистента',
        'assistant_delete': 'Удаление ассистента',
        'bot_create': 'Создание бота',
        'bot_delete': 'Удаление бота',
        'token_create': 'Создание токена',
        'token_delete': 'Удаление токена',
        'admin_action': 'Административное действие',
        'payment_process': 'Обработка платежа',
        'security_event': 'Событие безопасности',
        'data_export': 'Экспорт данных',
        'data_import': 'Импорт данных',
        'backup_create': 'Создание резервной копии',
        'backup_restore': 'Восстановление из резервной копии',
    }
    
    @staticmethod
    def log(
        operation: str,
        user_id: Optional[int] = None,
        status: str = 'success',
        details: Optional[Dict[str, Any]] = None,
        error: Optional[Exception] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """
        Логирование операции
        
        Args:
            operation: Тип операции из CRITICAL_OPERATIONS
            user_id: ID пользователя
            status: Статус операции (success, failed, error)
            details: Дополнительные детали
            error: Исключение если произошла ошибка
            ip_address: IP адрес клиента
            user_agent: User-Agent клиента
        """
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'operation': operation,
            'operation_name': AuditLogger.CRITICAL_OPERATIONS.get(operation, operation),
            'user_id': user_id,
            'status': status,
            'details': details or {},
            'ip_address': ip_address,
            'user_agent': user_agent
        }
        
        if error:
            log_entry['error'] = {
                'type': type(error).__name__,
                'message': str(error),
                'traceback': traceback.format_exc()
            }
        
        # Форматируем для логгера
        extra = {
            'user_id': user_id or 'anonymous',
            'operation': operation,
            'status': status,
            'details': json.dumps(log_entry, ensure_ascii=False)
        }
        
        if status == 'success':
            audit_logger.info(f"{operation} completed", extra=extra)
        elif status == 'failed':
            audit_logger.warning(f"{operation} failed", extra=extra)
        else:
            audit_logger.error(f"{operation} error", extra=extra)
        
        return log_entry
    
    @staticmethod
    def log_to_db(
        db: Session,
        operation: str,
        user_id: Optional[int] = None,
        status: str = 'success',
        details: Optional[Dict[str, Any]] = None,
        error: Optional[Exception] = None
    ):
        """
        Сохранение аудит лога в базу данных
        
        Args:
            db: Сессия БД
            operation: Тип операции
            user_id: ID пользователя
            status: Статус операции
            details: Дополнительные детали
            error: Исключение если произошла ошибка
        """
        try:
            audit_entry = models.AuditLog(
                operation=operation,
                user_id=user_id,
                status=status,
                details=json.dumps(details or {}, ensure_ascii=False),
                error_message=str(error) if error else None,
                created_at=datetime.utcnow()
            )
            
            db.add(audit_entry)
            db.commit()
            
        except Exception as e:
            # Если не удалось записать в БД, логируем в файл
            audit_logger.error(
                f"Failed to save audit log to DB: {e}",
                extra={
                    'user_id': user_id or 'anonymous',
                    'operation': operation,
                    'status': 'db_error',
                    'details': json.dumps({'db_error': str(e)})
                }
            )


def audit_operation(operation: str, log_to_db: bool = False):
    """
    Декоратор для автоматического логирования операций
    
    Args:
        operation: Тип операции
        log_to_db: Сохранять ли в БД
        
    Example:
        @audit_operation('user_login')
        def login(username: str, password: str):
            # логика входа
    """
    def decorator(func):
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Извлекаем информацию о пользователе и запросе
            user_id = None
            ip_address = None
            user_agent = None
            db_session = None
            
            # Пытаемся найти current_user в kwargs
            if 'current_user' in kwargs and hasattr(kwargs['current_user'], 'id'):
                user_id = kwargs['current_user'].id
                
            # Пытаемся найти request для IP и User-Agent
            if 'request' in kwargs:
                request = kwargs['request']
                if hasattr(request, 'client') and request.client:
                    ip_address = request.client.host
                if hasattr(request, 'headers'):
                    user_agent = request.headers.get('user-agent')
                    
            # Находим сессию БД если нужно логировать в БД
            if log_to_db and 'db' in kwargs:
                db_session = kwargs['db']
            
            start_time = datetime.utcnow()
            details = {
                'function': func.__name__,
                'start_time': start_time.isoformat()
            }
            
            try:
                # Выполняем функцию
                result = func(*args, **kwargs)
                
                # Логируем успех
                end_time = datetime.utcnow()
                details['end_time'] = end_time.isoformat()
                details['duration_ms'] = (end_time - start_time).total_seconds() * 1000
                
                AuditLogger.log(
                    operation=operation,
                    user_id=user_id,
                    status='success',
                    details=details,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                if log_to_db and db_session:
                    AuditLogger.log_to_db(
                        db=db_session,
                        operation=operation,
                        user_id=user_id,
                        status='success',
                        details=details
                    )
                
                return result
                
            except Exception as e:
                # Логируем ошибку
                end_time = datetime.utcnow()
                details['end_time'] = end_time.isoformat()
                details['duration_ms'] = (end_time - start_time).total_seconds() * 1000
                details['error_type'] = type(e).__name__
                
                AuditLogger.log(
                    operation=operation,
                    user_id=user_id,
                    status='error',
                    details=details,
                    error=e,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                if log_to_db and db_session:
                    AuditLogger.log_to_db(
                        db=db_session,
                        operation=operation,
                        user_id=user_id,
                        status='error',
                        details=details,
                        error=e
                    )
                
                # Пробрасываем исключение дальше
                raise
                
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Аналогичная логика для асинхронных функций
            user_id = None
            ip_address = None
            user_agent = None
            db_session = None
            
            if 'current_user' in kwargs and hasattr(kwargs['current_user'], 'id'):
                user_id = kwargs['current_user'].id
                
            if 'request' in kwargs:
                request = kwargs['request']
                if hasattr(request, 'client') and request.client:
                    ip_address = request.client.host
                if hasattr(request, 'headers'):
                    user_agent = request.headers.get('user-agent')
                    
            if log_to_db and 'db' in kwargs:
                db_session = kwargs['db']
            
            start_time = datetime.utcnow()
            details = {
                'function': func.__name__,
                'start_time': start_time.isoformat()
            }
            
            try:
                result = await func(*args, **kwargs)
                
                end_time = datetime.utcnow()
                details['end_time'] = end_time.isoformat()
                details['duration_ms'] = (end_time - start_time).total_seconds() * 1000
                
                AuditLogger.log(
                    operation=operation,
                    user_id=user_id,
                    status='success',
                    details=details,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                if log_to_db and db_session:
                    AuditLogger.log_to_db(
                        db=db_session,
                        operation=operation,
                        user_id=user_id,
                        status='success',
                        details=details
                    )
                
                return result
                
            except Exception as e:
                end_time = datetime.utcnow()
                details['end_time'] = end_time.isoformat()
                details['duration_ms'] = (end_time - start_time).total_seconds() * 1000
                details['error_type'] = type(e).__name__
                
                AuditLogger.log(
                    operation=operation,
                    user_id=user_id,
                    status='error',
                    details=details,
                    error=e,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                if log_to_db and db_session:
                    AuditLogger.log_to_db(
                        db=db_session,
                        operation=operation,
                        user_id=user_id,
                        status='error',
                        details=details,
                        error=e
                    )
                
                raise
        
        # Возвращаем правильную обертку
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
            
    return decorator


# Экспортируем для удобства
audit_log = AuditLogger.log
audit_log_to_db = AuditLogger.log_to_db