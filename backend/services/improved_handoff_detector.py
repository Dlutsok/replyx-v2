"""
Улучшенная система определения потребности в операторе
Заменяет простой поиск ключевых слов на более умный анализ
"""

import re
from typing import Tuple, List, Dict
from dataclasses import dataclass

@dataclass
class HandoffPattern:
    """Паттерн для определения запроса оператора"""
    pattern: str
    reason: str
    weight: float
    description: str

class ImprovedHandoffDetector:
    """Улучшенная система определения handoff с контекстным анализом"""
    
    def __init__(self):
        # Паттерны для определения запросов оператора
        self.handoff_patterns = [
            # Прямые запросы оператора
            HandoffPattern(r'\bоператор\b(?!.{0,20}(?:if|while|for|присваивани|сравнени|\+\=|\-\=|\*\=|python|javascript|java|sql|программировани))', "direct_operator", 0.9, 
                         "Одиночное слово 'оператор'"),
            HandoffPattern(r'(?:нужен|хочу|соедините|переключите|вызовите|дайте|позовите).{0,20}оператор', "direct_operator", 1.0, 
                         "Прямой запрос оператора"),
            HandoffPattern(r'оператор.{0,20}(?:нужен|пожалуйста|помогите)', "direct_operator", 1.0,
                         "Прямой запрос оператора"),
            HandoffPattern(r'(?:подключи|подключите|подключить).{0,20}(?:к|на|меня).{0,20}оператор', "direct_operator", 1.0,
                         "Просьба подключить к оператору"),
            HandoffPattern(r'(?:можешь|можете|модешь).{0,20}(?:подключить|соединить).{0,20}(?:с|к|на|меня).{0,20}оператор', "direct_operator", 1.0,
                         "Вопрос о подключении к оператору"),
            
            # Живой человек
            HandoffPattern(r'(?:нужен|хочу|соедините).{0,20}(?:живого|реального).{0,10}человек', "human_request", 1.0,
                         "Запрос живого человека"),
            HandoffPattern(r'(?:живой|реальный) человек', "human_request", 0.9,
                         "Запрос живого человека"),
            HandoffPattern(r'(?:хочу|нужно).{0,30}с (?:живым|реальным) человеком', "human_request", 0.9,
                         "Разговор с живым человеком"),
            HandoffPattern(r'(?:можно|дайте|позовите).{0,20}человека', "human_request", 0.9,
                         "Просьба позвать человека"),
            HandoffPattern(r'человека.{0,10}(?:можно|дайте|позовите)', "human_request", 0.9,
                         "Просьба позвать человека"),
            HandoffPattern(r'(?:нужен|хочу).{0,10}человек', "human_request", 0.8,
                         "Запрос человека"),
            HandoffPattern(r'(?:хочу|могу).{0,30}поговорить.{0,20}с человеком', "human_request", 0.9,
                         "Желание поговорить с человеком"),
            
            # Поддержка и помощь (с контекстом)
            HandoffPattern(r'(?:служба|техническая|тех).{0,10}поддержка', "support_request", 0.8,
                         "Запрос службы поддержки"),
            HandoffPattern(r'обрат.{0,15}в.{0,10}(?:службу.{0,10})?поддержк', "support_request", 0.9,
                         "Обращение в поддержку"),
            HandoffPattern(r'(?:серьезная|срочная|профессиональная).{0,10}помощь', "help_request", 0.8,
                         "Запрос серьезной помощи"),
            
            # Менеджер
            HandoffPattern(r'(?:нужен|хочу|соедините).{0,20}(?:менеджер|руководител|начальник)', "manager_request", 0.9,
                         "Запрос менеджера"),
            
            # Специалисты
            HandoffPattern(r'(?:нужен|хочу).{0,20}(?:специалист|консультант|эксперт)', "specialist_request", 0.8,
                         "Запрос специалиста"),
            
            # Жалобы
            HandoffPattern(r'(?:хочу|подать|есть).{0,20}жалобу?', "complaint", 0.9,
                         "Подача жалобы"),
            HandoffPattern(r'(?:недоволен|плохо|ужасно).{0,30}(?:сервис|обслуживани|работ)', "complaint", 0.8,
                         "Недовольство сервисом"),
            
            # Проблемы (с эмоциональным контекстом)
            HandoffPattern(r'(?:серьезная|сложная|большая).{0,10}проблема', "complex_problem", 0.7,
                         "Сложная проблема"),
            HandoffPattern(r'не (?:могу|получается|удается) решить', "cannot_solve", 0.8,
                         "Не может решить сам"),
            
            # Фрустрация
            HandoffPattern(r'(?:третий|несколько|много) раз (?:пытаюсь|спрашиваю|прошу)', "frustration", 0.7,
                         "Повторные попытки"),
            HandoffPattern(r'(?:уже|давно) (?:пытаюсь|жду|прошу)', "frustration", 0.6,
                         "Длительные попытки"),
            
            # English patterns
            HandoffPattern(r'(?:need|want|connect).{0,20}(?:human|operator|agent)', "english_request", 1.0,
                         "English operator request"),
            HandoffPattern(r'speak.{0,20}(?:human|person|agent)', "english_request", 0.9,
                         "English human request"),
            HandoffPattern(r'customer (?:service|support)', "english_request", 0.8,
                         "English support request"),
        ]
        
        # Исключающие паттерны (ложные срабатывания)
        self.exclusion_patterns = [
            # Технические термины
            r'оператор.{0,20}(?:if|while|for|присваивани|сравнени|\+\=|\-\=|\*\=)',
            r'(?:логический|арифметический|битовый).{0,10}оператор',
            r'оператор.{0,20}(?:python|javascript|java|sql|программировани)',
            
            # Общие термины
            r'человек.{0,20}(?:млекопитающее|животное|существо|вид|особь)',
            r'поддержка.{0,20}(?:файлов|формат|верси|технологи)',
            r'менеджер.{0,20}(?:задач|пакет|проект|файл|memory|памяти)',
            
            # Вопросы о понятиях
            r'что (?:такое|это|означает).{0,20}(?:оператор|менеджер|поддержка)',
            r'как (?:работает|использовать).{0,20}(?:оператор|менеджер)',
        ]
        
        # Паттерны для AI fallback
        self.ai_fallback_patterns = [
            r'не (?:могу|смогу|знаю как) (?:ответить|помочь|решить)',
            r'(?:не хватает|недостаточно) (?:информации|данных)',
            r'обратитесь в (?:поддержку|службу поддержки)',
            r'(?:не уверен|затрудняюсь) ответить',
            r'это (?:сложный|специфический|особый) (?:вопрос|случай)',
            r'рекомендую (?:обратиться|связаться)',
            r'(?:cannot|can\'t|unable to) (?:answer|help|solve)',
            r'(?:don\'t|do not) (?:know|have) (?:enough|sufficient)',
            r'contact (?:support|our team)',
        ]

    def should_request_handoff(self, user_text: str, ai_text: str = None, dialog=None) -> Tuple[bool, str, Dict]:
        """
        Определяет нужен ли handoff с подробной диагностикой
        
        Returns:
            Tuple[bool, str, dict]: (should_handoff, reason, details)
        """
        details = {
            "matched_patterns": [],
            "excluded_patterns": [],
            "total_score": 0.0,
            "threshold": 0.5,
            "ai_fallback": False
        }
        
        # 1. Проверяем исключающие паттерны
        user_text_clean = user_text.lower()
        for exclusion_pattern in self.exclusion_patterns:
            if re.search(exclusion_pattern, user_text_clean):
                details["excluded_patterns"].append(exclusion_pattern)
                # Если есть исключающий паттерн, снижаем вероятность
                return False, "excluded_pattern", details
        
        # 2. Проверяем handoff паттерны
        total_score = 0.0
        for pattern in self.handoff_patterns:
            match = re.search(pattern.pattern, user_text_clean)
            if match:
                details["matched_patterns"].append({
                    "pattern": pattern.pattern,
                    "reason": pattern.reason,
                    "weight": pattern.weight,
                    "description": pattern.description,
                    "matched_text": match.group()
                })
                total_score += pattern.weight
        
        details["total_score"] = total_score
        
        # 3. Проверяем AI fallback если есть ответ AI
        if ai_text:
            ai_text_clean = ai_text.lower()
            for fallback_pattern in self.ai_fallback_patterns:
                if re.search(fallback_pattern, ai_text_clean):
                    details["ai_fallback"] = True
                    total_score += 0.8  # Добавляем вес за AI fallback
                    break
        
        # 4. Проверяем контекст диалога (повторные проблемы)
        if dialog and hasattr(dialog, 'fallback_count') and dialog.fallback_count >= 2:
            total_score += 0.6
            details["repeated_issues"] = True
        
        details["total_score"] = total_score
        
        # 5. Принимаем решение
        if total_score >= details["threshold"]:
            # Определяем основную причину
            if details.get("ai_fallback"):
                main_reason = "fallback"
            elif details.get("repeated_issues"):
                main_reason = "retries" 
            elif details["matched_patterns"]:
                main_reason = "keyword"
            else:
                main_reason = "manual"
                
            return True, main_reason, details
        
        return False, "", details

    def get_improved_keywords_for_config(self) -> Dict[str, List[str]]:
        """Возвращает улучшенные ключевые слова для конфигурации"""
        return {
            "phrases_ru": [
                "нужен оператор", "хочу оператора", "соедините с оператором",
                "живой человек", "реальный человек", "нужен человек",
                "служба поддержки", "техподдержка", "обратиться в поддержку",
                "нужен менеджер", "соедините с менеджером",
                "нужен специалист", "консультант", "эксперт",
                "подать жалобу", "есть жалоба", "недоволен сервисом",
                "серьезная проблема", "не могу решить", "сложный вопрос"
            ],
            "phrases_en": [
                "need operator", "human support", "connect to agent",
                "speak with human", "customer service", "need help",
                "want to complain", "serious problem"
            ],
            "exclusions": [
                "оператор if", "оператор while", "логический оператор",
                "менеджер задач", "поддержка файлов", "что такое оператор"
            ]
        }

def test_improved_detector():
    """Тестирует улучшенную систему"""
    detector = ImprovedHandoffDetector()
    
    # Тестовые случаи
    test_cases = [
        # Должны срабатывать
        ("нужен оператор", True),
        ("соедините с оператором пожалуйста", True), 
        ("хочу поговорить с живым человеком", True),
        ("обратиться в службу поддержки", True),
        ("у меня серьезная проблема", True),
        ("подать жалобу на сервис", True),
        ("не могу решить эту проблему", True),
        ("need human operator", True),
        
        # НЕ должны срабатывать
        ("оператор if в Python", False),
        ("что такое логический оператор", False),
        ("менеджер задач Windows", False),
        ("поддержка файлов PDF", False),
        ("человек это млекопитающее", False),
        ("техническая проблема с кодом", False),
    ]
    
    print("🧪 ТЕСТ УЛУЧШЕННОЙ СИСТЕМЫ:")
    print("=" * 60)
    
    correct = 0
    for text, expected in test_cases:
        should_handoff, reason, details = detector.should_request_handoff(text)
        status = "✅" if should_handoff == expected else "❌"
        score = details["total_score"]
        
        print(f"{status} '{text}' -> {should_handoff} (score: {score:.2f})")
        if details["matched_patterns"]:
            for pattern in details["matched_patterns"]:
                print(f"    📋 {pattern['description']} (weight: {pattern['weight']})")
        if details["excluded_patterns"]:
            print(f"    🚫 Исключен: {len(details['excluded_patterns'])} паттернов")
        
        if should_handoff == expected:
            correct += 1
    
    print(f"\n📊 Результат: {correct}/{len(test_cases)} ({correct/len(test_cases)*100:.1f}%)")
    
if __name__ == "__main__":
    test_improved_detector()