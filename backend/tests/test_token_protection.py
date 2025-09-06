"""
КРИТИЧНЫЕ ТЕСТЫ: Защита от трат токенов
Гарантирует, что в CI/тестах никогда не будут потрачены реальные токены
"""

import os
import pytest
import asyncio
from unittest.mock import patch

from services.llm_client import (
    get_llm, 
    FakeLLM, 
    OpenAILLM, 
    AnthropicLLM,
    generate_ai_response,
    check_dry_run_request
)
from services.ws_config import (
    IS_TEST_ENV, 
    BLOCK_EXTERNAL_IO, 
    LLM_PROVIDER,
    FAKE_LLM_MODE
)
from conftest import ensure_no_tokens_spent, NoTokensError


class TestTokenProtection:
    """Охранные тесты защиты от трат токенов"""
    
    def test_environment_configuration(self):
        """Проверяет корректность тестового окружения"""
        # Импортируем свежие значения после установки переменных окружения
        from services.ws_config import ENVIRONMENT, IS_TEST_ENV, BLOCK_EXTERNAL_IO, LLM_PROVIDER
        assert ENVIRONMENT == "test", f"Expected ENVIRONMENT=test, got: {ENVIRONMENT}"
        assert IS_TEST_ENV == True, f"IS_TEST_ENV must be True in tests, got: {IS_TEST_ENV}"
        assert BLOCK_EXTERNAL_IO == True, f"BLOCK_EXTERNAL_IO must be True, got: {BLOCK_EXTERNAL_IO}"
        assert LLM_PROVIDER == "fake", f"LLM_PROVIDER must be 'fake' in tests, got: {LLM_PROVIDER}"
    
    def test_get_llm_returns_fake_only(self):
        """Гарантирует что get_llm() возвращает только FakeLLM"""
        # Базовый вызов
        llm = get_llm()
        assert llm.__class__.__name__ == "FakeLLM", f"Expected FakeLLM, got: {type(llm)}"
        
        # С dry_run=False (всё равно должен быть fake в тестах)
        llm_no_dry = get_llm(dry_run=False)
        assert llm_no_dry.__class__.__name__ == "FakeLLM", f"Expected FakeLLM even with dry_run=False, got: {type(llm_no_dry)}"
        
        # С provider_override (должен игнорировать в тестах)
        llm_override = get_llm(provider_override="openai")
        assert llm_override.__class__.__name__ == "FakeLLM", f"Expected FakeLLM even with openai override, got: {type(llm_override)}"
    
    def test_real_providers_blocked(self):
        """Проверяет что реальные провайдеры заблокированы в тестах"""
        
        # OpenAI должен выбрасывать исключение
        with pytest.raises(RuntimeError, match="External IO blocked"):
            OpenAILLM(api_key="fake-key")
            
        # Anthropic должен выбрасывать исключение  
        with pytest.raises(RuntimeError, match="External IO blocked"):
            AnthropicLLM(api_key="fake-key")
    
    @pytest.mark.asyncio
    async def test_fake_llm_modes(self):
        """Тестирует различные режимы FakeLLM"""
        
        # Echo режим
        fake_echo = FakeLLM(mode="echo")
        result = await fake_echo.chat([{"role": "user", "content": "test message"}])
        assert "test message" in result["content"]
        assert result["metadata"]["is_fake"] == True
        assert result["metadata"]["tokens_used"] == 0
        
        # Stub режим
        fake_stub = FakeLLM(mode="stub")
        result = await fake_stub.chat([{"role": "user", "content": "anything"}])
        assert "[FAKE/stub]" in result["content"]
        assert result["metadata"]["is_fake"] == True
        
        # Script режим
        fake_script = FakeLLM(mode="script")
        result = await fake_script.chat(
            [{"role": "user", "content": "test"}], 
            dialog_id=123
        )
        assert "диалога 123" in result["content"]
        assert result["metadata"]["is_fake"] == True
    
    @pytest.mark.asyncio 
    async def test_generate_ai_response_wrapper(self):
        """Тестирует обёртку generate_ai_response"""
        messages = [{"role": "user", "content": "Hello AI"}]
        
        result = await generate_ai_response(messages, dialog_id=456)
        
        assert result["role"] == "assistant"
        assert "Hello AI" in result["content"]  # Echo режим
        assert result["metadata"]["is_fake"] == True
        assert result["metadata"]["tokens_used"] == 0
        assert result["metadata"]["cost"] == 0.0
        assert result["metadata"]["dialog_id"] == 456
    
    def test_dry_run_detection(self):
        """Тестирует определение dry-run режима из заголовков"""
        
        # Тест заголовка X-Dry-Run
        headers_true = {"X-Dry-Run": "1"}
        assert check_dry_run_request(headers=headers_true) == True
        
        headers_false = {"X-Dry-Run": "0"}
        assert check_dry_run_request(headers=headers_false) == False
        
        # Тест query параметра
        query_true = {"dry_run": "true"}
        assert check_dry_run_request(query_params=query_true) == True
        
        query_false = {"dry_run": "false"}
        assert check_dry_run_request(query_params=query_false) == False
        
        # Без параметров
        assert check_dry_run_request() == False
    
    def test_protection_utility_function(self):
        """Тестирует утилиту проверки защиты"""
        # В тестовом окружении должно проходить без исключений
        ensure_no_tokens_spent()
        
        # Симулируем отключение защиты
        with patch.dict(os.environ, {"IS_TEST_ENV": "false", "BLOCK_EXTERNAL_IO": "false"}):
            # Нужно переимпортировать модуль чтобы переменные обновились
            import importlib
            import services.ws_config as ws_config
            importlib.reload(ws_config)
            
            with pytest.raises(NoTokensError):
                ensure_no_tokens_spent()


class TestTokenProtectionIntegration:
    """Интеграционные тесты защиты токенов"""
    
    @pytest.mark.asyncio
    async def test_multiple_concurrent_calls(self):
        """Тестирует множественные параллельные вызовы LLM"""
        
        async def make_ai_call(dialog_id: int):
            return await generate_ai_response(
                [{"role": "user", "content": f"Message {dialog_id}"}],
                dialog_id=dialog_id
            )
        
        # Создаём 10 параллельных вызовов
        tasks = [make_ai_call(i) for i in range(10)]
        results = await asyncio.gather(*tasks)
        
        # Все должны быть fake
        for i, result in enumerate(results):
            assert result["metadata"]["is_fake"] == True
            assert result["metadata"]["tokens_used"] == 0
            assert result["metadata"]["dialog_id"] == i
            assert f"Message {i}" in result["content"]
    
    def test_various_provider_attempts(self):
        """Тестирует попытки использования различных провайдеров"""
        
        providers = ["openai", "anthropic", "unknown", ""]
        
        for provider in providers:
            llm = get_llm(provider_override=provider)
            assert llm.__class__.__name__ == "FakeLLM", f"Provider {provider} should return FakeLLM in tests"
    
    @pytest.mark.asyncio
    async def test_stress_token_protection(self):
        """Стресс-тест защиты токенов при высокой нагрузке"""
        
        # Создаём много задач одновременно
        tasks = []
        for i in range(100):
            for provider in ["openai", "anthropic", "fake"]:
                task = asyncio.create_task(
                    generate_ai_response(
                        [{"role": "user", "content": f"Stress test {i}"}],
                        dialog_id=i
                    )
                )
                tasks.append(task)
        
        # Ждём выполнения всех задач
        results = await asyncio.gather(*tasks)
        
        # Проверяем что ВСЕ результаты fake
        total_tokens = 0
        total_cost = 0.0
        fake_count = 0
        
        for result in results:
            if result["metadata"]["is_fake"]:
                fake_count += 1
            total_tokens += result["metadata"]["tokens_used"]
            total_cost += result["metadata"]["cost"]
        
        assert fake_count == len(results), "All results must be fake in tests"
        assert total_tokens == 0, f"No tokens should be spent, but spent: {total_tokens}"
        assert total_cost == 0.0, f"No cost should be incurred, but cost: {total_cost}"
        
        print(f"✅ Completed {len(results)} AI calls with ZERO tokens spent")


class TestProductionScenarios:
    """Тесты сценариев для production (с защитой)"""
    
    def test_production_config_simulation(self):
        """Симулирует production конфигурацию (но без реальных вызовов)"""
        
        # Временно меняем конфигурацию
        with patch.dict(os.environ, {
            "ENVIRONMENT": "production",
            "LLM_PROVIDER": "openai", 
            "BLOCK_EXTERNAL_IO": "true"  # Защита всё равно включена
        }):
            # Переимпортируем конфигурацию
            import importlib
            import services.ws_config as ws_config
            importlib.reload(ws_config)
            
            # Даже в "продакшене" с BLOCK_EXTERNAL_IO=true должен быть fake
            llm = get_llm()
            assert llm.__class__.__name__ == "FakeLLM", "BLOCK_EXTERNAL_IO should prevent real LLM usage"


if __name__ == "__main__":
    # Запуск охранных тестов  
    pytest.main([__file__, "-v", "--tb=short", "-x"])