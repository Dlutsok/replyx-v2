#!/usr/bin/env python3
"""
Скрипт для переиндексации всех Q&A записей
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from database import models
from services.embeddings_service import embeddings_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reindex_all_qa():
    """Переиндексируем все активные Q&A записи"""
    db = next(get_db())
    
    try:
        # Получаем все активные Q&A записи
        qa_records = db.query(models.QAKnowledge).filter(
            models.QAKnowledge.is_active == True
        ).all()
        
        print(f"Найдено {len(qa_records)} активных Q&A записей для переиндексации")
        
        reindexed_count = 0
        failed_count = 0
        
        for qa in qa_records:
            try:
                print(f"Переиндексируем Q&A ID: {qa.id}")
                print(f"  Вопрос: {qa.question}")
                print(f"  Ответ: {qa.answer[:50]}...")
                
                # Сначала удаляем старые embeddings
                embeddings_service.delete_qa_embeddings(qa.id, db)
                
                # Затем создаем новые
                indexed_count = embeddings_service.index_qa_knowledge(
                    qa_id=qa.id,
                    user_id=qa.user_id,
                    assistant_id=qa.assistant_id,
                    question=qa.question,
                    answer=qa.answer,
                    importance=qa.importance or 10,
                    db=db
                )
                
                print(f"  ✅ Создано {indexed_count} embeddings")
                reindexed_count += 1
                
                # Инкрементируем версию знаний ассистента
                if qa.assistant_id:
                    assistant = db.query(models.Assistant).filter(
                        models.Assistant.id == qa.assistant_id
                    ).first()
                    if assistant:
                        assistant.knowledge_version = (assistant.knowledge_version or 0) + 1
                        db.commit()
                        print(f"  📈 Обновлена версия знаний ассистента: {assistant.knowledge_version}")
                
            except Exception as e:
                print(f"  ❌ Ошибка при переиндексации Q&A ID {qa.id}: {e}")
                failed_count += 1
                continue
        
        print(f"\n=== РЕЗУЛЬТАТЫ ===")
        print(f"Успешно переиндексировано: {reindexed_count}")
        print(f"Ошибок: {failed_count}")
        print(f"Всего обработано: {len(qa_records)}")
        
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    reindex_all_qa()