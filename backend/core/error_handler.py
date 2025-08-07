"""
Централизованная обработка ошибок для backend
"""
import logging
import traceback
from typing import Dict, Any, Optional, Union
from functools import wraps
from datetime import datetime

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import (
    IntegrityError, 
    DataError,
    OperationalError,
    ProgrammingError,
    DatabaseError
)
import asyncio

logger = logging.getLogger(__name__)


class ApplicationError(Exception):
    """Базовый класс для ошибок приложения"""
    
    def __init__(self, message: str, code: str = "APP_ERROR", 
                 status_code: int = 500, details: Optional[Dict] = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(ApplicationError):
    """Ошибка валидации данных"""
    
    def __init__(self, message: str, field: Optional[str] = None, 
                 details: Optional[Dict] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=400,
            details={"field": field, **(details or {})}
        )


class NotFoundError(ApplicationError):
    """Ресурс не найден"""
    
    def __init__(self, resource: str, resource_id: Optional[Union[int, str]] = None):
        message = f"{resource} не найден"
        if resource_id:
            message += f" (ID: {resource_id})"
        
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=404,
            details={"resource": resource, "resource_id": resource_id}
        )


class PermissionError(ApplicationError):
    """Недостаточно прав"""
    
    def __init__(self, message: str = "Недостаточно прав для выполнения операции"):
        super().__init__(
            message=message,
            code="PERMISSION_DENIED",
            status_code=403
        )


class RateLimitError(ApplicationError):
    """Превышен лимит запросов"""
    
    def __init__(self, retry_after: Optional[int] = None):
        message = "Превышен лимит запросов"
        if retry_after:
            message += f". Повторите через {retry_after} секунд"
            
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after": retry_after}
        )


class ExternalServiceError(ApplicationError):
    """Ошибка внешнего сервиса"""
    
    def __init__(self, service: str, message: str):
        super().__init__(
            message=f"Ошибка сервиса {service}: {message}",
            code="EXTERNAL_SERVICE_ERROR",
            status_code=503,
            details={"service": service}
        )


def handle_database_error(error: DatabaseError) -> HTTPException:
    """
    Обработка ошибок базы данных
    
    Args:
        error: Исключение SQLAlchemy
        
    Returns:
        HTTPException с понятным сообщением
    """
    error_msg = str(error.orig) if hasattr(error, 'orig') else str(error)
    
    if isinstance(error, IntegrityError):
        if "duplicate key" in error_msg or "UNIQUE constraint" in error_msg:
            return HTTPException(
                status_code=409,
                detail="Запись с такими данными уже существует"
            )
        elif "foreign key" in error_msg:
            return HTTPException(
                status_code=409,
                detail="Невозможно выполнить операцию: связанные данные"
            )
        else:
            return HTTPException(
                status_code=409,
                detail="Ошибка целостности данных"
            )
            
    elif isinstance(error, DataError):
        return HTTPException(
            status_code=400,
            detail="Неверный формат данных"
        )
        
    elif isinstance(error, OperationalError):
        if "deadlock detected" in error_msg:
            return HTTPException(
                status_code=503,
                detail="Временная блокировка базы данных, повторите позже"
            )
        else:
            return HTTPException(
                status_code=503,
                detail="База данных временно недоступна"
            )
            
    elif isinstance(error, ProgrammingError):
        logger.error(f"Ошибка программирования БД: {error}")
        return HTTPException(
            status_code=500,
            detail="Внутренняя ошибка сервера"
        )
        
    else:
        logger.error(f"Неизвестная ошибка БД: {error}")
        return HTTPException(
            status_code=500,
            detail="Ошибка базы данных"
        )


def error_handler(func):
    """
    Декоратор для централизованной обработки ошибок
    
    Example:
        @error_handler
        def my_endpoint(db: Session = Depends(get_db)):
            # код эндпоинта
    """
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
            
        except ApplicationError as e:
            logger.warning(f"{e.code}: {e.message}", extra={"details": e.details})
            raise HTTPException(
                status_code=e.status_code,
                detail={
                    "error": e.code,
                    "message": e.message,
                    "details": e.details
                }
            )
            
        except HTTPException:
            # Пробрасываем HTTPException без изменений
            raise
            
        except DatabaseError as e:
            logger.error(f"Database error: {e}", exc_info=True)
            raise handle_database_error(e)
            
        except Exception as e:
            # Логируем полный traceback для неожиданных ошибок
            logger.error(
                f"Unexpected error in {func.__name__}: {e}",
                exc_info=True,
                extra={
                    "function": func.__name__,
                    "args": str(args)[:200],  # Ограничиваем длину
                    "kwargs": str(kwargs)[:200]
                }
            )
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "INTERNAL_ERROR",
                    "message": "Внутренняя ошибка сервера",
                    "request_id": datetime.now().isoformat()
                }
            )
    
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
            
        except ApplicationError as e:
            logger.warning(f"{e.code}: {e.message}", extra={"details": e.details})
            raise HTTPException(
                status_code=e.status_code,
                detail={
                    "error": e.code,
                    "message": e.message,
                    "details": e.details
                }
            )
            
        except HTTPException:
            raise
            
        except DatabaseError as e:
            logger.error(f"Database error: {e}", exc_info=True)
            raise handle_database_error(e)
            
        except Exception as e:
            logger.error(
                f"Unexpected error in {func.__name__}: {e}",
                exc_info=True,
                extra={
                    "function": func.__name__,
                    "args": str(args)[:200],
                    "kwargs": str(kwargs)[:200]
                }
            )
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "INTERNAL_ERROR",
                    "message": "Внутренняя ошибка сервера",
                    "request_id": datetime.now().isoformat()
                }
            )
    
    # Возвращаем правильную обертку в зависимости от типа функции
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Глобальный обработчик исключений для FastAPI
    
    Использование:
        app.add_exception_handler(Exception, global_exception_handler)
    """
    # Логируем все необработанные исключения
    logger.error(
        f"Unhandled exception: {exc}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "client": request.client.host if request.client else None
        }
    )
    
    # Определяем тип ошибки и формируем ответ
    if isinstance(exc, ApplicationError):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.code,
                "message": exc.message,
                "details": exc.details,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    elif isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTP_ERROR",
                "message": exc.detail,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    elif isinstance(exc, DatabaseError):
        http_exc = handle_database_error(exc)
        return JSONResponse(
            status_code=http_exc.status_code,
            content={
                "error": "DATABASE_ERROR",
                "message": http_exc.detail,
                "timestamp": datetime.now().isoformat()
            }
        )
        
    else:
        # Для всех остальных ошибок возвращаем общее сообщение
        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "message": "Внутренняя ошибка сервера",
                "request_id": datetime.now().isoformat(),
                "timestamp": datetime.now().isoformat()
            }
        )


class ErrorContext:
    """
    Контекстный менеджер для обработки ошибок с дополнительным контекстом
    
    Example:
        with ErrorContext("обработка документа", document_id=doc_id):
            # операции с документом
    """
    
    def __init__(self, operation: str, **context):
        self.operation = operation
        self.context = context
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            logger.error(
                f"Ошибка при {self.operation}: {exc_val}",
                exc_info=True,
                extra={
                    "operation": self.operation,
                    "context": self.context,
                    "error_type": exc_type.__name__ if exc_type else None
                }
            )
        return False  # Не подавляем исключение 


def setup_error_handlers(app):
    """
    Настройка обработчиков ошибок для FastAPI приложения
    
    Args:
        app: Экземпляр FastAPI приложения
    """
    # Добавляем глобальный обработчик исключений
    app.add_exception_handler(Exception, global_exception_handler)
    
    # Добавляем обработчики для специфических типов ошибок
    app.add_exception_handler(ApplicationError, lambda request, exc: global_exception_handler(request, exc))
    app.add_exception_handler(DatabaseError, lambda request, exc: global_exception_handler(request, exc))
    
    logger.info("Error handlers configured successfully")