# 🚀 1-страничный чек-лист выката CORS Security

## 0️⃣ Пре-деплой (один раз)

### ✅ Конфигурация `.env.production`
```bash
CORS_ORIGINS=https://replyx.ru,https://www.replyx.ru  # БЕЗ "*"!
ENABLE_CSRF_PROTECTION=false                          # для API виджетов
SITE_SECRET=<случайный_секрет>                        # для JWT виджетов
SECRET_KEY=<другой_случайный_секрет>                  # основное приложение
```

### ✅ Nginx конфиг
- Загружен `nginx.conf` → `/etc/nginx/sites-available/replyx.ru`
- CORS НЕ настраиваем в nginx (только `Vary: Origin`)
- Health эндпоинт: `GET /api/health → 200`

### ✅ Alembic состояние
```bash
alembic current  # должно показывать head
# Если нет: alembic stamp head (после бэкапа БД!)
```

## 1️⃣ Сборка в CI

```bash
# Соберите образы и пушните в реестр
export TAG=v1.0.0  # или sha-XXXXXXX
docker build -t ghcr.io/yourorg/replyx-backend:$TAG backend/
docker build -t ghcr.io/yourorg/replyx-frontend:$TAG frontend/
docker push ghcr.io/yourorg/replyx-backend:$TAG
docker push ghcr.io/yourorg/replyx-frontend:$TAG
```

## 2️⃣ Деплой на сервер

```bash
cd /opt/replyx/Deployed
export TAG=v1.0.0  # тот же тег
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head
docker compose -f docker-compose.prod.yml up -d
```

## 3️⃣ Базовые проверки

### Контейнеры запущены
```bash
docker compose ps
# Все сервисы должны быть "Up"
```

### Health check
```bash
curl -isS https://replyx.ru/health
# Ожидаем: HTTP/1.1 200 OK
```

### Логин ЛК (основной домен)
```bash
curl -isS https://replyx.ru/api/login \
  -H "Origin: https://replyx.ru" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Ожидаем:
# ✅ Access-Control-Allow-Origin: https://replyx.ru
# ✅ Access-Control-Allow-Credentials: true
```

### Preflight виджета
```bash
curl -isS https://replyx.ru/api/validate-widget-token \
  -X OPTIONS \
  -H "Origin: https://stencom.ru" \
  -H "Access-Control-Request-Method: POST"

# Ожидаем:
# ✅ HTTP/1.1 200 OK  
# ✅ Access-Control-Allow-Origin: https://stencom.ru
# ✅ НЕТ Access-Control-Allow-Credentials
```

### POST виджета с JWT
```bash
# Генерируем тестовый токен:
python3 generate_test_jwt.py "your-site-secret" "stencom.ru"

curl -isS https://replyx.ru/api/validate-widget-token \
  -H "Origin: https://stencom.ru" \
  -H "Content-Type: application/json" \
  -d '{"token":"<JWT_TOKEN>","domain":"stencom.ru"}'

# Ожидаем:
# ✅ Access-Control-Allow-Origin: https://stencom.ru
# ✅ НЕТ credentials
# ⚠️  Может быть 401 (невалидный токен), но CORS должен работать
```

### Блокировка злонамеренных доменов
```bash
curl -isS https://replyx.ru/api/validate-widget-token \
  -X OPTIONS \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: POST"

# Ожидаем:
# ✅ HTTP/1.1 403 Forbidden ИЛИ нет CORS заголовков
```

## 4️⃣ Наблюдаемость

### Prometheus метрики
```bash
curl -sS https://replyx.ru/metrics | grep widget

# Должны расти:
# ✅ widget_cors_requests_total
# ✅ widget_token_validations_total  
# ✅ widget_blocked_origins_total
```

### Nginx логи
```bash
tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# Не должно быть:
# ❌ Новых 502 ошибок
# ❌ CORS related ошибок
```

### Backend логи
```bash
docker compose logs -f backend | grep -E "(CORS|DynamicCORSMiddleware|widget)"

# Должны быть:
# ✅ "🔐 DynamicCORSMiddleware инициализирован"
# ✅ "🌐 Основные CORS домены: ['https://replyx.ru', ...]"
# ✅ "⚠️ CSRF Protection отключена (разработка)"
```

## 5️⃣ Откат (если что-то пошло не так)

### Быстрый откат образов
```bash
export PREV_TAG=v0.9.9  # предыдущая рабочая версия
cd /opt/replyx/Deployed
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Проверяем
curl -sS https://replyx.ru/health
```

### Полный откат (с БД)
```bash
# Остановка
docker compose down

# Восстановление БД (если нужно)
psql -U replyx_user -d replyx_prod < backup_YYYYMMDD.sql

# Откат кода
git checkout $PREV_TAG

# Запуск
docker compose up -d
```

---

## ✅ Критерии успеха

- [ ] **Health**: `/health` возвращает 200
- [ ] **ЛК**: логин работает с credentials для replyx.ru
- [ ] **Виджеты**: preflight работает без credentials
- [ ] **Блокировка**: злонамеренные домены отклоняются  
- [ ] **Метрики**: Prometheus собирает widget_* метрики
- [ ] **Логи**: нет CORS ошибок в nginx/backend логах

## 🆘 Контакты в случае проблем

**Документация**: `CORS_SECURITY_IMPLEMENTATION_REPORT.md`  
**Тесты**: `./deployment_tests.sh`  
**Отладка**: `docker compose logs backend frontend`  
**Метрики**: `https://replyx.ru/metrics`  

---

**⏱️ Время деплоя**: ~5-10 минут  
**🎯 Готовность**: все файлы в проекте, тесты пройдены