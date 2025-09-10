#!/usr/bin/env python3
"""
Полный анализ системы определения потребности в операторе
Тестирует все ключевые слова и логику handoff detection
"""

import sys
import os
from pathlib import Path

# Добавляем путь к backend модулям
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from services.handoff_service import HandoffService
    from core.app_config import HANDOFF_KEYWORDS_RU, HANDOFF_KEYWORDS_EN
    print("✓ Модули загружены успешно")
except ImportError as e:
    print(f"❌ Ошибка загрузки модулей: {e}")
    sys.exit(1)

def analyze_keyword_detection():
    """Анализирует текущую систему определения ключевых слов"""
    
    print("🔍 АНАЛИЗ СИСТЕМЫ ОПРЕДЕЛЕНИЯ HANDOFF")
    print("=" * 80)
    
    # Ключевые слова из handoff_service.py (хардкод)
    service_keywords_ru = ["оператор", "менеджер", "живой человек", "поддержка", "помощь", "человек"]
    service_keywords_en = ["operator", "manager", "human", "support", "help", "person"]
    
    # Ключевые слова из site.py (хардкод)
    site_keywords = ['оператор', 'человек', 'менеджер', 'поддержка', 'помощь', 'жалоба', 'проблема']
    
    # Ключевые слова из bot_worker.js (хардкод)
    bot_keywords = [
        'оператор', 'менеджер', 'живой человек', 'поддержка', 'помощь', 
        'жалоба', 'проблема', 'консультант', 'специалист',
        'operator', 'human', 'manager', 'support', 'help', 'complaint', 'problem'
    ]
    
    # Ключевые слова из конфига (настраиваемые)
    config_keywords_ru = HANDOFF_KEYWORDS_RU
    config_keywords_en = HANDOFF_KEYWORDS_EN
    
    print("📋 ТЕКУЩЕЕ СОСТОЯНИЕ КЛЮЧЕВЫХ СЛОВ:")
    print()
    print(f"1. HandoffService.should_request_handoff() (НЕ ИСПОЛЬЗУЕТСЯ):")
    print(f"   RU: {service_keywords_ru}")
    print(f"   EN: {service_keywords_en}")
    print()
    print(f"2. site.py автотриггер (ИСПОЛЬЗУЕТСЯ):")
    print(f"   Keywords: {site_keywords}")
    print()
    print(f"3. bot_worker.js shouldRequestHandoff() (ИСПОЛЬЗУЕТСЯ):")
    print(f"   Keywords: {bot_keywords}")
    print()
    print(f"4. app_config.py настраиваемые (НЕ ИСПОЛЬЗУЮТСЯ):")
    print(f"   RU: {config_keywords_ru}")
    print(f"   EN: {config_keywords_en}")
    print()
    
    # Находим различия
    print("🚨 ПРОБЛЕМЫ С КОНСИСТЕНТНОСТЬЮ:")
    print()
    
    # Объединяем все используемые ключевые слова
    site_set = set(site_keywords)
    bot_ru_set = set([kw for kw in bot_keywords if kw not in ['operator', 'human', 'manager', 'support', 'help', 'complaint', 'problem']])
    bot_en_set = set([kw for kw in bot_keywords if kw in ['operator', 'human', 'manager', 'support', 'help', 'complaint', 'problem']])
    
    print(f"1. site.py содержит: {len(site_set)} русских слов")
    print(f"2. bot_worker.js содержит: {len(bot_ru_set)} русских + {len(bot_en_set)} английских слов")
    print()
    
    # Слова которые есть в боте, но нет в сайте
    bot_only_ru = bot_ru_set - site_set
    if bot_only_ru:
        print(f"❗ Слова только в боте: {list(bot_only_ru)}")
    
    # Слова которые есть в сайте, но нет в боте  
    site_only = site_set - bot_ru_set
    if site_only:
        print(f"❗ Слова только в сайте: {list(site_only)}")
    
    print()
    print("✅ РЕКОМЕНДАЦИИ:")
    print("1. Объединить все ключевые слова в один настраиваемый список в app_config.py")
    print("2. Использовать импорт из конфига вместо хардкод списков")
    print("3. Функция HandoffService.should_request_handoff() не используется - либо удалить, либо внедрить")
    print("4. Добавить больше синонимов для лучшего покрытия")

def test_keyword_coverage():
    """Тестирует покрытие различными фразами"""
    
    print("\n" + "=" * 80)
    print("🧪 ТЕСТИРОВАНИЕ ПОКРЫТИЯ КЛЮЧЕВЫХ СЛОВ")
    print("=" * 80)
    
    # Тестовые фразы которые должны срабатывать
    should_trigger = [
        # Прямые запросы оператора
        "нужен оператор",
        "хочу поговорить с оператором", 
        "соедините с оператором",
        "переключите на оператора",
        "мне нужен человек",
        "хочу живого человека",
        "нужен живой человек",
        "соедините с человеком",
        
        # Запросы поддержки
        "обратиться в поддержку",
        "нужна поддержка",
        "служба поддержки",
        "техническая поддержка",
        
        # Запросы помощи с контекстом
        "мне нужна помощь специалиста",
        "помогите мне разобраться",
        "нужна помощь консультанта",
        
        # Жалобы и проблемы
        "у меня проблема",
        "хочу подать жалобу",
        "есть жалоба на сервис",
        
        # Менеджер
        "хочу поговорить с менеджером",
        "соедините с менеджером",
        "нужен менеджер",
        
        # Английские фразы
        "I need human support",
        "connect me to operator",
        "I want to speak with manager",
        "need help from person",
    ]
    
    # Фразы которые НЕ должны срабатывать
    should_not_trigger = [
        "как работает оператор if в Python?",
        "что такое оператор +=?", 
        "помогите с оператором присваивания",
        "человек это млекопитающее",
        "сколько людей работает в компании?",
        "поддержка файлов PDF",
        "техническая проблема с кодом",
        "жалоба на погоду",
        "менеджер задач Windows",
        "как стать менеджером проекта?",
    ]
    
    # Тестируем текущие ключевые слова из site.py
    trigger_keywords = ['оператор', 'человек', 'менеджер', 'поддержка', 'помощь', 'жалоба', 'проблема']
    
    def should_trigger_current_logic(text):
        """Текущая логика из site.py"""
        user_text = text.lower()
        return any(keyword in user_text for keyword in trigger_keywords)
    
    print("📊 ТЕСТИРОВАНИЕ ФРАЗ КОТОРЫЕ ДОЛЖНЫ СРАБАТЫВАТЬ:")
    print()
    
    triggered_count = 0
    for phrase in should_trigger:
        triggered = should_trigger_current_logic(phrase)
        status = "✅" if triggered else "❌"
        print(f"{status} '{phrase}' -> {triggered}")
        if triggered:
            triggered_count += 1
    
    print(f"\nРезультат: {triggered_count}/{len(should_trigger)} фраз срабатывают ({triggered_count/len(should_trigger)*100:.1f}%)")
    
    print("\n📊 ТЕСТИРОВАНИЕ ФРАЗ КОТОРЫЕ НЕ ДОЛЖНЫ СРАБАТЫВАТЬ:")
    print()
    
    false_positive_count = 0
    for phrase in should_not_trigger:
        triggered = should_trigger_current_logic(phrase)
        status = "❌" if triggered else "✅"
        print(f"{status} '{phrase}' -> {triggered}")
        if triggered:
            false_positive_count += 1
    
    print(f"\nРезультат: {false_positive_count}/{len(should_not_trigger)} ложных срабатываний ({false_positive_count/len(should_not_trigger)*100:.1f}%)")
    
    return triggered_count, len(should_trigger), false_positive_count, len(should_not_trigger)

def suggest_improvements():
    """Предлагает улучшения для системы"""
    
    print("\n" + "=" * 80)
    print("💡 ПРЕДЛОЖЕНИЯ ПО УЛУЧШЕНИЮ")
    print("=" * 80)
    
    improved_keywords = [
        # Более точные фразы для операторов
        "соедините с оператором", "нужен оператор", "хочу оператора", 
        "переключите на оператора", "вызовите оператора",
        
        # Живой человек
        "живой человек", "реальный человек", "нужен человек", 
        "хочу с человеком", "соедините с человеком",
        
        # Поддержка (более конкретно)
        "служба поддержки", "техподдержка", "обратиться в поддержку",
        "нужна поддержка", "служба помощи",
        
        # Менеджер
        "соедините с менеджером", "нужен менеджер", "хочу менеджера",
        "руководитель", "начальник",
        
        # Специалисты
        "нужен специалист", "консультант", "эксперт",
        
        # Жалобы
        "подать жалобу", "есть жалоба", "хочу пожаловаться",
        "недоволен сервисом", "плохое обслуживание",
        
        # Более умные паттерны
        "не могу решить проблему", "нужна серьезная помощь",
        "это сложный вопрос", "требуется вмешательство"
    ]
    
    print("🎯 РЕКОМЕНДУЕМЫЕ УЛУЧШЕНИЯ:")
    print()
    print("1. ИСПОЛЬЗОВАТЬ БОЛЕЕ ТОЧНЫЕ ПАТТЕРНЫ вместо одиночных слов:")
    for keyword in improved_keywords:
        print(f"   • '{keyword}'")
    
    print()
    print("2. ДОБАВИТЬ КОНТЕКСТНЫЙ АНАЛИЗ:")
    print("   • Проверять не только наличие слова, но и контекст")
    print("   • Исключать техническое использование (оператор в программировании)")
    print("   • Учитывать эмоциональную окраску сообщения")
    
    print()
    print("3. УЛУЧШИТЬ AI FALLBACK DETECTION:")
    print("   • Анализировать уверенность AI в ответе")
    print("   • Считать количество 'не знаю' в диалоге")
    print("   • Определять сложность вопроса")
    
    print()
    print("4. УНИФИЦИРОВАТЬ ЛОГИКУ:")
    print("   • Использовать один источник ключевых слов для всех каналов")
    print("   • Создать единый сервис определения handoff потребности")
    print("   • Настраиваемость через переменные окружения")

def main():
    print("🔧 ReplyX Handoff Detection Analysis")
    print()
    
    # Анализируем текущее состояние
    analyze_keyword_detection()
    
    # Тестируем покрытие
    triggered, total_should, false_pos, total_shouldnt = test_keyword_coverage()
    
    # Предлагаем улучшения  
    suggest_improvements()
    
    print("\n" + "=" * 80)
    print("📊 ИТОГОВАЯ ОЦЕНКА СИСТЕМЫ:")
    print(f"✅ Покрытие целевых фраз: {triggered}/{total_should} ({triggered/total_should*100:.1f}%)")
    print(f"❌ Ложные срабатывания: {false_pos}/{total_shouldnt} ({false_pos/total_shouldnt*100:.1f}%)")
    
    if triggered/total_should >= 0.8 and false_pos/total_shouldnt <= 0.2:
        print("🎉 Система работает достаточно хорошо!")
    elif triggered/total_should >= 0.6:
        print("⚠️ Система работает удовлетворительно, но есть место для улучшений")
    else:
        print("🚨 Система требует серьезных улучшений!")

if __name__ == "__main__":
    main()