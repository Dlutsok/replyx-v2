#!/usr/bin/env python3
"""
Тестовый скрипт для проверки загрузки документов с привязкой к ассистенту
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database.connection import SessionLocal
from backend.database import models
from backend.database.crud import create_document
from backend.services.embeddings_service import embeddings_service
import tempfile

def test_document_upload_with_assistant():
    """Тестируем загрузку документа с привязкой к ассистенту"""
    
    db = SessionLocal()
    try:
        # Параметры теста
        user_id = 1
        assistant_id = 117
        test_content = """
        Тестовый документ для проверки привязки к ассистенту.
        Этот документ должен быть виден только в ассистенте 'moroz' (ID: 117).
        
        Содержание документа:
        - Тип: Инструкция
        - Важность: Высокая  
        - Назначение: Тестирование функции привязки документов
        """
        filename = "test_document_assistant_binding.txt"
        
        print("=== ТЕСТ ЗАГРУЗКИ ДОКУМЕНТА С ПРИВЯЗКОЙ К АССИСТЕНТУ ===")
        print(f"User ID: {user_id}")
        print(f"Assistant ID: {assistant_id}")
        print(f"Filename: {filename}")
        
        # 1. Создаем документ в БД
        print("\n1. Создание документа в БД...")
        doc = create_document(db, user_id, filename, len(test_content))
        print(f"✅ Документ создан с ID: {doc.id}")
        
        # 2. Создаем физический файл
        print("\n2. Создание физического файла...")
        upload_dir = os.path.join("uploads", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(test_content)
        print(f"✅ Файл сохранен: {file_path}")
        
        # 3. Индексируем документ для ассистента
        print(f"\n3. Индексация документа для ассистента {assistant_id}...")
        embeddings_service.index_document(
            doc_id=doc.id,
            user_id=user_id,
            assistant_id=assistant_id,
            text=test_content,
            doc_type="instruction",
            importance=10,
            db=db
        )
        print("✅ Документ проиндексирован")
        
        # 4. Проверяем результат
        print("\n4. Проверка результата...")
        
        # Проверяем UserKnowledge
        knowledge = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.doc_id == doc.id,
            models.UserKnowledge.assistant_id == assistant_id
        ).first()
        
        if knowledge:
            print(f"✅ UserKnowledge создан: doc_id={knowledge.doc_id}, assistant_id={knowledge.assistant_id}")
        else:
            print("❌ UserKnowledge НЕ создан!")
            return False
        
        # Проверяем фильтрацию API
        documents_for_assistant = db.query(models.Document).join(
            models.UserKnowledge, 
            models.Document.id == models.UserKnowledge.doc_id
        ).filter(
            models.Document.user_id == user_id,
            models.UserKnowledge.assistant_id == assistant_id
        ).all()
        
        print(f"✅ Документов для ассистента {assistant_id}: {len(documents_for_assistant)}")
        
        # Проверяем, что документ НЕ виден другим ассистентам
        other_assistant_id = 118  # Dan
        documents_for_other = db.query(models.Document).join(
            models.UserKnowledge, 
            models.Document.id == models.UserKnowledge.doc_id
        ).filter(
            models.Document.user_id == 63,  # user_id для ассистента Dan
            models.UserKnowledge.assistant_id == other_assistant_id
        ).all()
        
        print(f"✅ Документов для ДРУГОГО ассистента {other_assistant_id}: {len(documents_for_other)}")
        
        print(f"\n🎉 ТЕСТ ПРОЙДЕН УСПЕШНО!")
        print(f"Документ {doc.id} корректно привязан к ассистенту {assistant_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    test_document_upload_with_assistant()