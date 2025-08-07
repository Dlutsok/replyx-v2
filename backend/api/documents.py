from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File
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

logger = logging.getLogger(__name__)

router = APIRouter()

# get_db импортируется из database.connection

# Helper functions to avoid circular imports
def invalidate_knowledge_cache(user_id: int, assistant_id: int):
    """Wrapper для инвалидации кэша знаний"""
    try:
        import chatai_cache
        chatai_cache.invalidate_knowledge_cache(user_id, assistant_id)
    except ImportError:
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

def extract_document_text(doc_id: int, current_user: models.User, file_path: str) -> str:
    """Извлекает текст из документа в зависимости от его типа"""
    file_extension = os.path.splitext(file_path)[1].lower()
    text = ""
    
    try:
        if file_extension == '.pdf':
            import PyPDF2
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                for page_num in range(len(pdf_reader.pages)):
                    text += pdf_reader.pages[page_num].extract_text() + "\n"
        
        elif file_extension == '.docx':
            from docx import Document as DocxDoc
            docx = DocxDoc(file_path)
            text = '\n'.join([p.text for p in docx.paragraphs])
        
        elif file_extension == '.doc':
            # Для .doc файлов простое чтение как текстового файла
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        
        else:
            # Для .txt и других текстовых файлов
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        
        return text.strip()
        
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
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
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    """Получение документов пользователя с пагинацией и кэшированием"""
    
    # Подсчет общего количества
    total = db.query(models.Document).filter(models.Document.user_id == current_user.id).count()
    
    # Пагинация с эффективной загрузкой
    offset = (page - 1) * limit
    documents = db.query(models.Document).filter(
        models.Document.user_id == current_user.id
    ).order_by(models.Document.upload_date.desc()).offset(offset).limit(limit).all()
    
    # Подготавливаем результат
    result = {
        "items": documents,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "limit": limit
    }
    
    return result

@router.post("/documents", response_model=schemas.DocumentRead)
@rate_limit_api(limit=10, window=300)  # 10 файлов за 5 минут
async def upload_document(file: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
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
    
    # Генерируем безопасное уникальное имя файла
    secure_filename = file_validator.generate_secure_filename(
        user_id=current_user.id,
        original_filename=safe_filename,
        content=content
    )
    
    # Получаем безопасный путь для сохранения
    file_path = file_validator.get_safe_upload_path(current_user.id, secure_filename)
    
    # Сохраняем файл
    try:
        with open(file_path, "wb") as f:
            f.write(content)
        
        logger.info(f"File uploaded successfully: {file_path} by user {current_user.id}")
        
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
        # Новый подход: создаем embeddings для lazy-retrieval без перезагрузки ботов
        try:
            logger.info(f"Starting automatic embedding indexing for doc_id={doc.id}, user_id={current_user.id}")
            
            # Извлекаем текст из документа
            text = extract_document_text(doc.id, current_user, file_path)
            
            # Определяем тип документа для лучшей обработки
            doc_type = determine_document_type(secure_filename)
            
            # Импортируем сервис embeddings
            from services.embeddings_service import embeddings_service
            
            # Получаем всех ассистентов пользователя
            assistants = db.query(models.Assistant).filter(models.Assistant.user_id == current_user.id).all()
            
            if assistants:
                # Индексируем документ для каждого ассистента (или можно без привязки к ассистенту)
                for assistant in assistants:
                    indexed_chunks = embeddings_service.index_document(
                        doc_id=doc.id,
                        user_id=current_user.id,
                        assistant_id=assistant.id,
                        text=text,
                        doc_type=doc_type,
                        importance=10,
                        db=db
                    )
                    
                    logger.info(f"Indexed {indexed_chunks} chunks for assistant {assistant.id}")
                
                logger.info(f"✅ Document indexed with embeddings for {len(assistants)} assistants - NO BOT RELOAD NEEDED!")
                
            else:
                # Если нет ассистентов, индексируем для пользователя без привязки к ассистенту
                indexed_chunks = embeddings_service.index_document(
                    doc_id=doc.id,
                    user_id=current_user.id,
                    assistant_id=None,  # Общие знания для всех ассистентов
                    text=text,
                    doc_type=doc_type,
                    importance=10,
                    db=db
                )
                
                logger.info(f"✅ Document indexed with {indexed_chunks} chunks as general knowledge")
                
        except Exception as e:
            logger.error(f"Failed to index document embeddings {doc.id}: {e}")
            # Не прерываем процесс загрузки, если индексация не удалась
            # Пользователь сможет переиндексировать позже
        
        return doc
        
    except Exception as e:
        logger.error(f"Error saving file {file_path}: {e}")
        # Удаляем файл если создание записи в БД не удалось
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="Ошибка сохранения файла")

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
        raise HTTPException(status_code=500, detail="Internal server error during document deletion")

@router.get("/documents/{doc_id}/text")
def get_document_text(doc_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Используем user_id для пути к файлу, как в upload_document
    file_path = os.path.join("uploads", str(current_user.id), doc.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Извлечение текста из файла
    text = ""
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.pdf':
        try:
            import PyPDF2
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                for page_num in range(len(pdf_reader.pages)):
                    text += pdf_reader.pages[page_num].extract_text() + "\n"
        except Exception as e:
            print(f"Ошибка чтения PDF: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка чтения PDF: {e}")
    elif file_extension == '.docx':
        try:
            from docx import Document as DocxDoc
            docx = DocxDoc(file_path)
            text = '\n'.join([p.text for p in docx.paragraphs])
        except Exception as e:
            print(f"Ошибка чтения .docx: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка чтения .docx: {e}")
    else:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            print(f"Ошибка чтения файла: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка чтения файла: {e}")
    
    return {"text": text}

def analyze_document_internal(doc_id: int, current_user: models.User, db: Session):
    """Внутренняя функция анализа документа для автоматической индексации"""
    print(f"[analyze_document_internal] Analyzing doc_id={doc_id} for user {current_user.id}")
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        print(f"[analyze_document_internal] Document not found in DB for user_id={current_user.id}, doc_id={doc_id}")
        raise Exception("Document not found")
    
    # Используем user_id для пути к файлу, как в upload_document
    file_path = os.path.join("uploads", str(current_user.id), doc.filename)
    if not os.path.exists(file_path):
        print(f"[analyze_document_internal] File not found: {file_path}")
        raise Exception("File not found")
    
    # Используем новый пул токенов вместо персональных токенов
    from ai.ai_token_manager import ai_token_manager
    
    # --- Извлечение текста ---
    text = ""
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.pdf':
        try:
            import PyPDF2
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                for page_num in range(len(pdf_reader.pages)):
                    text += pdf_reader.pages[page_num].extract_text() + "\n"
        except Exception as e:
            print(f"[analyze_document_internal] Ошибка чтения PDF: {e}")
            raise Exception(f"Ошибка чтения PDF: {e}")
    elif file_extension == '.docx':
        try:
            from docx import Document as DocxDoc
            docx = DocxDoc(file_path)
            text = '\n'.join([p.text for p in docx.paragraphs])
        except Exception as e:
            print(f"[analyze_document_internal] Ошибка чтения .docx: {e}")
            raise Exception(f"Ошибка чтения .docx: {e}")
    elif file_extension == '.doc':
        try:
            # Для .doc файлов можно использовать textract или другие библиотеки
            # Здесь простое чтение как текстового файла
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            print(f"[analyze_document_internal] Ошибка чтения .doc: {e}")
            raise Exception(f"Ошибка чтения .doc: {e}")
    else:
        # Для .txt и других текстовых файлов
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            print(f"[analyze_document_internal] Ошибка чтения файла: {e}")
            raise Exception(f"Ошибка чтения файла: {e}")
    
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

@router.post("/analyze-document/{doc_id}")
def analyze_document(doc_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    print(f"[analyze_document] User {current_user.id} ({current_user.email}) requests analysis for doc_id={doc_id}")
    doc = db.query(models.Document).filter(models.Document.id == doc_id, models.Document.user_id == current_user.id).first()
    if not doc:
        print(f"[analyze_document] Document not found in DB for user_id={current_user.id}, doc_id={doc_id}")
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Используем user_id для пути к файлу, как в upload_document
    file_path = os.path.join("uploads", str(current_user.id), doc.filename)
    if not os.path.exists(file_path):
        print(f"[analyze_document] File not found: {file_path}")
        print(f"[analyze_document] Critical error in initialization: 404: File not found")
        raise HTTPException(status_code=404, detail="File not found")
    # Используем новый пул токенов вместо персональных токенов
    from ai.ai_token_manager import ai_token_manager
    
    # --- Извлечение текста ---
    text = ""
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension == '.pdf':
        try:
            import PyPDF2
            with open(file_path, 'rb') as pdf_file:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
                for page_num in range(len(pdf_reader.pages)):
                    text += pdf_reader.pages[page_num].extract_text() + "\n"
        except Exception as e:
            print(f"[analyze_document] Ошибка чтения PDF: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка чтения PDF: {e}")
    elif file_extension == '.docx':
        try:
            from docx import Document as DocxDoc
            docx = DocxDoc(file_path)
            text = '\n'.join([p.text for p in docx.paragraphs])
        except Exception as e:
            print(f"[analyze_document] Ошибка чтения .docx: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка чтения .docx: {e}")
    elif file_extension == '.doc':
        try:
            # Для .doc файлов можно использовать textract или другие библиотеки
            # Здесь простое чтение как текстового файла
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            print(f"[analyze_document] Ошибка чтения .doc: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка чтения .doc: {e}")
    else:
        # Для .txt и других текстовых файлов
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            print(f"[analyze_document] Ошибка чтения файла: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка чтения файла: {e}")
    
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
def confirm_knowledge(data: KnowledgeIn, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
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
def update_knowledge(knowledge_id: int, data: KnowledgeIn, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
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
            return {"ok": True}
        else:
            raise HTTPException(status_code=404, detail="Knowledge not found or deletion failed")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DELETE_KNOWLEDGE] Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during knowledge deletion")

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