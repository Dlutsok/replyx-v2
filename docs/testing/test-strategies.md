# Стратегии тестирования ReplyX

## Пирамида тестирования

```
                    🔺 E2E Tests
                   /            \
                  /   Слож. 95%   \
                 /   Время: 60%    \
                /   Стоимость: 80%  \
               /____________________\
              🔻 Integration Tests  🔺
             /                      \
            /    Слож. 70%           \
           /    Время: 30%            \
          /    Стоимость: 15%          \
         /________________________________\
        🔻      Unit Tests             🔺
       /                                \
      /         Слож. 20%               \
     /         Время: 10%                \
    /         Стоимость: 5%               \
   /________________________________________\
```

## Типы тестов по компонентам

### 1. 🛡️ Token Protection Tests (Критические)
**Приоритет**: КРИТИЧЕСКИЙ  
**Частота**: На каждый коммит  
**Время выполнения**: < 10 секунд

```python
# test_token_protection_simple.py - Быстрые проверки
def test_environment_protection()         # Проверка env переменных
def test_fake_llm_functionality()         # Базовая функциональность FakeLLM
def test_external_io_blocking()           # Блокировка внешних вызовов

# test_token_protection.py - Комплексные тесты  
class TestTokenProtection:
    def test_get_llm_returns_fake_only()  # Валидация get_llm()
    def test_real_providers_blocked()     # Блокировка реальных провайдеров
    
class TestTokenProtectionIntegration:
    def test_stress_token_protection()    # 300 concurrent вызовов
```

**Критерии успеха:**
- ✅ 18/18 тестов проходят
- ✅ 0 токенов потрачено во всех сценариях
- ✅ Все LLM вызовы возвращают `is_fake: true`

### 2. 🔌 WebSocket Tests
**Приоритет**: ВЫСОКИЙ  
**Частота**: На каждый PR  
**Время выполнения**: < 30 секунд

```python
# test_websocket_critical_fixes.py
class TestWebSocketSecurity:
    def test_ip_spoofing_protection()     # Защита от IP spoofing
    def test_rate_limiting()              # Rate limiting по IP
    def test_memory_exhaustion()          # Защита от memory exhaustion
    
class TestWebSocketReliability:
    def test_connection_cleanup()         # Очистка соединений
    def test_message_queue_ack()          # ACK механизм
    def test_heartbeat_mechanism()        # Ping/Pong heartbeat
```

**Критерии успеха:**
- ✅ Все security fix'ы функционируют
- ✅ Rate limiting блокирует превышение лимитов
- ✅ Memory не растёт бесконечно

### 3. 🗄️ Database Tests  
**Приоритет**: СРЕДНИЙ  
**Частота**: На изменения DB схемы  
**Время выполнения**: < 60 секунд

```python
# test_database.py (когда появится)
class TestMigrations:
    def test_migration_forward()          # Применение миграций
    def test_migration_rollback()         # Откат миграций
    
class TestPerformance:
    def test_query_performance()          # Производительность запросов
    def test_index_usage()               # Использование индексов
```

### 4. 🔐 Security Tests
**Приоритет**: ВЫСОКИЙ  
**Частота**: На security-related изменения  
**Время выполнения**: < 45 секунд

```python
# test_security.py (потенциальные тесты)
class TestAuthentication:
    def test_jwt_validation()            # Валидация JWT токенов
    def test_csrf_protection()           # CSRF защита
    
class TestAuthorization:
    def test_rbac_permissions()          # Role-based доступ
    def test_data_isolation()            # Изоляция данных пользователей
```

## Стратегии по средам выполнения

### Development Environment
**Цель**: Быстрая обратная связь разработчикам

```bash
# Перед коммитом (< 15 секунд)
pytest tests/test_token_protection_simple.py -v

# При значительных изменениях (< 60 секунд)  
pytest tests/test_token_protection*.py tests/test_websocket_critical_fixes.py -v
```

**Конфигурация:**
- `ENVIRONMENT=test`
- `LLM_PROVIDER=fake`
- `BLOCK_EXTERNAL_IO=true`

### CI/CD Pipeline
**Цель**: Гарантия качества перед деплоем

```yaml
# .github/workflows/test-suite.yml
jobs:
  critical-tests:
    name: "🛡️ Critical Token Protection"
    steps:
      - run: pytest tests/test_token_protection*.py -v
      
  security-tests:
    name: "🔒 Security & WebSocket"  
    steps:
      - run: pytest tests/test_websocket_critical_fixes.py -v
      
  integration-tests:
    name: "🔗 Integration Tests"
    needs: [critical-tests, security-tests]
    steps:
      - run: pytest tests/ --ignore=tests/e2e -v
```

### Production Monitoring
**Цель**: Непрерывная валидация в production

```python
# Мониторинг в реальном времени
class ProductionHealthCheck:
    def check_llm_token_usage():         # Мониторинг трат на токены
        """Alerting при превышении бюджета"""
        
    def check_websocket_connections():   # Здоровье WebSocket системы
        """Alerting при проблемах с подключениями"""
```

## Матрица покрытия

| Компонент | Unit | Integration | E2E | Security | Performance |
|-----------|------|-------------|-----|----------|-------------|
| **LLM Client** | ✅ | ✅ | 🔄 | ✅ | 🔄 |
| **WebSocket** | ✅ | ✅ | 🔄 | ✅ | ✅ |
| **Auth System** | 🔄 | 🔄 | 🔄 | ✅ | 🔄 |
| **Database** | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 |
| **API Endpoints** | 🔄 | 🔄 | 🔄 | 🔄 | 🔄 |

**Легенда:**
- ✅ Реализовано и протестировано
- 🔄 Планируется к реализации  
- ❌ Не требуется

## Test Data Management

### Фикстуры и тестовые данные

```python
# conftest.py - Глобальные фикстуры
@pytest.fixture
def fake_llm():
    """FakeLLM инстанс для тестов"""
    
@pytest.fixture  
def mock_ai_messages():
    """Стандартные AI сообщения"""
    
@pytest.fixture
def websocket_test_client():
    """WebSocket тестовый клиент"""
```

### Factory Pattern для тестовых данных
```python
# factories.py (будущая реализация)
class DialogFactory:
    @staticmethod
    def create_dialog(user_id: int = 1, **kwargs):
        """Создание тестового диалога"""

class MessageFactory:
    @staticmethod  
    def create_message(dialog_id: int, content: str = "test", **kwargs):
        """Создание тестового сообщения"""
```

## Стратегии моков и заглушек

### LLM Mocking Strategy
```python
# Уровень 1: Environment-based (Автоматический в тестах)
LLM_PROVIDER=fake → FakeLLM

# Уровень 2: Explicit mocking (Для специальных случаев)
@patch('services.llm_client.OpenAILLM')
def test_with_mocked_openai(mock_openai):
    mock_openai.return_value.chat.return_value = fake_response
    
# Уровень 3: Fixture-based (Для интеграционных тестов)
@pytest.fixture
def mocked_llm_responses():
    """Предопределённые ответы LLM для тестов"""
```

### External Service Mocking
```python
# HTTP services
@responses.activate
def test_external_api():
    responses.add(responses.POST, "https://api.external.com/", json={"status": "ok"})

# Database
@pytest.fixture  
def mock_db_session():
    """Мокированная DB сессия"""
```

## Тестирование производительности

### Load Testing Strategy
```python
# performance/load_test.py (будущая реализация)
class TestWebSocketLoad:
    def test_concurrent_connections(self):
        """1000 одновременных WebSocket соединений"""
        
    def test_message_throughput(self):  
        """10000 сообщений/секунду"""
        
class TestLLMLoad:
    def test_concurrent_ai_requests(self):
        """100 параллельных AI запросов (все fake в тестах)"""
```

### Memory & Resource Testing
```python
class TestResourceUsage:
    def test_memory_leak_detection(self):
        """Тест на memory leak'и"""
        
    def test_connection_pool_limits(self):
        """Лимиты пулов соединений"""
```

## Reporting и метрики

### Test Reports
```bash
# Coverage report
pytest tests/ --cov=services --cov-report=html --cov-report=term

# Performance profiling  
pytest tests/ --profile --profile-svg
```

### Метрики качества тестов
```python
# metrics.py (концепция)
class TestQualityMetrics:
    def calculate_test_coverage():       # % покрытия кода тестами
    def measure_test_execution_time():   # Время выполнения тестов  
    def count_flaky_tests():            # Количество нестабильных тестов
    def track_token_protection_rate():  # % защищённых LLM вызовов
```

## Continuous Testing Strategy

### Pre-commit Testing
```bash
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: critical-tests
        name: Critical Token Protection Tests
        entry: pytest tests/test_token_protection_simple.py --maxfail=1
        language: system
```

### Nightly Testing
```yaml
# .github/workflows/nightly-tests.yml  
name: Nightly Full Test Suite
schedule:
  - cron: '0 2 * * *'  # 2 AM каждый день
jobs:
  comprehensive-tests:
    steps:
      - run: pytest tests/ --cov=services --slow-tests
```

### Production Health Checks
```python
# monitoring/health_checks.py
class ProductionTestRunner:
    def run_smoke_tests():               # Базовые smoke tests в production
    def validate_ai_responses():         # Качество AI ответов
    def check_websocket_stability():     # Стабильность WebSocket
```

## Эволюция тестовой стратегии

### Phase 1: Foundation (COMPLETED ✅)
- [x] Token protection system
- [x] WebSocket critical fixes
- [x] Basic test infrastructure

### Phase 2: Expansion (NEXT)
- [ ] Database testing strategy
- [ ] API endpoint testing
- [ ] End-to-end user journey tests

### Phase 3: Optimization (FUTURE)
- [ ] Performance testing automation
- [ ] AI-assisted test generation
- [ ] Predictive test failure analysis

---

**🎯 Главный принцип**: Максимальная защита от рисков (токены, security) при минимальном времени обратной связи для разработчиков.