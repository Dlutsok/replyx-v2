#!/usr/bin/env python3
"""
Скрипт для диагностики: откуда бот взял информацию о времени работы
"""

from database.connection import SessionLocal
from database import models
from services.embeddings_service import embeddings_service
from sqlalchemy import func
import json

def debug_working_hours_source():
    """Диагностирует источник информации о времени работы"""
    
    db = SessionLocal()
    
    try:
        print("🔍 ДИАГНОСТИКА ИСТОЧНИКА ИНФОРМАЦИИ О ВРЕМЕНИ РАБОТЫ")
        print("=" * 60)
        
        # 1. Ищем всех пользователей с ботами
        users_with_bots = db.query(models.User).join(models.Assistant).all()
        
        if not users_with_bots:
            print("❌ Нет пользователей с ботами")
            return
            
        for user in users_with_bots:
            print(f"\n👤 ПОЛЬЗОВАТЕЛЬ: {user.email} (ID: {user.id})")
            
            # Получаем ассистентов пользователя
            assistants = db.query(models.Assistant).filter(
                models.Assistant.user_id == user.id
            ).all()
            
            for assistant in assistants:
                print(f"\n🤖 АССИСТЕНТ: {assistant.name} (ID: {assistant.id})")
                
                # 2. Проверяем UserKnowledge
                knowledge_entries = db.query(models.UserKnowledge).filter(
                    models.UserKnowledge.user_id == user.id,
                    models.UserKnowledge.assistant_id == assistant.id
                ).all()
                
                print(f"📚 Найдено {len(knowledge_entries)} записей знаний")
                
                working_hours_found = False
                
                for entry in knowledge_entries:
                    content_lower = entry.content.lower()
                    if any(phrase in content_lower for phrase in [
                        'время работы', 'пн-пт', 'понедельник', 'вторник', 
                        '09:00', '18:00', 'рабочие часы', 'график работы'
                    ]):
                        working_hours_found = True
                        print(f"\n✅ НАЙДЕНА ИНФОРМАЦИЯ О ВРЕМЕНИ РАБОТЫ:")
                        print(f"   📄 Документ ID: {entry.doc_id}")
                        print(f"   📝 Тип: {entry.doc_type}")
                        print(f"   📊 Важность: {entry.importance}")
                        print(f"   📅 Создано: {entry.created_at}")
                        print(f"   📋 Содержание (первые 300 символов):")
                        print(f"   {entry.content[:300]}...")
                        
                        # Получаем информацию о документе
                        doc = db.query(models.Document).filter(
                            models.Document.id == entry.doc_id
                        ).first()
                        
                        if doc:
                            print(f"   📎 Файл: {doc.filename}")
                            print(f"   📅 Загружен: {doc.upload_date}")
                
                # 3. Проверяем embeddings
                embeddings_count = db.query(models.KnowledgeEmbedding).filter(
                    models.KnowledgeEmbedding.user_id == user.id,
                    models.KnowledgeEmbedding.assistant_id == assistant.id
                ).count()
                
                print(f"🧠 Найдено {embeddings_count} embeddings")
                
                # 4. Тестируем поиск по запросу "время работы"
                print(f"\n🔍 ТЕСТИРОВАНИЕ ПОИСКА ПО ЗАПРОСУ 'время работы':")
                
                relevant_chunks = embeddings_service.search_relevant_chunks(
                    query="время работы",
                    user_id=user.id,
                    assistant_id=assistant.id,
                    top_k=3,
                    min_similarity=0.5,  # Понижаем порог для диагностики
                    db=db
                )
                
                print(f"   Найдено {len(relevant_chunks)} релевантных чанков:")
                
                for i, chunk in enumerate(relevant_chunks, 1):
                    print(f"\n   {i}. Схожесть: {chunk['similarity']:.3f}")
                    print(f"      Тип: {chunk['doc_type']}")
                    print(f"      Важность: {chunk['importance']}")
                    print(f"      Текст (первые 200 символов):")
                    print(f"      {chunk['text'][:200]}...")
                
                if not working_hours_found and not relevant_chunks:
                    print("❌ НЕ НАЙДЕНО информации о времени работы в знаниях")
                    
                    # Проверяем, может ли ИИ генерировать ответ без знаний
                    print("\n⚠️  ВОЗМОЖНЫЕ ИСТОЧНИКИ:")
                    print("   1. ИИ генерирует ответ на основе общих знаний")
                    print("   2. Есть fallback в коде на старую систему знаний")
                    print("   3. Информация берется из системного промпта")
                    
                    # Проверяем системный промпт
                    if assistant.system_prompt:
                        prompt_lower = assistant.system_prompt.lower()
                        if any(phrase in prompt_lower for phrase in [
                            'время работы', 'пн-пт', '09:00', '18:00'
                        ]):
                            print("   ✅ НАЙДЕНО в системном промпте!")
                            print(f"      Промпт: {assistant.system_prompt[:200]}...")
                
                print("\n" + "-" * 50)
        
        # 5. Проверяем общие знания (без привязки к ассистенту)
        print(f"\n🌐 ПРОВЕРКА ОБЩИХ ЗНАНИЙ (без привязки к ассистенту):")
        
        general_knowledge = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.assistant_id.is_(None)
        ).all()
        
        print(f"Найдено {len(general_knowledge)} общих записей знаний")
        
        for entry in general_knowledge:
            content_lower = entry.content.lower()
            if any(phrase in content_lower for phrase in [
                'время работы', 'пн-пт', '09:00', '18:00'
            ]):
                print(f"✅ НАЙДЕНА общая информация о времени работы:")
                print(f"   Пользователь ID: {entry.user_id}")
                print(f"   Содержание: {entry.content[:300]}...")
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        db.close()

if __name__ == "__main__":
    debug_working_hours_source()