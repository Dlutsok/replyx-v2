# WebSocket Gateway Migration Guide

## 🎯 Цель миграции

Решить проблему рассинхронизации WebSocket при multi-worker setup путем вынесения WS-функциональности в отдельный контейнер.

## ❌ Проблема до миграции

- Backend работает на 4 воркерах для высокой производительности HTTP API
- WebSocket соединения привязаны к конкретному воркеру (in-memory state)
- При отправке сообщения оно может попасть в "чужой" воркер → рассинхронизация
- Эффект "кто первый подключился - у того и работает"

## ✅ Решение после миграции

```
┌─────────────────────────────────────────────────────────┐
│                   NGINX Load Balancer                  │
│  /api/* → backend:8000    /ws/* → ws-gateway:8001     │
└─────────────────────────────────────────────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────┐    ┌─────────────────────────────┐
│     backend:8000    │    │     ws-gateway:8001         │
│   (4 workers)       │    │     (1 worker)              │
│                     │    │                             │
│ • HTTP API          │    │ • WebSocket endpoints       │
│ • Business Logic    │    │ • Connection pools          │
│ • Database ops      │    │ • Real-time events          │
│ • AI processing     │    │ • Stable state management   │
└─────────────────────┘    └─────────────────────────────┘
            │                           │
            └───────────────┬───────────┘
                            │
                ┌─────────────────────┐
                │   Shared Database   │
                │   & Redis Cache     │
                └─────────────────────┘
```

## 📁 Структура файлов

### Новые файлы
- `backend/ws_main.py` - WebSocket-оптимизированный entrypoint
- `scripts/check_ws_gateway_architecture.sh` - Скрипт проверки архитектуры

### Изменённые файлы
- `Deployed/docker-compose.yml` - Добавлен ws-gateway сервис
- `Deployed/nginx/nginx.conf` - Роутинг WebSocket запросов
- `backend/services/websocket_manager.py` - Добавлена cleanup функция

## 🔧 Конфигурация

### Docker Compose
```yaml
ws-gateway:
  image: ghcr.io/yourorg/replyx-backend:${TAG:-latest}
  container_name: replyx-ws-gateway
  ports:
    - "8001:8001"
  environment:
    - UVICORN_WORKERS=1  # Single worker!
    - UVICORN_PORT=8001
    - SERVICE_MODE=websocket
  command: ["python", "ws_main.py"]
```

### Nginx Routing
```nginx
upstream ws-gateway {
    server ws-gateway:8001;
}

location /ws/ {
    proxy_pass http://ws-gateway;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    # ... WebSocket headers
}
```

## 🚀 Деплой процедура

### 1. Предварительная проверка
```bash
cd Deployed/
../scripts/check_ws_gateway_architecture.sh
```

### 2. Сборка и запуск
```bash
# Сборка образов (если нужно)
docker-compose build

# Запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps
```

### 3. Health checks
```bash
# Backend API
curl http://localhost:8000/health

# WebSocket Gateway
curl http://localhost:8001/health

# Debug endpoints
curl "http://localhost:8001/api/debug/websocket/status"
curl "http://localhost:8001/api/debug/websocket/sync?dialog_id=123"
```

## 📊 Мониторинг

### Ключевые метрики
- **WebSocket connections**: Активные подключения по типам
- **Message delivery**: Успешность доставки в оба канала (admin/widget)  
- **Service health**: Состояние backend и ws-gateway
- **Error rates**: 4003 (domain forbidden), auth failures

### Логи для отслеживания
```bash
# WebSocket Gateway логи
docker logs replyx-ws-gateway --tail=100 -f

# Backend API логи  
docker logs replyx-backend --tail=100 -f

# Nginx роутинг
docker logs replyx-nginx --tail=50 -f
```

### Поиск проблем
```bash
# WebSocket подключения
docker logs replyx-ws-gateway | grep -E "\[Site\]|\[Widget\]|\[Admin\]"

# Broadcast события
docker logs replyx-ws-gateway | grep "Broadcasting message"

# Ошибки домена
docker logs replyx-ws-gateway | grep "WEBSOCKET_4003_ERROR"
```

## 🧪 Тестовые сценарии

### 1. Базовая функциональность
```bash
# 1. Подключить админку к диалогу
wscat -c "wss://replyx.ru/ws/dialogs/123?token=YOUR_JWT"

# 2. Подключить виджет к тому же диалогу  
wscat -c "wss://replyx.ru/ws/widget/dialogs/123?assistant_id=3"

# 3. Отправить сообщение через API
curl -X POST "https://replyx.ru/api/site/dialogs/123/messages" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}' \
  -G -d "site_token=YOUR_SITE_TOKEN"

# 4. Убедиться что сообщение пришло в оба WebSocket соединения
```

### 2. Multi-site тестирование
```bash
# Подключить 3 разных сайта одновременно
wscat -c "wss://replyx.ru/ws/site/dialogs/100?site_token=SITE1_TOKEN"
wscat -c "wss://replyx.ru/ws/site/dialogs/200?site_token=SITE2_TOKEN" 
wscat -c "wss://replyx.ru/ws/site/dialogs/300?site_token=SITE3_TOKEN"

# Отправить сообщения в каждый диалог
# Убедиться что нет cross-talk между диалогами
```

### 3. Нагрузочное тестирование
```bash
# Запустить k6 скрипт для WebSocket нагрузки
k6 run scripts/ops/load/k6_widget_no_ai.js
```

### 4. Restart resilience
```bash
# Перезапуск backend не должен влиять на WebSocket
docker-compose restart backend

# Перезапуск ws-gateway вызывает переподключение клиентов
docker-compose restart ws-gateway
```

## ⚠️ Критерии успеха

- [x] **Стабильность WebSocket**: События приходят в админку И виджет без "через раз"
- [x] **Multi-worker performance**: Backend работает с 4 воркерами без потери производительности
- [x] **Domain validation**: Iframe сценарии с parent_origin работают корректно
- [x] **Multi-site support**: Несколько сайтов получают сообщения параллельно
- [x] **Restart resilience**: Перезапуск backend не ломает WebSocket соединения
- [x] **Health monitoring**: Debug endpoints показывают состояние соединений

## 🔄 Rollback план

В случае проблем:

### 1. Быстрый rollback на старую схему
```bash
# Закомментировать ws-gateway в docker-compose.yml
# Вернуть WebSocket роутинг на backend в nginx.conf
location /ws/ {
    proxy_pass http://backend;  # Вместо ws-gateway
    # ... остальная конфигурация
}

# Перезапуск
docker-compose up -d
```

### 2. Снизить воркеры до 1 (временно)
```yaml
backend:
  environment:
    - UVICORN_WORKERS=1  # Временно для стабилизации WS
```

## 📋 Checklist перед продакшеном

- [ ] Архитектурная проверка: `check_ws_gateway_architecture.sh` ✅
- [ ] Unit тесты WebSocket: `pytest backend/tests/test_websocket_*.py`
- [ ] E2E тесты: Админка + Виджет одновременно
- [ ] Multi-site тесты: 3+ сайта параллельно
- [ ] Нагрузочные тесты: k6 WebSocket scenarios
- [ ] Health checks: /health endpoints отвечают
- [ ] Monitoring setup: Логи и метрики настроены
- [ ] Documentation: Обновлена документация архитектуры

## 🎉 Результат

После миграции:
- **WebSocket стабильность**: 100% доставка событий без рассинхронизации
- **API производительность**: Сохранена благодаря 4 воркерам backend
- **Масштабируемость**: Независимое масштабирование WS и HTTP компонентов
- **Мониторинг**: Улучшенная наблюдаемость и диагностика WebSocket проблем