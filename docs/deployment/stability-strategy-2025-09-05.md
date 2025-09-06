# Стратегия фиксации и стабилизации исправлений WebSocket виджета

## Цель
Закрепить критические исправления WebSocket виджета от 5 сентября 2025 и предотвратить регрессии через расширенное тестирование, мониторинг и безопасные процедуры деплоя.

## 🎯 План действий

### ПРИОРИТЕТ 1: Расширить автоматические тесты

#### 1.1 WebSocket Integration Tests
**Создать:** `backend/tests/test_websocket_widget_integration.py`

```python
import pytest
import asyncio
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect
from backend.services.websocket_manager import ws_connections, ws_site_connections

class TestWebSocketWidgetIntegration:
    
    @pytest.mark.asyncio
    async def test_widget_websocket_routing_to_correct_pool(self):
        """Тест: Widget WebSocket должен регистрироваться в ws_connections"""
        # Подключение widget WebSocket
        # Проверка: соединение в ws_connections, НЕ в ws_site_connections
        
    @pytest.mark.asyncio  
    async def test_site_websocket_routing_to_correct_pool(self):
        """Тест: Site WebSocket должен регистрироваться в ws_site_connections"""
        # Подключение site WebSocket
        # Проверка: соединение в ws_site_connections
        
    @pytest.mark.asyncio
    async def test_no_duplicate_endpoints_conflict(self):
        """Тест: Отсутствие конфликтов дублирующих endpoints"""
        # Проверка что только один endpoint /ws/site/dialogs/ активен
        
    @pytest.mark.asyncio
    async def test_message_delivery_widget_mode(self):
        """Тест: Доставка real-time сообщений в widget режиме"""
        # 1. Подключить widget WebSocket
        # 2. Отправить HTTP сообщение
        # 3. Проверить получение через WebSocket
        
    @pytest.mark.asyncio 
    async def test_message_delivery_site_mode(self):
        """Тест: Доставка real-time сообщений в site режиме"""
        # Аналогично для site режима
        
    @pytest.mark.asyncio
    async def test_websocket_after_dialog_loaded(self):
        """Тест: WebSocket подключается только после dialogLoaded"""
        # Проверка race condition fix
```

#### 1.2 End-to-End Tests
**Создать:** `frontend/tests/e2e/widget-websocket.spec.js`

```javascript
// Playwright/Cypress тесты
describe('Widget WebSocket E2E', () => {
  test('Widget stable connection and real-time messages', async () => {
    // 1. Загрузить страницу с виджетом
    // 2. Проверить WebSocket подключение
    // 3. Отправить сообщение из виджета
    // 4. Проверить получение ответа в real-time
    // 5. Проверить отсутствие ERR_CONNECTION_RESET
  });
  
  test('No duplicate welcome message on reload', async () => {
    // Проверка исправления приветственного сообщения
  });
  
  test('WebSocket reconnection after network failure', async () => {
    // Тест переподключения
  });
});
```

#### 1.3 Load Tests для WebSocket
**Обновить:** `docs/perf/k6_widget_websocket.js`

```javascript
// K6 нагрузочные тесты для WebSocket соединений
export default function () {
  // Тест множественных одновременных WebSocket подключений
  // Проверка стабильности под нагрузкой
}
```

### ПРИОРИТЕТ 2: Мониторинг и алерты

#### 2.1 Healthcheck для WebSocket
**Создать:** `backend/api/health.py` - расширить endpoint

```python
@router.get("/health/websocket")
async def websocket_health():
    """Healthcheck для WebSocket соединений"""
    return {
        "active_admin_connections": sum(len(conns) for conns in ws_connections.values()),
        "active_site_connections": sum(len(conns) for conns in ws_site_connections.values()),
        "total_dialogs_admin": len(ws_connections.keys()),
        "total_dialogs_site": len(ws_site_connections.keys()),
        "status": "healthy"
    }
```

#### 2.2 Prometheus метрики
**Добавить метрики в:** `backend/core/metrics.py`

```python
from prometheus_client import Counter, Gauge

# WebSocket метрики
websocket_connections_total = Gauge('websocket_connections_total', 'Active WebSocket connections', ['type'])
websocket_messages_sent = Counter('websocket_messages_sent_total', 'Messages sent via WebSocket', ['type'])
websocket_connection_errors = Counter('websocket_connection_errors_total', 'WebSocket connection errors', ['error_type'])
```

#### 2.3 Алерты в CI/CD
**Создать:** `.github/workflows/websocket-health-check.yml`

```yaml
name: WebSocket Health Check
on:
  schedule:
    - cron: '*/15 * * * *'  # Каждые 15 минут
  workflow_dispatch:

jobs:
  websocket-health:
    runs-on: ubuntu-latest
    steps:
      - name: Check WebSocket Health
        run: |
          response=$(curl -f https://replyx.ru/health/websocket)
          echo "WebSocket Health: $response"
          # Алерт если healthcheck не прошел
```

### ПРИОРИТЕТ 3: Безопасный deploy процесс

#### 3.1 Blue-Green Deployment для WebSocket
**Создать:** `scripts/deploy/safe-websocket-deploy.sh`

```bash
#!/bin/bash
# Безопасный деплой с проверкой WebSocket
set -e

echo "🚀 Starting safe WebSocket deployment..."

# 1. Pre-deployment health check
curl -f https://replyx.ru/health/websocket || exit 1

# 2. Deploy to blue environment
docker-compose -f docker-compose.blue.yml up -d

# 3. Wait for services to be ready
sleep 30

# 4. Run WebSocket integration tests on blue
pytest backend/tests/test_websocket_widget_integration.py || exit 1

# 5. Switch traffic to blue (if tests pass)
# Update nginx config to point to blue
nginx -s reload

# 6. Monitor for 5 minutes
for i in {1..20}; do
  sleep 15
  curl -f https://replyx.ru/health/websocket || exit 1
  echo "Health check $i/20 passed"
done

echo "✅ Deployment successful and stable"
```

#### 3.2 Rollback процедура
**Создать:** `scripts/deploy/websocket-rollback.sh`

```bash
#!/bin/bash
# Быстрый откат при проблемах с WebSocket
set -e

echo "⚠️ Rolling back WebSocket changes..."

# 1. Switch nginx back to green
cp nginx/nginx.green.conf nginx/nginx.conf
nginx -s reload

# 2. Restart green containers
docker-compose -f docker-compose.green.yml restart

# 3. Verify rollback
sleep 10
curl -f https://replyx.ru/health/websocket

echo "✅ Rollback completed"
```

### ПРИОРИТЕТ 4: Защита от регрессий в CI

#### 4.1 Mandatory WebSocket Tests
**Обновить:** `.github/workflows/backend-tests.yml`

```yaml
- name: Run WebSocket Integration Tests
  run: |
    pytest backend/tests/test_websocket_widget_integration.py -v
    # FAIL pipeline если WebSocket тесты не прошли
  
- name: Run E2E Widget Tests  
  run: |
    npm run test:e2e:widget
    # FAIL если E2E тесты виджета не прошли
```

#### 4.2 Branch Protection Rules
**Настроить в GitHub:**
- Требовать прохождение WebSocket тестов для merge в main
- Требовать review от 2+ разработчиков для изменений в websocket_manager.py
- Заблокировать прямые push в main

#### 4.3 Code Quality Gates
**Создать:** `.github/workflows/websocket-code-quality.yml`

```yaml
- name: WebSocket Code Analysis
  run: |
    # Проверка что не появилось дублирующих WebSocket endpoints
    python3 scripts/validate-websocket-endpoints.py
    
    # Проверка правильности routing в websocket_manager
    python3 scripts/validate-websocket-routing.py
```

### ПРИОРИТЕТ 5: Documentation-Driven Development

#### 5.1 Живая документация
**Создать:** `docs/websocket/CHANGELOG.md`
- Все изменения WebSocket логики должны документироваться
- Каждое изменение требует обновления архитектурной диаграммы

#### 5.2 Decision Records
**Создать:** `docs/adr/ADR-0026-websocket-routing-strategy.md`
- Зафиксировать решение о правильном routing WebSocket соединений
- Объяснить почему widget -> ws_connections, site -> ws_site_connections

## 📊 Критерии успеха

### Краткосрочные (1-2 недели)
- ✅ 95%+ WebSocket connection success rate
- ✅ <100ms WebSocket message latency  
- ✅ 0 дублирующих endpoint конфликтов
- ✅ 100% прохождение integration тестов

### Среднесрочные (1 месяц)
- ✅ Автоматический мониторинг WebSocket метрик
- ✅ Алерты на Slack/email при проблемах
- ✅ Blue-green deployment процесс
- ✅ 0 регрессий в WebSocket функциональности

### Долгосрочные (3 месяца)  
- ✅ 99.9%+ WebSocket uptime
- ✅ Полностью автоматизированный safe deploy
- ✅ Comprehensive E2E test coverage
- ✅ Proactive monitoring и предиктивные алерты

## 🚦 Implementation Roadmap

### Неделя 1: Тестирование
- [ ] Создать WebSocket integration тесты
- [ ] Написать E2E тесты для виджета
- [ ] Добавить нагрузочные тесты WebSocket

### Неделя 2: Мониторинг
- [ ] Добавить WebSocket healthcheck endpoint
- [ ] Настроить Prometheus метрики
- [ ] Создать dashboard для WebSocket мониторинга

### Неделя 3: Deploy Safety
- [ ] Реализовать blue-green deployment
- [ ] Создать rollback процедуры
- [ ] Добавить обязательные проверки в CI

### Неделя 4: Стабилизация
- [ ] Провести нагрузочное тестирование
- [ ] Финальная проверка всех процедур
- [ ] Документирование и training команды

## 🔧 Инструменты

- **Testing**: pytest, Playwright/Cypress, k6
- **Monitoring**: Prometheus, Grafana, здоровье-чекі
- **Deploy**: Docker Compose, Blue-Green, nginx
- **CI/CD**: GitHub Actions, branch protection
- **Documentation**: ADR, архитектурные диаграммы

---

**Ответственный:** Команда разработки ReplyX  
**Дата начала:** 5 сентября 2025  
**Предполагаемое завершение:** 3 октября 2025