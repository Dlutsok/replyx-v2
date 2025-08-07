#!/usr/bin/env python3
"""
🧪 ТЕСТИРОВАНИЕ СТИЛЯ TELEGRAM БОТА

Эмулирует запросы к Telegram боту через API /bot/ai-response
для проверки профессионального стиля общения.
"""

import requests
import json

def test_telegram_bot_style():
    """Тестирует стиль Telegram бота через API"""
    
    # Тестовые сообщения (как в реальном Telegram)
    test_cases = [
        {"message": "привет", "expected": "профессиональное приветствие"},
        {"message": "кто ты?", "expected": "представление компании"},
        {"message": "время работы?", "expected": "конкретное время работы"},
        {"message": "что вы умеете?", "expected": "список услуг"},
        {"message": "спасибо", "expected": "вежливое завершение"}
    ]
    
    api_url = "http://localhost:8000/api/bot/ai-response"
    
    print("🤖 ТЕСТИРОВАНИЕ СТИЛЯ TELEGRAM БОТА")
    print("=" * 60)
    print(f"API: {api_url}")
    print(f"Ассистент: Dan (ID=67)")
    print()
    
    for i, test_case in enumerate(test_cases, 1):
        message = test_case["message"]
        expected = test_case["expected"]
        
        print(f"{i}. ТЕСТ: '{message}' (ожидается: {expected})")
        print("-" * 50)
        
        # Подготовка данных для API
        payload = {
            "user_id": 1,  # admin@example.com
            "message": message,
            "assistant_id": 67,  # Dan
            "dialog_id": None
        }
        
        try:
            # Отправка запроса к API
            response = requests.post(api_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                bot_response = data.get("response", "Нет ответа")
                
                print(f"ОТВЕТ: {bot_response}")
                
                # Анализ профессиональности
                score = analyze_professionalism(bot_response)
                print(f"ОЦЕНКА ПРОФЕССИОНАЛЬНОСТИ: {score['score']}/5")
                
                for feedback in score['feedback']:
                    print(f"  {feedback}")
                    
            else:
                print(f"❌ Ошибка API: {response.status_code}")
                print(f"   Ответ: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Ошибка соединения: {e}")
        except Exception as e:
            print(f"❌ Ошибка: {e}")
            
        print()

def analyze_professionalism(text):
    """Анализирует профессиональность ответа"""
    score = 0
    feedback = []
    
    # Проверка отсутствия смайликов
    emojis = ['😊', '🚀', '✨', '🎓', '🛠️', '💡', '🔥', '⚡', '🎯', '🌟', '👋', '🤖']
    if not any(emoji in text for emoji in emojis):
        score += 1
        feedback.append("✅ Отсутствуют смайлики и эмодзи")
    else:
        feedback.append("❌ Содержит смайлики или эмодзи")
    
    # Проверка вежливого обращения
    polite_forms = ['вы', 'вас', 'вам', 'ваш', 'ваша', 'ваше', 'ваши']
    if any(form in text.lower() for form in polite_forms):
        score += 1
        feedback.append("✅ Вежливое обращение на 'Вы'")
    else:
        feedback.append("❌ Неформальное обращение")
    
    # Проверка корректной типографики
    if '«' in text and '»' in text:
        score += 1
        feedback.append("✅ Корректные кавычки-ёлочки")
    
    if '—' in text:
        score += 1
        feedback.append("✅ Правильное длинное тире")
    
    # Проверка деловых формулировок
    business_terms = [
        'предоставляю', 'информацию', 'консультацию', 'обращайтесь', 
        'рекомендую', 'специалист', 'менеджер', 'поддержка', 'услуги',
        'компания', 'сотрудничество', 'решение'
    ]
    
    if any(term in text.lower() for term in business_terms):
        score += 1
        feedback.append("✅ Использует деловую лексику")
    else:
        feedback.append("❌ Отсутствует деловая лексика")
    
    # Проверка структурированности
    if '•' in text or '-' in text or any(str(i) in text for i in range(1, 6)):
        feedback.append("✅ Структурированная подача")
    
    # Проверка на излишнюю эмоциональность
    emotional_words = ['обожаю', 'здорово', 'отлично', 'супер', 'классно', 'круто']
    if not any(word in text.lower() for word in emotional_words):
        feedback.append("✅ Отсутствует излишняя эмоциональность")
    else:
        feedback.append("❌ Излишняя эмоциональность")
    
    return {"score": score, "feedback": feedback}

if __name__ == "__main__":
    print("Убедитесь, что сервер запущен на http://localhost:8000")
    print("Нажмите Enter для продолжения...")
    input()
    
    test_telegram_bot_style()