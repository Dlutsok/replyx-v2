#!/usr/bin/env python3
"""
Тест поиска Q&A
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from database import models
from services.embeddings_service import embeddings_service
import logging

logging.basicConfig(level=logging.INFO)

def test_qa_search():
    """Тестируем поиск Q&A"""
    db = next(get_db())
    
    try:
        # Найдем все Q&A записи для пользователя 1
        qa_records = db.query(models.QAKnowledge).filter(
            models.QAKnowledge.user_id == 1,
            models.QAKnowledge.is_active == True
        ).all()
        
        print(f"Найдено Q&A записей для пользователя 1: {len(qa_records)}")
        for qa in qa_records:
            print(f"  ID: {qa.id}, Вопрос: '{qa.question}', Важность: {qa.importance}")
        
        if qa_records:
            qa_record = qa_records[0]
            
            # Точный тест запроса
            query = "Время работы?"
            print(f"\n🔍 Тестируем поиск по запросу: '{query}'")
            
            # Тест с низким порогом
            qa_results = embeddings_service.search_relevant_qa(
                query=query,
                user_id=1,
                assistant_id=117,
                top_k=5,
                min_similarity=0.1,  # Очень низкий порог
                db=db
            )
            
            print(f"Q&A результатов (min_similarity=0.1): {len(qa_results)}")
            for result in qa_results:
                print(f"  - ID: {result['id']}, Вопрос: '{result['question']}', Similarity: {result['similarity']:.3f}")
            
            # Комбинированный поиск
            combined_results = embeddings_service.search_relevant_chunks(
                query=query,
                user_id=1,
                assistant_id=117,
                top_k=10,
                min_similarity=0.1,
                include_qa=True,
                qa_limit=10,
                db=db
            )
            
            print(f"\nКомбинированный поиск результатов: {len(combined_results)}")
            for i, result in enumerate(combined_results):
                result_type = result.get('type', result.get('doc_type', 'unknown'))
                print(f"  {i+1}. Type: {result_type}, Similarity: {result['similarity']:.3f}")
                if 'Q:' in result['text']:
                    print(f"      Q&A: {result['text'][:100]}...")
                else:
                    print(f"      Text: {result['text'][:100]}...")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_qa_search()