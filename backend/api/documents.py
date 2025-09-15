from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import json
import os
import logging
from pydantic import BaseModel

from database import models, schemas, crud, auth
from database.connection import get_db
from validators.rate_limiter import rate_limit_api
from services.s3_storage_service import get_s3_service

logger = logging.getLogger(__name__)

router = APIRouter()
def _background_index_document(doc_id: int, user_id: int, assistant_id: Optional[int], text: str, doc_type: str, importance: int = 10):
    """Фоновая индексация документа/знания в отдельной сессии."""
    try:
        from database.connection import SessionLocal
        from services.embeddings_service import embeddings_service
        db = SessionLocal()
        try:
            embeddings_service.index_document(
                doc_id=doc_id,
                user_id=user_id,
                assistant_id=assistant_id,
                text=text,
                doc_type=doc_type,
                importance=importance,
                db=db,
            )
        finally:
            db.close()
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"[BG_INDEX] failed: {e}")

def _background_generate_summary(doc_id: int, user_id: int):
    """Фоновая генерация выжимки и сохранение в UserKnowledge(type='summary')."""
    try:
        from database.connection import SessionLocal
        db = SessionLocal()
        try:
            # Получаем пользователя для analyze_document_internal
            current_user = db.query(models.User).filter(models.User.id == user_id).first()
            if not current_user:
                return
            # Проверяем, нет ли уже сохраненной выжимки
            existing = db.query(models.UserKnowledge).filter(
                models.UserKnowledge.doc_id == doc_id,
                models.UserKnowledge.user_id == user_id,
                models.UserKnowledge.type == 'summary'
            ).first()
            if existing:
                return
            # Генерируем выжимку
            result = analyze_document_internal(doc_id, current_user, db)
            summaries = result.get("summaries", [])
            doc_type = result.get("doc_type")
            # Сохраняем
            knowledge = models.UserKnowledge(
                user_id=user_id,
                assistant_id=None,
                doc_id=doc_id,
                content=json.dumps(summaries),
                type='summary',
                doc_type=doc_type,
                importance=10
            )
            db.add(knowledge)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"[BG_SUMMARY] failed: {e}")


def _background_generate_summary_and_index(doc_id: int, user_id: int, assistant_id: Optional[int], text: str, doc_type: str):
    """Фоновая генерация выжимки и ПОСЛЕДУЮЩАЯ индексация очищенных данных."""
    from database.connection import SessionLocal
    db = SessionLocal()
    try:
        logger.info(f"🔄 Starting background summary generation for doc_id={doc_id}")
        
        # 1. Генерируем выжимку
        _background_generate_summary(doc_id, user_id)
        logger.info(f"✅ Summary generated for doc_id={doc_id}")
        
        # 2. Получаем сгенерированную выжимку
        summary_record = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.doc_id == doc_id,
            models.UserKnowledge.user_id == user_id,
            models.UserKnowledge.type == 'summary'
        ).first()
        
        text_for_embeddings = text  # Fallback to original
        
        if summary_record:
            try:
                summaries_data = json.loads(summary_record.content)
                # Объединяем все выжимки в единый текст для embeddings
                summary_parts = []
                for summary_item in summaries_data:
                    if isinstance(summary_item, dict) and 'summary' in summary_item:
                        summary_parts.append(summary_item['summary'])
                text_for_embeddings = "\n\n".join(summary_parts)
                logger.info(f"📄 Using cleaned summary text ({len(text_for_embeddings)} chars) for embeddings")
            except Exception as e:
                logger.warning(f"Failed to parse summary JSON, using original text: {e}")
        else:
            logger.warning("No summary found after generation, using original text")
        
        # 3. ТОЛЬКО ПОСЛЕ выжимки индексируем очищенные данные
        if assistant_id is not None:
            from services.embeddings_service import embeddings_service
            indexed_chunks = embeddings_service.index_document(
                doc_id=doc_id,
                user_id=user_id,
                assistant_id=assistant_id,
                text=text_for_embeddings,  # Используем ОЧИЩЕННЫЙ текст
                doc_type=doc_type,
                importance=10,
                db=db
            )
            logger.info(f"✅ Document {doc_id} indexed with {indexed_chunks} chunks using cleaned summary for assistant {assistant_id}")
        
    except Exception as e:
        logger.warning(f"[BG_SUMMARY_INDEX] failed for doc_id={doc_id}: {e}")
    finally:
        db.close()


def _generate_summary_and_index_sync(doc_id: int, user_id: int, assistant_id: Optional[int], text: str, doc_type: str, db: Session):
    """Синхронная генерация выжимки и индексация (для fallback)."""
    try:
        logger.info(f"🔄 Synchronous summary generation and indexing for doc_id={doc_id}")
        
        # 1. Генерируем выжимку синхронно
        current_user = db.query(models.User).filter(models.User.id == user_id).first()
        if not current_user:
            return
            
        result = analyze_document_internal(doc_id, current_user, db)
        summaries = result.get("summaries", [])
        doc_type_result = result.get("doc_type")
        
        # Сохраняем выжимку
        knowledge = models.UserKnowledge(
            user_id=user_id,
            assistant_id=None,
            doc_id=doc_id,
            content=json.dumps(summaries),
            type='summary',
            doc_type=doc_type_result,
            importance=10
        )
        db.add(knowledge)
        db.commit()
        
        # 2. Получаем очищенный текст
        text_for_embeddings = text
        try:
            summary_parts = []
            for summary_item in summaries:
                if isinstance(summary_item, dict) and 'summary' in summary_item:
                    summary_parts.append(summary_item['summary'])
            if summary_parts:
                text_for_embeddings = "\n\n".join(summary_parts)
                logger.info(f"📄 Using cleaned summary text for embeddings")
        except Exception as e:
            logger.warning(f"Failed to process summaries, using original text: {e}")
        
        # 3. Индексируем очищенные данные
        if assistant_id is not None:
            from services.embeddings_service import embeddings_service
            indexed_chunks = embeddings_service.index_document(
                doc_id=doc_id,
                user_id=user_id,
                assistant_id=assistant_id,
                text=text_for_embeddings,
                doc_type=doc_type,
                importance=10,
                db=db
            )
            logger.info(f"✅ Document {doc_id} indexed with {indexed_chunks} chunks using cleaned summary")
            
    except Exception as e:
        logger.warning(f"[SYNC_SUMMARY_INDEX] failed for doc_id={doc_id}: {e}")


def analyze_document_internal(doc_id: int, user: models.User, db: Session):
    """Внутренняя функция анализа документа (вынесена для background task)"""
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        return None

    # Проверяем лимит пользователя
    from services.balance_service import BalanceService
    balance_service = BalanceService(db)

    if not balance_service.can_use_document_analysis(user.id):
        return {"error": "Превышен лимит анализа документов"}

    # Проводим анализ (тяжелая операция)
    try:
        file_path = f"./storage/documents/{doc.filename}"

        if doc.filename.endswith('.pdf'):
            import PyPDF2
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text()
        else:
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()

        # AI анализ текста
        from ai.ai_token_manager import ai_token_manager
        analysis = ai_token_manager.make_openai_request(
            messages=[{
                "role": "user",
                "content": f"Проанализируй документ и выдели ключевые моменты:\n\n{text[:8000]}"
            }],
            user_id=user.id
        )

        # Сохраняем результат
        doc.analysis_result = analysis.choices[0].message.content if analysis.choices else "Анализ не удался"
        db.commit()

        # Списываем токены
        balance_service.consume_document_analysis(user.id)

        return {"status": "success", "analysis": doc.analysis_result}

    except Exception as e:
        logger.error(f"Analysis failed for doc {doc_id}: {e}")
        return {"error": str(e)}


def _background_analyze_document(doc_id: int, user_id: int):
    """Background task для анализа документов без блокировки event loop"""
    from database.connection import SessionLocal

    db = SessionLocal()
    try:
        logger.info(f"🧵 Starting background analysis for doc_id={doc_id}")

        # Получаем пользователя и документ
        user = db.query(models.User).filter(models.User.id == user_id).first()
        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()

        if not user or not doc:
            logger.error(f"User {user_id} or document {doc_id} not found")
            return

        # Выполняем анализ (вынесли тяжелую работу из event loop)
        result = analyze_document_internal(doc_id, user, db)

        logger.info(f"✅ Background analysis completed for doc_id={doc_id}")
        return result

    except Exception as e:
        logger.error(f"[BG_ANALYZE] failed for doc_id={doc_id}: {e}")
    finally:
        db.close()


# get_db импортируется из database.connection

# Helper functions to avoid circular imports
def invalidate_knowledge_cache(user_id: int, assistant_id: int):
    """Wrapper для инвалидации кэша знаний"""
    try:
        from cache.redis_cache import chatai_cache
        chatai_cache.invalidate_knowledge_cache(user_id, assistant_id)
    except Exception:
        pass

def hot_reload_assistant_bots(assistant_id: int, db: Session):
    """Импортируем функцию только при вызове"""
    try:
        from main import hot_reload_assistant_bots as _hot_reload
        return _hot_reload(assistant_id, db)
    except ImportError:
        pass

def reload_assistant_bots(assistant_id: int, db: Session):
    """Импортируем функцию только при вызове"""
    try:
        from main import reload_assistant_bots as _reload
        return _reload(assistant_id, db)
    except ImportError:
        pass



def extract_document_text(doc_id: int, current_user: models.User, filename: str, file_content: bytes = None) -> str:
    """Извлекает текст из документа в зависимости от его типа"""
    file_extension = os.path.splitext(filename)[1].lower()
    text = ""

    try:
        # Если контент не передан, загружаем из хранилища
        if file_content is None:
            s3_service = get_s3_service()
            if s3_service:
                # Все файлы (включая импорт сайтов) теперь хранятся в папке documents
                file_type = "documents"

                # Загружаем из S3
                object_key = s3_service.get_user_object_key(current_user.id, filename, file_type)
                file_content = s3_service.download_file(object_key)
                if file_content is None:
                    logger.error(f"Failed to download file from S3: {object_key}")
                    return ""
            else:
                # Загружаем из локального хранилища (fallback)
                from validators.file_validator import file_validator
                file_path = file_validator.get_safe_upload_path(current_user.id, filename)
                if not os.path.exists(file_path):
                    logger.error(f"File not found: {file_path}")
                    return ""
                with open(file_path, 'rb') as f:
                    file_content = f.read()

        # Обрабатываем содержимое в зависимости от типа файла
        if file_extension == '.pdf':
            import PyPDF2
            from io import BytesIO
            pdf_file = BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            for page_num in range(len(pdf_reader.pages)):
                text += pdf_reader.pages[page_num].extract_text() + "\n"

        elif file_extension == '.docx':
            from docx import Document as DocxDoc
            from io import BytesIO
            docx_file = BytesIO(file_content)
            docx = DocxDoc(docx_file)
            text = '\n'.join([p.text for p in docx.paragraphs])

        elif file_extension == '.doc':
            # Для .doc файлов простое чтение как текстового файла
            text = file_content.decode("utf-8", errors="ignore")

        else:
            # Для .txt и других текстовых файлов
            text = file_content.decode("utf-8", errors="ignore")

        return text.strip()

    except Exception as e:
        logger.error(f"Error extracting text from {filename}: {e}")
        return ""

def determine_document_type(filename: str) -> str:
    """Определяет тип документа по имени файла для лучшей обработки"""
    filename_lower = filename.lower()
    
    if any(word in filename_lower for word in ['инструкц', 'instruction', 'manual', 'руководств']):
        return 'instruction'
    elif any(word in filename_lower for word in ['регламент', 'policy', 'procedure']):
        return 'regulation'
    elif any(word in filename_lower for word in ['faq', 'вопрос', 'ответ', 'question']):
        return 'faq'
    elif any(word in filename_lower for word in ['прайс', 'price', 'цен', 'тариф', 'cost']):
        return 'pricing'
    elif any(word in filename_lower for word in ['контакт', 'contact', 'телефон', 'email']):
        return 'contacts'
    elif any(word in filename_lower for word in ['компан', 'company', 'about', 'о_нас']):
        return 'company_info'
    else:
        return 'document'

# --- User Knowledge Endpoint ---

@router.get("/user-knowledge/{user_id}")
def get_user_knowledge(user_id: int, assistant_id: int = Query(None), db: Session = Depends(get_db)):
    """
    🎯 ИСПРАВЛЕНА КОРНЕВАЯ ПРОБЛЕМА КЭШИРОВАНИЯ!
    Теперь функция учитывает assistant_id и фильтрует знания правильно
    """
    
    # Получаем нужного ассистента
    target_assistant = None
    if assistant_id:
        target_assistant = db.query(models.Assistant).filter(
            models.Assistant.id == assistant_id,
            models.Assistant.user_id == user_id
        ).first()
    else:
        # Если assistant_id не указан, берем первого активного
        target_assistant = db.query(models.Assistant).filter(
            models.Assistant.user_id == user_id,
            models.Assistant.is_active == True
        ).first()
    
    # 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Получаем ТОЛЬКО знания конкретного ассистента
    if target_assistant:
        print(f"[GET_USER_KNOWLEDGE] Загружаем знания ТОЛЬКО для ассистента {target_assistant.id} ({target_assistant.name}) пользователя {user_id}")
        # Получаем ТОЛЬКО знания привязанные к этому ассистенту
        # НЕ используем общие знания - каждый ассистент должен быть уникальным
        knowledge_with_docs = db.query(
            models.UserKnowledge,
            models.Document
        ).join(
            models.Document, 
            models.UserKnowledge.doc_id == models.Document.id
        ).filter(
            models.UserKnowledge.user_id == user_id,
            models.UserKnowledge.assistant_id == target_assistant.id  # ТОЛЬКО этого ассистента
        ).all()
    else:
        print(f"[GET_USER_KNOWLEDGE] Ассистент не найден, возвращаем пустые знания")
        # Если ассистент не найден, возвращаем пустой список
        knowledge_with_docs = []
    
    print(f"[GET_USER_KNOWLEDGE] Найдено {len(knowledge_with_docs)} записей знаний для ассистента")
    
    documents = []
    for entry, doc in knowledge_with_docs:
        doc_type = entry.doc_type or "Документ"
        
        # Для Quick Fix документов используем более естественный формат
        if doc.filename.startswith('quick_fix_'):
            # Извлекаем чистый контент без ссылки на файл
            documents.append(entry.content)
        else:
            # Для обычных документов сохраняем информативный префикс
            prefix = f"Информация из документа типа '{doc_type}':\n"
            documents.append(prefix + entry.content)
    
    # Возвращаем промпт из нужного ассистента или дефолтный
    system_prompt = "Ты — дружелюбный и полезный ИИ-ассистент."
    if target_assistant:
        system_prompt = target_assistant.system_prompt or system_prompt
        print(f"[GET_USER_KNOWLEDGE] Системный промпт от ассистента {target_assistant.id}: '{system_prompt[:100]}...'")
    
    return {
        "system_prompt": system_prompt,
        "documents": documents
    }

# --- Documents CRUD ---

@router.get("/documents")
def get_documents(
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(50, ge=1, le=100, description="Количество документов на странице"),
    assistant_id: Optional[int] = Query(None, description="ID ассистента для фильтрации документов"),
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    """Получение документов пользователя с пагинацией и фильтрацией по ассистенту"""
    
    if assistant_id is not None:
        # Фильтрация документов по ассистенту через таблицу UserKnowledge
        query = db.query(models.Document).join(
            models.UserKnowledge, 
            models.Document.id == models.UserKnowledge.doc_id
        ).filter(
            models.Document.user_id == current_user.id,
            models.UserKnowledge.assistant_id == assistant_id
        )
        
        total = query.count()
        offset = (page - 1) * limit
        documents = query.order_by(models.Document.upload_date.desc()).offset(offset).limit(limit).all()
    else:
        # Показываем все документы пользователя
        total = db.query(models.Document).filter(models.Document.user_id == current_user.id).count()
        
        offset = (page - 1) * limit
        documents = db.query(models.Document).filter(
            models.Document.user_id == current_user.id
        ).order_by(models.Document.upload_date.desc()).offset(offset).limit(limit).all()
    
    # Подготавливаем результат с совместимостью для фронтенда
    result = {
        "documents": documents,  # Фронтенд ожидает "documents"
        "items": documents,      # Обратная совместимость 
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "limit": limit
    }
    
    return result

@router.post("/documents", response_model=schemas.DocumentRead)
@rate_limit_api(limit=10, window=300)  # 10 файлов за 5 минут
async def upload_document(
    file: UploadFile = File(...),
    assistant_id: Optional[int] = Form(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    """Безопасная загрузка документов с улучшенной валидацией"""
    from validators.file_validator import file_validator
    from services.balance_service import BalanceService
    
    # Проверяем баланс перед загрузкой документа
    balance_service = BalanceService(db)
    if not balance_service.check_sufficient_balance(current_user.id, "document_upload"):
        raise HTTPException(
            status_code=402, 
            detail="Недостаточно средств на балансе для загрузки документа"
        )
    
    # Читаем содержимое файла
    content = await file.read()
    await file.seek(0)  # Возвращаем указатель в начало
    
    # Валидация файла с новым валидатором
    try:
        mime_type, safe_filename = await file_validator.validate_file_content(file, content)
    except HTTPException as e:
        logger.warning(f"File upload rejected for user {current_user.id}: {e.detail}")
        raise e
    
    # Получаем S3 сервис
    s3_service = get_s3_service()

    # Генерируем безопасное уникальное имя файла
    if s3_service:
        # Для S3 используем простое имя файла с timestamp
        import hashlib
        from datetime import datetime
        content_hash = hashlib.sha256(content).hexdigest()[:16]
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        secure_filename = f"{current_user.id}_{timestamp}_{content_hash}.docx"
    else:
        secure_filename = file_validator.generate_secure_filename(
            user_id=current_user.id,
            original_filename=safe_filename,
            content=content
        )

    # Сохраняем файл
    file_path = None
    try:
        if s3_service:
            # Загружаем в S3 (документы в папку documents)
            object_key = f"users/{current_user.id}/documents/{secure_filename}"

            # Добавляем метаданные (используем дефисы вместо подчеркиваний для Timeweb Cloud)
            metadata = {
                'user-id': str(current_user.id),
                'original-filename': safe_filename,
                'upload-time': datetime.now().isoformat()
            }

            upload_result = s3_service.upload_file(
                file_content=content,
                object_key=object_key,
                content_type=mime_type,
                metadata=metadata
            )

            if not upload_result.get('success'):
                raise Exception(f"S3 upload failed: {upload_result.get('error')}")

            logger.info(f"File uploaded to S3: {object_key} by user {current_user.id}")

        else:
            # Fallback: сохраняем локально
            file_path = file_validator.get_safe_upload_path(current_user.id, secure_filename)
            with open(file_path, "wb") as f:
                f.write(content)
            logger.info(f"File uploaded locally: {file_path} by user {current_user.id}")
        
        # Создаем запись в БД с безопасным именем файла
        doc = crud.create_document(db, current_user.id, secure_filename, len(content))
        
        # Списываем средства за загрузку документа
        try:
            balance_service.charge_for_service(current_user.id, "document_upload")
            logger.info(f"Charged user {current_user.id} for document upload")
        except Exception as e:
            logger.error(f"Failed to charge user {current_user.id} for document upload: {e}")
            # Не прерываем процесс, если списание не удалось
        
        # Инвалидируем кэш документов пользователя
        from cache.redis_cache import cache
        cache.delete_pattern(f"user_documents:{current_user.id}:*")
        
        # 🚀 АВТОМАТИЧЕСКАЯ ИНДЕКСАЦИЯ ЧЕРЕЗ EMBEDDINGS (БЕЗ HOT-RELOAD)
        # Новый подход: индексируем ТОЛЬКО под конкретного ассистента, если он указан
        try:
            logger.info(f"Starting automatic embedding indexing for doc_id={doc.id}, user_id={current_user.id}")

            # Извлекаем текст из документа (передаем уже загруженный контент)
            text = extract_document_text(doc.id, current_user, secure_filename, content)
            # Считаем doc_hash для грубой проверки изменений
            try:
                import hashlib
                doc_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
                doc.doc_hash = doc_hash
                db.commit()
            except Exception:
                pass
            
            # Определяем тип документа для лучшей обработки
            doc_type = determine_document_type(secure_filename)
            
            # Импортируем сервис embeddings
            from services.embeddings_service import embeddings_service

            target_assistant_id: Optional[int] = None
            if assistant_id is not None:
                # Проверяем, что ассистент принадлежит пользователю
                assistant = db.query(models.Assistant).filter(
                    models.Assistant.id == int(assistant_id),
                    models.Assistant.user_id == current_user.id
                ).first()
                if not assistant:
                    raise HTTPException(status_code=404, detail="Assistant not found")
                target_assistant_id = assistant.id

            if target_assistant_id is not None:
                # Создаём запись знаний, чтобы документ был привязан к ассистенту и отображался в UI
                try:
                    existing_knowledge = db.query(models.UserKnowledge).filter(
                        models.UserKnowledge.user_id == current_user.id,
                        models.UserKnowledge.assistant_id == target_assistant_id,
                        models.UserKnowledge.doc_id == doc.id
                    ).first()
                    if not existing_knowledge:
                        knowledge = models.UserKnowledge(
                            user_id=current_user.id,
                            assistant_id=target_assistant_id,
                            doc_id=doc.id,
                            content=text,  # сохраняем исходный текст как знание 'original'
                            type='original',
                            doc_type=doc_type,
                            importance=10
                        )
                        db.add(knowledge)
                        db.commit()
                except Exception as e:
                    logger.warning(f"[UPLOAD_DOCUMENT] failed to create UserKnowledge link: {e}")
                # Запускаем ФОНОВУЮ генерацию выжимки и последующую индексацию
                if background_tasks is not None:
                    logger.info(f"🧵 Scheduling background summary generation and indexing for doc_id={doc.id}")
                    background_tasks.add_task(_background_generate_summary_and_index, doc.id, current_user.id, target_assistant_id, text, doc_type)
                else:
                    # Если background_tasks недоступны, делаем синхронно (только для тестов)
                    logger.info(f"🔄 Generating summary and indexing synchronously for doc_id={doc.id}")
                    _generate_summary_and_index_sync(doc.id, current_user.id, target_assistant_id, text, doc_type, db)
            else:
                # Без assistant_id больше НЕ выполняем индексацию для всех ассистентов (избегаем "размазывания")
                logger.info("ℹ️ Document uploaded without assistant_id - skipping assistant-specific embedding indexing")

        except Exception as e:
            logger.error(f"Failed to index document embeddings {doc.id}: {e}")
            # Не прерываем процесс загрузки, если индексация не удалась
            # Пользователь сможет переиндексировать позже
        
        return doc
        
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        # Удаляем файл если создание записи в БД не удалось
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Ошибка сохранения файла")

@router.post("/documents/import-website", response_model=schemas.DocumentRead)
def import_website(
    data: dict,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Импортирует страницу сайта по URL как документ и индексирует под ассистента"""
    from services.embeddings_service import embeddings_service
    from services.balance_service import BalanceService
    import re
    import time
    import requests
    try:
        from bs4 import BeautifulSoup  # type: ignore
    except Exception:
        raise HTTPException(status_code=500, detail="Отсутствует зависимость beautifulsoup4 на сервере")

    url = (data or {}).get('url')
    assistant_id = (data or {}).get('assistant_id')
    if not url:
        raise HTTPException(status_code=400, detail="url обязателен")

    # Проверка баланса как для загрузки документа
    balance_service = BalanceService(db)
    if not balance_service.check_sufficient_balance(current_user.id, "document_upload"):
        raise HTTPException(status_code=402, detail="Недостаточно средств на балансе для импорта сайта")

    # Вытягиваем содержимое страницы
    try:
        headers = {"User-Agent": "ChatAI-Importer/1.0"}
        resp = requests.get(url, headers=headers, timeout=20)
        resp.raise_for_status()
        html = resp.text
    except Exception as e:
        logger.error(f"Website fetch failed: {e}")
        raise HTTPException(status_code=400, detail="Не удалось загрузить страницу по указанному URL")

    # Извлекаем текст
    soup = BeautifulSoup(html, 'html.parser')
    # Удаляем скрипты/стили
    for tag in soup(["script", "style", "noscript"]):
        tag.extract()
    text = soup.get_text("\n")
    # Нормализуем пробелы
    text = re.sub(r"\n{2,}", "\n\n", text)
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Не удалось извлечь текст со страницы")

    # Готовим безопасное имя файла
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        host = (parsed.netloc or 'site').replace(':', '_').replace('.', '_')
    except Exception:
        host = 'site'

    # Генерируем красивое имя файла как у обычных документов
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    import hashlib
    content_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()[:6]
    safe_name = f"информация с сайта — {host} {timestamp}_{content_hash}.md"

    # Получаем S3 сервис
    s3_service = get_s3_service()
    content_bytes = text.encode('utf-8')
    size = len(content_bytes)

    try:
        if s3_service:
            # Загружаем в S3 (как обычные документы)
            object_key = f"users/{current_user.id}/documents/{safe_name}"

            # Добавляем метаданные
            metadata = {
                'user-id': str(current_user.id),
                'original-url': url,
                'upload-time': datetime.now().isoformat(),
                'source': 'website-import'
            }

            upload_result = s3_service.upload_file(
                file_content=content_bytes,
                object_key=object_key,
                content_type='text/markdown',
                metadata=metadata
            )

            if not upload_result.get('success'):
                raise Exception(f"S3 upload failed: {upload_result.get('error')}")

            logger.info(f"Website content uploaded to S3: {object_key} by user {current_user.id}")

        else:
            # Fallback: сохраняем локально
            upload_dir = os.path.join("uploads", str(current_user.id))
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, safe_name)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(text)
            logger.info(f"Website content uploaded locally: {file_path} by user {current_user.id}")

        doc = crud.create_document(db, current_user.id, safe_name, size)

        # Индексация для ассистента, если указан
        target_assistant_id = None
        if assistant_id is not None:
            assistant = db.query(models.Assistant).filter(
                models.Assistant.id == int(assistant_id),
                models.Assistant.user_id == current_user.id
            ).first()
            if not assistant:
                raise HTTPException(status_code=404, detail="Assistant not found")
            target_assistant_id = assistant.id

        if target_assistant_id is not None:
            try:
                embeddings_service.index_document(
                    doc_id=doc.id,
                    user_id=current_user.id,
                    assistant_id=target_assistant_id,
                    text=text,
                    doc_type='website',
                    importance=10,
                    db=db
                )
            except Exception as e:
                logger.warning(f"Embedding index failed for website doc_id={doc.id}: {e}")

        # Списание средств
        try:
            balance_service.charge_for_service(current_user.id, "document_upload", f"Импорт сайта {host}")
        except Exception as e:
            logger.error(f"Charge failed after website import: {e}")

        return doc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Website import failed: {e}")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка импорта сайта")

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """
    Улучшенное удаление документа с полной очисткой всех связанных данных
    """
    from utils.bot_cleanup import enhanced_document_deletion
    
    try:
        success = enhanced_document_deletion(doc_id, current_user.id, db)
        
        if success:
            logger.info(f"[DELETE_DOCUMENT] ✅ Document {doc_id} completely deleted with full cleanup")
            return {"ok": True}
        else:
            raise HTTPException(status_code=404, detail="Document not found or deletion failed")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DELETE_DOCUMENT] Error: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при удалении документа. Попробуйте позже.")

@router.get("/documents/{doc_id}/text")
def get_document_text(doc_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # Извлекаем текст из документа (функция автоматически выберет S3 или локальное хранилище)
        text = extract_document_text(doc.id, current_user, doc.filename)
        if not text:
            raise HTTPException(status_code=404, detail="File not found or empty")
        return {"text": text}
    except Exception as e:
        logger.error(f"Error getting document text for doc_id={doc_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка чтения файла: {e}")


@router.get("/documents/{doc_id}/summary")
def get_document_summary(doc_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Возвращает выжимку документа из БД; при отсутствии — генерирует и сохраняет."""
    # Проверяем владение документом
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Ищем сохраненную выжимку
    existing = db.query(models.UserKnowledge).filter(
        models.UserKnowledge.doc_id == doc_id,
        models.UserKnowledge.user_id == current_user.id,
        models.UserKnowledge.type == 'summary'
    ).first()

    if existing:
        try:
            content = json.loads(existing.content)
        except Exception:
            content = existing.content
        return {"summaries": content, "doc_type": existing.doc_type}

    # Если нет — генерируем и сохраняем
    try:
        result = analyze_document_internal(doc_id, current_user, db)
        summaries = result.get("summaries", [])
        doc_type = result.get("doc_type")

        try:
            knowledge = models.UserKnowledge(
                user_id=current_user.id,
                assistant_id=None,  # глобальная выжимка, не привязана к ассистенту
                doc_id=doc_id,
                content=json.dumps(summaries),
                type='summary',
                doc_type=doc_type,
                importance=10
            )
            db.add(knowledge)
            db.commit()
        except Exception:
            db.rollback()
        return {"summaries": summaries, "doc_type": doc_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {e}")

def analyze_document_internal(doc_id: int, current_user: models.User, db: Session):
    """Внутренняя функция анализа документа для автоматической индексации"""
    print(f"[analyze_document_internal] Analyzing doc_id={doc_id} for user {current_user.id}")
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        print(f"[analyze_document_internal] Document not found in DB for user_id={current_user.id}, doc_id={doc_id}")
        raise Exception("Document not found")
    
    # Используем новый пул токенов вместо персональных токенов
    from ai.ai_token_manager import ai_token_manager
    
    # --- Извлечение текста ---
    try:
        text = extract_document_text(doc_id, current_user, doc.filename)
        if not text:
            raise Exception("Failed to extract text from document")
    except Exception as e:
        print(f"[analyze_document_internal] Ошибка извлечения текста: {e}")
        raise Exception(f"Ошибка извлечения текста: {e}")
    
    # Определяем оптимальный размер чанка для gpt-4o (16384 токена)
    # Приблизительно 1 токен = 4 символа, оставляем место для промпта и ответа
    total_length = len(text)
    if total_length < 40000:
        chunk_size = total_length  # Обрабатываем целиком документы до 40KB для максимальной детализации
    elif total_length < 120000:
        chunk_size = 30000  # Увеличиваем чанки для сохранения контекста и деталей
    else:
        chunk_size = 20000   # Для очень больших документов тоже большие чанки
    
    # Разбиваем текст на чанки
    chunks = []
    current_pos = 0
    while current_pos < len(text):
        # Находим конец предложения или абзаца для более естественного разделения
        end_pos = min(current_pos + chunk_size, len(text))
        if end_pos < len(text):
            # Ищем ближайший конец предложения или абзаца
            for separator in ['\n\n', '\n', '. ', '! ', '? ']:
                last_separator = text.rfind(separator, current_pos, end_pos)
                if last_separator > current_pos + chunk_size // 2:  # Берем только если разделитель не в начале чанка
                    end_pos = last_separator + len(separator)
                    break
        
        chunks.append(text[current_pos:end_pos])
        current_pos = end_pos
    
    summaries = []
    
    # Определяем тип документа для лучшего анализа
    doc_type_prompt = f"Определи тип документа (инструкция, регламент, справочник, статья и т.д.) и его основную тему. Текст документа начинается с: {text[:500]}..."
    try:
        doc_type_response = ai_token_manager.make_openai_request(
            messages=[
                {"role": "system", "content": "Ты эксперт по анализу документов. Определи тип и тему документа."},
                {"role": "user", "content": doc_type_prompt}
            ],
            model="gpt-4o",
            user_id=current_user.id,
            assistant_id=None
        )
        doc_type = doc_type_response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[analyze_document_internal] Ошибка определения типа документа: {e}")
        doc_type = "Неизвестный тип документа"
    
    # Анализируем каждый чанк с учетом типа документа
    for idx, chunk in enumerate(chunks):
        prompt = f"""
Проанализируй следующий фрагмент документа типа "{doc_type}" и ОБЯЗАТЕЛЬНО выдели ВСЕ важные детали:

1. КЛЮЧЕВЫЕ ФАКТЫ (с сохранением ВСЕХ деталей):
   - Названия компаний, организаций, продуктов
   - Даты, цифры, статистика
   - Контактная информация (email, телефоны, адреса)
   - Время работы, часы, расписания

2. УСЛУГИ И ПРОДУКТЫ (с ПОЛНЫМИ названиями):
   - Точные названия курсов, программ, услуг
   - Специализации и направления
   - Особенности и уникальные предложения

3. FAQ И ВОПРОСЫ (сохрани содержание):
   - Вопросы и ответы полностью
   - Правила и условия
   - Инструкции пользователям

4. ФУНКЦИИ И ЗАДАЧИ (если есть):
   - Что умеет делать система/бот
   - Возможности и ограничения

6. 💰 ЦЕНЫ И ТАРИФЫ (КРИТИЧЕСКИ ВАЖНО - извлеки ВСЕ ценовые данные):
   - Стоимость услуг (включая цены с пометками "???", "неизвестно", "~", "примерно")
   - Планы и пакеты
   - Скидки и акции
   - ОСОБО ВАЖНО: если цена указана как "???", "неопределено", "~", "примерно" - ОБЯЗАТЕЛЬНО сохрани эту неопределенность

7. 🚨 ПРОБЛЕМЫ И ЖАЛОБЫ КЛИЕНТОВ (НОВЫЙ РАЗДЕЛ - обязательно извлекай):
   - Жалобы на качество сервиса ("не перезвонили", "не работает", "проблемы")
   - Негативные отзывы и комментарии
   - Упоминания о проблемах с менеджерами, поддержкой
   - Любые фразы типа: "обещали, но...", "сказали, что будет, но...", "до сих пор нет"
   - Сарказм и ирония в тексте

8. 📝 ОСОБЕННОСТИ ДОКУМЕНТА:
   - Стиль документа (официальный, юмористический, сатира)
   - Полнота информации (есть ли пропуски, неточности)
   - Качество контактных данных
   - Противоречия в информации

9. 🔍 НЕОПРЕДЕЛЕННОСТИ И СПЕЦСИМВОЛЫ (НОВЫЙ РАЗДЕЛ):
   - Все упоминания "???", "неизвестно", "ХЗ", "~", "примерно"
   - Противоречивая информация (разные даты, цифры)
   - Недостающие данные с пометками
   - Эмодзи с неопределенным значением (🤷‍♂️, 🤔)

КРИТИЧЕСКИ ВАЖНО:
- НЕ обобщай и НЕ пропускай конкретные детали!
- Сохрани ВСЕ упомянутые email адреса точно как написано, отметь некорректные
- Сохрани ВСЕ телефонные номера полностью, включая неполные
- Сохрани ВСЕ названия курсов и услуг дословно
- Сохрани ВСЕ FAQ вопросы и ответы целиком
- ОБЯЗАТЕЛЬНО извлекай жалобы и проблемы клиентов
- ОБЯЗАТЕЛЬНО сохраняй неопределенности в ценах и данных
- Если информация неполная, юмористическая или содержит проблемы - четко укажи это

Текст фрагмента:
{chunk}

Создай структурированную выжимку для AI-ассистента, сохранив ВСЕ конкретные данные, проблемы клиентов и неопределенности.
"""
        try:
            response = ai_token_manager.make_openai_request(
                messages=[
                    {"role": "system", "content": "Ты эксперт по анализу документов и извлечению знаний. КРИТИЧЕСКИ ВАЖНО: сохраняй ВСЕ конкретные детали - email адреса, телефоны, названия, цены, даты. НЕ обобщай и НЕ пропускай детали! ОСОБО ВАЖНО: извлекай жалобы клиентов, проблемы сервиса, неопределенности в ценах (???, ~, примерно). Твоя задача - создать ПОЛНУЮ структурированную выжимку из документа, включая негативную информацию и проблемы, которая будет использоваться AI-ассистентом для честных ответов пользователям."},
                    {"role": "user", "content": prompt}
                ],
                model="gpt-4o",  # Используем модель с большим контекстом для анализа документов
                user_id=current_user.id,
                assistant_id=None,
                temperature=0.05  # Еще более низкая температура для максимальной точности извлечения
            )
            summary = response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[analyze_document_internal] Ошибка анализа чанка {idx+1}: {e}")
            summary = f"[Ошибка анализа: {e}]"
        
        summaries.append({"chunk": idx+1, "summary": summary})
    
    # Создаем общее резюме документа
    if len(chunks) > 1:
        try:
            all_summaries = "\n\n".join([s["summary"] for s in summaries])
            final_prompt = f"""
На основе всех выжимок из документа типа "{doc_type}", создай единое краткое резюме всего документа:

{all_summaries}

Создай краткое резюме, которое объединяет ключевые моменты всего документа.
"""
            final_response = ai_token_manager.make_openai_request(
                messages=[
                    {"role": "system", "content": "Ты эксперт по анализу документов. Создай единое резюме документа на основе выжимок из его частей."},
                    {"role": "user", "content": final_prompt}
                ],
                model="gpt-4o",
                user_id=current_user.id,
                assistant_id=None
            )
            document_summary = final_response.choices[0].message.content.strip()
            summaries.append({"chunk": 0, "summary": document_summary, "is_overall": True})
        except Exception as e:
            print(f"[analyze_document_internal] Ошибка создания общего резюме: {e}")
    
    print(f"[analyze_document_internal] Analysis complete for doc_id={doc_id}, user_id={current_user.id}")
    
    return {"summaries": summaries, "doc_type": doc_type}

@router.get("/documents/{doc_id}/summary-status")
def get_document_summary_status(doc_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Проверяет статус генерации выжимки документа."""
    # Проверяем владение документом
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id,
        models.Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Проверяем, есть ли уже сохраненная выжимка
    existing_summary = db.query(models.UserKnowledge).filter(
        models.UserKnowledge.doc_id == doc_id,
        models.UserKnowledge.user_id == current_user.id,
        models.UserKnowledge.type == 'summary'
    ).first()

    if existing_summary:
        return {
            "status": "completed",
            "has_summary": True,
            "created_at": existing_summary.created_at
        }
    else:
        return {
            "status": "processing",
            "has_summary": False,
            "created_at": None
        }

@router.post("/analyze-document/{doc_id}")
async def analyze_document(
    doc_id: int,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[analyze_document] User {current_user.id} ({current_user.email}) requests analysis for doc_id={doc_id}")
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        print(f"[analyze_document] Document not found in DB for user_id={current_user.id}, doc_id={doc_id}")
        raise HTTPException(status_code=404, detail="Document not found")
    
# Файл будет загружен из S3 или локального хранилища в функции extract_document_text
    # Используем новый пул токенов вместо персональных токенов
    from ai.ai_token_manager import ai_token_manager
    
    # --- Извлечение текста ---
    try:
        text = extract_document_text(doc_id, current_user, doc.filename)
        if not text:
            raise HTTPException(status_code=404, detail="Failed to extract text from document")
    except Exception as e:
        print(f"[analyze_document] Ошибка извлечения текста: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка извлечения текста: {e}")
    
    # Определяем оптимальный размер чанка для gpt-4o (16384 токена)
    # Приблизительно 1 токен = 4 символа, оставляем место для промпта и ответа
    total_length = len(text)
    if total_length < 40000:
        chunk_size = total_length  # Обрабатываем целиком документы до 40KB для максимальной детализации
    elif total_length < 120000:
        chunk_size = 30000  # Увеличиваем чанки для сохранения контекста и деталей
    else:
        chunk_size = 20000   # Для очень больших документов тоже большие чанки
    
    # Разбиваем текст на чанки
    chunks = []
    current_pos = 0
    while current_pos < len(text):
        # Находим конец предложения или абзаца для более естественного разделения
        end_pos = min(current_pos + chunk_size, len(text))
        if end_pos < len(text):
            # Ищем ближайший конец предложения или абзаца
            for separator in ['\n\n', '\n', '. ', '! ', '? ']:
                last_separator = text.rfind(separator, current_pos, end_pos)
                if last_separator > current_pos + chunk_size // 2:  # Берем только если разделитель не в начале чанка
                    end_pos = last_separator + len(separator)
                    break
        
        chunks.append(text[current_pos:end_pos])
        current_pos = end_pos
    
    summaries = []
    
    # Определяем тип документа для лучшего анализа
    doc_type_prompt = f"Определи тип документа (инструкция, регламент, справочник, статья и т.д.) и его основную тему. Текст документа начинается с: {text[:500]}..."
    try:
        doc_type_response = ai_token_manager.make_openai_request(
            messages=[
                {"role": "system", "content": "Ты эксперт по анализу документов. Определи тип и тему документа."},
                {"role": "user", "content": doc_type_prompt}
            ],
            model="gpt-4o",
            user_id=current_user.id,
            assistant_id=None
        )
        doc_type = doc_type_response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[analyze_document] Ошибка определения типа документа: {e}")
        doc_type = "Неизвестный тип документа"
    
    # Анализируем каждый чанк с учетом типа документа
    for idx, chunk in enumerate(chunks):
        prompt = f"""
Проанализируй следующий фрагмент документа типа "{doc_type}" и ОБЯЗАТЕЛЬНО выдели ВСЕ важные детали:

1. КЛЮЧЕВЫЕ ФАКТЫ (с сохранением ВСЕХ деталей):
   - Названия компаний, организаций, продуктов
   - Даты, цифры, статистика
   - Контактная информация (email, телефоны, адреса)
   - Время работы, часы, расписания

2. УСЛУГИ И ПРОДУКТЫ (с ПОЛНЫМИ названиями):
   - Точные названия курсов, программ, услуг
   - Специализации и направления
   - Особенности и уникальные предложения

3. FAQ И ВОПРОСЫ (сохрани содержание):
   - Вопросы и ответы полностью
   - Правила и условия
   - Инструкции пользователям

4. ФУНКЦИИ И ЗАДАЧИ (если есть):
   - Что умеет делать система/бот
   - Возможности и ограничения

6. 💰 ЦЕНЫ И ТАРИФЫ (КРИТИЧЕСКИ ВАЖНО - извлеки ВСЕ ценовые данные):
   - Стоимость услуг (включая цены с пометками "???", "неизвестно", "~", "примерно")
   - Планы и пакеты
   - Скидки и акции
   - ОСОБО ВАЖНО: если цена указана как "???", "неопределено", "~", "примерно" - ОБЯЗАТЕЛЬНО сохрани эту неопределенность

7. 🚨 ПРОБЛЕМЫ И ЖАЛОБЫ КЛИЕНТОВ (НОВЫЙ РАЗДЕЛ - обязательно извлекай):
   - Жалобы на качество сервиса ("не перезвонили", "не работает", "проблемы")
   - Негативные отзывы и комментарии
   - Упоминания о проблемах с менеджерами, поддержкой
   - Любые фразы типа: "обещали, но...", "сказали, что будет, но...", "до сих пор нет"
   - Сарказм и ирония в тексте

8. 📝 ОСОБЕННОСТИ ДОКУМЕНТА:
   - Стиль документа (официальный, юмористический, сатира)
   - Полнота информации (есть ли пропуски, неточности)
   - Качество контактных данных
   - Противоречия в информации

9. 🔍 НЕОПРЕДЕЛЕННОСТИ И СПЕЦСИМВОЛЫ (НОВЫЙ РАЗДЕЛ):
   - Все упоминания "???", "неизвестно", "ХЗ", "~", "примерно"
   - Противоречивая информация (разные даты, цифры)
   - Недостающие данные с пометками
   - Эмодзи с неопределенным значением (🤷‍♂️, 🤔)

КРИТИЧЕСКИ ВАЖНО:
- НЕ обобщай и НЕ пропускай конкретные детали!
- Сохрани ВСЕ упомянутые email адреса точно как написано, отметь некорректные
- Сохрани ВСЕ телефонные номера полностью, включая неполные
- Сохрани ВСЕ названия курсов и услуг дословно
- Сохрани ВСЕ FAQ вопросы и ответы целиком
- ОБЯЗАТЕЛЬНО извлекай жалобы и проблемы клиентов
- ОБЯЗАТЕЛЬНО сохраняй неопределенности в ценах и данных
- Если информация неполная, юмористическая или содержит проблемы - четко укажи это

Текст фрагмента:
{chunk}

Создай структурированную выжимку для AI-ассистента, сохранив ВСЕ конкретные данные, проблемы клиентов и неопределенности.
"""
        try:
            response = ai_token_manager.make_openai_request(
                messages=[
                    {"role": "system", "content": "Ты эксперт по анализу документов и извлечению знаний. КРИТИЧЕСКИ ВАЖНО: сохраняй ВСЕ конкретные детали - email адреса, телефоны, названия, цены, даты. НЕ обобщай и НЕ пропускай детали! ОСОБО ВАЖНО: извлекай жалобы клиентов, проблемы сервиса, неопределенности в ценах (???, ~, примерно). Твоя задача - создать ПОЛНУЮ структурированную выжимку из документа, включая негативную информацию и проблемы, которая будет использоваться AI-ассистентом для честных ответов пользователям."},
                    {"role": "user", "content": prompt}
                ],
                model="gpt-4o",  # Используем модель с большим контекстом для анализа документов
                user_id=current_user.id,
                assistant_id=None,
                temperature=0.05  # Еще более низкая температура для максимальной точности извлечения
            )
            summary = response.choices[0].message.content.strip()
        except Exception as e:
            print(f"[analyze_document] Ошибка анализа чанка {idx+1}: {e}")
            summary = f"[Ошибка анализа: {e}]"
        
        summaries.append({"chunk": idx+1, "summary": summary})
    
    # Создаем общее резюме документа
    if len(chunks) > 1:
        try:
            all_summaries = "\n\n".join([s["summary"] for s in summaries])
            final_prompt = f"""
На основе всех выжимок из документа типа "{doc_type}", создай единое краткое резюме всего документа:

{all_summaries}

Создай краткое резюме, которое объединяет ключевые моменты всего документа.
"""
            final_response = ai_token_manager.make_openai_request(
                messages=[
                    {"role": "system", "content": "Ты эксперт по анализу документов. Создай единое резюме документа на основе выжимок из его частей."},
                    {"role": "user", "content": final_prompt}
                ],
                model="gpt-4o",
                user_id=current_user.id,
                assistant_id=None
            )
            document_summary = final_response.choices[0].message.content.strip()
            summaries.append({"chunk": 0, "summary": document_summary, "is_overall": True})
        except Exception as e:
            print(f"[analyze_document] Ошибка создания общего резюме: {e}")
    
    print(f"[analyze_document] Analysis complete for doc_id={doc_id}, user_id={current_user.id}")
    
    # 🔥 АВТОМАТИЧЕСКАЯ горячая перезагрузка ботов после анализа документа
    # (на случай если в документе есть новая информация для ботов)
    assistants = db.query(models.Assistant).filter(models.Assistant.user_id == current_user.id).all()
    print(f"[analyze_document] Автоматическая перезагрузка {len(assistants)} ассистентов после анализа документа")
    for assistant in assistants:
        hot_reload_assistant_bots(assistant.id, db)
    
    return {"summaries": summaries, "doc_type": doc_type}

# --- Knowledge Management ---

class KnowledgeIn(BaseModel):
    doc_id: int
    content: str
    type: str  # 'summary' или 'original'
    doc_type: Optional[str] = None
    importance: Optional[int] = 10
    assistant_id: Optional[int] = None  # Добавляем assistant_id

@router.post("/knowledge/confirm")
def confirm_knowledge(data: KnowledgeIn, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    # Проверить, что документ принадлежит пользователю
    doc = db.query(models.Document).filter(models.Document.id == data.doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Добавить знание
    knowledge = models.UserKnowledge(
        user_id=current_user.id,
        assistant_id=data.assistant_id,  # Привязываем к конкретному ассистенту
        doc_id=data.doc_id,
        content=data.content,
        type=data.type,
        doc_type=data.doc_type,
        importance=data.importance or 10
    )
    db.add(knowledge)
    db.commit()
    db.refresh(knowledge)
    
    # Инвалидируем кэш знаний
    invalidate_knowledge_cache(current_user.id, data.assistant_id)

    # Индексируем подтвержденное знание как отдельный источник (incremental)
    try:
        if background_tasks is not None:
            background_tasks.add_task(
                _background_index_document,
                knowledge.doc_id,
                current_user.id,
                data.assistant_id,
                knowledge.content,
                data.doc_type or 'confirmed_knowledge',
                data.importance or 10,
            )
        else:
            from services.embeddings_service import embeddings_service
            embeddings_service.index_document(
                doc_id=knowledge.doc_id,
                user_id=current_user.id,
                assistant_id=data.assistant_id,
                text=knowledge.content,
                doc_type=data.doc_type or 'confirmed_knowledge',
                importance=data.importance or 10,
                db=db,
            )
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"[CONFIRM_KNOWLEDGE] indexing failed: {e}")

    # Увеличиваем версию знаний ассистента(ов), чтобы кэш ответов перестал совпадать
    try:
        from services.embeddings_service import embeddings_service
        if data.assistant_id:
            embeddings_service.increment_knowledge_version(data.assistant_id, db)
        else:
            assistants = db.query(models.Assistant).filter(models.Assistant.user_id == current_user.id).all()
            for assistant in assistants:
                embeddings_service.increment_knowledge_version(assistant.id, db)
    except Exception as _e:
        logger = logging.getLogger(__name__)
        logger.warning(f"[CONFIRM_KNOWLEDGE] Failed to bump knowledge version: {_e}")
    
    # 🔥 ГОРЯЧАЯ перезагрузка настроек для конкретного ассистента или всех ассистентов
    print(f"[CONFIRM_KNOWLEDGE] Добавлено знание для пользователя {current_user.id}, ассистент {data.assistant_id}")
    if data.assistant_id:
        print(f"[CONFIRM_KNOWLEDGE] Перезагружаем ботов для ассистента {data.assistant_id}")
        hot_reload_assistant_bots(data.assistant_id, db)
    else:
        # Если знание общее - перезагружаем всех ассистентов пользователя
        assistants = db.query(models.Assistant).filter(models.Assistant.user_id == current_user.id).all()
        print(f"[CONFIRM_KNOWLEDGE] Перезагружаем ботов для {len(assistants)} ассистентов пользователя")
        for assistant in assistants:
            hot_reload_assistant_bots(assistant.id, db)
    
    return {"ok": True, "id": knowledge.id}

@router.get("/knowledge/confirmed")
def get_confirmed_knowledge(
    assistant_id: int = Query(None),
    page: int = Query(1, ge=1, description="Номер страницы"),
    limit: int = Query(50, ge=1, le=100, description="Количество записей на странице"),
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    """Получение подтвержденных знаний с пагинацией и эффективными запросами"""
    
    # Базовый запрос с EAGER LOADING для избежания N+1
    query = db.query(models.UserKnowledge).options(
        joinedload(models.UserKnowledge.document)
    ).filter(models.UserKnowledge.user_id == current_user.id)
    
    # Фильтрация по ассистенту
    if assistant_id:
        # Убеждаемся, что ассистент принадлежит пользователю
        assistant = db.query(models.Assistant).filter(
            models.Assistant.id == assistant_id,
            models.Assistant.user_id == current_user.id
        ).first()
        if not assistant:
            raise HTTPException(status_code=404, detail="Assistant not found")
        
        query = query.filter(models.UserKnowledge.assistant_id == assistant_id)
    
    # Подсчет общего количества
    total = query.count()
    
    # Пагинация
    offset = (page - 1) * limit
    entries = query.order_by(models.UserKnowledge.id.desc()).offset(offset).limit(limit).all()
    
    items = []
    for entry in entries:
        try:
            content = json.loads(entry.content) if entry.type == 'summary' else entry.content
        except Exception:
            content = entry.content
        items.append({
            'id': entry.id,  # Добавляем ID из таблицы UserKnowledge
            'doc_id': entry.doc_id,
            'type': entry.type,
            'content': content,
            'doc_type': entry.doc_type,
            'importance': entry.importance,
            'last_used': entry.last_used.isoformat() if entry.last_used else None,
            'usage_count': entry.usage_count,
            'assistant_id': entry.assistant_id  # Добавляем assistant_id
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "limit": limit
    }

@router.put("/knowledge/{knowledge_id}")
def update_knowledge(knowledge_id: int, data: KnowledgeIn, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db), background_tasks: BackgroundTasks = None):
    # Проверяем, что знание принадлежит пользователю
    knowledge = db.query(models.UserKnowledge).filter(
        models.UserKnowledge.id == knowledge_id,
        models.UserKnowledge.user_id == current_user.id
    ).first()
    
    if not knowledge:
        raise HTTPException(status_code=404, detail="Knowledge not found")
    
    # Обновляем знание
    knowledge.content = data.content
    knowledge.type = data.type
    knowledge.doc_type = data.doc_type or knowledge.doc_type
    knowledge.importance = data.importance or knowledge.importance
    knowledge.assistant_id = data.assistant_id
    
    db.commit()
    
    # Инвалидируем кэш знаний
    invalidate_knowledge_cache(current_user.id, knowledge.assistant_id)

    # Фоновая переиндексация обновленного знания
    try:
        if background_tasks is not None:
            background_tasks.add_task(
                _background_index_document,
                knowledge.doc_id,
                current_user.id,
                knowledge.assistant_id,
                knowledge.content,
                knowledge.doc_type or 'confirmed_knowledge',
                knowledge.importance or 10,
            )
        else:
            from services.embeddings_service import embeddings_service
            # Перед индексацией удалим старые confirmed_knowledge embeddings по этому doc_id
            try:
                db.query(models.KnowledgeEmbedding).filter(
                    models.KnowledgeEmbedding.doc_id == knowledge.doc_id,
                    models.KnowledgeEmbedding.source == 'confirmed_knowledge'
                ).delete(synchronize_session=False)
                db.commit()
            except Exception:
                db.rollback()
            embeddings_service.index_document(
                doc_id=knowledge.doc_id,
                user_id=current_user.id,
                assistant_id=knowledge.assistant_id,
                text=knowledge.content,
                doc_type=knowledge.doc_type or 'confirmed_knowledge',
                importance=knowledge.importance or 10,
                db=db,
            )
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.warning(f"[UPDATE_KNOWLEDGE] indexing failed: {e}")

    # Увеличиваем версию знаний ассистента(ов)
    try:
        from services.embeddings_service import embeddings_service
        if knowledge.assistant_id:
            embeddings_service.increment_knowledge_version(knowledge.assistant_id, db)
        else:
            assistants = db.query(models.Assistant).filter(models.Assistant.user_id == current_user.id).all()
            for assistant in assistants:
                embeddings_service.increment_knowledge_version(assistant.id, db)
    except Exception as _e:
        logger = logging.getLogger(__name__)
        logger.warning(f"[UPDATE_KNOWLEDGE] Failed to bump knowledge version: {_e}")
    
    # 🔥 ГОРЯЧАЯ перезагрузка настроек для конкретного ассистента или всех ассистентов
    if knowledge.assistant_id:
        hot_reload_assistant_bots(knowledge.assistant_id, db)
    else:
        # Если знание общее - перезагружаем всех ассистентов пользователя
        assistants = db.query(models.Assistant).filter(models.Assistant.user_id == current_user.id).all()
        for assistant in assistants:
            hot_reload_assistant_bots(assistant.id, db)
    
    return {"ok": True}

@router.delete("/knowledge/{knowledge_id}")
def delete_knowledge(knowledge_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """
    Улучшенное удаление записи знаний с полной очисткой всех связанных данных
    """
    from utils.bot_cleanup import enhanced_knowledge_deletion
    
    try:
        success = enhanced_knowledge_deletion(knowledge_id, current_user.id, db)
        
        if success:
            logger.info(f"[DELETE_KNOWLEDGE] ✅ Knowledge {knowledge_id} completely deleted with full cleanup")
            # Бамп версии знаний ассистента(ов) после удаления
            try:
                from services.embeddings_service import embeddings_service
                # Пытаемся найти ассистента этой записи (она уже удалена, поэтому берём из логики enhanced_knowledge_deletion не получится)
                # В качестве безопасного варианта — инкремент для всех ассистентов пользователя
                assistants = db.query(models.Assistant).filter(models.Assistant.user_id == current_user.id).all()
                for assistant in assistants:
                    embeddings_service.increment_knowledge_version(assistant.id, db)
            except Exception as _e:
                logger.warning(f"[DELETE_KNOWLEDGE] Failed to bump knowledge version: {_e}")

            # Очистка embeddings источника confirmed_knowledge для документов, где не осталось подтвержденных знаний
            try:
                # Находим doc_id без оставшихся подтвержденных знаний
                subq = db.query(models.UserKnowledge.doc_id).filter(
                    models.UserKnowledge.user_id == current_user.id
                ).subquery()
                deleted = db.query(models.KnowledgeEmbedding).filter(
                    ~models.KnowledgeEmbedding.doc_id.in_(subq),
                    models.KnowledgeEmbedding.source == 'confirmed_knowledge'
                ).delete(synchronize_session=False)
                db.commit()
                logger.info(f"[DELETE_KNOWLEDGE] cleaned {deleted} orphan confirmed_knowledge embeddings")
            except Exception as _e:
                db.rollback()
                logger.warning(f"[DELETE_KNOWLEDGE] embeddings cleanup failed: {_e}")
            return {"ok": True}
        else:
            raise HTTPException(status_code=404, detail="Knowledge not found or deletion failed")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DELETE_KNOWLEDGE] Error: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при удалении знаний. Попробуйте позже.")

@router.get("/knowledge/stats")
def get_knowledge_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Получаем статистику по базе знаний пользователя
    knowledge_count = db.query(models.UserKnowledge).filter(
        models.UserKnowledge.user_id == current_user.id
    ).count()
    
    # Получаем наиболее часто используемые документы
    most_used = db.query(
        models.UserKnowledge,
        models.Document.filename
    ).join(
        models.Document, 
        models.UserKnowledge.doc_id == models.Document.id
    ).filter(
        models.UserKnowledge.user_id == current_user.id
    ).order_by(
        models.UserKnowledge.usage_count.desc()
    ).limit(5).all()
    
    top_docs = []
    for k, filename in most_used:
        top_docs.append({
            "id": k.id,
            "doc_id": k.doc_id,
            "filename": filename,
            "doc_type": k.doc_type,
            "usage_count": k.usage_count,
            "last_used": k.last_used.isoformat() if k.last_used else None,
            "importance": k.importance
        })
    
    # Получаем типы документов и их количество
    doc_types = db.query(
        models.UserKnowledge.doc_type,
        func.count(models.UserKnowledge.id).label('count')
    ).filter(
        models.UserKnowledge.user_id == current_user.id
    ).group_by(
        models.UserKnowledge.doc_type
    ).all()
    
    types_count = {}
    for doc_type, count in doc_types:
        types_count[doc_type or 'Неизвестный'] = count
    
    return {
        "total_documents": knowledge_count,
        "most_used": top_docs,
        "document_types": types_count,
        "total_content_length": sum(len(k.content or '') for k, _ in most_used),
        "avg_importance": sum(k.importance or 0 for k, _ in most_used) / len(most_used) if most_used else 0
    }

@router.post("/knowledge/track-usage")
def track_document_usage(
    used_docs: List[str] = Body(..., description="Список использованных документов по содержимому"),
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    """Отслеживает использование документов в ответах AI"""
    if not used_docs:
        return {"message": "Нет документов для отслеживания"}
    
    updated_count = 0
    
    for doc_content in used_docs:
        # Ищем документ по содержимому (частичное совпадение)
        knowledge_entries = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.user_id == current_user.id
        ).all()
        
        for entry in knowledge_entries:
            # Проверяем, содержится ли контент этого документа в использованном тексте
            # Или наоборот - содержится ли использованный текст в документе
            if (entry.content in doc_content or doc_content in entry.content):
                # Обновляем статистику
                entry.usage_count = (entry.usage_count or 0) + 1
                entry.last_used = datetime.utcnow()
                updated_count += 1
                break
    
    db.commit()
    
    return {
        "message": f"Обновлена статистика для {updated_count} документов",
        "updated_count": updated_count
    }