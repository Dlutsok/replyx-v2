"""
Модуль для безопасной валидации загружаемых файлов
"""
import os
import mimetypes
import magic
import hashlib
from pathlib import Path
from typing import List, Tuple, Optional, Set
from fastapi import HTTPException, UploadFile
import logging
import re

logger = logging.getLogger(__name__)

# Разрешенные типы файлов и их MIME-типы
ALLOWED_FILE_TYPES = {
    # Документы
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.txt': ['text/plain', 'text/x-python', 'application/x-empty'],
    '.rtf': ['application/rtf', 'text/rtf'],
    
    # Изображения (если нужно)
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.gif': ['image/gif'],
    
    # Архивы (ограниченно)
    '.zip': ['application/zip'],
}

# Максимальные размеры файлов (в байтах)
MAX_FILE_SIZES = {
    '.pdf': 50 * 1024 * 1024,  # 50MB для PDF
    '.doc': 25 * 1024 * 1024,  # 25MB для DOC
    '.docx': 25 * 1024 * 1024, # 25MB для DOCX
    '.txt': 10 * 1024 * 1024,  # 10MB для TXT
    '.rtf': 10 * 1024 * 1024,  # 10MB для RTF
    '.jpg': 5 * 1024 * 1024,   # 5MB для изображений
    '.jpeg': 5 * 1024 * 1024,
    '.png': 5 * 1024 * 1024,
    '.gif': 5 * 1024 * 1024,
    '.zip': 100 * 1024 * 1024, # 100MB для архивов
}

# Опасные расширения (запрещены)
DANGEROUS_EXTENSIONS = {
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.sh', '.ps1',
    '.msi', '.deb', '.rpm', '.dmg', '.app', '.ipa', '.apk',
    '.dll', '.so', '.dylib', '.sys'
}

# Опасные MIME-типы
DANGEROUS_MIME_TYPES = {
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-dosexec',
    'application/x-winexe',
    'application/x-python-code',
    'text/x-python',
    'application/javascript',
    'text/javascript',
    'application/x-php',
    'text/x-php'
}

# Безопасные расширения файлов
ALLOWED_EXTENSIONS: Set[str] = {'.pdf', '.doc', '.docx', '.txt'}

# MIME типы для проверки
ALLOWED_MIME_TYPES: Set[str] = {
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
}

# Максимальный размер файла (10MB)
MAX_FILE_SIZE: int = 10 * 1024 * 1024

# Паттерн для опасных имен файлов
DANGEROUS_PATTERNS = [
    r'\.\./',  # Path traversal
    r'\.\.\\',  # Path traversal Windows
    r'^/',  # Absolute path
    r'^~',  # Home directory
    r'^\.',  # Hidden files
    r'[<>:"|?*]',  # Windows forbidden chars
    r'[\x00-\x1f]',  # Control characters
]

def sanitize_filename(filename: str) -> str:
    """
    Очищает имя файла от опасных символов
    """
    # Удаляем путь, если он есть
    filename = os.path.basename(filename)
    
    # Заменяем опасные символы
    dangerous_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/', '\0']
    for char in dangerous_chars:
        filename = filename.replace(char, '_')
    
    # Удаляем точки в начале (скрытые файлы в Unix)
    filename = filename.lstrip('.')
    
    # Ограничиваем длину
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[:255-len(ext)] + ext
    
    return filename

def validate_file_extension(filename: str) -> Tuple[bool, str]:
    """
    Проверяет расширение файла
    """
    _, ext = os.path.splitext(filename.lower())
    
    if not ext:
        return False, "Файл должен иметь расширение"
    
    if ext in DANGEROUS_EXTENSIONS:
        return False, f"Расширение {ext} запрещено по соображениям безопасности"
    
    if ext not in ALLOWED_FILE_TYPES:
        return False, f"Расширение {ext} не поддерживается. Разрешены: {', '.join(ALLOWED_FILE_TYPES.keys())}"
    
    return True, ""

def validate_file_size(content_length: int, filename: str) -> Tuple[bool, str]:
    """
    Проверяет размер файла
    """
    _, ext = os.path.splitext(filename.lower())
    max_size = MAX_FILE_SIZES.get(ext, 10 * 1024 * 1024)  # По умолчанию 10MB
    
    if content_length > max_size:
        max_size_mb = max_size / (1024 * 1024)
        return False, f"Размер файла превышает {max_size_mb:.1f}MB"
    
    if content_length == 0:
        return False, "Файл пустой"
    
    return True, ""

def validate_mime_type(file_content: bytes, filename: str) -> Tuple[bool, str]:
    """
    Проверяет MIME-тип файла по содержимому
    """
    try:
        # Используем python-magic для определения типа по содержимому
        mime_type = magic.from_buffer(file_content, mime=True)
        
        if mime_type in DANGEROUS_MIME_TYPES:
            return False, f"Тип файла {mime_type} запрещен по соображениям безопасности"
        
        # Проверяем соответствие расширения и MIME-типа
        _, ext = os.path.splitext(filename.lower())
        allowed_mimes = ALLOWED_FILE_TYPES.get(ext, [])
        
        if allowed_mimes and mime_type not in allowed_mimes:
            logger.warning(f"MIME type mismatch: file {filename} has extension {ext} but MIME type {mime_type}")
            # Для некоторых файлов MIME может отличаться, поэтому только предупреждаем
            # return False, f"Тип файла не соответствует расширению"
        
        return True, ""
        
    except Exception as e:
        logger.error(f"Error detecting MIME type: {e}")
        return False, "Не удалось определить тип файла"

def scan_for_malicious_content(file_content: bytes, filename: str) -> Tuple[bool, str]:
    """
    Базовое сканирование на наличие подозрительного содержимого
    """
    # Проверяем на наличие подозрительных строк
    suspicious_patterns = [
        b'<script',
        b'javascript:',
        b'vbscript:',
        b'onload=',
        b'onerror=',
        b'eval(',
        b'exec(',
        b'system(',
        b'shell_exec',
        b'<?php',
        b'<%',
        b'#!/bin/',
        b'cmd.exe',
        b'powershell'
    ]
    
    content_lower = file_content.lower()
    for pattern in suspicious_patterns:
        if pattern in content_lower:
            logger.warning(f"Suspicious pattern found in file {filename}: {pattern}")
            return False, "Файл содержит подозрительный код"
    
    return True, ""

async def validate_uploaded_file(file: UploadFile) -> Tuple[bool, str, bytes]:
    """
    Полная валидация загружаемого файла
    
    Returns:
        Tuple[bool, str, bytes]: (is_valid, error_message, file_content)
    """
    try:
        # Читаем содержимое файла
        file_content = await file.read()
        
        # Сбрасываем позицию для последующего чтения
        await file.seek(0)
        
        # Очищаем имя файла
        clean_filename = sanitize_filename(file.filename or "unnamed")
        
        # 1. Проверяем расширение
        is_valid, error = validate_file_extension(clean_filename)
        if not is_valid:
            return False, error, b''
        
        # 2. Проверяем размер
        is_valid, error = validate_file_size(len(file_content), clean_filename)
        if not is_valid:
            return False, error, b''
        
        # 3. Проверяем MIME-тип
        is_valid, error = validate_mime_type(file_content, clean_filename)
        if not is_valid:
            return False, error, b''
        
        # 4. Сканируем на подозрительное содержимое
        is_valid, error = scan_for_malicious_content(file_content, clean_filename)
        if not is_valid:
            return False, error, b''
        
        logger.info(f"File validation passed: {clean_filename} ({len(file_content)} bytes)")
        return True, "", file_content
        
    except Exception as e:
        logger.error(f"File validation error: {e}")
        return False, f"Ошибка валидации файла: {str(e)}", b''

def get_safe_file_path(user_email: str, filename: str) -> str:
    """
    Создает безопасный путь для сохранения файла
    """
    import re
    
    # Очищаем email для имени папки
    safe_email = re.sub(r'[^a-zA-Z0-9_.@-]', '_', user_email)
    
    # Очищаем имя файла
    safe_filename = sanitize_filename(filename)
    
    # Создаем уникальное имя файла если нужно
    base_dir = os.path.join("uploads", safe_email)
    file_path = os.path.join(base_dir, safe_filename)
    
    # Если файл уже существует, добавляем счетчик
    counter = 1
    original_path = file_path
    while os.path.exists(file_path):
        name, ext = os.path.splitext(safe_filename)
        safe_filename = f"{name}_{counter}{ext}"
        file_path = os.path.join(base_dir, safe_filename)
        counter += 1
    
    return file_path 

class FileValidator:
    """Класс для валидации загружаемых файлов"""
    
    @staticmethod
    def validate_filename(filename: str) -> str:
        """
        Валидация и санитизация имени файла
        
        Args:
            filename: Исходное имя файла
            
        Returns:
            Безопасное имя файла
            
        Raises:
            HTTPException: Если имя файла небезопасно
        """
        if not filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        # Проверка на опасные паттерны
        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, filename):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Dangerous filename pattern detected: {pattern}"
                )
        
        # Получаем расширение
        path = Path(filename)
        extension = path.suffix.lower()
        
        # Проверка расширения
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File extension {extension} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Создаем безопасное имя файла
        # Удаляем все кроме букв, цифр, дефисов и подчеркиваний
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', path.stem)
        
        # Ограничиваем длину
        if len(safe_name) > 100:
            safe_name = safe_name[:100]
        
        # Если имя пустое после санитизации
        if not safe_name:
            safe_name = "file"
        
        return f"{safe_name}{extension}"
    
    @staticmethod
    async def validate_file_content(
        file: UploadFile,
        content: bytes
    ) -> Tuple[str, str]:
        """
        Валидация содержимого файла
        
        Args:
            file: Загруженный файл
            content: Содержимое файла
            
        Returns:
            Кортеж (mime_type, safe_filename)
            
        Raises:
            HTTPException: Если файл не прошел валидацию
        """
        # Проверка размера
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        if len(content) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file not allowed"
            )
        
        # Проверка MIME типа по содержимому
        try:
            mime_type = magic.from_buffer(content, mime=True)
        except Exception as e:
            # Fallback если magic не работает
            logger.warning(f"Ошибка определения MIME типа через magic: {e}")
            mime_type = file.content_type
        
        if mime_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"File type {mime_type} not allowed"
            )
        
        # Валидация имени файла
        safe_filename = FileValidator.validate_filename(file.filename)
        
        # Дополнительная проверка для PDF
        if mime_type == 'application/pdf':
            if not content.startswith(b'%PDF'):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid PDF file"
                )
        
        # Проверка на исполняемые файлы
        if content.startswith(b'MZ') or content.startswith(b'\x7fELF'):
            raise HTTPException(
                status_code=400,
                detail="Executable files not allowed"
            )
        
        return mime_type, safe_filename
    
    @staticmethod
    def generate_secure_filename(
        user_id: int,
        original_filename: str,
        content: bytes
    ) -> str:
        """
        Генерация уникального безопасного имени файла
        
        Args:
            user_id: ID пользователя
            original_filename: Оригинальное имя файла
            content: Содержимое для хэширования
            
        Returns:
            Уникальное безопасное имя файла
        """
        # Получаем расширение
        extension = Path(original_filename).suffix.lower()
        
        # Генерируем хэш на основе содержимого
        content_hash = hashlib.sha256(content).hexdigest()[:16]
        
        # Создаем уникальное имя
        timestamp = hashlib.md5(str(os.urandom(16)).encode()).hexdigest()[:8]
        
        return f"{user_id}_{content_hash}_{timestamp}{extension}"
    
    @staticmethod
    def get_safe_upload_path(user_id: int, filename: str) -> Path:
        """
        Получение безопасного пути для сохранения файла
        
        Args:
            user_id: ID пользователя
            filename: Имя файла
            
        Returns:
            Безопасный путь для сохранения
        """
        # Базовая директория для загрузок (от корня проекта)
        try:
            from core.app_config import PROJECT_ROOT  # type: ignore
            base_dir = PROJECT_ROOT / "uploads"
        except Exception:
            base_dir = Path("uploads")
        
        # Директория пользователя
        user_dir = base_dir / str(user_id)
        
        # Создаем директории если не существуют
        user_dir.mkdir(parents=True, exist_ok=True)
        
        # Полный путь к файлу
        file_path = user_dir / filename
        
        # Проверяем что путь не выходит за пределы базовой директории
        try:
            file_path = file_path.resolve()
            base_dir_resolved = base_dir.resolve()
            
            if not str(file_path).startswith(str(base_dir_resolved)):
                raise ValueError("Path traversal attempt")
                
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid file path"
            )
        
        return file_path

# Экспортируем для удобства
file_validator = FileValidator()