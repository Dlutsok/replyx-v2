# Руководство по развертыванию ReplyX в продакшене

## 🟢 Статус готовности к продакшену

✅ **CORS безопасность** - Строгие CORS настройки для продакшена  
✅ **Лимиты ресурсов** - Ограничения памяти и CPU для всех сервисов  
✅ **Строгие теги образов** - Использование ${TAG} вместо :latest  
✅ **Проверки здоровья** - Мониторинг состояния всех сервисов  
✅ **Изоляция сетей** - Изолированные Docker сети  
✅ **Заголовки безопасности** - CSP, HSTS, X-Frame-Options, X-XSS-Protection  
✅ **Оптимизированные сборки** - Улучшенные .dockerignore файлы  
✅ **Сканирование безопасности** - Trivy проверки в CI/CD  
✅ **Внешняя база данных** - PostgreSQL на отдельном сервере (192.168.0.4)

## 🚀 Быстрое развертывание

**ВАЖНО**: Теперь обязательна переменная TAG!

```bash
# 1. Установить переменную тега (ОБЯЗАТЕЛЬНО!)
export TAG=v1.0.0

# 2. Запустить развертывание
cd Deployed/
chmod +x deploy.sh
./deploy.sh
```

## 📋 Критические изменения

### 🔄 Обновления Docker Compose
- **Теги образов**: Все образы теперь используют `ghcr.io/yourorg/replyx-*:${TAG}`
- **Лимиты ресурсов**: Жесткие ограничения памяти и CPU
- **Проверки здоровья**: Добавлены для всех сервисов
- **Сети**: Публичная и внутренняя изоляция

### ⚠️ Критические изменения
1. **Обязательная переменная TAG**: Необходима переменная `$TAG` перед запуском
2. **Внешняя база данных**: База данных уже настроена на внешнем сервере
3. **Архитектура сетей**: Изменена структура сетей

## ⚙️ Конфигурация окружения

### 📁 Централизованное управление настройками
- **Единый файл конфигурации**: `Deployed/.env.production`
- **Все сервисы** (backend, workers, redis) используют один файл через `env_file`
- **Frontend** использует только NEXT_PUBLIC_ переменные через `environment`
- **Удалены дублирующие** `.env.example` файлы из папок сервисов

### 🔗 Как работает конфигурация:
```yaml
# docker-compose.yml
backend:
  env_file: .env.production  # Загружает ВСЕ переменные

workers:  
  env_file: .env.production  # Тот же файл

frontend:
  environment:              # Только публичные переменные
    - NEXT_PUBLIC_API_URL=https://replyx.ru
```

## 🔧 Распределение ресурсов

```
Общая память: ~3ГБ
Общий CPU: ~2.5 ядра

┌─────────────┬─────────┬─────────┬──────────────┐
│ Сервис      │ Память  │ CPU     │ Порт         │
├─────────────┼─────────┼─────────┼──────────────┤
│ Backend     │ 1024МБ  │ 1.0     │ 8000         │
│ Frontend    │ 512МБ   │ 0.5     │ 3000         │
│ Workers     │ 768МБ   │ 0.75    │ 8443, 3002   │
│ Redis       │ 512МБ   │ 0.25    │ 6379         │
│ Nginx       │ 256МБ   │ 0.25    │ 80, 443      │
└─────────────┴─────────┴─────────┴──────────────┘
```

## 🗄️ Конфигурация базы данных (внешняя)

**НАСТРОЕНО**: База данных уже настроена!
```
Хост: 192.168.0.4
Порт: 5432
База данных: replyx_production
Пользователь: gen_user
Пароль: [НАСТРОЕН В .env.production]
SSL режим: require
```

❌ **НЕ запускайте init-db.sh** - база уже настроена на внешнем сервере!

## 📦 Архитектура сетей

```
┌─────────────────────────────────────────┐
│            Публичная сеть               │
│         (172.20.0.0/24)                │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │         Nginx (80/443)              ││
│  │    SSL + Заголовки безопасности     ││
│  └─────────────┬───────────────────────┘│
└────────────────┼────────────────────────┘
                 │
┌────────────────┼────────────────────────┐
│          Внутренняя сеть                │
│         (172.21.0.0/24)                │
│                │                        │
│  ┌─────┬───────┼────────┬────────┐      │
│  │     │       │        │        │      │
│┌─▼───┐│┌────▼─┐│┌─────▼─┐│┌─────▼──┐   │
││Front││││Back  │││Workers│││ Redis  │   │
││:3000│││:8000 │││:8443  │││ :6379  │   │
│└─────┘│└──────┘│└───────┘│└────────┘   │
└───────┴────────┴─────────┴──────────────┘
                 │
         ┌───────▼────────┐
         │ Внешняя БД     │
         │192.168.0.4:5432│
         └────────────────┘
```

## 🔑 Статус переменных окружения

### ✅ Готово к продакшену:
- ✅ SECRET_KEY: `QwGNF...` (32+ символа)
- ✅ JWT_SECRET_KEY: `exF6Z...` (32+ символа) 
- ✅ DATABASE_URL: Внешняя PostgreSQL настроена
- ✅ REDIS_PASSWORD: `EGpdW...` (сложный)
- ✅ OPENAI_API_KEY: `sk-proj...` (настроен с прокси)
- ✅ TELEGRAM_BOT_TOKEN: `8088014627:AAG4...`
- ✅ YANDEX_SMTP: Настроен с паролем приложения
- ✅ CORS_ORIGINS: `https://replyx.ru,https://www.replyx.ru`

### ⚠️ Требует ручного обновления:
- `YANDEX_CLIENT_ID`: `CHANGEME_PRODUCTION_YANDEX_CLIENT_ID`
- `YANDEX_CLIENT_SECRET`: `CHANGEME_PRODUCTION_YANDEX_CLIENT_SECRET`

### 📧 Настройка OAuth:
1. Перейдите на https://oauth.yandex.ru/
2. Создайте приложение для `replyx.ru`
3. Укажите callback: `https://replyx.ru/api/auth/yandex/callback`
4. Обновите .env.production:
   ```bash
   YANDEX_CLIENT_ID=ваш_реальный_client_id
   YANDEX_CLIENT_SECRET=ваш_реальный_client_secret
   ```

## 🚀 Процесс развертывания

### Метод 1: Полностью автоматическое развертывание
```bash
export TAG=v1.0.0
cd Deployed/
./deploy.sh
```

### Метод 2: Пошаговое развертывание
```bash
export TAG=v1.0.0  # ОБЯЗАТЕЛЬНО!
cd Deployed/

# Проверить конфигурацию
docker-compose config

# Поэтапный запуск
docker-compose up -d redis
sleep 10

docker-compose up -d backend
sleep 30

docker-compose up -d workers
sleep 20

docker-compose up -d frontend
sleep 20

docker-compose up -d nginx
```

## 🔍 Точки проверки здоровья

После развертывания проверьте:

```bash
# Nginx (через балансировщик нагрузки)
curl -f https://replyx.ru/health
# Ожидается: "healthy"

# Backend API
curl -f https://replyx.ru/api/health
# Ожидается: {"status":"healthy",...}

# Frontend
curl -f https://replyx.ru/
# Ожидается: HTML страница

# Workers (через внутреннюю сеть)
docker-compose exec nginx curl -f http://workers:3002/health
# Ожидается: {"status":"ok",...}
```

## 📊 Мониторинг и логи

### Статус контейнеров:
```bash
# Проверить статус всех сервисов
docker-compose ps

# Использование ресурсов
docker stats

# Логи всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
```

### Расположение логов:
- **Приложение**: Внутри контейнеров
- **Nginx**: `docker-compose logs nginx`
- **Система**: `/var/log/docker/`

## 🔒 Реализация безопасности

### Реализованные заголовки:
```
Strict-Transport-Security: max-age=63072000
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
```

### Безопасность сети:
- Внутренняя сеть изолирована
- Только nginx имеет внешний доступ
- База данных на отдельном внешнем сервере
- Redis требует аутентификации по паролю

### Лимиты ресурсов:
- Отключено использование swap (`memswap_limit = mem_limit`)
- Включено ограничение CPU
- Автоматический перезапуск при сбоях
- Поддержка корректного завершения

## 🚨 Устранение неполадок

### Частые проблемы после обновлений:

1. **Переменная TAG не установлена**:
   ```
   ERROR: Invalid interpolation format for "image" option
   ```
   Решение: `export TAG=v1.0.0`

2. **Конфликты сетей**:
   ```bash
   # Удалить конфликтующие сети
   docker network prune
   ```

3. **Ограничения ресурсов**:
   ```bash
   # Проверить доступную память на сервере
   free -h
   # Должно быть 4ГБ+ доступно
   ```

4. **Подключение к базе данных**:
   ```bash
   # Тест подключения к внешней БД
   docker-compose exec backend python -c "
   import psycopg2
   conn = psycopg2.connect('postgresql://gen_user:q%3F%7C%3E7!gzi%2BS.jJ@192.168.0.4:5432/replyx_production')
   print('БД подключена!')
   "
   ```

### Команды для отладки:
```bash
# Внутренности контейнеров
docker-compose exec backend bash
docker-compose exec workers bash

# Диагностика сетей
docker network ls
docker network inspect replyx_public
docker network inspect replyx_internal

# Использование ресурсов
docker stats --no-stream
```

## 🔄 Обновления и обслуживание

### Обновления приложения:
```bash
# Установить новый тег
export TAG=v1.1.0

# Получить последние образы (если используются образы из CI/CD)
docker-compose pull

# Пересоздать контейнеры с новыми образами
docker-compose up -d
```

### Миграции базы данных:
```bash
# Запустить миграции на внешней БД
docker-compose exec backend alembic upgrade head
```

## 📞 Экстренные процедуры

### Быстрое отключение:
```bash
docker-compose down
```

### Перезапуск сервиса:
```bash
# Перезапуск одного сервиса
docker-compose restart backend

# Перезапуск всех сервисов
docker-compose restart
```

### Откат:
```bash
# Откат к предыдущему тегу
export TAG=v1.0.0
docker-compose up -d
```

---

**📋 Чек-лист развертывания:**
- [ ] Переменная TAG установлена
- [ ] .env.production проверен
- [ ] Внешняя база данных доступна
- [ ] DNS домена настроен
- [ ] SSL сертификаты готовы
- [ ] Yandex OAuth настроен
- [ ] Все проверки здоровья пройдены