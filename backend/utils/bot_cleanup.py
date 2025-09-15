"""
Функция полной очистки бота от устаревших данных
"""

from database import models
from sqlalchemy.orm import Session
import requests
import logging
from core.app_config import BOT_SERVICE_URL

logger = logging.getLogger(__name__)

def full_bot_cleanup(user_id: int, assistant_id: int = None, db: Session = None):
    """
    Полная очистка всех данных бота для устранения устаревшей информации
    
    Args:
        user_id: ID пользователя
        assistant_id: ID ассистента (если None - очищает всех ассистентов пользователя)
        db: Сессия базы данных
    """
    from cache.redis_cache import chatai_cache
    from services.embeddings_service import embeddings_service
    
    if not db:
        from database.connection import SessionLocal
        db = SessionLocal()
        should_close = True
    else:
        should_close = False
    
    try:
        logger.info(f"🧹 Полная очистка для пользователя {user_id}, ассистент {assistant_id}")
        
        # 1. Очищаем все кэши пользователя
        chatai_cache.invalidate_user_cache(user_id)
        
        if assistant_id:
            # Очищаем кэш конкретного ассистента
            chatai_cache.invalidate_assistant_cache(assistant_id)
            chatai_cache.invalidate_knowledge_cache(user_id, assistant_id)
            
            # Обновляем версию знаний
            assistant = db.query(models.Assistant).filter(
                models.Assistant.id == assistant_id
            ).first()
            if assistant:
                assistant.knowledge_version = (assistant.knowledge_version or 0) + 1
                db.commit()
            
            # Перезагружаем ботов ассистента
            bot_instances = db.query(models.BotInstance).filter(
                models.BotInstance.assistant_id == assistant_id,
                models.BotInstance.is_active == True
            ).all()
            
        else:
            # Очищаем всех ассистентов пользователя
            assistants = db.query(models.Assistant).filter(
                models.Assistant.user_id == user_id
            ).all()
            
            for assistant in assistants:
                chatai_cache.invalidate_assistant_cache(assistant.id)
                chatai_cache.invalidate_knowledge_cache(user_id, assistant.id)
                assistant.knowledge_version = (assistant.knowledge_version or 0) + 1
            
            db.commit()
            
            # Перезагружаем всех ботов пользователя
            bot_instances = db.query(models.BotInstance).filter(
                models.BotInstance.user_id == user_id,
                models.BotInstance.is_active == True
            ).all()
        
        # 2. Принудительно перезагружаем ботов
        if bot_instances:
            bot_ids = [bot.id for bot in bot_instances]
            
            try:
                # Очищаем кэш bot manager (не блокируем долго)
                requests.post(
                    f"{BOT_SERVICE_URL}/clear-cache",
                    json={'bot_ids': bot_ids},
                    timeout=1
                )
                # Перезагружаем ботов (короткий таймаут)
                requests.post(
                    f"{BOT_SERVICE_URL}/hot-reload-bots",
                    json={'bot_ids': bot_ids},
                    timeout=1
                )
                logger.info(f"✅ Перезагружено {len(bot_ids)} ботов (async, короткий таймаут)")
            except Exception as e:
                logger.warning(f"⚠️  Ошибка перезагрузки ботов (пропущено): {e}")
        
        logger.info("✅ Полная очистка завершена")
        
    finally:
        if should_close:
            db.close()

def enhanced_document_deletion(doc_id: int, user_id: int, db: Session):
    """
    Улучшенное удаление документа с полной очисткой всех связанных данных
    
    Args:
        doc_id: ID документа
        user_id: ID пользователя
        db: Сессия базы данных
    """
    from services.embeddings_service import embeddings_service
    from cache.redis_cache import chatai_cache
    
    logger.info(f"🗑️  Расширенное удаление документа {doc_id}")
    
    try:
        # 1. Получаем информацию о документе
        doc = db.query(models.Document).filter(
            models.Document.id == doc_id,
            models.Document.user_id == user_id
        ).first()
        
        if not doc:
            logger.warning(f"Документ {doc_id} не найден")
            return False
        
        # 2. Удаляем все связанные записи знаний
        deleted_knowledge = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.doc_id == doc_id
        ).delete(synchronize_session=False)
        
        logger.info(f"Удалено записей знаний: {deleted_knowledge}")
        
        # 3. Удаляем все embeddings документа
        deleted_embeddings = embeddings_service.delete_document_embeddings(doc_id, db)
        logger.info(f"Удалено embeddings: {deleted_embeddings}")
        
        # 4. Удаляем физический файл
        filename = doc.filename
        try:
            # Пытаемся удалить из S3
            from services.s3_storage_service import get_s3_service
            s3_service = get_s3_service()
            if s3_service:
                # Удаляем документ из папки documents
                object_key = s3_service.get_user_object_key(user_id, filename, "documents")
                s3_deleted = s3_service.delete_file(object_key)
                if s3_deleted:
                    logger.info(f"Файл удален из S3: {object_key}")
                else:
                    logger.warning(f"Не удалось удалить файл из S3: {object_key}")
            else:
                # Fallback: удаляем из локального хранилища
                from validators.file_validator import file_validator
                import os
                local_path = file_validator.get_safe_upload_path(user_id, filename)
                if os.path.exists(local_path):
                    os.remove(local_path)
                    logger.info(f"Файл удален локально: {local_path}")
                else:
                    logger.warning(f"Локальный файл не найден: {local_path}")
        except Exception as e:
            logger.error(f"Ошибка удаления файла {filename}: {e}")

        # 5. Удаляем сам документ из БД
        db.delete(doc)
        
        # 6. Получаем всех затронутых ассистентов
        assistants = db.query(models.Assistant).filter(
            models.Assistant.user_id == user_id
        ).all()
        
        # 7. Обновляем версии знаний всех ассистентов
        for assistant in assistants:
            embeddings_service.increment_knowledge_version(assistant.id, db)
        
        # 8. АГРЕССИВНАЯ очистка всех связанных кэшей
        chatai_cache.invalidate_user_cache(user_id)
        for assistant in assistants:
            chatai_cache.invalidate_assistant_cache(assistant.id)
            chatai_cache.invalidate_knowledge_cache(user_id, assistant.id)
            
            # Дополнительная очистка всех возможных кэшей ассистента
            try:
                # Принудительно сбрасываем версию знаний для инвалидации всех кэшей
                assistant.knowledge_version = (assistant.knowledge_version or 0) + 10
                db.commit()
                
                # Очищаем все возможные кэши
                chatai_cache.clear_pattern(f"assistant:{assistant.id}:*")
                chatai_cache.clear_pattern(f"knowledge:{user_id}:{assistant.id}:*")
                chatai_cache.clear_pattern(f"embeddings:{assistant.id}:*")
                
                logger.info(f"Очищены все кэши для ассистента {assistant.id}")
            except Exception as e:
                logger.warning(f"Дополнительная очистка кэша ассистента {assistant.id} не удалась: {e}")
        
        # Очищаем глобальные кэши пользователя
        try:
            chatai_cache.clear_pattern(f"user:{user_id}:*")
            chatai_cache.clear_pattern(f"documents:{user_id}:*")
            logger.info(f"Очищены глобальные кэши пользователя {user_id}")
        except Exception as e:
            logger.warning(f"Очистка глобальных кэшей пользователя {user_id} не удалась: {e}")
        
        # 9. Принудительно перезагружаем всех ботов пользователя
        bot_instances = db.query(models.BotInstance).filter(
            models.BotInstance.user_id == user_id,
            models.BotInstance.is_active == True
        ).all()
        
        if bot_instances:
            bot_ids = [bot.id for bot in bot_instances]
            
            try:
                requests.post(
                    f"{BOT_SERVICE_URL}/clear-cache",
                    json={'bot_ids': bot_ids},
                    timeout=1
                )
                requests.post(
                    f"{BOT_SERVICE_URL}/hot-reload-bots",
                    json={'bot_ids': bot_ids},
                    timeout=1
                )
                logger.info(f"Перезагружено {len(bot_ids)} ботов (async, короткий таймаут)")
            except Exception as e:
                logger.warning(f"Ошибка перезагрузки ботов (пропущено): {e}")
        
        # 9. Удаляем файл с диска (используем PROJECT_ROOT/uploads)
        import os
        try:
            from core.app_config import PROJECT_ROOT  # type: ignore
            base_dir = os.path.join(str(PROJECT_ROOT), "uploads")
        except Exception:
            base_dir = "uploads"
        file_path = os.path.join(base_dir, str(user_id), doc.filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"Файл удален: {file_path}")
            except Exception as e:
                logger.error(f"Ошибка удаления файла {file_path}: {e}")
        
        db.commit()
        logger.info(f"✅ Документ {doc.filename} полностью удален")
        return True
        
    except Exception as e:
        logger.error(f"Ошибка расширенного удаления документа: {e}")
        db.rollback()
        return False

def delete_assistant_files(user_id: int, assistant_id: int, db: Session) -> int:
    """Удаляет физические файлы документов, которые были привязаны к ассистенту."""
    import os
    try:
        from core.app_config import PROJECT_ROOT  # type: ignore
        base_dir = os.path.join(str(PROJECT_ROOT), "uploads")
    except Exception:
        base_dir = "uploads"
    
    deleted = 0
    doc_ids = [row[0] for row in db.query(models.UserKnowledge.doc_id).filter(
        models.UserKnowledge.user_id == user_id,
        models.UserKnowledge.assistant_id == assistant_id
    ).distinct().all()]
    
    if not doc_ids:
        return 0
    
    docs = db.query(models.Document).filter(
        models.Document.user_id == user_id,
        models.Document.id.in_(doc_ids)
    ).all()
    
    for d in docs:
        path = os.path.join(base_dir, str(user_id), d.filename)
        if os.path.exists(path):
            try:
                os.remove(path)
                deleted += 1
                logger.info(f"Удален файл ассистента {assistant_id}: {path}")
            except Exception as e:
                logger.warning(f"Не удалось удалить файл {path}: {e}")
    return deleted

def enhanced_knowledge_deletion(knowledge_id: int, user_id: int, db: Session):
    """
    Улучшенное удаление записи знаний с полной очисткой
    
    Args:
        knowledge_id: ID записи знаний
        user_id: ID пользователя
        db: Сессия базы данных
    """
    from cache.redis_cache import chatai_cache
    from services.embeddings_service import embeddings_service
    
    logger.info(f"🗑️  Расширенное удаление знания {knowledge_id}")
    
    try:
        # 1. Получаем запись знания
        knowledge = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.id == knowledge_id,
            models.UserKnowledge.user_id == user_id
        ).first()
        
        if not knowledge:
            logger.warning(f"Знание {knowledge_id} не найдено")
            return False
        
        doc_id = knowledge.doc_id
        assistant_id = knowledge.assistant_id
        
        # 2. Удаляем запись знания
        db.delete(knowledge)
        
        # 3. Если это было последнее знание из документа, удаляем связанные embeddings
        remaining_knowledge = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.doc_id == doc_id,
            models.UserKnowledge.id != knowledge_id
        ).count()
        
        if remaining_knowledge == 0:
            deleted_embeddings = embeddings_service.delete_document_embeddings(doc_id, db)
            logger.info(f"Удалено embeddings документа: {deleted_embeddings}")
        
        # 4. Обновляем версии знаний
        if assistant_id:
            embeddings_service.increment_knowledge_version(assistant_id, db)
            chatai_cache.invalidate_assistant_cache(assistant_id)
            chatai_cache.invalidate_knowledge_cache(user_id, assistant_id)
        else:
            # Обновляем всех ассистентов пользователя
            assistants = db.query(models.Assistant).filter(
                models.Assistant.user_id == user_id
            ).all()
            
            for assistant in assistants:
                embeddings_service.increment_knowledge_version(assistant.id, db)
                chatai_cache.invalidate_assistant_cache(assistant.id)
                chatai_cache.invalidate_knowledge_cache(user_id, assistant.id)
        
        # 5. Очищаем кэш пользователя
        chatai_cache.invalidate_user_cache(user_id)
        
        # 6. Перезагружаем ботов
        bot_instances = db.query(models.BotInstance).filter(
            models.BotInstance.user_id == user_id,
            models.BotInstance.is_active == True
        ).all()
        
        if bot_instances:
            bot_ids = [bot.id for bot in bot_instances]
            
            try:
                requests.post(
                    f"{BOT_SERVICE_URL}/hot-reload-bots",
                    json={'bot_ids': bot_ids},
                    timeout=1
                )
                logger.info(f"Перезагружено {len(bot_ids)} ботов (async, короткий таймаут)")
            except Exception as e:
                logger.warning(f"Ошибка перезагрузки ботов (пропущено): {e}")
        
        db.commit()
        logger.info("✅ Знание полностью удалено")
        return True
        
    except Exception as e:
        logger.error(f"Ошибка расширенного удаления знания: {e}")
        db.rollback()
        return False