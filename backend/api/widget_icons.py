"""
API для работы с иконками виджетов пользователей
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
import logging

from database import models, auth
from database.connection import get_db
from validators.rate_limiter import rate_limit_api
from services.s3_storage_service import get_s3_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Разрешенные типы файлов для иконок
ALLOWED_ICON_TYPES = {
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.svg': ['image/svg+xml'],
    '.webp': ['image/webp']
}

# Максимальный размер иконки (1MB)
MAX_ICON_SIZE = 1024 * 1024


@router.post("/widget-icons/upload")
@rate_limit_api(limit=5, window=300)  # 5 иконок за 5 минут
async def upload_widget_icon(
    file: UploadFile = File(...),
    widget_id: Optional[int] = None,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Загрузка иконки для виджета пользователя"""

    # Получаем S3 сервис и проверяем, что он доступен
    s3_service = get_s3_service()
    if not s3_service:
        raise HTTPException(
            status_code=503,
            detail="Файловое хранилище временно недоступно"
        )

    # Читаем содержимое файла
    content = await file.read()
    await file.seek(0)

    # Валидация размера
    if len(content) > MAX_ICON_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Файл слишком большой. Максимальный размер: {MAX_ICON_SIZE // 1024}KB"
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Пустой файл")

    # Валидация типа файла
    import magic
    try:
        mime_type = magic.from_buffer(content, mime=True)
    except Exception:
        mime_type = file.content_type

    # Проверяем расширение
    import os
    _, ext = os.path.splitext(file.filename.lower())

    if ext not in ALLOWED_ICON_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый тип файла. Разрешены: {', '.join(ALLOWED_ICON_TYPES.keys())}"
        )

    allowed_mimes = ALLOWED_ICON_TYPES.get(ext, [])
    if mime_type not in allowed_mimes:
        raise HTTPException(
            status_code=400,
            detail="MIME-тип файла не соответствует расширению"
        )

    try:
        # Генерируем безопасное имя файла для иконки
        secure_filename = s3_service.generate_widget_icon_filename(
            user_id=current_user.id,
            original_filename=file.filename,
            content=content
        )

        # Загружаем в S3 в папку widget-icons
        object_key = s3_service.get_user_object_key(
            current_user.id,
            secure_filename,
            "widget-icons"
        )

        # Добавляем метаданные (используем дефисы вместо подчеркиваний для Timeweb Cloud)
        metadata = {
            'user-id': str(current_user.id),
            'original-filename': file.filename,
            'widget-id': str(widget_id) if widget_id else 'default',
            'file-type': 'widget-icon'
        }

        upload_result = s3_service.upload_file(
            file_content=content,
            object_key=object_key,
            content_type=mime_type,
            metadata=metadata
        )

        if not upload_result.get('success'):
            raise Exception(f"S3 upload failed: {upload_result.get('error')}")

        logger.info(f"Widget icon uploaded: {object_key} by user {current_user.id}")

        # Возвращаем URL через наш proxy endpoint вместо прямой ссылки на S3
        proxy_url = f"/api/files/widget-icons/{current_user.id}/{secure_filename}"

        # Возвращаем информацию о загруженной иконке
        return {
            "success": True,
            "filename": secure_filename,
            "url": proxy_url,
            "s3_url": upload_result.get('url'),  # Оригинальный S3 URL для отладки
            "size": len(content),
            "content_type": mime_type,
            "object_key": object_key
        }

    except Exception as e:
        logger.error(f"Widget icon upload failed for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка загрузки иконки")


@router.get("/widget-icons/list")
def list_widget_icons(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка иконок виджетов пользователя"""

    s3_service = get_s3_service()
    if not s3_service:
        return {"icons": []}

    try:
        # Получаем список иконок из папки widget-icons
        icons = s3_service.list_user_files(current_user.id, "widget-icons")

        # Форматируем ответ
        result = []
        for icon in icons:
            result.append({
                "filename": icon['filename'],
                "url": icon['url'],
                "size": icon['size'],
                "last_modified": icon['last_modified'].isoformat(),
                "object_key": icon['object_key']
            })

        return {"icons": result}

    except Exception as e:
        logger.error(f"Failed to list widget icons for user {current_user.id}: {e}")
        return {"icons": []}


@router.delete("/widget-icons/{filename}")
def delete_widget_icon(
    filename: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Удаление иконки виджета"""

    s3_service = get_s3_service()
    if not s3_service:
        raise HTTPException(status_code=503, detail="Файловое хранилище недоступно")

    try:
        # Формируем ключ объекта
        object_key = s3_service.get_user_object_key(
            current_user.id,
            filename,
            "widget-icons"
        )

        # Проверяем существование файла
        if not s3_service.file_exists(object_key):
            raise HTTPException(status_code=404, detail="Иконка не найдена")

        # Удаляем файл
        deleted = s3_service.delete_file(object_key)

        if deleted:
            logger.info(f"Widget icon deleted: {object_key} by user {current_user.id}")
            return {"success": True, "message": "Иконка удалена"}
        else:
            raise HTTPException(status_code=500, detail="Не удалось удалить иконку")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete widget icon {filename} for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка удаления иконки")


@router.get("/widget-icons/{filename}")
def get_widget_icon_url(
    filename: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Получение временной ссылки на иконку виджета"""

    s3_service = get_s3_service()
    if not s3_service:
        raise HTTPException(status_code=503, detail="Файловое хранилище недоступно")

    try:
        # Формируем ключ объекта
        object_key = s3_service.get_user_object_key(
            current_user.id,
            filename,
            "widget-icons"
        )

        # Проверяем существование файла
        if not s3_service.file_exists(object_key):
            raise HTTPException(status_code=404, detail="Иконка не найдена")

        # Генерируем временную ссылку на 1 час
        presigned_url = s3_service.generate_presigned_url(
            object_key,
            expiration=3600
        )

        if presigned_url:
            return {
                "url": presigned_url,
                "filename": filename,
                "expires_in": 3600
            }
        else:
            raise HTTPException(status_code=500, detail="Не удалось создать ссылку")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate presigned URL for {filename}: {e}")
        raise HTTPException(status_code=500, detail="Ошибка генерации ссылки")