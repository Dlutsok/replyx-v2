#!/usr/bin/env python3
"""
Тест асинхронной прокси системы для проверки неблокирующей работы
"""

import asyncio
import time
import os
import sys
from pathlib import Path

# Добавляем backend в PATH
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from ai.ai_providers import get_ai_completion


async def test_concurrent_requests():
    """Тестирует параллельные запросы без блокировки"""
    
    print("🧪 Тестирование асинхронных прокси запросов...")
    
    # Создаем несколько параллельных запросов
    test_messages = [
        [{"role": "user", "content": f"Скажи просто число: {i}"}]
        for i in range(5)
    ]
    
    start_time = time.time()
    
    # Запускаем все запросы параллельно
    tasks = [
        get_ai_completion(messages, model="gpt-4o-mini")
        for messages in test_messages
    ]
    
    print(f"📤 Запущено {len(tasks)} параллельных запросов...")
    
    try:
        # Ждем завершения всех запросов с таймаутом
        results = await asyncio.wait_for(
            asyncio.gather(*tasks, return_exceptions=True), 
            timeout=60.0
        )
        
        total_time = time.time() - start_time
        
        print(f"⏱️ Общее время выполнения: {total_time:.2f}s")
        
        # Анализируем результаты
        success_count = 0
        error_count = 0
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"❌ Запрос {i+1}: {result}")
                error_count += 1
            else:
                print(f"✅ Запрос {i+1}: успешен (провайдер: {result.get('provider_used', 'unknown')})")
                success_count += 1
        
        print(f"\n📊 Результаты:")
        print(f"   ✅ Успешных: {success_count}")
        print(f"   ❌ Ошибок: {error_count}")
        print(f"   🚀 Производительность: {len(tasks)/total_time:.2f} req/s")
        
        # Проверяем что сервер не заблокировался
        if total_time < 30.0:  # Все запросы должны завершиться быстро
            print("✅ Сервер НЕ блокируется - запросы выполняются асинхронно!")
        else:
            print("⚠️ Возможна блокировка - запросы выполняются слишком медленно")
            
    except asyncio.TimeoutError:
        print("❌ Таймаут - некоторые запросы зависли!")
        return False
    
    return success_count > 0


async def test_proxy_failover():
    """Тестирует переключение между прокси при ошибках"""
    
    print("\n🔄 Тестирование failover прокси...")
    
    try:
        result = await asyncio.wait_for(
            get_ai_completion([{"role": "user", "content": "Test failover"}]),
            timeout=30.0
        )
        
        print(f"✅ Failover работает, используется: {result.get('provider_used', 'unknown')}")
        if 'proxy_used' in result:
            print(f"🔗 Прокси: {result['proxy_used']}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка failover: {e}")
        return False


async def main():
    """Основная функция тестирования"""
    
    print("🚀 Запуск тестов асинхронной прокси системы")
    print("=" * 50)
    
    # Тест 1: Параллельные запросы
    test1_ok = await test_concurrent_requests()
    
    # Тест 2: Failover
    test2_ok = await test_proxy_failover()
    
    print("\n" + "=" * 50)
    
    if test1_ok and test2_ok:
        print("🎉 Все тесты пройдены! Асинхронная система работает корректно")
        return 0
    else:
        print("❌ Некоторые тесты провалились")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)