#!/usr/bin/env python3
"""
Тест для проверки, что боты больше не выдают дефолтное время работы
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import get_db
from database import models
from api.bots import get_bot_ai_response
from sqlalchemy.orm import Session

def test_working_hours_response():
    """Тестирует, что бот не выдает дефолтное время работы"""
    
    print("🧪 ТЕСТИРОВАНИЕ: Проверка ответов на вопрос о времени работы")
    print("=" * 60)
    
    db = next(get_db())
    
    try:
        # Получаем первого пользователя и ассистента
        user = db.query(models.User).first()
        if not user:
            print("❌ Не найден активный пользователь для тестирования")
            return False
            
        assistant = db.query(models.Assistant).filter(
            models.Assistant.user_id == user.id,
            models.Assistant.is_active == True
        ).first()
        
        if not assistant:
            print("❌ Не найден активный ассистент для тестирования")
            return False
            
        print(f"👤 Тестируем с пользователем: {user.email}")
        print(f"🤖 Ассистент: {assistant.name}")
        print(f"📝 Системный промпт (первые 100 символов): {assistant.system_prompt[:100]}...")
        print()
        
        # Тестовые вопросы о времени работы
        test_questions = [
            "время работы?",
            "Когда вы работаете?",
            "Какие у вас рабочие часы?",
            "С какого до какого времени работает компания?",
            "Во сколько вы открываетесь и закрываетесь?",
            "График работы компании"
        ]
        
        suspicious_phrases = [
            "9:00", "18:00", "09:00",
            "пн-пт", "понедельник", "пятница",
            "с 9 до 18", "9 до 18",
            "понедельника по пятницу"
        ]
        
        results = {
            'total_tests': len(test_questions),
            'passed': 0,
            'failed': 0,
            'issues': []
        }
        
        for i, question in enumerate(test_questions, 1):
            print(f"📋 Тест {i}/{len(test_questions)}: '{question}'")
            
            try:
                # Формируем запрос
                request_data = {
                    'user_id': user.id,
                    'message': question,
                    'assistant_id': assistant.id
                }
                
                # Получаем ответ от бота
                response = get_bot_ai_response(request_data, db)
                
                if 'error' in response:
                    print(f"   ⚠️ Ошибка: {response['error']}")
                    results['issues'].append(f"Ошибка при запросе '{question}': {response['error']}")
                    continue
                
                bot_response = response.get('response', '')
                print(f"   🤖 Ответ: {bot_response[:150]}...")
                
                # Проверяем наличие подозрительных фраз
                found_suspicious = []
                for phrase in suspicious_phrases:
                    if phrase.lower() in bot_response.lower():
                        found_suspicious.append(phrase)
                
                if found_suspicious:
                    print(f"   ❌ НАЙДЕНЫ ПОДОЗРИТЕЛЬНЫЕ ФРАЗЫ: {found_suspicious}")
                    results['failed'] += 1
                    results['issues'].append(f"В ответе на '{question}' найдены фразы: {found_suspicious}")
                else:
                    print(f"   ✅ Ответ корректный - нет хардкода времени работы")
                    results['passed'] += 1
                    
            except Exception as e:
                print(f"   ❌ Ошибка при тестировании: {str(e)}")
                results['failed'] += 1
                results['issues'].append(f"Исключение при запросе '{question}': {str(e)}")
            
            print()
        
        # Результаты тестирования
        print("📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:")
        print(f"   Всего тестов: {results['total_tests']}")
        print(f"   ✅ Прошли: {results['passed']}")
        print(f"   ❌ Провалились: {results['failed']}")
        
        if results['issues']:
            print("\n🚨 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:")
            for issue in results['issues']:
                print(f"   • {issue}")
        
        success_rate = (results['passed'] / results['total_tests']) * 100
        print(f"\n📈 Процент успешных тестов: {success_rate:.1f}%")
        
        if results['failed'] == 0:
            print("\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ! Хардкод времени работы успешно удален.")
            return True
        else:
            print(f"\n⚠️ ВНИМАНИЕ: {results['failed']} тестов провалились. Требуется дополнительная работа.")
            return False
            
    except Exception as e:
        print(f"❌ Критическая ошибка при тестировании: {str(e)}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    test_working_hours_response()