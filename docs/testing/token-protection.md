# Защита от трат токенов в тестах

## Обзор

Система защиты от трат токенов обеспечивает **нулевую стоимость всех LLM вызовов** в тестовом окружении. Это критически важно для предотвращения случайных трат на API-вызовы во время разработки, CI/CD и автоматизированного тестирования.

## Архитектура защиты

```
┌─────────────────────┐
│   conftest.py       │
│ ┌─────────────────┐ │
│ │ Session Fixture │ │ ← Принудительно устанавливает тестовые переменные
│ │ Function Fixture│ │ ← Валидирует каждый тест перед выполнением
│ └─────────────────┘ │
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│   ws_config.py      │
│ ┌─────────────────┐ │
│ │ ENVIRONMENT     │ │ ← test/ci/development/production
│ │ IS_TEST_ENV     │ │ ← Автоматическое определение
│ │ BLOCK_EXTERNAL_IO│ │ ← Глобальный рубильник 
│ │ LLM_PROVIDER    │ │ ← fake/openai/anthropic
│ └─────────────────┘ │
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│   llm_client.py     │
│ ┌─────────────────┐ │
│ │ get_llm()       │ │ ← Фабрика LLM клиентов
│ │   ├─FakeLLM     │ │ ← 0 токенов, 0 стоимость
│ │   ├─OpenAILLM   │ │ ← Реальные токены (блокируется в тестах)
│ │   └─AnthropicLLM│ │ ← Реальные токены (блокируется в тестах)
│ └─────────────────┘ │
└─────────────────────┘
```

## Компоненты системы

### 1. Конфигурация (ws_config.py)

**Переменные окружения:**
- `ENVIRONMENT` - окружение выполнения (`test`, `ci`, `development`, `production`)
- `IS_TEST_ENV` - автоматически `True` для `test|ci` 
- `BLOCK_EXTERNAL_IO` - глобальная блокировка внешних вызовов
- `LLM_PROVIDER` - провайдер LLM (`fake`, `openai`, `anthropic`)
- `FAKE_LLM_MODE` - режим фейка (`echo`, `stub`, `script`)

**Автоматическая логика:**
```python
IS_TEST_ENV = ENVIRONMENT.lower() in {"test", "ci"}
BLOCK_EXTERNAL_IO = os.getenv('BLOCK_EXTERNAL_IO', 'false').lower() == 'true' or IS_TEST_ENV
```

### 2. LLM Клиенты (llm_client.py)

#### FakeLLM - Фейковый провайдер

**Режимы работы:**
- `echo` - возвращает входящее сообщение с префиксом `[FAKE/echo]`
- `stub` - стандартный тестовый ответ
- `script` - программируемые ответы по dialog_id

**Метаданные:**
```python
{
    "provider": "fake",
    "mode": "echo", 
    "tokens_used": 0,      # ← ВСЕГДА 0
    "cost": 0.0,           # ← ВСЕГДА 0.0
    "is_fake": True        # ← Маркер фейкового вызова
}
```

#### Реальные провайдеры (OpenAILLM, AnthropicLLM)

**Защитные механизмы:**
- Проверка `BLOCK_EXTERNAL_IO` в конструкторе
- Исключение `RuntimeError` при попытке создания в тестах
- Дублирующая проверка в методе `chat()`

### 3. Глобальная защита (conftest.py)

#### Session-level защита
```python
@pytest.fixture(autouse=True, scope="session")
def force_test_environment():
    """Принудительно включает тестовое окружение"""
    test_env_vars = {
        "ENVIRONMENT": "test",
        "LLM_PROVIDER": "fake", 
        "FAKE_LLM_MODE": "echo",
        "BLOCK_EXTERNAL_IO": "true",
        "IS_TEST_ENV": "true"
    }
```

#### Function-level валидация
```python
@pytest.fixture(autouse=True, scope="function")  
def verify_no_real_llm():
    """Проверяет что в каждом тесте используется только FakeLLM"""
    # Переустановка переменных окружения
    # Переимпорт модулей
    # Валидация get_llm() → FakeLLM
```

## Использование в коде

### Базовое использование
```python
# Автоматический выбор провайдера (fake в тестах)
from services.llm_client import generate_ai_response

async def my_function():
    response = await generate_ai_response(
        messages=[{"role": "user", "content": "Hello"}],
        dialog_id=123
    )
    # В тестах: response["metadata"]["is_fake"] == True
    # В тестах: response["metadata"]["tokens_used"] == 0
```

### Принудительный dry-run
```python
from services.llm_client import get_llm

# Принудительный fake режим даже в production
llm = get_llm(dry_run=True)
response = await llm.chat(messages)
```

### Определение dry-run из HTTP запроса
```python
from services.llm_client import check_dry_run_request

# Из заголовков: X-Dry-Run: 1
# Из query: ?dry_run=true
is_dry_run = check_dry_run_request(headers=request.headers, query_params=request.query_params)
```

## Тестирование системы

### Запуск тестов защиты
```bash
# Упрощённые тесты (быстрая проверка)
pytest tests/test_token_protection_simple.py -v

# Полный набор тестов
pytest tests/test_token_protection.py -v

# Все тесты защиты
pytest tests/test_token_protection*.py -v
```

### Ключевые тест-кейсы

1. **Environment Configuration** - валидация тестового окружения
2. **Provider Selection** - проверка выбора FakeLLM в тестах
3. **Real Provider Blocking** - блокировка OpenAI/Anthropic в тестах
4. **Concurrent Protection** - стресс-тест 100+ параллельных вызовов
5. **Dry-Run Detection** - определение dry-run режима
6. **Production Simulation** - симуляция production с защитой

### Результаты тестирования
```
✅ 18/18 тестов пройдено
✅ 0 токенов потрачено
✅ 300+ concurrent вызовов с нулевой стоимостью
```

## Отладка и диагностика

### Проверка конфигурации
```python
from services.ws_config import get_config

config = get_config()
print("LLM Config:", config['llm'])
# Вывод:
# {
#   'environment': 'test',
#   'is_test_env': True, 
#   'provider': 'fake',
#   'fake_mode': 'echo',
#   'block_external_io': True
# }
```

### Валидация защиты
```python
from conftest import ensure_no_tokens_spent

# Проверяет что защита активна
ensure_no_tokens_spent()  # Не выбрасывает исключение в тестах
```

### Логирование
При создании LLM провайдеров в логи выводятся сообщения:
- `🔒 LLM provider: FAKE/echo (tokens will NOT be spent)` - фейковый режим
- `💰 LLM provider: OpenAI (REAL tokens will be spent)` - реальный провайдер
- `🚫 External IO blocked` - блокировка внешних вызовов

## Кастомизация

### Добавление нового LLM провайдера
```python
class CustomLLM(BaseLLM):
    def __init__(self, api_key: str):
        # Обязательная защита!
        if BLOCK_EXTERNAL_IO:
            raise RuntimeError(
                f"🚫 External IO blocked in environment: {ENVIRONMENT}. "
                "CustomLLM calls are prohibited in test/CI environments."
            )
        
        self.api_key = api_key
        
    async def chat(self, messages, **kwargs):
        # Дублирующая проверка
        if BLOCK_EXTERNAL_IO:
            raise RuntimeError("External IO is blocked - CustomLLM calls prohibited")
            
        # Реальная реализация...
```

### Расширение FakeLLM
```python
# Добавить новый режим в FAKE_LLM_MODE
class FakeLLM(BaseLLM):
    async def chat(self, messages, **kwargs):
        if self.mode == "my_custom_mode":
            # Кастомная логика
            response = generate_custom_fake_response(messages)
        # ...
```

## Безопасность

### ⚠️ Критически важно:
1. **НЕ переопределяйте** `BLOCK_EXTERNAL_IO=false` в CI/CD
2. **НЕ используйте** `@pytest.mark.live_ai` без крайней необходимости
3. **НЕ импортируйте** реальные провайдеры напрямую в тестах

### ✅ Рекомендации:
1. Всегда используйте `get_llm()` или `generate_ai_response()`
2. Проверяйте `response["metadata"]["is_fake"]` в тестах
3. Используйте `ensure_no_tokens_spent()` в критичных тестах
4. Добавляйте новые тесты защиты для новых провайдеров

## Мониторинг

### Метрики для отслеживания:
- Количество fake vs real LLM вызовов
- Общая стоимость токенов в production
- Попытки использования реальных провайдеров в тестах
- Ошибки блокировки внешнего IO

### Alerting:
- Предупреждение при превышении бюджета на токены
- Уведомление о попытках real LLM вызовов в CI/CD

## FAQ

**Q: Как проверить что система защиты работает?**
```bash
pytest tests/test_token_protection*.py -v
```

**Q: Как временно отключить защиту для debugging?**
```python
# НЕ рекомендуется! Только для локальной отладки
os.environ["BLOCK_EXTERNAL_IO"] = "false"
```

**Q: Как добавить специальный тест с реальным LLM?**
```python
@pytest.mark.live_ai
def test_real_llm(live_ai_test):
    """Требует явного маркера и специальной фикстуры"""
    # Код с реальными токенами
```

**Q: Что делать если тесты не проходят?**
1. Проверьте переменные окружения: `echo $ENVIRONMENT $LLM_PROVIDER`
2. Переустановите зависимости: `pip install -e .`
3. Очистите кеш: `pytest --cache-clear`
4. Запустите упрощённые тесты: `pytest tests/test_token_protection_simple.py`

---

**🛡️ Помните: Эта система предназначена для защиты от случайных трат. В production используйте мониторинг бюджета и rate limiting для дополнительной защиты.**