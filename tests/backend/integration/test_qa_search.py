#!/usr/bin/env python3
"""
Тест поиска Q&A с разными параметрами
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

def test_qa_search():
    """Тестируем поиск Q&A с разными параметрами"""
    db = next(get_db())
    
    try:
        # Найдем нашу Q&A запись о времени работы
        qa_record = db.query(models.QAKnowledge).filter(
            models.QAKnowledge.question.ilike("%время работы%")
        ).first()
        
        if not qa_record:
            print("❌ Q&A запись 'Время работы' не найдена!")
            return
        
        print(f"✅ Найдена Q&A запись:")
        print(f"  ID: {qa_record.id}")
        print(f"  Вопрос: {qa_record.question}")
        print(f"  Ответ: {qa_record.answer}")
        print(f"  Важность: {qa_record.importance}")
        print(f"  User ID: {qa_record.user_id}")
        print(f"  Assistant ID: {qa_record.assistant_id}")
        
        # Тестовые запросы
        test_queries = [
            "Время работы?",
            "Когда работаете?", 
            "В какое время открыто?",
            "График работы",
            "Часы работы"
        ]
        
        similarity_thresholds = [0.3, 0.5, 0.7, 0.75]
        
        for query in test_queries:
            print(f"\n🔍 ТЕСТИРУЕМ ЗАПРОС: '{query}'")
            
            for threshold in similarity_thresholds:
                print(f"\n  📊 Similarity threshold: {threshold}")
                
                # Тест только Q&A поиска
                qa_results = embeddings_service.search_relevant_qa(
                    query=query,
                    user_id=qa_record.user_id,
                    assistant_id=qa_record.assistant_id,
                    top_k=5,
                    min_similarity=threshold,
                    db=db
                )
                
                print(f"    Q&A результатов: {len(qa_results)}")
                for result in qa_results:
                    print(f"      - {result['question']} (similarity: {result['similarity']:.3f}, importance: {result['importance']})")
                
                # Тест комбинированного поиска
                combined_results = embeddings_service.search_relevant_chunks(
                    query=query,
                    user_id=qa_record.user_id,
                    assistant_id=qa_record.assistant_id,
                    top_k=5,
                    min_similarity=threshold,
                    include_qa=True,
                    qa_limit=5,
                    db=db
                )
                
                qa_in_combined = [r for r in combined_results if r.get('type') == 'qa_knowledge' or 'Q:' in r.get('text', '')]
                print(f"    Комбинированный поиск - всего: {len(combined_results)}, Q&A: {len(qa_in_combined)}")
                
                for result in qa_in_combined:
                    print(f"      - Q&A: {result['text'][:50]}... (similarity: {result['similarity']:.3f})")
        
    except Exception as e:
        logger.error(f"Ошибка тестирования: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_qa_search()