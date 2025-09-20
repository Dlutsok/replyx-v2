"""
API для работы с файлами - проксирование S3 файлов
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
import logging
from services.s3_storage_service import get_s3_service
import io

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/files/test")
async def test_files_endpoint():
    """Простой тест endpoint для проверки работы"""
    return {"status": "OK", "message": "Files endpoint работает"}

@router.get("/files/health")
async def files_health():
    """Проверка здоровья файлового сервиса"""
    from services.s3_storage_service import get_s3_service
    s3_service = get_s3_service()
    return {
        "status": "OK",
        "s3_available": s3_service is not None,
        "bucket": s3_service.bucket_name if s3_service else None
    }

@router.get("/files/avatars/{user_id}/{filename}")
async def get_avatar_file(user_id: int, filename: str):
    """Проксирует файл аватара из S3"""
    s3_service = get_s3_service()
    if not s3_service:
        raise HTTPException(status_code=503, detail="Файловое хранилище недоступно")
    
    try:
        # Формируем ключ объекта
        object_key = f"users/{user_id}/avatars/{filename}"
        
        # Проверяем существование файла
        if not s3_service.file_exists(object_key):
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        # Скачиваем файл из S3
        file_content = s3_service.download_file(object_key)
        if not file_content:
            raise HTTPException(status_code=404, detail="Не удалось загрузить файл")
        
        # Определяем MIME тип по расширению
        import mimetypes
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            if filename.lower().endswith('.png'):
                content_type = 'image/png'
            elif filename.lower().endswith(('.jpg', '.jpeg')):
                content_type = 'image/jpeg'
            elif filename.lower().endswith('.webp'):
                content_type = 'image/webp'
            else:
                content_type = 'application/octet-stream'
        
        # Возвращаем файл как поток
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",  # Кеш на 1 час
                "Access-Control-Allow-Origin": "*",  # Разрешаем CORS
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving avatar file {object_key}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения файла")

@router.get("/files/widget-icons/{user_id}/{filename}")
async def get_widget_icon_file(user_id: int, filename: str):
    """Проксирует файл иконки виджета из S3"""
    s3_service = get_s3_service()
    if not s3_service:
        raise HTTPException(status_code=503, detail="Файловое хранилище недоступно")
    
    try:
        # Формируем ключ объекта
        object_key = f"users/{user_id}/widget-icons/{filename}"
        
        # Проверяем существование файла
        if not s3_service.file_exists(object_key):
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        # Скачиваем файл из S3
        file_content = s3_service.download_file(object_key)
        if not file_content:
            raise HTTPException(status_code=404, detail="Не удалось загрузить файл")
        
        # Определяем MIME тип по расширению
        import mimetypes
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            if filename.lower().endswith('.png'):
                content_type = 'image/png'
            elif filename.lower().endswith(('.jpg', '.jpeg')):
                content_type = 'image/jpeg'
            elif filename.lower().endswith('.svg'):
                content_type = 'image/svg+xml'
            elif filename.lower().endswith('.webp'):
                content_type = 'image/webp'
            else:
                content_type = 'application/octet-stream'
        
        # Возвращаем файл как поток
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",  # Кеш на 1 час
                "Access-Control-Allow-Origin": "*",  # Разрешаем CORS
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving widget icon file {object_key}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения файла")

@router.get("/files/documents/{user_id}/{filename}")
async def get_document_file(user_id: int, filename: str):
    """Проксирует файл документа из S3 (только для авторизованных пользователей)"""
    from database.auth import get_current_user
    from database.connection import get_db
    from fastapi import Depends
    from database import models
    from sqlalchemy.orm import Session
    
    # Здесь можно добавить авторизацию если нужно
    s3_service = get_s3_service()
    if not s3_service:
        raise HTTPException(status_code=503, detail="Файловое хранилище недоступно")
    
    try:
        # Формируем ключ объекта
        object_key = f"users/{user_id}/documents/{filename}"
        
        # Проверяем существование файла
        if not s3_service.file_exists(object_key):
            raise HTTPException(status_code=404, detail="Файл не найден")
        
        # Скачиваем файл из S3
        file_content = s3_service.download_file(object_key)
        if not file_content:
            raise HTTPException(status_code=404, detail="Не удалось загрузить файл")
        
        # Определяем MIME тип по расширению
        import mimetypes
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Возвращаем файл как поток
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={
                "Cache-Control": "private, max-age=300",  # Кеш на 5 минут
                "Access-Control-Allow-Origin": "*",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving document file {object_key}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения файла")

@router.get("/files/blog-images/{user_id}/{filename}")
async def get_blog_image_file(user_id: int, filename: str):
    """Проксирует файл изображения блога из S3"""
    s3_service = get_s3_service()
    if not s3_service:
        raise HTTPException(status_code=503, detail="Файловое хранилище недоступно")

    try:
        # Формируем ключ объекта (аналогично widget-icons)
        object_key = f"users/{user_id}/blog-images/{filename}"

        # Проверяем существование файла
        if not s3_service.file_exists(object_key):
            raise HTTPException(status_code=404, detail="Файл не найден")

        # Скачиваем файл из S3
        file_content = s3_service.download_file(object_key)
        if not file_content:
            raise HTTPException(status_code=404, detail="Не удалось загрузить файл")

        # Определяем MIME тип по расширению
        import mimetypes
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            if filename.lower().endswith('.png'):
                content_type = 'image/png'
            elif filename.lower().endswith(('.jpg', '.jpeg')):
                content_type = 'image/jpeg'
            elif filename.lower().endswith('.webp'):
                content_type = 'image/webp'
            elif filename.lower().endswith('.gif'):
                content_type = 'image/gif'
            else:
                content_type = 'application/octet-stream'

        # Возвращаем файл как поток
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=86400",  # Кеш на 24 часа для изображений блога
                "Access-Control-Allow-Origin": "*",  # Разрешаем CORS для блога
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving blog image file {object_key}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка получения файла")
