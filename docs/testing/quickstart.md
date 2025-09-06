# Быстрый старт: Тестирование с защитой от токенов

## 🛡️ Что это и зачем?

Система защиты от трат токенов **автоматически блокирует** все реальные LLM вызовы в тестах, заменяя их на фейковые с нулевой стоимостью. Это критически важно для предотвращения случайных трат на OpenAI/Anthropic API во время разработки и CI/CD.

## ⚡ Быстрая проверка (30 секунд)

```bash
# Перейдите в backend директорию
cd backend

# Запустите критические тесты защиты
python3 -m pytest tests/test_token_protection_simple.py -v

# Ожидаемый результат:
# ✅ 7 passed in 0.06s
# ✅ Выполнено 50 AI вызовов с НУЛЕВОЙ тратой токенов
```

## 📝 Использование в коде

### ✅ Правильно (защищённо):
```python
from services.llm_client import generate_ai_response

async def my_function():
    # В тестах автоматически использует FakeLLM (0 токенов)
    # В production использует реальный LLM
    response = await generate_ai_response(
        messages=[{"role": "user", "content": "Hello"}],
        dialog_id=123
    )
    
    # В тестах: response["metadata"]["is_fake"] == True
    # В тестах: response["metadata"]["tokens_used"] == 0
    return response["content"]
```

### ❌ Неправильно (опасно):
```python
import openai  # НЕ используйте напрямую!

# Это может потратить токены в тестах!
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello"}]
)
```

## 🧪 Написание тестов

### Шаблон безопасного теста:
```python
import pytest
from services.llm_client import generate_ai_response

class TestMyFeature:
    @pytest.mark.asyncio
    async def test_my_ai_feature(self):
        """Тест с автоматической защитой от трат токенов"""
        
        response = await generate_ai_response(
            messages=[{"role": "user", "content": "test message"}],
            dialog_id=456
        )
        
        # Проверяем что токены НЕ потрачены
        assert response["metadata"]["is_fake"] == True
        assert response["metadata"]["tokens_used"] == 0
        assert response["metadata"]["cost"] == 0.0
        
        # Проверяем бизнес-логику
        assert "test message" in response["content"]
```

## 🔍 Диагностика проблем

### Проверка конфигурации:
```python
from services.ws_config import get_config

config = get_config()
print("Конфигурация LLM:", config['llm'])

# Должно показать:
# {
#   'environment': 'test',
#   'is_test_env': True,
#   'provider': 'fake', 
#   'block_external_io': True
# }
```

### Явная проверка защиты:
```python
from conftest import ensure_no_tokens_spent

# Проверяет что защита активна
ensure_no_tokens_spent()  # Не выбрасывает исключение если всё ОК
```

## 🚨 Что делать если тесты падают?

### Ошибка: "External IO blocked"
**Это хорошо!** Система работает и блокирует опасные вызовы.

Проверьте:
1. Используете ли вы `generate_ai_response()` вместо прямых LLM вызовов?
2. Правильно ли импортируете модули после установки переменных окружения?

### Ошибка: "Expected FakeLLM, got OpenAILLM"  
**Это опасно!** Возможна трата токенов.

Решение:
```bash
# Переустановите переменные окружения
export ENVIRONMENT=test
export LLM_PROVIDER=fake
export BLOCK_EXTERNAL_IO=true

# Перезапустите тесты
pytest tests/test_token_protection_simple.py -v
```

### Ошибка: "tokens_used > 0"
**КРИТИЧНО!** Немедленно остановите тесты!

Действия:
1. Проверьте логи на предмет реальных LLM вызовов
2. Запустите диагностику: `ensure_no_tokens_spent()`
3. Убедитесь что `conftest.py` загружается правильно

## 🎯 Ключевые принципы

### ✅ Всегда:
- Используйте `generate_ai_response()` для AI вызовов
- Проверяйте `is_fake: true` в тестах
- Запускайте тесты защиты перед коммитом
- Используйте фикстуры из `conftest.py`

### ❌ Никогда:
- НЕ импортируйте OpenAI/Anthropic напрямую в тестах
- НЕ устанавливайте `BLOCK_EXTERNAL_IO=false` в CI/CD
- НЕ игнорируйте предупреждения о потенциальных тратах
- НЕ коммитьте код без проверки защиты

## 🚀 Команды для ежедневной работы

```bash
# Перед коммитом (быстро, 6 сек):
pytest tests/test_token_protection_simple.py -v

# При больших изменениях (полно, 10 сек):
pytest tests/test_token_protection*.py -v

# При изменениях WebSocket (30 сек):
pytest tests/test_websocket_critical_fixes.py -v

# Полная проверка системы (60+ сек):
pytest tests/ -v
```

## 📚 Дополнительная информация

- **Полная документация**: [token-protection.md](./token-protection.md)
- **Стратегии тестирования**: [test-strategies.md](./test-strategies.md) 
- **Общий обзор тестов**: [README.md](./README.md)
- **Конфигурация**: `backend/services/ws_config.py`
- **LLM клиенты**: `backend/services/llm_client.py`

## ⚡ TL;DR

1. **Используйте** `generate_ai_response()` для AI вызовов
2. **Проверяйте** `response["metadata"]["is_fake"] == True` в тестах  
3. **Запускайте** `pytest tests/test_token_protection_simple.py -v` перед коммитом
4. **НЕ импортируйте** OpenAI/Anthropic напрямую в тестах

**🛡️ Результат**: 0 токенов потрачено в тестах, 100% защита, быстрая разработка!

---

**📅 Создано**: 2025-09-06  
**🔄 Последнее обновление**: 2025-09-06  
**✅ Статус**: Полностью протестировано и работает