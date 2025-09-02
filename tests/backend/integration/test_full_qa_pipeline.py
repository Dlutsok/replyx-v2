#!/usr/bin/env python3
"""
Полный тест Q&A пайплайна для проверки работы в AI чате
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from database.models import User, Assistant, QAKnowledge
from services.embeddings_service import EmbeddingsService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_full_pipeline():
    """Тестируем полный пайплайн Q&A как в реальном AI чате"""
    db = next(get_db())
    embeddings_service = EmbeddingsService()
    
    try:
        print("=== ТЕСТ ПОЛНОГО Q&A ПАЙПЛАЙНА ===")
        
        # Настройки теста
        test_user_id = 1
        test_assistant_id = 117
        test_questions = [
            "Время работы?",
            "Во сколько вы работаете?", 
            "График работы",
            "Когда работает офис?",
            "Часы работы"
        ]
        
        print(f"Пользователь: {test_user_id}, Ассистент: {test_assistant_id}")
        
        # Проверяем что пользователь и ассистент существуют
        user = db.query(User).filter(User.id == test_user_id).first()
        assistant = db.query(Assistant).filter(Assistant.id == test_assistant_id).first()
        
        if not user:
            print(f"❌ Пользователь {test_user_id} не найден")
            return
            
        if not assistant:
            print(f"❌ Ассистент {test_assistant_id} не найден")
            return
            
        print(f"✅ Пользователь: {user.email}")
        print(f"✅ Ассистент: {assistant.name}")
        
        # Проверяем Q&A записи для этого ассистента
        qa_records = db.query(QAKnowledge).filter(
            QAKnowledge.user_id == test_user_id,
            QAKnowledge.assistant_id == test_assistant_id,
            QAKnowledge.is_active == True
        ).all()
        
        print(f"✅ Q&A записей в ассистенте: {len(qa_records)}")
        for qa in qa_records:
            print(f"   - {qa.question} -> {qa.answer}")
        
        print("\\n" + "="*60)
        
        # Тестируем разные варианты вопросов
        for i, question in enumerate(test_questions, 1):
            print(f"\\n{i}. ТЕСТ: '{question}'")
            
            # Используем search_relevant_chunks с include_qa=True как в реальном AI чате
            results = embeddings_service.search_relevant_chunks(
                query=question,
                user_id=test_user_id,
                assistant_id=test_assistant_id,
                top_k=5,
                min_similarity=0.5,
                db=db,
                include_qa=True,
                qa_limit=3
            )
            
            print(f"   Найдено результатов: {len(results)}")
            
            # Фильтруем только Q&A результаты
            qa_results = [r for r in results if r.get('type') == 'qa']
            doc_results = [r for r in results if r.get('type') != 'qa']
            
            if qa_results:
                print(f"   ✅ Q&A результаты ({len(qa_results)}):")
                for qa in qa_results:
                    similarity = qa.get('similarity', 0)
                    print(f"      • {qa.get('question', 'N/A')} -> {qa.get('answer', 'N/A')}")
                    print(f"        Сходство: {similarity:.4f}")
            else:
                print("   ❌ Q&A результаты не найдены")
                
            if doc_results:
                print(f"   📄 Документов: {len(doc_results)}")
        
        print("\\n" + "="*60)
        print("\\n=== ИТОГОВЫЙ РЕЗУЛЬТАТ ===")
        
        # Финальный тест с основным вопросом
        final_question = "Время работы?"
        final_results = embeddings_service.search_relevant_chunks(
            query=final_question,
            user_id=test_user_id,
            assistant_id=test_assistant_id,
            top_k=3,
            min_similarity=0.7,
            db=db,
            include_qa=True,
            qa_limit=2
        )
        
        qa_final = [r for r in final_results if r.get('type') == 'qa']
        
        if qa_final:
            best_qa = qa_final[0]
            print(f"✅ AI должен отвечать: '{best_qa.get('answer')}'")
            print(f"✅ На основании Q&A: '{best_qa.get('question')}'")
            print(f"✅ Сходство: {best_qa.get('similarity', 0):.4f}")
            print("✅ Q&A система работает корректно!")
        else:
            print("❌ Q&A система не работает - ответы не найдены")
            
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_full_pipeline()