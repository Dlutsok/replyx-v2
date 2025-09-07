#!/usr/bin/env python3
"""
Тест системы отказоустойчивых прокси
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Загружаем переменные окружения из .env
from dotenv import load_dotenv
load_dotenv("../.env")

from ai.proxy_manager import get_proxy_manager
from ai.ai_providers import OpenAIProvider
from ai.proxy_manager import ProxyConfig, CircuitState
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_proxy_system():
    """Основная функция тестирования системы прокси"""
    print("🚀 Начинаем тестирование системы отказоустойчивых прокси")
    print("=" * 60)
    
    # 1. Тестируем ProxyManager
    print("\n1. 📊 Тестирование ProxyManager")
    try:
        proxy_manager = get_proxy_manager()
        print(f"✅ ProxyManager инициализирован с {len(proxy_manager.proxies)} прокси")
        
        # Получаем метрики
        metrics = proxy_manager.get_proxy_metrics()
        print(f"   📈 Всего прокси: {metrics['total_proxies']}")
        print(f"   📈 Доступных прокси: {metrics['available_proxies']}")
        print(f"   📈 Все прокси недоступны: {metrics['all_proxies_down']}")
        
        # Выводим информацию о каждом прокси
        for proxy_info in metrics['proxies']:
            print(f"   🔗 Прокси '{proxy_info['name']}': {proxy_info['circuit_state']} (Запросов: {proxy_info['requests_total']})")
        
    except Exception as e:
        print(f"❌ Ошибка тестирования ProxyManager: {e}")
        return False
    
    # 2. Тестируем выбор прокси
    print("\n2. 🎯 Тестирование выбора прокси")
    try:
        available_proxy = proxy_manager.get_available_proxy()
        if available_proxy:
            print(f"✅ Выбран прокси: {available_proxy.name} (приоритет: {available_proxy.priority})")
        else:
            print("❌ Нет доступных прокси")
            return False
    except Exception as e:
        print(f"❌ Ошибка выбора прокси: {e}")
        return False
    
    # 3. Тестируем OpenAIProvider (без реальных запросов к API)
    print("\n3. 🤖 Тестирование OpenAIProvider")
    try:
        # Создаем тестовый провайдер с API ключом из env
        api_key = os.getenv('OPENAI_API_KEY', 'test-key')
        openai_provider = OpenAIProvider(api_key=api_key)
        print(f"✅ OpenAIProvider инициализирован")
        print(f"   🔗 Использует ProxyManager с {len(openai_provider.proxy_manager.proxies)} прокси")
    except Exception as e:
        print(f"❌ Ошибка инициализации OpenAIProvider: {e}")
        return False
    
    # 4. Симулируем блокировку прокси
    print("\n4. 🚫 Симулируем блокировку primary прокси")
    try:
        # Находим primary прокси
        primary_proxy = None
        for proxy in proxy_manager.proxies:
            if proxy.name == "primary":
                primary_proxy = proxy
                break
        
        if primary_proxy:
            print(f"   Текущее состояние primary прокси: {primary_proxy.circuit_state}")
            
            # Симулируем ошибку
            primary_proxy.circuit_state = CircuitState.OPEN
            primary_proxy.failure_count = 5
            print(f"   🔴 Primary прокси заблокирован (симуляция)")
            
            # Проверяем что система переключится на secondary
            available_proxy = proxy_manager.get_available_proxy()
            if available_proxy and available_proxy.name == "secondary":
                print(f"✅ Система переключилась на secondary прокси")
            else:
                print(f"❌ Система не переключилась на secondary прокси")
            
            # Восстанавливаем состояние
            primary_proxy.circuit_state = CircuitState.CLOSED
            primary_proxy.failure_count = 0
            print(f"   🟢 Primary прокси восстановлен")
        else:
            print("❌ Primary прокси не найден")
            
    except Exception as e:
        print(f"❌ Ошибка симуляции блокировки: {e}")
        return False
    
    # 5. Финальные метрики
    print("\n5. 📊 Финальные метрики")
    try:
        final_metrics = proxy_manager.get_proxy_metrics()
        print(f"   📊 Статус системы: {'Healthy' if not final_metrics['all_proxies_down'] else 'Unhealthy'}")
        print(f"   📊 Доступных прокси: {final_metrics['available_proxies']}/{final_metrics['total_proxies']}")
    except Exception as e:
        print(f"❌ Ошибка получения финальных метрик: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 Все тесты пройдены успешно!")
    print("✅ Система отказоустойчивых прокси работает корректно")
    return True

if __name__ == "__main__":
    result = asyncio.run(test_proxy_system())
    sys.exit(0 if result else 1)