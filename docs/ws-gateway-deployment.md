# WS-Gateway Deployment Guide

## Что изменилось

Виджет теперь работает через отдельный WebSocket-сервис `ws-gateway` для решения проблем синхронизации в multi-worker окружении.

**Архитектура:**
- `backend` (4 воркера) — HTTP API для производительности
- `ws-gateway` (1 воркер) — WebSocket для консистентности состояния

## Быстрый деплой

### 1. GitHub Actions (автоматический)

```bash
# Пуш в main автоматически запускает деплой
git push origin main

# Или ручной запуск через GitHub UI:
# Actions → Deploy to Production → Run workflow
```

**Что происходит:**
1. Собираются образы: `backend`, `frontend`, `workers` 
2. `ws-gateway` использует тот же образ `backend` с другой точкой входа
3. Образы отправляются на сервер и разворачиваются

### 2. Ручной деплой на Timeweb

```bash
# Первоначальная настройка сервера
export PGPASSWORD="your_postgres_password"
./timeweb_deploy.sh

# Или только мониторинг
./timeweb_deploy.sh monitor
```

## Проверка развертывания

После деплоя проверьте health endpoints:

```bash
# Основной API
curl https://replyx.ru/health

# WS Gateway 
curl https://replyx.ru/ws-health

# Прямой доступ к ws-gateway (если порт открыт)
curl http://your-server:8001/health
```

## Структура сервисов

```yaml
services:
  backend:      # 4 воркера для HTTP API
  ws-gateway:   # 1 воркер для WebSocket
  workers:      # Telegram боты
  frontend:     # Next.js
  nginx:        # Reverse proxy
```

## Маршрутизация

- `/api/*` → `backend:8000` (HTTP API)
- `/ws/*` → `ws-gateway:8001` (WebSocket)
- `/*` → `frontend:3000` (SPA)

## Отладка проблем

### Проверка контейнеров
```bash
cd /opt/replyx/Deployed
docker compose ps
docker compose logs -f ws-gateway
```

### Проверка WebSocket соединений
```bash
# В логах ws-gateway должны быть подключения
docker compose logs ws-gateway | grep "WebSocket"

# Тест WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost/ws/widget/test
```

### Типичные проблемы

1. **ws-gateway не стартует**
   ```bash
   # Проверить образ и команду запуска
   docker compose logs ws-gateway
   ```

2. **WebSocket соединения не работают**
   ```bash
   # Проверить nginx конфигурацию
   docker compose exec nginx cat /etc/nginx/nginx.conf | grep -A 10 "location /ws"
   ```

3. **Разные состояния в виджетах**
   ```bash
   # Убедиться что ws-gateway имеет ровно 1 воркер
   docker compose exec ws-gateway ps aux | grep uvicorn
   ```

## Откат изменений

Если что-то пошло не так:

```bash
cd /opt/replyx/Deployed

# Откат к предыдущей версии
export PREV_TAG="previous-working-tag"
docker compose pull
docker compose up -d

# Или полная остановка ws-gateway
docker compose stop ws-gateway
# Виджет не будет работать, но основное приложение останется рабочим
```

## Мониторинг

```bash
# Статус всех сервисов
/opt/replyx/monitor_timeweb.sh

# Логи в реальном времени
docker compose logs -f ws-gateway nginx backend

# Проверка WebSocket подключений
curl -s http://localhost:8001/debug/connections | jq
```