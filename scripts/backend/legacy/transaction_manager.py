"""
Модуль управления транзакциями для безопасной работы с БД
"""
import logging
from contextlib import contextmanager
from typing import Generator, Optional, Any, Callable
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
import functools
import re

logger = logging.getLogger(__name__)


def _validate_savepoint_name(name: str) -> str:
    """
    Валидирует имя savepoint для защиты от SQL injection
    
    Args:
        name: Имя savepoint для валидации
        
    Returns:
        str: Валидированное имя
        
    Raises:
        ValueError: Если имя содержит недопустимые символы
    """
    if not name:
        raise ValueError("Имя savepoint не может быть пустым")
    
    # Разрешаем только буквы, цифры и underscore
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', name):
        raise ValueError(f"Недопустимое имя savepoint: {name}. Разрешены только буквы, цифры и underscore")
    
    # Ограничиваем длину
    if len(name) > 63:  # PostgreSQL limit for identifiers
        raise ValueError(f"Имя savepoint слишком длинное: {len(name)} символов (максимум 63)")
    
    return name


@contextmanager
def db_transaction(db: Session, auto_commit: bool = True, 
                  auto_rollback: bool = True) -> Generator[Session, None, None]:
    """
    Контекстный менеджер для безопасного выполнения транзакций
    
    Args:
        db: Сессия SQLAlchemy
        auto_commit: Автоматически фиксировать транзакцию при успехе
        auto_rollback: Автоматически откатывать при исключении
        
    Yields:
        Session: Сессия БД для выполнения операций
        
    Example:
        with db_transaction(db) as session:
            user = models.User(email="test@example.com")
            session.add(user)
            # Коммит произойдет автоматически при выходе из блока
    """
    try:
        yield db
        
        if auto_commit:
            db.commit()
            logger.debug("Транзакция успешно зафиксирована")
            
    except SQLAlchemyError as e:
        if auto_rollback:
            db.rollback()
            logger.error(f"Ошибка БД, транзакция откачена: {str(e)}")
        raise
        
    except Exception as e:
        if auto_rollback:
            db.rollback()
            logger.error(f"Неожиданная ошибка, транзакция откачена: {str(e)}")
        raise


def transactional(auto_commit: bool = True, auto_rollback: bool = True):
    """
    Декоратор для автоматического управления транзакциями
    
    Args:
        auto_commit: Автоматически фиксировать транзакцию
        auto_rollback: Автоматически откатывать при ошибке
        
    Example:
        @transactional()
        def create_user(db: Session, email: str):
            user = models.User(email=email)
            db.add(user)
            return user
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Находим параметр db в аргументах функции
            db = None
            
            # Проверяем позиционные аргументы
            func_params = func.__code__.co_varnames[:func.__code__.co_argcount]
            if 'db' in func_params:
                db_index = func_params.index('db')
                if len(args) > db_index:
                    db = args[db_index]
            
            # Проверяем именованные аргументы
            if db is None and 'db' in kwargs:
                db = kwargs['db']
            
            if db is None:
                # Если db не найден, выполняем функцию как есть
                return func(*args, **kwargs)
            
            # Выполняем функцию в транзакции
            try:
                result = func(*args, **kwargs)
                
                if auto_commit:
                    db.commit()
                    logger.debug(f"Транзакция {func.__name__} успешно зафиксирована")
                    
                return result
                
            except SQLAlchemyError as e:
                if auto_rollback:
                    db.rollback()
                    logger.error(f"Ошибка БД в {func.__name__}, транзакция откачена: {str(e)}")
                raise
                
            except Exception as e:
                if auto_rollback:
                    db.rollback()
                    logger.error(f"Ошибка в {func.__name__}, транзакция откачена: {str(e)}")
                raise
        
        return wrapper
    return decorator


class TransactionManager:
    """
    Менеджер для управления сложными транзакциями
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.savepoint_counter = 0
        
    def create_savepoint(self, name: Optional[str] = None) -> str:
        """
        Создает точку сохранения в транзакции
        
        Args:
            name: Имя точки сохранения (опционально)
            
        Returns:
            str: Имя созданной точки сохранения
        """
        if name is None:
            self.savepoint_counter += 1
            name = f"sp_{self.savepoint_counter}"
        else:
            name = _validate_savepoint_name(name)
            
        # Используем text() для безопасного выполнения с валидированным именем
        self.db.execute(text(f"SAVEPOINT {name}"))
        logger.debug(f"Создана точка сохранения: {name}")
        return name
        
    def rollback_to_savepoint(self, name: str):
        """
        Откатывает транзакцию до указанной точки сохранения
        
        Args:
            name: Имя точки сохранения
        """
        validated_name = _validate_savepoint_name(name)
        self.db.execute(text(f"ROLLBACK TO SAVEPOINT {validated_name}"))
        logger.debug(f"Откат к точке сохранения: {validated_name}")
        
    def release_savepoint(self, name: str):
        """
        Освобождает точку сохранения
        
        Args:
            name: Имя точки сохранения
        """
        validated_name = _validate_savepoint_name(name)
        self.db.execute(text(f"RELEASE SAVEPOINT {validated_name}"))
        logger.debug(f"Освобождена точка сохранения: {validated_name}")


@contextmanager
def nested_transaction(db: Session, savepoint_name: Optional[str] = None):
    """
    Контекстный менеджер для вложенных транзакций с использованием savepoints
    
    Args:
        db: Сессия БД
        savepoint_name: Имя точки сохранения
        
    Example:
        with db_transaction(db) as session:
            # Основная транзакция
            user = create_user(session, "user@example.com")
            
            with nested_transaction(session) as nested:
                # Вложенная транзакция
                try:
                    create_profile(nested, user.id)
                except Exception:
                    # Откатится только вложенная транзакция
                    pass
    """
    tm = TransactionManager(db)
    sp_name = tm.create_savepoint(savepoint_name)
    
    try:
        yield db
        # Если все хорошо, освобождаем savepoint
        tm.release_savepoint(sp_name)
        
    except Exception as e:
        # При ошибке откатываемся к savepoint
        tm.rollback_to_savepoint(sp_name)
        logger.error(f"Вложенная транзакция откачена к {sp_name}: {str(e)}")
        raise


def retry_on_deadlock(max_attempts: int = 3, delay: float = 0.1):
    """
    Декоратор для повторной попытки при deadlock
    
    Args:
        max_attempts: Максимальное количество попыток
        delay: Задержка между попытками в секундах
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            import time
            from sqlalchemy.exc import OperationalError
            
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                    
                except OperationalError as e:
                    if 'deadlock detected' in str(e).lower():
                        last_exception = e
                        if attempt < max_attempts - 1:
                            logger.warning(
                                f"Обнаружен deadlock в {func.__name__}, "
                                f"попытка {attempt + 1}/{max_attempts}"
                            )
                            time.sleep(delay * (attempt + 1))
                            continue
                    raise
                    
            # Если все попытки исчерпаны
            logger.error(f"Все {max_attempts} попыток исчерпаны для {func.__name__}")
            raise last_exception
            
        return wrapper
    return decorator