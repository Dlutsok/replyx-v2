#!/usr/bin/env python3
"""
Скрипт для миграции существующих документов к ассистентам.
Привязывает документы без assistant_id к первому ассистенту пользователя.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import SessionLocal
from database import models
from services.embeddings_service import embeddings_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_documents_to_assistants():
    """Привязывает документы без ассистента к первому ассистенту пользователя"""
    db = SessionLocal()
    try:
        # Получаем всех пользователей
        users = db.query(models.User).all()
        
        for user in users:
            logger.info(f"Processing user {user.id}: {user.email}")
            
            # Получаем первого ассистента пользователя  
            first_assistant = db.query(models.Assistant).filter(
                models.Assistant.user_id == user.id,
                models.Assistant.is_active == True
            ).first()
            
            if not first_assistant:
                logger.warning(f"User {user.id} has no active assistants, skipping")
                continue
                
            logger.info(f"Using assistant {first_assistant.id}: {first_assistant.name}")
            
            # Находим документы без привязки к ассистентам
            documents_without_assistant = db.query(models.Document).filter(
                models.Document.user_id == user.id,
                ~db.query(models.UserKnowledge).filter(
                    models.UserKnowledge.doc_id == models.Document.id,
                    models.UserKnowledge.assistant_id.isnot(None)
                ).exists()
            ).all()
            
            logger.info(f"Found {len(documents_without_assistant)} documents without assistant binding")
            
            for doc in documents_without_assistant:
                try:
                    # Создаем запись в UserKnowledge
                    knowledge = models.UserKnowledge(
                        user_id=user.id,
                        assistant_id=first_assistant.id,
                        doc_id=doc.id,
                        content=f"Document: {doc.filename}",
                        type="original",
                        importance=10
                    )
                    
                    db.add(knowledge)
                    logger.info(f"Linked document {doc.id} ({doc.filename}) to assistant {first_assistant.id}")
                    
                except Exception as e:
                    logger.error(f"Failed to link document {doc.id}: {e}")
                    continue
        
        # Коммитим все изменения
        db.commit()
        logger.info("Migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_documents_to_assistants()