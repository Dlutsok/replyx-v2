#!/usr/bin/env python3
"""
🔄 ПЕРЕИНДЕКСАЦИЯ ДОКУМЕНТА С GPT-4O

Переанализирует конкретный документ с использованием GPT-4o
для более точного извлечения информации.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import SessionLocal
from database import models
from sqlalchemy import text
from api.documents import analyze_document_internal
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reindex_document(doc_id, user_id):
    """Переиндексация конкретного документа"""
    db = SessionLocal()
    
    try:
        print(f"🔄 ПЕРЕИНДЕКСАЦИЯ ДОКУМЕНТА ID={doc_id}")
        print("=" * 50)
        
        # Получаем пользователя
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            print(f"❌ Пользователь ID={user_id} не найден")
            return
        
        # Проверяем существование документа
        doc = db.query(models.Document).filter(
            models.Document.id == doc_id,
            models.Document.user_id == user_id
        ).first()
        
        if not doc:
            print(f"❌ Документ ID={doc_id} не найден для пользователя {user_id}")
            return
        
        print(f"📄 Документ: {doc.filename}")
        print(f"👤 Пользователь: {user.email}")
        
        # Удаляем старые записи знаний для этого документа
        old_knowledge = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.doc_id == doc_id
        ).all()
        
        print(f"🗑️  Удаляем старых записей знаний: {len(old_knowledge)}")
        
        for knowledge in old_knowledge:
            db.delete(knowledge)
        
        db.commit()
        
        # Переанализируем документ с GPT-4o
        print("🤖 Анализируем документ с GPT-4o...")
        analysis_result = analyze_document_internal(doc_id, user, db)
        
        # Получаем всех ассистентов пользователя
        assistants = db.query(models.Assistant).filter(
            models.Assistant.user_id == user_id
        ).all()
        
        print(f"👥 Найдено ассистентов: {len(assistants)}")
        
        # Создаем новые записи знаний для каждого ассистента
        for assistant in assistants:
            # Объединяем все саммари в один контент
            combined_content = "\n\n".join([
                summary["summary"] for summary in analysis_result["summaries"]
            ])
            
            # Создаем запись знаний
            knowledge = models.UserKnowledge(
                user_id=user_id,
                assistant_id=assistant.id,
                doc_id=doc_id,
                content=combined_content,
                type='summary',
                doc_type=analysis_result.get("doc_type", "document"),
                importance=10
            )
            db.add(knowledge)
            print(f"✅ Создана запись знаний для ассистента: {assistant.name}")
        
        db.commit()
        
        print("🎉 ПЕРЕИНДЕКСАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
        print("🤖 Боты теперь используют обновленные знания с GPT-4o анализом")
        
        # Показываем часть нового контента
        if assistants:
            latest_knowledge = db.query(models.UserKnowledge).filter(
                models.UserKnowledge.doc_id == doc_id,
                models.UserKnowledge.assistant_id == assistants[0].id
            ).first()
            
            if latest_knowledge:
                print("\n📝 ФРАГМЕНТ НОВОГО АНАЛИЗА:")
                print("-" * 40)
                print(latest_knowledge.content[:500] + "...")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Ошибка переиндексации: {e}")
        logger.error(f"Reindexing error: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    # Переиндексируем последний документ пользователя ID=1 (admin@example.com)
    doc_id = 77  # Последний загруженный документ
    user_id = 1  # admin@example.com
    
    print("⚠️  ВНИМАНИЕ: Документ будет переанализирован с GPT-4o!")
    print("🔄 Это заменит существующие знания новым анализом")
    
    confirm = input("\n🤔 Продолжить? (yes/no): ")
    if confirm.lower() == 'yes':
        reindex_document(doc_id, user_id)
    else:
        print("❌ Операция отменена пользователем")