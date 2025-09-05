"""
📄 СЕРВИС ДЛЯ РАБОТЫ С ДОКУМЕНТАМИ

Выделение бизнес-логики из main.py в отдельный сервисный слой.
Часть рефакторинга архитектуры для исправления монолитного main.py.
"""

import os
import logging
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from datetime import datetime

# Импорты модулей системы
from database import models, crud
from cache.redis_cache import cache
from validators.file_validator import file_validator

logger = logging.getLogger(__name__)


class DocumentService:
    """Сервис для работы с документами пользователя"""
    
    def __init__(self):
        self.cache_ttl = 300  # 5 минут кэш для документов
    
    def get_user_documents(
        self, 
        db: Session, 
        user_id: int, 
        page: int = 1, 
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Получение документов пользователя с пагинацией и кэшированием
        """
        # Проверяем кэш
        cached_result = cache.get("user_documents", user_id=user_id, page=page, limit=limit)
        
        if cached_result:
            logger.debug(f"🚀 CACHE HIT: Documents для пользователя {user_id}")
            return cached_result
        
        logger.debug(f"🔍 CACHE MISS: Загружаем documents для пользователя {user_id}")
        
        # Подсчет общего количества
        total = db.query(models.Document).filter(models.Document.user_id == user_id).count()
        
        # Пагинация с эффективной загрузкой
        offset = (page - 1) * limit
        documents = db.query(models.Document).filter(
            models.Document.user_id == user_id
        ).order_by(models.Document.uploaded_at.desc()).offset(offset).limit(limit).all()
        
        # Подготавливаем результат
        result = {
            "items": [self._document_to_dict(doc) for doc in documents],
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit,
            "limit": limit
        }
        
        # Сохраняем в кэш
        cache.set("user_documents", result, self.cache_ttl, user_id=user_id, page=page, limit=limit)
        
        return result
    
    async def upload_document(
        self, 
        db: Session, 
        user_id: int, 
        file: UploadFile
    ) -> models.Document:
        """
        Загрузка и валидация документа
        """
        # Читаем содержимое файла
        content = await file.read()
        await file.seek(0)  # Возвращаем указатель в начало
        
        # Валидация файла с новым валидатором
        try:
            mime_type, safe_filename = await file_validator.validate_file_content(file, content)
        except HTTPException as e:
            logger.warning(f"File upload rejected for user {user_id}: {e.detail}")
            raise e
        
        # Генерируем безопасное уникальное имя файла
        secure_filename = file_validator.generate_secure_filename(
            user_id=user_id,
            original_filename=safe_filename,
            content=content
        )
        
        # Получаем безопасный путь для сохранения
        file_path = file_validator.get_safe_upload_path(user_id, secure_filename)
        
        # Сохраняем файл
        try:
            with open(file_path, "wb") as f:
                f.write(content)
            
            logger.info(f"File uploaded successfully: {file_path} by user {user_id}")
            
            # Создаем запись в БД с безопасным именем файла
            doc = crud.create_document(db, user_id, secure_filename, len(content))
            
            # Инвалидируем кэш документов пользователя
            self._invalidate_user_cache(user_id)
            
            return doc
            
        except Exception as e:
            logger.error(f"Error saving file {file_path}: {e}")
            # Удаляем файл если создание записи в БД не удалось
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=500, detail="Ошибка сохранения файла")
    
    def delete_document(self, db: Session, user_id: int, doc_id: int) -> bool:
        """
        Удаление документа пользователя
        """
        from database.utils.transaction_manager import db_transaction
        
        with db_transaction(db) as session:
            doc = session.query(models.Document).filter(
                models.Document.id == doc_id, 
                models.Document.user_id == user_id
            ).first()
            
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            
            # Сохраняем имя файла для удаления после транзакции
            filename_to_delete = doc.filename
            
            # Удаляем связанные знания
            session.query(models.UserKnowledge).filter(
                models.UserKnowledge.doc_id == doc_id
            ).delete(synchronize_session=False)
            
            # Удаляем сам документ
            session.delete(doc)
        
        # Удаляем файл с диска после успешной транзакции
        self._delete_file_from_disk(user_id, filename_to_delete)
        
        # Инвалидируем кэш документов пользователя
        self._invalidate_user_cache(user_id)
        
        logger.info(f"Document {doc_id} deleted by user {user_id}")
        return True
    
    def get_document_text(self, db: Session, user_id: int, doc_id: int) -> str:
        """
        Извлечение текста из документа
        """
        doc = db.query(models.Document).filter(
            models.Document.id == doc_id, 
            models.Document.user_id == user_id
        ).first()
        
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Безопасный путь к файлу
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        safe_email = self._get_safe_email(user.email)
        file_path = os.path.join("uploads", safe_email, doc.filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return self._extract_text_from_file(file_path)
    
    def get_document_stats(self, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Статистика документов пользователя
        """
        total_docs = db.query(models.Document).filter(
            models.Document.user_id == user_id
        ).count()
        
        total_size = db.query(
            db.func.sum(models.Document.file_size)
        ).filter(
            models.Document.user_id == user_id
        ).scalar() or 0
        
        # Статистика по типам файлов
        from sqlalchemy import func
        file_types = db.query(
            func.regexp_replace(models.Document.filename, r'.*\.', '').label('extension'),
            func.count().label('count')
        ).filter(
            models.Document.user_id == user_id
        ).group_by('extension').all()
        
        return {
            "total_documents": total_docs,
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "file_types": [{"extension": ext, "count": count} for ext, count in file_types],
            "upload_limit_mb": 10,  # Лимит из file_validator
            "max_documents": 100    # Можно сделать зависимым от плана
        }
    
    def _document_to_dict(self, doc: models.Document) -> Dict[str, Any]:
        """Преобразование модели документа в словарь"""
        return {
            "id": doc.id,
            "filename": doc.filename,
            "file_size": doc.file_size,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "file_size_mb": round(doc.file_size / (1024 * 1024), 2)
        }
    
    def _invalidate_user_cache(self, user_id: int):
        """Инвалидация кэша документов пользователя"""
        cache.delete_pattern(f"user_documents:*user_id={user_id}*")
        logger.debug(f"🗑️ Инвалидирован кэш документов для пользователя {user_id}")
    
    def _delete_file_from_disk(self, user_id: int, filename: str):
        """Удаление файла с диска"""
        try:
            # Получаем пользователя для email
            db = Session()  # Временное решение, лучше передавать как параметр
            user = db.query(models.User).filter(models.User.id == user_id).first()
            db.close()
            
            if user:
                safe_email = self._get_safe_email(user.email)
                file_path = os.path.join("uploads", safe_email, filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"File deleted from disk: {file_path}")
        except Exception as e:
            logger.error(f"Ошибка удаления файла {filename}: {e}")
    
    def _get_safe_email(self, email: str) -> str:
        """Создание безопасного имени директории из email"""
        import re
        return re.sub(r'[^a-zA-Z0-9_.@-]', '_', email)
    
    def _extract_text_from_file(self, file_path: str) -> str:
        """Извлечение текста из файла"""
        file_extension = os.path.splitext(file_path)[1].lower()
        text = ""
        
        if file_extension == '.pdf':
            try:
                import PyPDF2
                with open(file_path, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    for page_num in range(len(pdf_reader.pages)):
                        text += pdf_reader.pages[page_num].extract_text() + "\n"
            except Exception as e:
                logger.error(f"Ошибка чтения PDF: {e}")
                raise HTTPException(status_code=500, detail=f"Ошибка чтения PDF: {e}")
                
        elif file_extension == '.docx':
            try:
                from docx import Document as DocxDocument
                docx = DocxDocument(file_path)
                text = '\n'.join([p.text for p in docx.paragraphs])
            except Exception as e:
                logger.error(f"Ошибка чтения .docx: {e}")
                raise HTTPException(status_code=500, detail=f"Ошибка чтения .docx: {e}")
                
        elif file_extension == '.doc':
            try:
                # Для .doc файлов можно использовать textract или другие библиотеки
                # Здесь простое чтение как текстового файла
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
            except Exception as e:
                logger.error(f"Ошибка чтения .doc: {e}")
                raise HTTPException(status_code=500, detail=f"Ошибка чтения .doc: {e}")
        else:
            # Для .txt и других текстовых файлов
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
            except Exception as e:
                logger.error(f"Ошибка чтения файла: {e}")
                raise HTTPException(status_code=500, detail=f"Ошибка чтения файла: {e}")
        
        return text


# Создаем глобальный экземпляр сервиса
document_service = DocumentService()