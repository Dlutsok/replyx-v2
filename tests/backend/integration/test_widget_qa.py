#!/usr/bin/env python3
"""
Тест виджета Q&A как в реальном использовании
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from services.embeddings_service import EmbeddingsService

def test_widget_qa():
    """Тестируем Q&A как в виджете"""
    db = next(get_db())
    embeddings_service = EmbeddingsService()
    
    print("🔧 ТЕСТ ВИДЖЕТА Q&A")
    print("=" * 50)
    
    user_message = "Сколько вас в компании?"
    user_id = 1
    assistant_id = 117
    
    print(f"Вопрос: '{user_message}'")
    print(f"Пользователь: {user_id}, Ассистент: {assistant_id}")
    
    try:
        # Точно так же как в api/site.py
        relevant_chunks = embeddings_service.search_relevant_chunks(
            query=user_message,
            user_id=user_id,
            assistant_id=assistant_id,
            top_k=5,  # RAG_TOP_K_WIDGET
            min_similarity=0.5,   # Понижаем порог чтобы Q&A проходили
            include_qa=True,  # Включаем Q&A поиск
            qa_limit=2,       # Максимум 2 Q&A результата для виджета
            db=db
        )
        
        print(f"\n✅ Найдено chunks: {len(relevant_chunks)}")
        
        for i, chunk in enumerate(relevant_chunks, 1):
            chunk_type = chunk.get('type', chunk.get('doc_type', 'unknown'))
            similarity = chunk.get('similarity', 0)
            text = chunk.get('text', '')
            
            print(f"\n{i}. Тип: {chunk_type}")
            print(f"   Сходство: {similarity:.4f}")
            print(f"   Текст: {text[:100]}{'...' if len(text) > 100 else ''}")
            
            if chunk_type == 'qa_knowledge':
                print("   🎯 ЭТО Q&A РЕЗУЛЬТАТ!")
        
        # Проверяем build_context_messages
        if relevant_chunks:
            print(f"\n=== ТЕСТ BUILD_CONTEXT_MESSAGES ===")
            context_parts, total_tokens = embeddings_service.build_context_messages(
                relevant_chunks, 
                max_context_tokens=1000
            )
            
            print(f"Контекстных частей: {len(context_parts)}")
            print(f"Общий токенов: {total_tokens}")
            
            for i, part in enumerate(context_parts, 1):
                print(f"\n{i}. Контекст:")
                print(f"   {part}")
                
                if "Q:" in part and "A:" in part:
                    print("   🎯 В КОНТЕКСТЕ ЕСТЬ Q&A!")
                    
        else:
            print("\n❌ Нет relevant_chunks для контекста")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        db.close()

if __name__ == "__main__":
    test_widget_qa()