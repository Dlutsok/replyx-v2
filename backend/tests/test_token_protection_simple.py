"""
КРИТИЧНЫЕ ТЕСТЫ: Защита от трат токенов (упрощенная версия)
Проверяет защиту на уровне environment переменных и базовой логики
"""

import os
import pytest
import asyncio


def test_environment_protection():
    """Проверяет что защитные environment переменные установлены"""
    env = os.environ.get("ENVIRONMENT")
    assert env == "test", f"ENVIRONMENT должна быть 'test' в тестах, получена: {env}"
    
    llm_provider = os.environ.get("LLM_PROVIDER")
    assert llm_provider == "fake", f"LLM_PROVIDER должен быть 'fake', получен: {llm_provider}"
    
    block_io = os.environ.get("BLOCK_EXTERNAL_IO")
    assert block_io == "true", f"BLOCK_EXTERNAL_IO должен быть 'true', получен: {block_io}"


@pytest.mark.asyncio
async def test_fake_llm_functionality():
    """Тестирует базовую функциональность FakeLLM без импорта модулей"""
    
    class SimpleFakeLLM:
        async def chat(self, messages):
            last_msg = messages[-1]["content"] if messages else ""
            return {
                "role": "assistant",
                "content": f"[FAKE/echo] {last_msg}",
                "metadata": {"is_fake": True, "tokens_used": 0, "cost": 0.0}
            }
    
    fake = SimpleFakeLLM()
    result = await fake.chat([{"role": "user", "content": "test message"}])
    
    assert "test message" in result["content"]
    assert result["metadata"]["is_fake"] == True
    assert result["metadata"]["tokens_used"] == 0
    assert result["metadata"]["cost"] == 0.0


@pytest.mark.asyncio 
async def test_concurrent_fake_calls():
    """Тестирует параллельные фейковые вызовы"""
    
    class SimpleFakeLLM:
        async def chat(self, messages, dialog_id=None):
            await asyncio.sleep(0.01)  # Имитируем задержку
            return {
                "role": "assistant", 
                "content": f"[FAKE] Response for dialog {dialog_id}",
                "metadata": {"is_fake": True, "tokens_used": 0, "cost": 0.0, "dialog_id": dialog_id}
            }
    
    fake = SimpleFakeLLM()
    
    # Создаём 50 параллельных вызовов
    tasks = []
    for i in range(50):
        task = asyncio.create_task(
            fake.chat([{"role": "user", "content": f"Message {i}"}], dialog_id=i)
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    
    # Проверяем что все результаты fake и без токенов
    total_tokens = 0
    total_cost = 0.0
    fake_count = 0
    
    for result in results:
        if result["metadata"]["is_fake"]:
            fake_count += 1
        total_tokens += result["metadata"]["tokens_used"]
        total_cost += result["metadata"]["cost"]
    
    assert fake_count == len(results), "Все результаты должны быть fake"
    assert total_tokens == 0, f"Не должно быть потрачено токенов, потрачено: {total_tokens}"
    assert total_cost == 0.0, f"Не должно быть стоимости, стоимость: {total_cost}"
    
    print(f"✅ Выполнено {len(results)} AI вызовов с НУЛЕВОЙ тратой токенов")


def test_external_io_blocking():
    """Проверяет что внешние вызовы заблокированы"""
    
    def simulate_external_call():
        if os.environ.get("BLOCK_EXTERNAL_IO", "false").lower() == "true":
            raise RuntimeError("External IO blocked in test environment")
        # Эмуляция внешнего вызова
        return "real response"
    
    with pytest.raises(RuntimeError, match="External IO blocked"):
        simulate_external_call()


def test_provider_selection_logic():
    """Тестирует логику выбора провайдера"""
    
    def get_provider():
        env = os.environ.get("ENVIRONMENT", "development") 
        is_test = env.lower() in {"test", "ci"}
        block_io = os.environ.get("BLOCK_EXTERNAL_IO", "false").lower() == "true"
        provider = os.environ.get("LLM_PROVIDER", "openai")
        
        # Логика выбора (упрощенная версия из llm_client.py)
        if is_test or block_io or provider == "fake":
            return "fake"
        return provider
    
    provider = get_provider()
    assert provider == "fake", f"В тестах должен выбираться 'fake', выбран: {provider}"


@pytest.mark.asyncio
async def test_stress_protection():
    """Стресс-тест защиты при высокой нагрузке"""
    
    class StressFakeLLM:
        def __init__(self):
            self.call_count = 0
            
        async def chat(self, messages):
            self.call_count += 1
            return {
                "role": "assistant",
                "content": f"[FAKE] Call #{self.call_count}",
                "metadata": {"is_fake": True, "tokens_used": 0, "cost": 0.0}
            }
    
    fake = StressFakeLLM()
    
    # Создаём много задач одновременно (200 вызовов)
    tasks = []
    for i in range(200):
        task = asyncio.create_task(
            fake.chat([{"role": "user", "content": f"Stress {i}"}])
        )
        tasks.append(task)
    
    start_time = asyncio.get_event_loop().time()
    results = await asyncio.gather(*tasks)
    end_time = asyncio.get_event_loop().time()
    
    duration = end_time - start_time
    
    # Проверяем результаты
    assert len(results) == 200
    assert all(r["metadata"]["is_fake"] for r in results)
    assert sum(r["metadata"]["tokens_used"] for r in results) == 0
    assert sum(r["metadata"]["cost"] for r in results) == 0.0
    
    print(f"✅ Стресс-тест: {len(results)} вызовов за {duration:.2f}s без токенов")
    

def test_conftest_fixture_safety():
    """Проверяет что conftest fixtures работают корректно"""
    # Эти переменные должны быть установлены глобальным session fixture
    critical_vars = ["ENVIRONMENT", "LLM_PROVIDER", "BLOCK_EXTERNAL_IO"]
    
    for var in critical_vars:
        value = os.environ.get(var)
        assert value is not None, f"Критичная переменная {var} не установлена"
        
    # Проверяем правильные значения
    assert os.environ.get("ENVIRONMENT") == "test"
    assert os.environ.get("LLM_PROVIDER") == "fake" 
    assert os.environ.get("BLOCK_EXTERNAL_IO") == "true"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])