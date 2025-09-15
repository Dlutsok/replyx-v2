from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime

from database.connection import get_db
from database.models import QAKnowledge, User
from database.schemas import QAKnowledgeCreate, QAKnowledgeUpdate, QAKnowledgeResponse
from core.auth import get_current_user

router = APIRouter(tags=["qa-knowledge"])


@router.get("/qa-knowledge", response_model=List[QAKnowledgeResponse])
async def get_qa_knowledge(
    assistant_id: Optional[int] = Query(None, description="ID ассистента для фильтрации"),
    category: Optional[str] = Query(None, description="Категория для фильтрации"),
    search: Optional[str] = Query(None, description="Поиск по вопросу или ответу"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить Q&A записи пользователя"""
    query = db.query(QAKnowledge).filter(QAKnowledge.user_id == current_user.id)
    
    if assistant_id is not None:
        query = query.filter(QAKnowledge.assistant_id == assistant_id)
    
    if category:
        query = query.filter(QAKnowledge.category == category)
    
    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.filter(
            and_(
                QAKnowledge.question.ilike(search_pattern) | 
                QAKnowledge.answer.ilike(search_pattern) |
                QAKnowledge.keywords.ilike(search_pattern)
            )
        )
    
    query = query.filter(QAKnowledge.is_active == True)
    query = query.order_by(QAKnowledge.importance.desc(), QAKnowledge.created_at.desc())
    
    return query.offset(skip).limit(limit).all()


@router.post("/qa-knowledge", response_model=QAKnowledgeResponse)
async def create_qa_knowledge(
    qa_data: QAKnowledgeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создать новую Q&A запись"""
    
    # Проверяем, что ассистент принадлежит пользователю
    if qa_data.assistant_id:
        from database.models import Assistant
        assistant = db.query(Assistant).filter(
            and_(
                Assistant.id == qa_data.assistant_id,
                Assistant.user_id == current_user.id
            )
        ).first()
        if not assistant:
            raise HTTPException(status_code=404, detail="Ассистент не найден")
    
    qa_knowledge = QAKnowledge(
        user_id=current_user.id,
        **qa_data.dict()
    )
    
    db.add(qa_knowledge)
    db.commit()
    db.refresh(qa_knowledge)
    
    # Автоматически индексируем Q&A в векторную базу данных
    try:
        from services.embeddings_service import embeddings_service
        text_to_index = f"Q: {qa_knowledge.question}\nA: {qa_knowledge.answer}"
        if qa_knowledge.keywords:
            text_to_index += f"\nКлючевые слова: {qa_knowledge.keywords}"
        
        embeddings_service.index_qa_knowledge(
            qa_id=qa_knowledge.id,
            user_id=qa_knowledge.user_id,
            assistant_id=qa_knowledge.assistant_id,
            question=qa_knowledge.question,
            answer=qa_knowledge.answer,
            importance=qa_knowledge.importance or 10,
            db=db
        )
        
        # Инкрементируем версию знаний ассистента
        if qa_knowledge.assistant_id:
            from database.models import Assistant
            assistant = db.query(Assistant).filter(Assistant.id == qa_knowledge.assistant_id).first()
            if assistant:
                assistant.knowledge_version = (assistant.knowledge_version or 0) + 1
                db.commit()
    except Exception as e:
        # Не прерываем выполнение, если индексация не удалась
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to index Q&A knowledge: {e}")
    
    return qa_knowledge


@router.get("/qa-knowledge/{qa_id}", response_model=QAKnowledgeResponse)
async def get_qa_knowledge_item(
    qa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить конкретную Q&A запись"""
    qa_knowledge = db.query(QAKnowledge).filter(
        and_(
            QAKnowledge.id == qa_id,
            QAKnowledge.user_id == current_user.id
        )
    ).first()
    
    if not qa_knowledge:
        raise HTTPException(status_code=404, detail="Q&A запись не найдена")
    
    return qa_knowledge


@router.put("/qa-knowledge/{qa_id}", response_model=QAKnowledgeResponse)
async def update_qa_knowledge(
    qa_id: int,
    qa_data: QAKnowledgeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновить Q&A запись"""
    qa_knowledge = db.query(QAKnowledge).filter(
        and_(
            QAKnowledge.id == qa_id,
            QAKnowledge.user_id == current_user.id
        )
    ).first()
    
    if not qa_knowledge:
        raise HTTPException(status_code=404, detail="Q&A запись не найдена")
    
    # Проверяем, что ассистент принадлежит пользователю
    if qa_data.assistant_id:
        from database.models import Assistant
        assistant = db.query(Assistant).filter(
            and_(
                Assistant.id == qa_data.assistant_id,
                Assistant.user_id == current_user.id
            )
        ).first()
        if not assistant:
            raise HTTPException(status_code=404, detail="Ассистент не найден")
    
    # Обновляем поля
    update_data = qa_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(qa_knowledge, field, value)
    
    qa_knowledge.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(qa_knowledge)
    
    # Переиндексируем Q&A в векторную базу данных
    try:
        from services.embeddings_service import embeddings_service
        text_to_index = f"Q: {qa_knowledge.question}\nA: {qa_knowledge.answer}"
        if qa_knowledge.keywords:
            text_to_index += f"\nКлючевые слова: {qa_knowledge.keywords}"
        
        # Сначала удаляем старые embeddings
        embeddings_service.delete_qa_embeddings(qa_knowledge.id, db)
        
        # Затем создаем новые
        embeddings_service.index_qa_knowledge(
            qa_id=qa_knowledge.id,
            user_id=qa_knowledge.user_id,
            assistant_id=qa_knowledge.assistant_id,
            question=qa_knowledge.question,
            answer=qa_knowledge.answer,
            importance=qa_knowledge.importance or 10,
            db=db
        )
        
        # Инкрементируем версию знаний ассистента
        if qa_knowledge.assistant_id:
            from database.models import Assistant
            assistant = db.query(Assistant).filter(Assistant.id == qa_knowledge.assistant_id).first()
            if assistant:
                assistant.knowledge_version = (assistant.knowledge_version or 0) + 1
                db.commit()
    except Exception as e:
        # Не прерываем выполнение, если индексация не удалась
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to reindex Q&A knowledge: {e}")
    
    return qa_knowledge


@router.delete("/qa-knowledge/{qa_id}")
async def delete_qa_knowledge(
    qa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Удалить Q&A запись (мягкое удаление)"""
    qa_knowledge = db.query(QAKnowledge).filter(
        and_(
            QAKnowledge.id == qa_id,
            QAKnowledge.user_id == current_user.id
        )
    ).first()
    
    if not qa_knowledge:
        raise HTTPException(status_code=404, detail="Q&A запись не найдена")
    
    qa_knowledge.is_active = False
    qa_knowledge.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Удаляем embeddings из индекса
    try:
        from services.embeddings_service import embeddings_service
        embeddings_service.delete_qa_embeddings(qa_knowledge.id, db)
        
        # Инкрементируем версию знаний ассистента
        if qa_knowledge.assistant_id:
            from database.models import Assistant
            assistant = db.query(Assistant).filter(Assistant.id == qa_knowledge.assistant_id).first()
            if assistant:
                assistant.knowledge_version = (assistant.knowledge_version or 0) + 1
                db.commit()
    except Exception as e:
        # Не прерываем выполнение, если удаление из индекса не удалось
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to delete Q&A embeddings: {e}")
    
    return {"message": "Q&A запись успешно удалена"}


@router.get("/qa-knowledge/categories/list")
async def get_qa_categories(
    assistant_id: Optional[int] = Query(None, description="ID ассистента для фильтрации"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить список всех категорий Q&A"""
    query = db.query(QAKnowledge.category).filter(
        and_(
            QAKnowledge.user_id == current_user.id,
            QAKnowledge.is_active == True,
            QAKnowledge.category.isnot(None)
        )
    )
    
    if assistant_id is not None:
        query = query.filter(QAKnowledge.assistant_id == assistant_id)
    
    categories = query.distinct().all()
    return [cat[0] for cat in categories if cat[0]]


@router.post("/qa-knowledge/{qa_id}/increment-usage")
async def increment_usage(
    qa_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Увеличить счетчик использования Q&A записи"""
    qa_knowledge = db.query(QAKnowledge).filter(
        and_(
            QAKnowledge.id == qa_id,
            QAKnowledge.user_id == current_user.id
        )
    ).first()
    
    if not qa_knowledge:
        raise HTTPException(status_code=404, detail="Q&A запись не найдена")
    
    qa_knowledge.usage_count += 1
    qa_knowledge.last_used = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Счетчик использования обновлен"}