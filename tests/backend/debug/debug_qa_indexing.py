#!/usr/bin/env python3
"""
Диагностический скрипт для проверки индексации Q&A
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

def debug_qa_indexing():
    """Проверяем Q&A индексацию"""
    db = next(get_db())
    
    try:
        # 1. Получаем все Q&A записи
        qa_records = db.query(models.QAKnowledge).filter(
            models.QAKnowledge.is_active == True
        ).all()
        
        print(f"\n=== НАЙДЕНО Q&A ЗАПИСЕЙ: {len(qa_records)} ===")
        for qa in qa_records:
            print(f"ID: {qa.id}")
            print(f"User ID: {qa.user_id}")
            print(f"Assistant ID: {qa.assistant_id}")
            print(f"Вопрос: {qa.question}")
            print(f"Ответ: {qa.answer}")
            print(f"Важность: {qa.importance}")
            print(f"Категория: {qa.category}")
            print(f"Ключевые слова: {qa.keywords}")
            print("-" * 50)
        
        # 2. Проверяем embeddings для Q&A
        qa_embeddings = db.query(models.KnowledgeEmbedding).filter(
            models.KnowledgeEmbedding.qa_id.isnot(None)
        ).all()
        
        print(f"\n=== НАЙДЕНО Q&A EMBEDDINGS: {len(qa_embeddings)} ===")
        for emb in qa_embeddings:
            print(f"ID: {emb.id}")
            print(f"QA ID: {emb.qa_id}")
            print(f"User ID: {emb.user_id}")
            print(f"Assistant ID: {emb.assistant_id}")
            print(f"Chunk text: {emb.chunk_text[:100]}...")
            print(f"Doc type: {emb.doc_type}")
            print(f"Source: {emb.source}")
            print(f"Importance: {emb.importance}")
            print("-" * 50)
        
        # 3. Тестируем поиск по Q&A
        if qa_records:
            test_qa = qa_records[0]
            print(f"\n=== ТЕСТИРУЕМ ПОИСК ДЛЯ: '{test_qa.question}' ===")
            
            results = embeddings_service.search_relevant_qa(
                query=test_qa.question,
                user_id=test_qa.user_id,
                assistant_id=test_qa.assistant_id,
                top_k=5,
                min_similarity=0.3,  # Низкий порог для диагностики
                db=db
            )
            
            print(f"Найдено результатов: {len(results)}")
            for result in results:
                print(f"ID: {result['id']}")
                print(f"Вопрос: {result['question']}")
                print(f"Ответ: {result['answer']}")
                print(f"Similarity: {result['similarity']:.3f}")
                print(f"Важность: {result['importance']}")
                print("-" * 30)
        
        # 4. Тестируем комбинированный поиск
        if qa_records:
            test_qa = qa_records[0]
            print(f"\n=== ТЕСТИРУЕМ КОМБИНИРОВАННЫЙ ПОИСК ===")
            
            combined_results = embeddings_service.search_relevant_chunks(
                query=test_qa.question,
                user_id=test_qa.user_id,
                assistant_id=test_qa.assistant_id,
                top_k=5,
                min_similarity=0.3,  # Низкий порог для диагностики
                include_qa=True,
                qa_limit=5,
                db=db
            )
            
            print(f"Найдено комбинированных результатов: {len(combined_results)}")
            for result in combined_results:
                print(f"ID: {result['id']}")
                print(f"Type: {result.get('type', result.get('doc_type', 'unknown'))}")
                print(f"Text: {result['text'][:100]}...")
                print(f"Similarity: {result['similarity']:.3f}")
                print(f"Importance: {result['importance']}")
                print("-" * 30)
                
    except Exception as e:
        logger.error(f"Ошибка диагностики: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_qa_indexing()