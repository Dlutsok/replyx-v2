"""
Глобальная конфигурация pytest с защитой от трат токенов
Автоматически включает фейковый LLM режим во всех тестах
"""

import os
import pytest
import logging

logger = logging.getLogger(__name__)


@pytest.fixture(autouse=True, scope="session")
def force_test_environment():
    """
    КРИТИЧНАЯ ЗАЩИТА: Принудительно включает тестовое окружение
    Предотвращает траты токенов во всех тестах
    """
    # Сохраняем оригинальные значения для восстановления
    original_env = {}
    
    # Критичные переменные для защиты от трат токенов
    test_env_vars = {
        "ENVIRONMENT": "test",
        "LLM_PROVIDER": "fake", 
        "FAKE_LLM_MODE": "echo",
        "BLOCK_EXTERNAL_IO": "true",
        "IS_TEST_ENV": "true",
        "SECRET_KEY": "dummy_secret_key_for_tests_only",
        "OPENAI_API_KEY": "dummy",
        "REPLYX_PROXY_DISABLED": "1"
    }
    
    for key, value in test_env_vars.items():
        original_env[key] = os.environ.get(key)
        os.environ[key] = value
        
    logger.info("🔒 Test environment enforced - all external LLM calls blocked")
    logger.info(f"🔒 Environment variables: {test_env_vars}")
    
    yield
    
    # Восстанавливаем оригинальные значения после тестов
    for key, original_value in original_env.items():
        if original_value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = original_value


@pytest.fixture(autouse=True, scope="function")  
def verify_no_real_llm():
    """
    Проверяет, что в каждом тесте используется только FakeLLM
    Дополнительная защита от регрессии
    """
    # Принудительно переустанавливаем переменные окружения на каждом тесте
    critical_vars = {
        "ENVIRONMENT": "test",
        "LLM_PROVIDER": "fake", 
        "FAKE_LLM_MODE": "echo",
        "BLOCK_EXTERNAL_IO": "true",
        "IS_TEST_ENV": "true",
        "SECRET_KEY": "dummy_secret_key_for_tests_only",
        "OPENAI_API_KEY": "dummy",
        "REPLYX_PROXY_DISABLED": "1"
    }
    
    for key, value in critical_vars.items():
        os.environ[key] = value
    
    # Переимпортируем модули после установки переменных окружения
    import importlib
    import services.ws_config
    import services.llm_client
    importlib.reload(services.ws_config)
    importlib.reload(services.llm_client)
    
    from services.llm_client import get_llm, FakeLLM
    from services.ws_config import IS_TEST_ENV, BLOCK_EXTERNAL_IO, LLM_PROVIDER, ENVIRONMENT
    
    # Проверяем конфигурацию перед каждым тестом
    assert ENVIRONMENT == "test", f"ENVIRONMENT must be 'test' in tests, got: {ENVIRONMENT}"
    assert IS_TEST_ENV, f"IS_TEST_ENV must be True in tests, got: {IS_TEST_ENV}"
    assert BLOCK_EXTERNAL_IO, f"BLOCK_EXTERNAL_IO must be True in tests, got: {BLOCK_EXTERNAL_IO}"
    assert LLM_PROVIDER == "fake", f"LLM_PROVIDER must be 'fake' in tests, got: {LLM_PROVIDER}"
    
    # Проверяем что get_llm() возвращает только FakeLLM
    llm = get_llm()
    assert llm.__class__.__name__ == "FakeLLM", f"Expected FakeLLM, got: {type(llm)}"
    
    # Дополнительная проверка с dry_run=False (должен всё равно вернуть FakeLLM)
    llm_no_dry = get_llm(dry_run=False)
    assert llm_no_dry.__class__.__name__ == "FakeLLM", f"Even with dry_run=False, expected FakeLLM in tests, got: {type(llm_no_dry)}"
    
    yield
    
    logger.debug("✅ Test completed without real LLM usage")


# Опциональные фикстуры для специальных случаев

@pytest.fixture
def fake_llm():
    """Предоставляет FakeLLM инстанс для тестов"""
    from services.llm_client import FakeLLM
    return FakeLLM(mode="echo")


@pytest.fixture  
def mock_ai_messages():
    """Предоставляет тестовые сообщения для AI"""
    return [
        {"role": "system", "content": "You are a helpful assistant"}, 
        {"role": "user", "content": "Hello, how are you?"}
    ]


@pytest.fixture
def dry_run_headers():
    """HTTP заголовки для включения dry-run режима"""
    return {"X-Dry-Run": "1", "Content-Type": "application/json"}


# Пользовательские маркеры для pytest

def pytest_configure(config):
    """Регистрируем пользовательские маркеры"""
    config.addinivalue_line(
        "markers", 
        "live_ai: mark test to use real AI providers (requires explicit opt-in)"
    )
    config.addinivalue_line(
        "markers",
        "external_io: mark test as requiring external network access"
    )


@pytest.fixture
def live_ai_test(request):
    """
    Фикстура для редких тестов с реальными AI провайдерами
    Требует явного маркера @pytest.mark.live_ai
    """
    if not request.node.get_closest_marker("live_ai"):
        pytest.skip("Test requires @pytest.mark.live_ai marker")
        
    # Временно разрешаем внешние вызовы ТОЛЬКО для специально помеченных тестов
    original_block = os.environ.get("BLOCK_EXTERNAL_IO")
    os.environ["BLOCK_EXTERNAL_IO"] = "false"
    
    logger.warning("⚠️ LIVE AI TEST: Real tokens may be spent!")
    
    yield
    
    # Восстанавливаем защиту
    if original_block:
        os.environ["BLOCK_EXTERNAL_IO"] = original_block
        
        
# Хук для сбора статистики тестов

def pytest_sessionfinish(session, exitstatus):
    """Выводит статистику после завершения тестов"""
    logger.info("🔒 Test session completed with token spending protection active")
    
    # Подсчитываем количество тестов с live_ai маркером
    live_ai_tests = []
    for item in session.items:
        if item.get_closest_marker("live_ai"):
            live_ai_tests.append(item.name)
            
    if live_ai_tests:
        logger.warning(f"⚠️ {len(live_ai_tests)} tests marked for live AI usage: {live_ai_tests}")
    else:
        logger.info("✅ No tests used real AI providers - zero tokens spent")
        

# Дополнительные утилиты для тестирования

class NoTokensError(Exception):
    """Исключение, выбрасываемое при попытке потратить токены в тестах"""
    pass


def ensure_no_tokens_spent():
    """Утилита для явной проверки в тестах"""
    # Получаем свежие значения из os.environ напрямую, т.к. импорты кешируются
    is_test_env = os.getenv('ENVIRONMENT', 'development').lower() in {'test', 'ci'} or os.getenv('IS_TEST_ENV', 'false').lower() == 'true'
    block_external_io = os.getenv('BLOCK_EXTERNAL_IO', 'false').lower() == 'true'
    
    if not is_test_env or not block_external_io:
        raise NoTokensError(
            "Token spending protection is not active! "
            f"IS_TEST_ENV={is_test_env}, BLOCK_EXTERNAL_IO={block_external_io}"
        )