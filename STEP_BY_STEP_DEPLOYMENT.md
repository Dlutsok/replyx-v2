# 🚀 Пошаговое развертывание ReplyX на сервере

**Дата:** 2025-01-24  
**Версия:** MVP 13  
**Статус:** Готов к продакшену  

## 📋 Предварительные требования

### Сервер
- **OS:** Ubuntu 20.04+ или CentOS 8+
- **RAM:** Минимум 4GB (рекомендуется 8GB)
- **CPU:** 2+ cores
- **Disk:** 50GB+ SSD
- **Docker:** 20.10+
- **Docker Compose:** 1.29+

### Сетевые требования
- Открытые порты: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Доступ к PostgreSQL серверу (192.168.0.4:5432)
- Доступ в интернет для установки пакетов

### Доменные настройки
- A-запись: `replyx.ru` → IP сервера
- A-запись: `www.replyx.ru` → IP сервера

---

## 🔧 Этап 1: Подготовка сервера

### 1.1 Подключение к серверу
```bash
ssh root@ваш-сервер-ip
# или
ssh user@ваш-сервер-ip
sudo -i  # если не root
```

### 1.2 Обновление системы
```bash
# Ubuntu/Debian
apt update && apt upgrade -y

# CentOS/RHEL
yum update -y
```

### 1.3 Установка Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Проверка установки
docker --version
docker-compose --version
```

### 1.4 Настройка файрвола
```bash
# Ubuntu (ufw)
ufw allow 22     # SSH
ufw allow 80     # HTTP
ufw allow 443    # HTTPS
ufw --force enable
ufw status

# CentOS (firewalld)
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

### 1.5 Создание рабочих директорий
```bash
mkdir -p /opt/replyx
cd /opt/replyx
```

---

## 📦 Этап 2: Перенос файлов проекта

### 2.1 Копирование файлов с локальной машины
```bash
# На локальной машине (из папки MVP 13):
scp -r Deployed user@ваш-сервер:/opt/replyx/
scp -r frontend user@ваш-сервер:/opt/replyx/
scp -r backend user@ваш-сервер:/opt/replyx/
scp -r workers user@ваш-сервер:/opt/replyx/
scp -r scripts user@ваш-сервер:/opt/replyx/
```

### 2.2 Альтернатива: клонирование из Git
```bash
# На сервере
cd /opt/replyx
git clone https://ваш-git-repo.git .
# или загрузка архива
```

### 2.3 Установка прав доступа
```bash
cd /opt/replyx
chmod +x Deployed/deploy.sh
chmod +x Deployed/init-db.sh
chmod +x scripts/production_deploy.sh
find . -name "*.sh" -type f -exec chmod +x {} \;
```

---

## 🗄️ Этап 3: Настройка базы данных

### 3.1 Подготовка переменных окружения
```bash
cd /opt/replyx/Deployed

# Проверяем настройки БД в .env.production
grep -E "DB_HOST|DB_NAME|DB_USER|DB_PASSWORD" .env.production

# Экспортируем пароль администратора PostgreSQL
export PGPASSWORD="пароль-админа-postgres"
```

### 3.2 Инициализация базы данных (неинтерактивно)
```bash
# Запускаем инициализацию БД без подтверждения
./init-db.sh -y
```

**Ожидаемый вывод:**
```
🗄️  Инициализация базы данных ReplyX
==================================
Неинтерактивный режим: автоматическое подтверждение
✅ Подключение успешно!
✅ Пользователь 'gen_user' создан
✅ База данных 'replyx_production' создана
✅ Расширение pgvector успешно установлено!
🎉 Инициализация базы данных завершена!
```

### 3.3 Проверка БД
```bash
# Тестируем подключение
./init-db.sh test
```

---

## 🔑 Этап 4: Настройка OAuth и ключей

### 4.1 Yandex OAuth (КРИТИЧНО!)
Перед деплоем **ОБЯЗАТЕЛЬНО** получите production ключи:

1. Перейдите на https://oauth.yandex.ru/
2. Создайте новое приложение для домена `replyx.ru`
3. Укажите Callback URL: `https://replyx.ru/api/auth/yandex/callback`
4. Получите Client ID и Client Secret

### 4.2 Обновление .env.production
```bash
cd /opt/replyx/Deployed

# Замените CHANGEME значения реальными ключами
nano .env.production

# Найдите и замените:
YANDEX_CLIENT_ID=ваш_production_client_id
YANDEX_CLIENT_SECRET=ваш_production_client_secret
```

### 4.3 Проверка критичных настроек
```bash
# Проверяем, что все ключи заполнены
grep -E "SECRET_KEY|JWT_SECRET_KEY|OPENAI_API_KEY|DATABASE_URL" .env.production
```

---

## 🐳 Этап 5: Развертывание Docker контейнеров

### 5.1 Сборка образов
```bash
cd /opt/replyx/Deployed

# Сборка всех образов
docker-compose build

# Проверяем образы
docker images | grep replyx
```

### 5.2 Запуск сервисов поэтапно

#### 5.2.1 Запуск Redis
```bash
docker-compose up -d redis

# Проверяем
docker-compose ps redis
docker-compose logs redis
```

#### 5.2.2 Запуск Backend
```bash
docker-compose up -d backend

# Ждем запуска и проверяем
sleep 30
docker-compose logs backend
curl http://localhost:8000/health
```

**Ожидаемый ответ от /health:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected"
}
```

#### 5.2.3 Запуск Workers
```bash
docker-compose up -d workers

# Проверяем
sleep 15
docker-compose logs workers
curl http://localhost:8443/health
```

#### 5.2.4 Запуск Frontend
```bash
docker-compose up -d frontend

# Проверяем
sleep 20
docker-compose logs frontend
curl http://localhost:3000
```

#### 5.2.5 Запуск Nginx
```bash
docker-compose up -d nginx

# Проверяем
docker-compose ps
curl http://localhost/health
```

### 5.3 Проверка всех сервисов
```bash
# Статус всех контейнеров
docker-compose ps

# Все сервисы должны быть "Up"
```

---

## 🔍 Этап 6: Проверка развертывания

### 6.1 Health Checks
```bash
# Backend API
curl -f http://localhost:8000/health || echo "❌ Backend недоступен"

# Workers Telegram Bot
curl -f http://localhost:8443/health || echo "❌ Workers недоступен"

# Frontend Next.js
curl -f http://localhost:3000 || echo "❌ Frontend недоступен"

# Nginx Proxy
curl -f http://localhost/health || echo "❌ Nginx недоступен"
```

### 6.2 Проверка логов
```bash
# Проверяем ошибки в логах
docker-compose logs backend | grep ERROR
docker-compose logs workers | grep ERROR
docker-compose logs frontend | grep ERROR
docker-compose logs nginx | grep error
```

### 6.3 Тестирование API
```bash
# Проверяем основные эндпоинты
curl http://localhost:8000/docs  # Swagger документация
curl http://localhost:8000/api/system/status
```

---

## 🌐 Этап 7: Настройка SSL и домена

### 7.1 Проверка SSL сертификатов
```bash
ls -la /opt/replyx/Deployed/ssl/
```

### 7.2 Тестирование через домен
```bash
# После настройки DNS записей
curl https://replyx.ru/health
curl https://replyx.ru/api/system/status
```

### 7.3 Замена на Let's Encrypt (рекомендуется)
```bash
# Установка Certbot
snap install --classic certbot

# Получение сертификата
certbot --nginx -d replyx.ru -d www.replyx.ru

# Обновление nginx конфигурации
systemctl reload nginx
```

---

## 🔧 Этап 8: Настройка мониторинга

### 8.1 Настройка логирования
```bash
# Создаем директории логов
mkdir -p /var/log/replyx
mkdir -p /opt/replyx/data/logs

# Настраиваем ротацию логов
echo '/opt/replyx/data/logs/*.log {
  daily
  missingok
  rotate 30
  compress
  notifempty
  create 644 app app
  postrotate
    docker-compose -f /opt/replyx/Deployed/docker-compose.yml restart backend
  endscript
}' > /etc/logrotate.d/replyx
```

### 8.2 Настройка мониторинга БД
```bash
# Запуск скрипта мониторинга БД
cd /opt/replyx
python backend/monitoring/db_size_monitor.py

# Настройка cron для мониторинга
crontab -e
# Добавить:
# 0 2 * * * cd /opt/replyx && python backend/monitoring/db_size_monitor.py
```

---

## 🎯 Этап 9: Финальная проверка

### 9.1 Комплексный тест системы
```bash
cd /opt/replyx/Deployed

# Проверяем все сервисы
echo "=== HEALTH CHECKS ==="
curl -s http://localhost:8000/health | jq .
curl -s http://localhost:8443/health | jq .
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK"
curl -s http://localhost/health | jq .

echo "=== DOCKER SERVICES ==="
docker-compose ps

echo "=== DISK USAGE ==="
df -h /opt/replyx

echo "=== MEMORY USAGE ==="
docker stats --no-stream
```

### 9.2 Создание пользователя-администратора
```bash
cd /opt/replyx
python scripts/admin_bootstrap.py
```

### 9.3 Проверка через веб-интерфейс
1. Откройте https://replyx.ru в браузере
2. Пройдите регистрацию/вход
3. Проверьте основные функции
4. Создайте тестового бота
5. Проверьте AI-ответы

---

## 🔄 Управление деплоем

### Полезные команды
```bash
cd /opt/replyx/Deployed

# Просмотр логов в реальном времени
docker-compose logs -f

# Перезапуск сервиса
docker-compose restart backend

# Обновление кода
git pull origin main
docker-compose build --no-cache
docker-compose up -d

# Остановка всех сервисов
docker-compose down

# Полная переустановка
docker-compose down -v
docker-compose up -d --build
```

### Бэкап
```bash
# Создание бэкапа БД
pg_dump postgresql://gen_user:q%3F%7C%3E7!gzi%2BS.jJ@192.168.0.4:5432/replyx_production > backup_$(date +%Y%m%d).sql

# Бэкап файлов проекта
tar -czf replyx-backup-$(date +%Y%m%d).tar.gz /opt/replyx/
```

---

## ✅ Результат успешного деплоя

После выполнения всех этапов у вас должны работать:

- 🌐 **Frontend:** https://replyx.ru
- 🔧 **API:** https://replyx.ru/api/docs
- 🤖 **Telegram боты:** Подключены и отвечают
- 🗄️ **База данных:** Миграции применены, pgvector работает
- 📊 **Мониторинг:** Логи настроены, health checks работают

## 🆘 Поддержка

Если что-то пошло не так:
1. Проверьте логи: `docker-compose logs [service]`
2. Проверьте статус: `docker-compose ps`
3. Проверьте ресурсы: `docker stats`
4. Обратитесь к документации в папке `docs/`

**Статус после деплоя: 🎉 ГОТОВ К ЭКСПЛУАТАЦИИ**