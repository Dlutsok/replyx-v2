#!/usr/bin/env python3
"""
🧪 ТЕСТИРОВАНИЕ ОТВЕТА БОТА

Проверяет, что бот теперь правильно использует знания из документа
и отвечает на вопросы о времени работы.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import SessionLocal
from database import models
from sqlalchemy import text
import json
from ai.ai_token_manager import ai_token_manager

def test_bot_knowledge():
    """Тестирует использование знаний ботом"""
    db = SessionLocal()
    
    try:
        print("🧪 ТЕСТИРОВАНИЕ ОТВЕТА БОТА DAN")
        print("=" * 50)
        
        # Параметры тестирования
        user_id = 1  # admin@example.com
        assistant_id = 67  # Dan
        test_messages = [
            "кто ты?",
            "время работы?", 
            "что вы умеете?",
            "как с вами связаться?"
        ]
        
        print(f"👤 Пользователь: ID={user_id}")
        print(f"🤖 Ассистент: ID={assistant_id}")
        print(f"💬 Тестируем {len(test_messages)} вопросов")
        print()
        
        # Получаем знания ассистента (как в реальном боте)
        knowledge_entries = db.query(models.UserKnowledge).filter(
            models.UserKnowledge.user_id == user_id,
            models.UserKnowledge.assistant_id == assistant_id
        ).all()
        
        print(f"📚 Найдено записей знаний: {len(knowledge_entries)}")
        
        documents = []
        for entry in knowledge_entries:
            if entry.type == 'summary':
                try:
                    chunks = json.loads(entry.content)
                    documents.extend(chunks)
                except Exception:
                    documents.append(entry.content)
            else:
                documents.append(entry.content)
        
        if documents:
            docs_text = '\n---\n'.join(documents)
            print(f"📄 Длина знаний: {len(docs_text)} символов")
            
            # Проверяем, есть ли информация о времени работы в знаниях
            if 'время работы' in docs_text.lower() or 'пн–пт' in docs_text.lower():
                print("✅ Знания содержат информацию о времени работы")
            else:
                print("❌ Знания НЕ содержат информацию о времени работы")
            
            # Готовим данные для тестирования
            
            # Продолжаем с тестированием
            
            print("\n🤖 ТЕСТИРОВАНИЕ ПРОФЕССИОНАЛЬНОГО СТИЛЯ")
            print("=" * 60)
            
            for i, test_message in enumerate(test_messages, 1):
                print(f"\n{i}. ВОПРОС: '{test_message}'")
                print("-" * 40)
                
                # Формируем промпт для текущего вопроса
                current_prompt = [
                    {"role": "system", "content": f"Используй следующую информацию из базы знаний для формирования ответа:\n\n{docs_text}"},
                    {"role": "system", "content": "Вы — корпоративный AI-ассистент компании «АльфаСфера», специализирующейся на онлайн-образовании и корпоративных тренингах. Стиль общения: деловой, вежливый, профессиональный. Используйте корректную типографику. Отвечайте кратко и информативно без смайликов."},
                    {"role": "user", "content": test_message}
                ]
                
                try:
                    completion = ai_token_manager.make_openai_request(
                        messages=current_prompt,
                        model="gpt-4o",
                        user_id=user_id,
                        assistant_id=assistant_id,
                        temperature=0.3,
                        max_tokens=300
                    )
                    
                    bot_response = completion.choices[0].message.content.strip()
                    
                    print(f"ОТВЕТ: {bot_response}")
                    
                    # Анализ профессиональности ответа
                    professional_score = 0
                    feedback = []
                    
                    # Проверка отсутствия смайликов
                    if not any(emoji in bot_response for emoji in ['😊', '🚀', '✨', '🎓', '🛠️', '💡', '🔥', '⚡', '🎯', '🌟']):
                        professional_score += 1
                        feedback.append("✅ Нет смайликов")
                    else:
                        feedback.append("❌ Содержит смайлики")
                    
                    # Проверка использования "Вы"
                    if 'вы' in bot_response.lower() or 'вас' in bot_response.lower() or 'вам' in bot_response.lower():
                        professional_score += 1
                        feedback.append("✅ Вежливое обращение")
                    else:
                        feedback.append("❌ Неформальное обращение")
                    
                    # Проверка типографики (ёлочки)
                    if '«' in bot_response and '»' in bot_response:
                        professional_score += 1
                        feedback.append("✅ Корректные кавычки")
                    
                    # Проверка длинного тире
                    if '—' in bot_response:
                        professional_score += 1
                        feedback.append("✅ Правильное тире")
                    
                    # Проверка деловых фраз
                    business_phrases = ['предоставляю', 'информацию', 'обращайтесь', 'рекомендую', 'консультацию', 'специалист']
                    if any(phrase in bot_response.lower() for phrase in business_phrases):
                        professional_score += 1
                        feedback.append("✅ Деловой стиль")
                    else:
                        feedback.append("❌ Неформальный стиль")
                    
                    print(f"ОЦЕНКА ПРОФЕССИОНАЛЬНОСТИ: {professional_score}/5")
                    for fb in feedback:
                        print(f"  {fb}")
                        
                except Exception as e:
                    print(f"❌ Ошибка: {e}")
                    
                print()
        else:
            print("❌ У ассистента нет знаний")
    
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    test_bot_knowledge()