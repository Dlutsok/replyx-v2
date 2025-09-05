#!/usr/bin/env python3
"""
Простой тест поиска Q&A через embeddings_service
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from services.embeddings_service import EmbeddingsService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_qa_search():
    """Тестируем поиск Q&A через embeddings_service"""
    db = next(get_db())
    embeddings_service = EmbeddingsService()
    
    try:
        print("=== ТЕСТ ПОИСКА Q&A ===")
        
        test_query = "Время работы?"
        test_user_id = 1
        test_assistant_id = 117
        
        print(f"Запрос: '{test_query}'")
        print(f"Пользователь: {test_user_id}, Ассистент: {test_assistant_id}")
        
        # Поиск через embeddings_service
        qa_results = embeddings_service.search_relevant_qa(
            query=test_query,
            user_id=test_user_id,
            assistant_id=test_assistant_id,
            top_k=5,
            min_similarity=0.5,
            db=db
        )
        
        print(f"\n=== НАЙДЕНО РЕЗУЛЬТАТОВ: {len(qa_results)} ===")
        
        for i, qa in enumerate(qa_results, 1):
            print(f"{i}. Вопрос: {qa.get('question', 'N/A')}")
            print(f"   Ответ: {qa.get('answer', 'N/A')}")
            similarity = qa.get('max_similarity', 'N/A')
            print(f"   Сходство: {similarity:.4f}" if isinstance(similarity, (int, float)) else f"   Сходство: {similarity}")
            print(f"   Категория: {qa.get('category', 'N/A')}")
            print(f"   Важность: {qa.get('importance', 'N/A')}")
            print("--" * 30)
        
        # Дополнительный тест - поиск для другого пользователя (должен дать 0 результатов)
        print(f"\n=== ТЕСТ ИЗОЛЯЦИИ: Поиск для пользователя 76 ===")
        qa_results_other = embeddings_service.search_relevant_qa(
            query=test_query,
            user_id=76,
            assistant_id=None,
            top_k=5,
            min_similarity=0.5,
            db=db
        )
        
        print(f"Результатов для пользователя 76: {len(qa_results_other)}")
        for qa in qa_results_other:
            print(f"- {qa.get('question')} -> {qa.get('answer')}")
        
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_qa_search()