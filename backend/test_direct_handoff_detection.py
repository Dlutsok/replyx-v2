#!/usr/bin/env python3
"""
Тест handoff detection напрямую - проверяем работает ли детектор
"""
import sys
import os
from pathlib import Path

# Add the backend path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

# Test direct handoff detection
def test_direct_handoff_detection():
    print("🧪 ТЕСТ ПРЯМОГО HANDOFF DETECTION")
    print("=" * 60)
    
    try:
        from services.improved_handoff_detector import ImprovedHandoffDetector
        
        detector = ImprovedHandoffDetector()
        
        # Тестируем различные фразы
        test_phrases = [
            "оператор",
            "а человека можно мне?",
            "модешь меня подключить на оператора?",
            "привет",  # should NOT trigger handoff
            "спасибо"  # should NOT trigger handoff
        ]
        
        for phrase in test_phrases:
            should_handoff, reason, details = detector.should_request_handoff(
                user_text=phrase
            )
            
            print(f"📝 Текст: '{phrase}'")
            print(f"   Should handoff: {should_handoff}")
            print(f"   Reason: {reason}")
            print(f"   Score: {details.get('total_score', 0):.2f}")
            print(f"   Patterns: {[p['description'] for p in details.get('matched_patterns', [])]}")
            print()
        
        return True
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_direct_handoff_detection()
    if success:
        print("✅ DIRECT HANDOFF DETECTION TEST COMPLETED")
    else:
        print("❌ DIRECT HANDOFF DETECTION TEST FAILED")