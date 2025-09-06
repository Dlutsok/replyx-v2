# 🚀 ReplyX CORS Security Deployment

Полный пакет для безопасного деплоя CORS изменений в продакшен.

## 📦 Содержимое пакета

### Основные файлы
- **`deploy.sh`** - автоматический скрипт деплоя
- **`docker-compose.prod.yml`** - продакшен конфигурация
- **`.env.docker.example`** - образец переменных окружения
- **`nginx.conf`** - конфигурация Nginx (без CORS!)

### Документация
- **`QUICK_DEPLOY_CHECKLIST.md`** - чек-лист на 1 страницу
- **`DEPLOYMENT_CHECKLIST.md`** - подробная инструкция
- **`CORS_SECURITY_IMPLEMENTATION_REPORT.md`** - техническая документация

### Тесты и утилиты
- **`deployment_tests.sh`** - автоматические тесты безопасности
- **`generate_test_jwt.py`** - генератор тестовых JWT токенов
- **`check_alembic.sh`** - проверка миграций

## 🏗️ Структура репозитория

```
replyx/
├── backend/                 # FastAPI + DynamicCORSMiddleware
├── frontend/               # Next.js приложение
├── workers/                # Node.js Telegram боты
├── deploy/                 # ← ВСЕ ФАЙЛЫ ОТСЮДА
│   ├── deploy.sh           # Автодеплой
│   ├── docker-compose.prod.yml
│   ├── nginx.conf
│   ├── .env.docker.example
│   └── *.md               # Документация
└── docs/                  # Техническая документация
```

## ⚡ Быстрый старт

### 1. Подготовка
```bash
# Скопируйте все файлы в deploy директорию
mkdir -p /opt/replyx/Deployed
cp deploy/* /opt/replyx/Deployed/
cd /opt/replyx/Deployed

# Настройте переменные окружения
cp .env.docker.example .env
nano .env  # Заполните реальными значениями
```

### 2. Nginx конфигурация
```bash
# Установите конфигурацию Nginx
sudo cp nginx.conf /etc/nginx/sites-available/replyx.ru
sudo ln -sf /etc/nginx/sites-available/replyx.ru /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Автоматический деплой
```bash
# Установите TAG и запустите деплой
export TAG=v1.0.0
./deploy.sh
```

### 4. Проверка
```bash
# Запустите автоматические тесты
./deployment_tests.sh
```

## 📋 Ручной деплой (пошагово)

Если нужно больше контроля, следуйте `QUICK_DEPLOY_CHECKLIST.md`:

```bash
# 1. Подготовка
export TAG=v1.0.0
docker compose -f docker-compose.prod.yml pull

# 2. Миграции
docker compose -f docker-compose.prod.yml run --rm replyx-backend alembic upgrade head

# 3. Запуск
docker compose -f docker-compose.prod.yml up -d

# 4. Проверка
curl -sS https://replyx.ru/health
```

## 🧪 Тестирование

### Автоматические тесты
```bash
./deployment_tests.sh
```

### Ручные проверки
```bash
# Health check
curl -sS https://replyx.ru/health

# Main app (с credentials)
curl -sS https://replyx.ru/api/login \
  -H "Origin: https://replyx.ru" \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}' -i

# Widget preflight (без credentials)
curl -sS https://replyx.ru/api/validate-widget-token \
  -X OPTIONS \
  -H "Origin: https://stencom.ru" \
  -H "Access-Control-Request-Method: POST" -i

# Блокировка злых доменов
curl -sS https://replyx.ru/api/validate-widget-token \
  -X OPTIONS \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: POST" -i
```

## 🚨 Откат

### Быстрый откат
```bash
export PREV_TAG=v0.9.9
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Откат с восстановлением БД
```bash
# Остановка
docker compose down

# Восстановление (если есть бэкап)
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U replyx_user -d replyx_prod < backup_YYYYMMDD.sql

# Старая версия
export PREV_TAG=v0.9.9
docker compose -f docker-compose.prod.yml up -d
```

## 📊 Мониторинг

### Логи
```bash
# Все сервисы
docker compose logs -f

# Только backend
docker compose logs -f replyx-backend

# Системные логи
journalctl -u nginx -f
```

### Метрики
```bash
# Prometheus метрики
curl -sS https://replyx.ru/metrics | grep widget

# Должны быть:
widget_cors_requests_total
widget_token_validations_total
widget_blocked_origins_total
```

### Состояние сервисов
```bash
# Docker контейнеры
docker compose ps

# Системные сервисы
systemctl status nginx
```

## 🔐 Безопасность

### Ключевые настройки
- ✅ `CORS_ORIGINS` без "*"
- ✅ `ENABLE_CSRF_PROTECTION=false` для API виджетов
- ✅ Уникальные `SECRET_KEY` и `SITE_SECRET`
- ✅ Nginx без CORS заголовков

### Мониторинг атак
- Следите за `widget_blocked_origins_total`
- Анализируйте логи WARNING уровня
- Настройте алерты в Grafana

## 🛠️ Кастомизация

### Изменение реестра образов
Отредактируйте `docker-compose.prod.yml`:
```yaml
image: your-registry.com/replyx-backend:${TAG}
```

### Добавление доменов
Отредактируйте `.env`:
```bash
# Добавьте новые домены (БЕЗ "*"!)
CORS_ORIGINS=https://replyx.ru,https://www.replyx.ru,https://your-domain.com
```

### Настройка мониторинга
```bash
# Запуск с Prometheus
docker compose --profile monitoring up -d
```

## 📞 Поддержка

**Документация**: 
- `CORS_SECURITY_IMPLEMENTATION_REPORT.md` - техническая документация
- `DEPLOYMENT_CHECKLIST.md` - подробная инструкция

**Отладка**:
```bash
# Логи деплоя
docker compose logs replyx-backend | grep -E "(CORS|DynamicCORSMiddleware)"

# Проверка конфигурации
curl -sS https://replyx.ru/metrics | grep widget
```

**Контакты**:
- Разработчик: Claude Code Assistant
- Техническая документация в `docs/`
- Метрики: `https://replyx.ru/metrics`

---

## ✅ Критерии готовности

- [ ] Все файлы скопированы в `/opt/replyx/Deployed/`
- [ ] `.env` заполнен реальными значениями
- [ ] Nginx конфигурация установлена
- [ ] `TAG` переменная установлена
- [ ] `./deployment_tests.sh` проходит все тесты

**🎯 Ready to deploy!**