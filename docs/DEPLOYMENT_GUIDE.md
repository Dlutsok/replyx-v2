# ChatAI MVP 11 - Руководство по развертыванию

**Дата:** 01 сентября 2025  
**Версия:** 1.0  
**Статус:** Production Ready

---

## 📋 Содержание

1. [Требования к системе](#требования-к-системе)
2. [Подготовка окружения](#подготовка-окружения)
3. [Развертывание Backend](#развертывание-backend)
4. [Развертывание Frontend](#развертывание-frontend)
5. [Настройка Telegram Workers](#настройка-telegram-workers)
6. [Конфигурация базы данных](#конфигурация-базы-данных)
7. [Мониторинг и логирование](#мониторинг-и-логирование)
8. [SSL и безопасность](#ssl-и-безопасность)
9. [Backup и восстановление](#backup-и-восстановление)
10. [Troubleshooting](#troubleshooting)

---

## 💻 Требования к системе

### Минимальные требования

#### Сервер приложений
- **CPU:** 2+ ядра (Intel/AMD x86_64)
- **RAM:** 4GB+ (рекомендуется 8GB)
- **Диск:** 50GB+ SSD
- **ОС:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+

#### База данных (PostgreSQL)
- **CPU:** 2+ ядра
- **RAM:** 4GB+ (рекомендуется 8GB)  
- **Диск:** 100GB+ SSD с RAID
- **PostgreSQL:** версия 13+ с расширением pgvector

#### Кэширование (Redis)
- **CPU:** 1+ ядро
- **RAM:** 1GB+ 
- **Redis:** версия 6.0+

### Рекомендуемая производственная конфигурация

#### Application Server
- **CPU:** 4-8 ядер
- **RAM:** 16-32GB
- **Диск:** 200GB+ NVMe SSD
- **Network:** 1Gbps+

#### Database Server
- **CPU:** 8+ ядер
- **RAM:** 32GB+
- **Диск:** 500GB+ NVMe SSD RAID-10
- **Network:** 10Gbps (для high-load)

---

## 🔧 Подготовка окружения

### 1. Установка зависимостей системы

#### Ubuntu/Debian
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка базовых пакетов
sudo apt install -y curl wget git vim htop build-essential

# Python 3.9+
sudo apt install -y python3 python3-pip python3-venv python3-dev

# Node.js 18+ 
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 15
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y postgresql-15 postgresql-contrib-15 postgresql-15-pgvector

# Redis
sudo apt install -y redis-server

# Nginx (reverse proxy)
sudo apt install -y nginx

# Supervisor (process management)
sudo apt install -y supervisor

# SSL certificates
sudo apt install -y certbot python3-certbot-nginx
```

#### CentOS/RHEL
```bash
# Установка EPEL
sudo dnf install -y epel-release

# Базовые пакеты
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y curl wget git vim htop

# Python 3.9+
sudo dnf install -y python3 python3-pip python3-devel

# Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# PostgreSQL 15
sudo dnf install -y postgresql15-server postgresql15-contrib postgresql15-devel

# Redis
sudo dnf install -y redis

# Nginx
sudo dnf install -y nginx

# Supervisor
sudo dnf install -y supervisor
```

### 2. Настройка пользователей и директорий

```bash
# Создание пользователя приложения
sudo useradd -m -s /bin/bash chatai
sudo usermod -aG sudo chatai

# Создание директорий
sudo mkdir -p /opt/chatai/{backend,frontend,logs,uploads}
sudo chown -R chatai:chatai /opt/chatai

# Переход к пользователю chatai
sudo su - chatai
```

---

## 🔧 Развертывание Backend

### 1. Клонирование и подготовка кода

```bash
# Клонирование репозитория
cd /opt/chatai
git clone <repository_url> .

# Создание виртуального окружения
cd /opt/chatai/backend
python3 -m venv venv
source venv/bin/activate

# Обновление pip
pip install --upgrade pip setuptools wheel

# Установка зависимостей
pip install -r requirements.txt
```

### 2. Конфигурация окружения

```bash
# Создание файла конфигурации
cp .env.example .env
vim .env
```

**Пример .env для production:**
```env
# Environment
ENVIRONMENT=production
DEBUG=False

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatai_production
DB_USER=chatai
DB_PASSWORD=secure_password_here
DB_SSL_MODE=require

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=redis_password_here

# Security
JWT_SECRET_KEY=very_long_secure_jwt_secret_key_here
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=24

# CSRF Protection
CSRF_SECRET_KEY=another_very_long_secure_csrf_secret
CSRF_TOKEN_EXPIRE_SECONDS=3600

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_ORG_ID=org-your-org-id

# Bot Service
BOT_SERVICE_URL=http://localhost:3001

# File Uploads
UPLOAD_DIR=/opt/chatai/uploads
MAX_FILE_SIZE_MB=10

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# External URLs
FRONTEND_URL=https://replyx.ru
BACKEND_URL=https://api.replyx.ru

# Logging
LOG_LEVEL=INFO
```

### 3. Создание systemd сервиса

```bash
# Создание сервиса
sudo vim /etc/systemd/system/chatai-backend.service
```

**Содержимое chatai-backend.service:**
```ini
[Unit]
Description=ChatAI Backend Service
After=network.target postgresql.service redis.service
Requires=postgresql.service redis.service

[Service]
Type=exec
User=chatai
Group=chatai
WorkingDirectory=/opt/chatai/backend
Environment=PYTHONPATH=/opt/chatai/backend
Environment=PYTHONUNBUFFERED=1
ExecStart=/opt/chatai/backend/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
ExecReload=/bin/kill -HUP $MAINPID
KillMode=mixed
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/chatai/uploads /opt/chatai/logs

[Install]
WantedBy=multi-user.target
```

### 4. Запуск backend сервиса

```bash
# Перезагрузка systemd
sudo systemctl daemon-reload

# Включение автозапуска
sudo systemctl enable chatai-backend

# Запуск сервиса
sudo systemctl start chatai-backend

# Проверка статуса
sudo systemctl status chatai-backend

# Просмотр логов
sudo journalctl -u chatai-backend -f
```

---

## 🖥️ Развертывание Frontend

### 1. Подготовка и сборка

```bash
# Переход в директорию frontend
cd /opt/chatai/frontend

# Установка зависимостей
npm ci --production=false

# Создание .env.local
vim .env.local
```

**Пример .env.local для production:**
```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.replyx.ru
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.replyx.ru

# Environment
NEXT_PUBLIC_ENVIRONMENT=production

# External Services
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=UA-your-analytics-id
```

```bash
# Сборка production build
npm run build

# Оптимизация (optional)
npm run analyze
```

### 2. Создание systemd сервиса для frontend

```bash
sudo vim /etc/systemd/system/chatai-frontend.service
```

**Содержимое chatai-frontend.service:**
```ini
[Unit]
Description=ChatAI Frontend Service
After=network.target
Requires=chatai-backend.service

[Service]
Type=exec
User=chatai
Group=chatai
WorkingDirectory=/opt/chatai/frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

### 3. Запуск frontend сервиса

```bash
# Включение и запуск
sudo systemctl daemon-reload
sudo systemctl enable chatai-frontend
sudo systemctl start chatai-frontend
sudo systemctl status chatai-frontend
```

---

## 🤖 Настройка Telegram Workers

### 1. Конфигурация Node.js workers

```bash
# Переход в директорию workers
cd /opt/chatai/backend

# Создание конфигурации для Telegram workers
vim config/webhook.js
```

**Пример конфигурации webhook.js:**
```javascript
module.exports = {
  MODE: process.env.TELEGRAM_MODE || 'POLLING', // POLLING или WEBHOOK
  
  WEBHOOK: {
    DOMAIN: process.env.WEBHOOK_DOMAIN || 'api.replyx.ru',
    PORT: parseInt(process.env.WEBHOOK_PORT || '3001'),
    PATH: process.env.WEBHOOK_PATH || '/webhook',
    SSL_CERT: process.env.SSL_CERT_PATH,
    SSL_KEY: process.env.SSL_KEY_PATH,
    SECRET_TOKEN: process.env.WEBHOOK_SECRET_TOKEN,
    MAX_CONNECTIONS: parseInt(process.env.WEBHOOK_MAX_CONNECTIONS || '40'),
    ALLOWED_UPDATES: ['message', 'callback_query']
  },

  POLLING: {
    INTERVAL: parseInt(process.env.POLLING_INTERVAL || '1000'),
    TIMEOUT: parseInt(process.env.POLLING_TIMEOUT || '10')
  }
};
```

### 2. Создание systemd сервиса для workers

```bash
sudo vim /etc/systemd/system/chatai-workers.service
```

**Содержимое chatai-workers.service:**
```ini
[Unit]
Description=ChatAI Telegram Workers
After=network.target chatai-backend.service
Requires=chatai-backend.service

[Service]
Type=exec
User=chatai
Group=chatai
WorkingDirectory=/opt/chatai/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node scripts/start_scalable_system.js
ExecReload=/bin/kill -HUP $MAINPID
KillMode=mixed
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Resource limits
LimitNOFILE=65536
LimitNPROC=32768

[Install]
WantedBy=multi-user.target
```

### 3. Запуск workers

```bash
sudo systemctl daemon-reload
sudo systemctl enable chatai-workers
sudo systemctl start chatai-workers
sudo systemctl status chatai-workers
```

---

## 🗄️ Конфигурация базы данных

### 1. Настройка PostgreSQL

```bash
# Переключение на пользователя postgres
sudo -u postgres psql

-- Создание пользователя и базы данных
CREATE USER chatai WITH PASSWORD 'secure_password_here';
CREATE DATABASE chatai_production OWNER chatai;

-- Предоставление прав
GRANT ALL PRIVILEGES ON DATABASE chatai_production TO chatai;
ALTER USER chatai CREATEDB;

-- Выход
\q
```

### 2. Установка pgvector

```bash
# Подключение к базе
sudo -u postgres psql chatai_production

-- Установка расширения
CREATE EXTENSION IF NOT EXISTS vector;

-- Проверка установки
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Выход
\q
```

### 3. Настройка производительности PostgreSQL

```bash
sudo vim /etc/postgresql/15/main/postgresql.conf
```

**Оптимальные настройки для production:**
```bash
# Memory Settings
shared_buffers = 2GB                    # 25% от RAM
effective_cache_size = 6GB              # 75% от RAM
work_mem = 64MB                         # для сложных запросов
maintenance_work_mem = 512MB            # для VACUUM, CREATE INDEX

# Checkpoint Settings
wal_buffers = 64MB
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Connection Settings
max_connections = 200
shared_preload_libraries = 'vector'

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_min_duration_statement = 1000      # Логировать медленные запросы
log_checkpoints = on
log_connections = on
log_disconnections = on

# Performance
random_page_cost = 1.1                 # для SSD
effective_io_concurrency = 200         # для SSD
```

### 4. Выполнение миграций

```bash
# Активация виртуального окружения
cd /opt/chatai/backend
source venv/bin/activate

# Выполнение миграций
alembic upgrade head

# Проверка текущей версии
alembic current

# Показать историю миграций
alembic history --verbose
```

---

## 📊 Мониторинг и логирование

### 1. Настройка логирования

```bash
# Создание директорий для логов
sudo mkdir -p /var/log/chatai/{backend,frontend,workers}
sudo chown -R chatai:chatai /var/log/chatai

# Конфигурация logrotate
sudo vim /etc/logrotate.d/chatai
```

**Содержимое /etc/logrotate.d/chatai:**
```
/var/log/chatai/*/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    su chatai chatai
}
```

### 2. Настройка мониторинга с помощью systemd

```bash
# Скрипт для мониторинга здоровья системы
sudo vim /usr/local/bin/chatai-health-check
```

**Содержимое health-check скрипта:**
```bash
#!/bin/bash

# Health check для ChatAI системы

LOG_FILE="/var/log/chatai/health-check.log"
TELEGRAM_CHAT_ID="your-admin-telegram-chat-id"
TELEGRAM_BOT_TOKEN="your-monitoring-bot-token"

function log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

function send_alert() {
    local message="🚨 ChatAI Alert: $1"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
         -d "chat_id=${TELEGRAM_CHAT_ID}" \
         -d "text=${message}"
}

# Проверка backend сервиса
if ! systemctl is-active --quiet chatai-backend; then
    log_message "CRITICAL: Backend service is down"
    send_alert "Backend service is down"
fi

# Проверка frontend сервиса
if ! systemctl is-active --quiet chatai-frontend; then
    log_message "CRITICAL: Frontend service is down"
    send_alert "Frontend service is down"
fi

# Проверка workers
if ! systemctl is-active --quiet chatai-workers; then
    log_message "CRITICAL: Workers service is down"
    send_alert "Workers service is down"
fi

# Проверка PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    log_message "CRITICAL: PostgreSQL is down"
    send_alert "PostgreSQL database is down"
fi

# Проверка Redis
if ! systemctl is-active --quiet redis; then
    log_message "WARNING: Redis is down"
    send_alert "Redis cache is down"
fi

# Проверка API endpoint
if ! curl -sf "http://localhost:8000/api/system/health" > /dev/null; then
    log_message "CRITICAL: API health check failed"
    send_alert "API health check failed"
fi

# Проверка дискового пространства
DISK_USAGE=$(df /opt/chatai | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    log_message "WARNING: Disk usage is ${DISK_USAGE}%"
    send_alert "Disk usage is ${DISK_USAGE}%"
fi

log_message "Health check completed"
```

```bash
# Делаем скрипт исполняемым
sudo chmod +x /usr/local/bin/chatai-health-check

# Создание cron job для регулярного мониторинга
sudo crontab -e

# Добавляем в crontab
*/5 * * * * /usr/local/bin/chatai-health-check
```

---

## 🔒 SSL и безопасность

### 1. Получение SSL сертификатов

```bash
# Использование Certbot для Let's Encrypt
sudo certbot --nginx -d api.replyx.ru -d replyx.ru

# Проверка автообновления
sudo certbot renew --dry-run
```

### 2. Конфигурация Nginx

```bash
sudo vim /etc/nginx/sites-available/chatai
```

**Пример конфигурации Nginx:**
```nginx
# Backend API server
server {
    listen 443 ssl http2;
    server_name api.replyx.ru;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.replyx.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.replyx.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # File Upload
    client_max_body_size 50M;
    
    # API Proxy
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket Proxy
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
    
    # Static Files Optimization
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Frontend server
server {
    listen 443 ssl http2;
    server_name replyx.ru www.replyx.ru;
    
    # SSL Configuration (same as above)
    ssl_certificate /etc/letsencrypt/live/replyx.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/replyx.ru/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Frontend Proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.replyx.ru replyx.ru www.replyx.ru;
    return 301 https://$server_name$request_uri;
}
```

### 3. Активация конфигурации

```bash
# Создание ссылки
sudo ln -s /etc/nginx/sites-available/chatai /etc/nginx/sites-enabled/

# Удаление default конфигурации
sudo rm /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t

# Перезагрузка nginx
sudo systemctl reload nginx
```

---

## 🔄 Backup и восстановление

### 1. Настройка автоматических backup

```bash
# Создание backup скрипта
sudo vim /usr/local/bin/chatai-backup
```

**Содержимое backup скрипта:**
```bash
#!/bin/bash

BACKUP_DIR="/opt/backups/chatai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Создание директории backup
mkdir -p $BACKUP_DIR

# Database backup
echo "Creating database backup..."
pg_dump -h localhost -U chatai -d chatai_production | gzip > $BACKUP_DIR/db_${TIMESTAMP}.sql.gz

# Files backup  
echo "Creating files backup..."
tar -czf $BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz /opt/chatai/uploads/

# Configuration backup
echo "Creating config backup..."
tar -czf $BACKUP_DIR/config_${TIMESTAMP}.tar.gz \
    /opt/chatai/backend/.env \
    /opt/chatai/frontend/.env.local \
    /etc/nginx/sites-available/chatai \
    /etc/systemd/system/chatai-*.service

# Clean old backups
echo "Cleaning old backups..."
find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"

# Optional: Upload to cloud storage
# aws s3 sync $BACKUP_DIR s3://your-backup-bucket/chatai/
```

```bash
# Делаем исполняемым
sudo chmod +x /usr/local/bin/chatai-backup

# Добавляем в cron
sudo crontab -e

# Ежедневный backup в 2:00
0 2 * * * /usr/local/bin/chatai-backup
```

### 2. Процедура восстановления

```bash
# Остановка сервисов
sudo systemctl stop chatai-backend chatai-frontend chatai-workers

# Восстановление базы данных
sudo -u postgres psql
DROP DATABASE chatai_production;
CREATE DATABASE chatai_production OWNER chatai;
\q

# Восстановление данных
gunzip -c /opt/backups/chatai/db_YYYYMMDD_HHMMSS.sql.gz | sudo -u postgres psql chatai_production

# Восстановление файлов
tar -xzf /opt/backups/chatai/uploads_YYYYMMDD_HHMMSS.tar.gz -C /

# Запуск сервисов
sudo systemctl start chatai-backend chatai-frontend chatai-workers
```

---

## 🔧 Troubleshooting

### Частые проблемы и решения

#### 1. Backend не запускается

**Проблема:** Ошибка подключения к базе данных
```bash
# Проверка статуса PostgreSQL
sudo systemctl status postgresql

# Проверка подключения
sudo -u postgres psql chatai_production -c "SELECT 1;"

# Проверка настроек в .env
cat /opt/chatai/backend/.env | grep DB_
```

**Проблема:** Ошибки миграций
```bash
# Откат к предыдущей миграции
cd /opt/chatai/backend
source venv/bin/activate
alembic downgrade -1

# Повторное применение
alembic upgrade head
```

#### 2. Frontend проблемы

**Проблема:** Ошибки сборки Next.js
```bash
# Очистка кэша
cd /opt/chatai/frontend
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

**Проблема:** API недоступен
```bash
# Проверка переменных окружения
cat /opt/chatai/frontend/.env.local

# Проверка доступности API
curl -I http://localhost:8000/api/system/health
```

#### 3. Telegram Workers проблемы

**Проблема:** Боты не отвечают
```bash
# Проверка логов workers
sudo journalctl -u chatai-workers -f

# Проверка токенов ботов
curl -s "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"

# Перезапуск workers
sudo systemctl restart chatai-workers
```

#### 4. Производительность

**Проблема:** Медленные запросы
```bash
# Проверка активных соединений
sudo -u postgres psql chatai_production -c "
SELECT pid, usename, application_name, client_addr, state, query 
FROM pg_stat_activity 
WHERE state = 'active';"

# Проверка медленных запросов
sudo -u postgres psql chatai_production -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

**Проблема:** Высокое потребление памяти
```bash
# Мониторинг процессов
htop

# Проверка утечек памяти
sudo journalctl -u chatai-backend --since "1 hour ago" | grep -i memory

# Перезапуск сервисов
sudo systemctl restart chatai-backend
```

### Команды диагностики

```bash
# Проверка всех сервисов
sudo systemctl status chatai-backend chatai-frontend chatai-workers

# Проверка портов
sudo netstat -tulpn | grep -E "(8000|3000|3001|5432|6379)"

# Проверка логов
sudo journalctl -u chatai-backend --since "10 minutes ago"
sudo journalctl -u chatai-frontend --since "10 minutes ago"
sudo journalctl -u chatai-workers --since "10 minutes ago"

# Проверка дискового пространства
df -h
du -sh /opt/chatai/* /var/log/chatai/*

# Проверка памяти и CPU
free -h
top -c
```

### Контакты поддержки

**Техническая поддержка:**
- Email: tech@replyx.ru
- Документация: https://docs.replyx.ru
- GitHub Issues: https://github.com/replyx/chatai/issues

**Экстренные контакты:**
- Telegram: @replyx_support
- Телефон: +7 (xxx) xxx-xx-xx (только критические инциденты)

---

## ✅ Чек-лист финального развертывания

### Перед запуском в production:

- [ ] Все пароли и секретные ключи изменены на сильные
- [ ] SSL сертификаты установлены и проверены
- [ ] Backup система настроена и протестирована
- [ ] Мониторинг и алерты настроены
- [ ] Брандмауэр настроен (только необходимые порты открыты)
- [ ] Логирование настроено и ротация включена
- [ ] Все сервисы добавлены в автозапуск
- [ ] DNS записи настроены правильно
- [ ] Нагрузочное тестирование выполнено
- [ ] План disaster recovery задокументирован
- [ ] Команда знает процедуры troubleshooting
- [ ] Контакты экстренной поддержки настроены

### После запуска:

- [ ] Мониторинг показывает здоровое состояние системы
- [ ] Все основные функции работают корректно
- [ ] WebSocket соединения стабильны  
- [ ] Telegram боты отвечают на сообщения
- [ ] Система обрабатывает файлы и создает embeddings
- [ ] Биллинг система корректно списывает средства
- [ ] Административная панель доступна

---

*Руководство актуально на 01 сентября 2025*  
*Версия: 1.0*  
*Поддержка: tech@replyx.ru*