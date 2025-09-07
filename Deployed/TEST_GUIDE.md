# Руководство по тестированию ReplyX

## 🧪 Локальное тестирование (Рекомендуется)

### Шаг 1: Подготовка окружения
```bash
# Установить тестовый тег
export TAG=test-local-$(date +%Y%m%d-%H%M)

# Проверить, что переменная установлена
echo "Тестовый тег: $TAG"

# Перейти в папку развертывания
cd Deployed/
```

### Шаг 2: Проверка конфигурации
```bash
# Проверить синтаксис docker-compose
docker-compose config

# Проверить, что все пути к контекстам сборки корректны
ls -la ../backend/Dockerfile
ls -la ../frontend/Dockerfile  
ls -la ../workers/Dockerfile
```

### Шаг 3: Сборка образов
```bash
# Собрать все образы локально
docker-compose build --no-cache

# Проверить созданные образы
docker images | grep replyx
```

### Шаг 4: Запуск сервисов поэтапно
```bash
# 1. Запустить Redis
docker-compose up -d redis
echo "Ждем Redis..."
sleep 10
docker-compose ps redis

# 2. Запустить Backend
docker-compose up -d backend
echo "Ждем Backend..."
sleep 30
docker-compose ps backend

# 3. Проверить логи Backend
docker-compose logs backend | tail -20

# 4. Запустить Workers
docker-compose up -d workers
echo "Ждем Workers..."
sleep 20
docker-compose ps workers

# 5. Запустить Frontend
docker-compose up -d frontend
echo "Ждем Frontend..."
sleep 20
docker-compose ps frontend

# 6. Запустить Nginx
docker-compose up -d nginx
echo "Ждем Nginx..."
sleep 10
docker-compose ps nginx
```

## 🔍 Проверки работоспособности

### Проверка 1: Статус всех сервисов
```bash
# Показать статус всех контейнеров
docker-compose ps

# Проверить использование ресурсов
docker stats --no-stream

# Все контейнеры должны быть в статусе "Up"
```

### Проверка 2: Health Checks
```bash
# Redis
echo "Проверяем Redis..."
docker-compose exec redis redis-cli ping
# Ожидается: PONG

# Backend API
echo "Проверяем Backend API..."
curl -f http://localhost:8000/health || echo "Backend недоступен"
# Ожидается: JSON с "status":"healthy"

# Frontend
echo "Проверяем Frontend..."
curl -f http://localhost:3000/ || echo "Frontend недоступен"
# Ожидается: HTML страница

# Workers
echo "Проверяем Workers..."
curl -f http://localhost:3002/health || echo "Workers недоступен"
# Ожидается: JSON с "status":"ok"

# Nginx
echo "Проверяем Nginx..."
curl -f http://localhost/health || echo "Nginx недоступен"
# Ожидается: "healthy"
```

### Проверка 3: Сетевое взаимодействие
```bash
# Проверить, что сервисы видят друг друга
docker-compose exec backend ping redis -c 3
docker-compose exec workers ping backend -c 3
docker-compose exec frontend curl -f http://backend:8000/health

# Проверить изоляцию сетей
docker network ls | grep replyx
docker network inspect replyx_public
docker network inspect replyx_internal
```

### Проверка 4: База данных (внешняя)
```bash
# Проверить подключение к внешней БД
docker-compose exec backend python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    print('✅ Подключение к БД успешно!')
    cursor = conn.cursor()
    cursor.execute('SELECT version()')
    version = cursor.fetchone()
    print(f'Версия PostgreSQL: {version[0]}')
    conn.close()
except Exception as e:
    print(f'❌ Ошибка подключения к БД: {e}')
"
```

## 📊 Мониторинг тестирования

### Логи в реальном времени
```bash
# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f workers

# Последние 50 строк логов
docker-compose logs --tail=50 backend
```

### Метрики ресурсов
```bash
# Использование ресурсов в реальном времени
docker stats

# Проверить лимиты ресурсов
docker inspect replyx-backend | jq '.[0].HostConfig.Memory'
docker inspect replyx-frontend | jq '.[0].HostConfig.Memory'
```

## 🔧 Тестирование функциональности

### Тест 1: API Endpoints
```bash
# Список основных endpoints для тестирования
echo "Тестируем основные API endpoints..."

# Health check
curl -s http://localhost:8000/health | jq .

# Status
curl -s http://localhost:8000/status | jq .

# Готовность системы
curl -s http://localhost:8000/readyz | jq .

# Проверка CORS headers
curl -I -H "Origin: https://replyx.ru" http://localhost:8000/health
```

### Тест 2: Frontend
```bash
# Проверить загрузку главной страницы
curl -s http://localhost:3000/ | head -20

# Проверить статические ресурсы
curl -I http://localhost:3000/_next/static/ 2>/dev/null || echo "Статика недоступна"
```

### Тест 3: Nginx Proxy
```bash
# Проверить проксирование через Nginx
curl -s http://localhost/api/health | jq . || echo "Nginx proxy не работает"

# Проверить security headers
curl -I http://localhost/health | grep -E "(X-Frame-Options|Content-Security-Policy|Strict-Transport-Security)"
```

## ❌ Остановка тестирования

```bash
# Остановить все сервисы
docker-compose down

# Удалить тестовые образы (опционально)
docker images | grep "replyx.*$TAG" | awk '{print $3}' | xargs docker rmi -f

# Очистить неиспользуемые ресурсы
docker system prune -f
```

## 🚨 Типичные проблемы и решения

### Проблема 1: Переменная TAG не установлена
```
ERROR: Invalid interpolation format for "image" option
```
**Решение**: `export TAG=test-local`

### Проблема 2: Порты заняты
```
ERROR: for replyx-nginx  Cannot start service nginx: driver failed programming external connectivity
```
**Решение**:
```bash
# Найти процесс, занимающий порт
sudo lsof -i :80
sudo lsof -i :443

# Остановить conflicting сервисы
sudo systemctl stop apache2  # если установлен
sudo systemctl stop nginx    # системный nginx
```

### Проблема 3: Недостаточно памяти
```
WARN[0000] The "replyx-backend" service specifies a memory limit of 1024MB but the available memory is only XXXm
```
**Решение**:
```bash
# Проверить доступную память
free -h

# Временно уменьшить лимиты для тестирования
# Отредактировать docker-compose.yml
```

### Проблема 4: База данных недоступна
```
psycopg2.OperationalError: could not connect to server
```
**Решение**:
```bash
# Проверить доступность внешней БД
ping 192.168.0.4
telnet 192.168.0.4 5432

# Проверить правильность credentials в .env.production
```

## 📋 Чек-лист успешного тестирования

- [ ] Переменная TAG установлена
- [ ] Все образы собраны успешно
- [ ] Все 5 сервисов запущены (Up status)
- [ ] Health checks проходят
- [ ] Подключение к внешней БД работает
- [ ] API endpoints отвечают
- [ ] Frontend загружается
- [ ] Nginx проксирует запросы
- [ ] Security headers присутствуют
- [ ] Логи не содержат критических ошибок
- [ ] Ресурсы используются в пределах лимитов

## 🎯 После успешного тестирования

Если все тесты прошли успешно:

1. **Готово к продакшену**: Система готова к реальному развертыванию
2. **Создать release тег**: `git tag v1.0.0 && git push origin v1.0.0`
3. **Запустить CI/CD**: Push в main для автоматической сборки production образов
4. **Развернуть на сервере**: Используя тот же процесс, но с production TAG

```bash
# Пример production развертывания после успешных тестов
export TAG=v1.0.0
cd Deployed/
./deploy.sh
```