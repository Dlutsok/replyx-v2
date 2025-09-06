# Тестирование ReplyX

## Обзор тестовой инфраструктуры

Система тестирования ReplyX обеспечивает комплексное покрытие всех компонентов приложения с особым акцентом на **защиту от трат токенов** и безопасность тестовых сред.

## Структура тестов

```
tests/
├── test_token_protection.py          # Комплексная защита от трат токенов
├── test_token_protection_simple.py   # Упрощённые тесты защиты  
├── test_websocket_critical_fixes.py  # Критические исправления WebSocket
└── conftest.py                       # Глобальная конфигурация pytest
```

## Типы тестирования

### 1. 🛡️ Защита от трат токенов
**Приоритет: КРИТИЧЕСКИЙ**

- **Файлы**: `test_token_protection*.py`
- **Цель**: 100% гарантия отсутствия трат на LLM в тестах
- **Покрытие**: 18 тест-кейсов, включая стресс-тесты до 300 concurrent вызовов
- **Статус**: ✅ Все тесты проходят

[➡️ Подробная документация](./token-protection.md)

### 2. 🔌 WebSocket тестирование  
**Приоритет: ВЫСОКИЙ**

- **Файлы**: `test_websocket_critical_fixes.py`
- **Цель**: Валидация исправлений WebSocket системы
- **Покрытие**: Security fixes, rate limiting, connection management
- **Статус**: ✅ Все критические исправления протестированы

### 3. 🔒 Security тестирование
**Приоритет: ВЫСОКИЙ**

- **Компоненты**: JWT validation, CORS, IP spoofing protection
- **Инструменты**: pytest, mock, security scanners
- **Статус**: ✅ Основные уязвимости исправлены

## Конфигурация тестов (conftest.py)

### Глобальные фикстуры

#### 🔒 Защита от трат токенов
```python
@pytest.fixture(autouse=True, scope="session")
def force_test_environment():
    """Принудительно устанавливает тестовые переменные окружения"""
    
@pytest.fixture(autouse=True, scope="function")
def verify_no_real_llm():
    """Валидирует каждый тест на использование только FakeLLM"""
```

#### 🧪 Тестовые утилиты
```python
@pytest.fixture
def fake_llm():
    """Предоставляет FakeLLM инстанс"""
    
@pytest.fixture
def dry_run_headers():
    """HTTP заголовки для включения dry-run режима"""
```

#### ⚠️ Специальные тесты
```python
@pytest.fixture  
def live_ai_test(request):
    """Фикстура для редких тестов с реальными AI провайдерами"""
    # Требует явного маркера @pytest.mark.live_ai
```

## Запуск тестов

### Быстрая проверка защиты
```bash
# Упрощённые тесты (6 сек)
pytest tests/test_token_protection_simple.py -v

# Результат:
# ✅ 7 passed in 0.06s
# ✅ Выполнено 50 AI вызовов с НУЛЕВОЙ тратой токенов
```

### Полное тестирование защиты
```bash
# Комплексные тесты включая стресс-тестирование
pytest tests/test_token_protection.py -v

# Результат:
# ✅ 11 passed in 0.07s 
# ✅ Completed 300 AI calls with ZERO tokens spent
```

### Все тесты защиты
```bash
# Всё вместе (18 тестов)
pytest tests/test_token_protection*.py -v

# Результат:
# ✅ 18 passed in 0.06s
```

### WebSocket тесты
```bash
# Критические исправления WebSocket
pytest tests/test_websocket_critical_fixes.py -v
```

### Полный набор тестов
```bash
# Все доступные тесты
pytest tests/ -v

# С покрытием кода
pytest tests/ --cov=services --cov-report=html
```

## Переменные окружения для тестов

### Обязательные (устанавливаются автоматически)
```bash
ENVIRONMENT=test                # Тестовое окружение
LLM_PROVIDER=fake              # Только фейковый LLM
BLOCK_EXTERNAL_IO=true         # Блокировка внешних вызовов
IS_TEST_ENV=true               # Флаг тестового окружения
FAKE_LLM_MODE=echo            # Режим работы FakeLLM
```

### Опциональные  
```bash
WS_LOG_LEVEL=DEBUG            # Уровень логирования WebSocket
PYTEST_CURRENT_TEST=...       # Автоматически устанавливается pytest
```

## Маркеры pytest

### Стандартные маркеры
```python
@pytest.mark.asyncio           # Асинхронные тесты
@pytest.mark.parametrize       # Параметризованные тесты
```

### Кастомные маркеры
```python
@pytest.mark.live_ai           # Тесты с реальными AI провайдерами (ОПАСНО!)
@pytest.mark.external_io       # Тесты требующие внешних вызовов
```

## Отладка тестов

### Включение подробного логирования
```bash
pytest tests/ -v --log-cli-level=DEBUG
```

### Запуск одного теста
```bash
pytest tests/test_token_protection.py::TestTokenProtection::test_environment_configuration -v
```

### Остановка на первой ошибке
```bash
pytest tests/ -x
```

### Повторение упавших тестов
```bash
pytest tests/ --lf  # last-failed
```

## Интеграция с CI/CD

### GitHub Actions
```yaml
- name: Run Token Protection Tests
  run: |
    export ENVIRONMENT=test
    export LLM_PROVIDER=fake
    export BLOCK_EXTERNAL_IO=true
    pytest tests/test_token_protection*.py -v
    
- name: Verify Zero Token Spending  
  run: |
    # Проверка что в логах нет упоминаний о реальных тратах
    ! grep -r "REAL tokens will be spent" test-logs/
```

### Pre-commit hooks
```yaml
repos:
  - repo: local
    hooks:
      - id: token-protection-tests
        name: Token Protection Tests
        entry: pytest tests/test_token_protection_simple.py
        language: system
        pass_filenames: false
```

## Мониторинг качества тестов

### Метрики для отслеживания
- **Token Protection**: 100% защита от трат (18/18 тестов проходят)
- **Test Coverage**: >80% покрытие критического кода
- **Test Performance**: Тесты выполняются <10 секунд
- **Flaky Tests**: 0 нестабильных тестов

### Алерты
- ❌ Провал тестов защиты от токенов → КРИТИЧЕСКИЙ алерт
- ⚠️ Снижение покрытия кода > 5% → WARNING
- 🐌 Увеличение времени тестов > 50% → INFO

## Лучшие практики

### ✅ Рекомендуется
1. **Всегда** используйте `generate_ai_response()` вместо прямых LLM вызовов
2. **Проверяйте** `response["metadata"]["is_fake"]` в тестах
3. **Используйте** фикстуры из `conftest.py`
4. **Добавляйте** тесты защиты для новых AI функций
5. **Запускайте** быстрые тесты перед коммитом

### ❌ Избегайте
1. **НЕ** переопределяйте `BLOCK_EXTERNAL_IO=false` в CI/CD
2. **НЕ** используйте `@pytest.mark.live_ai` без крайней необходимости  
3. **НЕ** импортируйте реальные LLM провайдеры напрямую в тестах
4. **НЕ** коммитьте тесты без проверки защиты от трат токенов
5. **НЕ** игнорируйте предупреждения о потенциальных тратах

## Добавление новых тестов

### Шаблон теста с защитой от токенов
```python
import pytest
from services.llm_client import generate_ai_response

class TestMyFeature:
    @pytest.mark.asyncio
    async def test_my_ai_feature(self):
        """Тест новой AI функции с защитой от трат токенов"""
        
        # Используем защищённую функцию
        response = await generate_ai_response(
            messages=[{"role": "user", "content": "test"}],
            dialog_id=123
        )
        
        # Проверяем что токены не потрачены
        assert response["metadata"]["is_fake"] == True
        assert response["metadata"]["tokens_used"] == 0
        assert response["metadata"]["cost"] == 0.0
        
        # Проверяем бизнес-логику
        assert "test" in response["content"]
```

### Добавление в CI/CD
После создания новых тестов защиты обновите:
1. `.github/workflows/test-suite.yml`
2. `pre-commit` конфигурацию  
3. Документацию в этом файле

## Troubleshooting

### Проблема: Тесты падают с "External IO blocked"
**Решение**: Проверьте что `conftest.py` правильно устанавливает переменные окружения

### Проблема: FakeLLM не используется в тестах  
**Решение**: Переимпортируйте модули после установки environment variables:
```python
import importlib
import services.llm_client
importlib.reload(services.llm_client)
```

### Проблема: Медленные тесты
**Решение**: 
1. Используйте упрощённые тесты для быстрой проверки
2. Профилируйте тесты: `pytest --profile`
3. Распараллеливание: `pytest -n auto`

---

**🎯 Цель**: Поддерживать 100% надёжность защиты от трат токенов при высокой скорости разработки и полноте тестирования.