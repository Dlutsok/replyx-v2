# 🚀 Развертывание ReplyX на сервере Timeweb

**Сервер:** Cloud MSK 50  
**IP:** 5.129.246.24  
**Характеристики:** 2x3.3ГГц CPU, 4ГБ RAM, 50ГБ NVMe  
**ОС:** Ubuntu 24.04  
**Дата:** 2025-01-24  

---

## 🔧 Этап 1: Подключение и подготовка сервера

### 1.1 Подключение к серверу
```bash
# Подключение к серверу Timeweb
ssh root@5.129.246.24

# Введите root-пароль из панели управления
```

### 1.2 Обновление Ubuntu 24.04
```bash
# Обновление пакетов
apt update && apt upgrade -y

# Установка необходимых утилит
apt install -y curl wget git unzip htop nano tree
```

### 1.3 Установка Docker для Ubuntu 24.04
```bash
# Установка Docker через официальный скрипт
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Автозапуск Docker
systemctl enable docker
systemctl start docker

# Проверка установки
docker --version
docker compose version  # В Ubuntu 24.04 это docker compose, не docker-compose
```

### 1.4 Настройка файрвола для Timeweb
```bash
# В Timeweb уже есть ограничения портов, но настроим ufw дополнительно
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw --force enable

# Проверяем статус
ufw status verbose
```

### 1.5 Создание рабочей директории
```bash
# Создаем директорию проекта
mkdir -p /opt/replyx
cd /opt/replyx

# Проверяем свободное место (должно быть ~48GB)
df -h .
```

---

## 📦 Этап 2: Перенос файлов на Timeweb сервер

### 2.1 Копирование с локальной машины
```bash
# На локальной машине (из папки MVP 13):
scp -r Deployed root@5.129.246.24:/opt/replyx/
scp -r frontend root@5.129.246.24:/opt/replyx/
scp -r backend root@5.129.246.24:/opt/replyx/
scp -r workers root@5.129.246.24:/opt/replyx/
scp -r scripts root@5.129.246.24:/opt/replyx/

# Альтернатива: использовать scp с ключом
# scp -i ~/.ssh/your_key -r Deployed root@5.129.246.24:/opt/replyx/
```

### 2.2 Проверка на сервере
```bash
# На сервере Timeweb
cd /opt/replyx
tree -L 2

# Устанавливаем права доступа
chmod +x Deployed/deploy.sh
chmod +x Deployed/init-db.sh
chmod +x scripts/production_deploy.sh
find . -name "*.sh" -type f -exec chmod +x {} \;
```

---

## 🗄️ Этап 3: Настройка БД (используем внешнюю БД)

### 3.1 Проверка настроек БД
```bash
cd /opt/replyx/Deployed

# Проверяем подключение к БД в .env.production
grep -E "DB_HOST|DB_NAME|DATABASE_URL" .env.production

# Должно показать:
# DB_HOST=192.168.0.4
# DATABASE_URL=postgresql://gen_user:q%3F%7C%3E7!gzi%2BS.jJ@192.168.0.4:5432/replyx_production
```

### 3.2 Установка PostgreSQL клиента
```bash
# Устанавливаем postgresql-client для подключения к внешней БД
apt install -y postgresql-client

# Проверяем подключение к БД (замените пароль)
export PGPASSWORD="ваш-postgres-admin-пароль"
psql -h 192.168.0.4 -p 5432 -U postgres -c "SELECT version();"
```

### 3.3 Инициализация базы данных
```bash
# Запускаем инициализацию БД неинтерактивно
export PGPASSWORD="ваш-postgres-admin-пароль"
./init-db.sh -y

# Тестируем подключение приложения
./init-db.sh test
```

---

## 🔑 Этап 4: Настройка переменных окружения для Timeweb

### 4.1 Обновление .env.production для вашего сервера
```bash
cd /opt/replyx/Deployed

# Создаем бэкап оригинального файла
cp .env.production .env.production.backup

# Редактируем настройки для Timeweb сервера
nano .env.production
```

### 4.2 Специфичные настройки для Timeweb:
```bash
# В .env.production обновить:
DOMAIN=5.129.246.24  # Пока используем IP, потом заменим на домен
FRONTEND_URL=http://5.129.246.24
BACKEND_URL=http://5.129.246.24
PUBLIC_URL=http://5.129.246.24

# CORS настройки для IP
CORS_ORIGINS=http://5.129.246.24,http://www.5.129.246.24

# Webhook для Telegram (Timeweb IP)
WEBHOOK_HOST=http://5.129.246.24

# КРИТИЧНО: Замените CHANGEME на реальные Yandex OAuth ключи
YANDEX_CLIENT_ID=ваш_production_client_id  # ПОЛУЧИТЬ!
YANDEX_CLIENT_SECRET=ваш_production_client_secret  # ПОЛУЧИТЬ!
```

---

## 🐳 Этап 5: Адаптация Docker для Timeweb

### 5.1 Проверка ресурсов Timeweb
```bash
# Проверяем ресурсы сервера
free -h          # RAM: 4GB
nproc            # CPU: 2 cores
df -h /opt/replyx  # Disk: ~48GB доступно

# Оптимизируем для 4GB RAM
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

### 5.2 Адаптация docker-compose.yml для 4GB RAM
```bash
cd /opt/replyx/Deployed

# Создаем бэкап docker-compose.yml
cp docker-compose.yml docker-compose.yml.backup

# Редактируем для оптимизации под 4GB RAM
nano docker-compose.yml
```

**Добавьте ограничения ресурсов:**
```yaml
# В каждый сервис добавить:
deploy:
  resources:
    limits:
      memory: 512M  # backend
      # memory: 256M  # frontend
      # memory: 256M  # workers
      # memory: 128M  # redis
      # memory: 256M  # nginx
```

### 5.3 Запуск Docker на Timeweb
```bash
# Сборка образов
docker compose build

# Запуск по этапам (важно для 4GB RAM!)
docker compose up -d redis
sleep 10
docker compose up -d backend
sleep 30
docker compose up -d workers
sleep 15
docker compose up -d frontend
sleep 20
docker compose up -d nginx

# Проверяем все сервисы
docker compose ps
```

---

## 🔍 Этап 6: Проверка на Timeweb сервере

### 6.1 Health checks через IP
```bash
# Проверяем все сервисы через IP Timeweb
curl -f http://5.129.246.24:8000/health
curl -f http://5.129.246.24:8443/health
curl -f http://5.129.246.24:3000
curl -f http://5.129.246.24/health
```

### 6.2 Мониторинг ресурсов на Timeweb
```bash
# Проверяем использование RAM (должно быть < 3.5GB)
free -h

# Проверяем использование диска
df -h

# Мониторим контейнеры
docker stats --no-stream

# Проверяем логи
docker compose logs backend | tail -20
docker compose logs workers | tail -20
```

---

## 🌐 Этап 7: Настройка домена для Timeweb

### 7.1 DNS настройки (если есть домен)
```bash
# Если у вас есть домен replyx.ru, настройте:
# A-запись: replyx.ru → 5.129.246.24
# A-запись: www.replyx.ru → 5.129.246.24

# Проверка DNS (после настройки)
nslookup replyx.ru
dig replyx.ru
```

### 7.2 SSL сертификат через Let's Encrypt
```bash
# Устанавливаем certbot
apt install -y snapd
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot

# Получаем сертификат (замените на ваш домен)
# certbot --nginx -d replyx.ru -d www.replyx.ru

# Для тестирования пока используем IP
```

---

## 🎯 Этап 8: Оптимизация для Timeweb (4GB RAM)

### 8.1 Настройка swap файла
```bash
# Создаем swap для безопасности (2GB)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Автомонтирование при загрузке
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Проверяем
free -h
```

### 8.2 Настройка логов для экономии места
```bash
# Настраиваем ротацию логов Docker
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Перезапускаем Docker
systemctl restart docker
```

### 8.3 Мониторинг для Timeweb
```bash
# Создаем скрипт мониторинга ресурсов
cat > /opt/replyx/monitor_timeweb.sh << 'EOF'
#!/bin/bash
echo "=== TIMEWEB SERVER MONITORING ==="
echo "Date: $(date)"
echo ""
echo "=== MEMORY ==="
free -h
echo ""
echo "=== DISK ==="
df -h /opt/replyx
echo ""
echo "=== DOCKER CONTAINERS ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "=== DOCKER STATS ==="
timeout 5 docker stats --no-stream
echo ""
echo "=== TOP PROCESSES ==="
ps aux --sort=-%mem | head -10
EOF

chmod +x /opt/replyx/monitor_timeweb.sh

# Запуск мониторинга
./monitor_timeweb.sh
```

---

## 📋 Этап 9: Финальная проверка Timeweb деплоя

### 9.1 Полная проверка системы
```bash
cd /opt/replyx/Deployed

echo "=== TIMEWEB DEPLOYMENT CHECK ==="
echo "Server IP: 5.129.246.24"
echo "Server specs: 2x3.3GHz CPU, 4GB RAM, 50GB NVMe"
echo ""

echo "=== HEALTH CHECKS ==="
curl -s http://5.129.246.24:8000/health | jq . || echo "❌ Backend failed"
curl -s http://5.129.246.24:8443/health || echo "❌ Workers failed"
curl -s http://5.129.246.24:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend failed"
curl -s http://5.129.246.24/health | jq . || echo "❌ Nginx failed"

echo ""
echo "=== RESOURCES ==="
echo "Memory usage:"
free -h | grep "Mem:"
echo "Disk usage:"
df -h / | tail -1
echo "Docker containers:"
docker compose ps

echo ""
echo "=== ACCESS URLS ==="
echo "🌐 Frontend: http://5.129.246.24"
echo "🔧 API Docs: http://5.129.246.24/api/docs" 
echo "📊 System Status: http://5.129.246.24/api/system/status"
```

### 9.2 Создание админа
```bash
# Создаем первого администратора
cd /opt/replyx
export FIRST_ADMIN_EMAIL="ваш-email@example.com"
python scripts/admin_bootstrap.py
```

---

## 🔧 Управление на Timeweb сервере

### Полезные команды для Timeweb
```bash
# Просмотр логов
cd /opt/replyx/Deployed
docker compose logs -f --tail=50

# Перезапуск сервиса
docker compose restart backend

# Проверка ресурсов
/opt/replyx/monitor_timeweb.sh

# Очистка Docker (если место заканчивается)
docker system prune -f
docker volume prune -f

# Полная остановка
docker compose down

# Полный перезапуск
docker compose down && docker compose up -d
```

### Бэкап на Timeweb
```bash
# Создание бэкапа
mkdir -p /opt/backups
cd /opt/backups

# Бэкап БД
pg_dump postgresql://gen_user:q%3F%7C%3E7!gzi%2BS.jJ@192.168.0.4:5432/replyx_production > replyx_$(date +%Y%m%d).sql

# Бэкап файлов
tar -czf replyx_files_$(date +%Y%m%d).tar.gz /opt/replyx/

# Очистка старых бэкапов (оставить 7 дней)
find /opt/backups -name "replyx_*.sql" -mtime +7 -delete
find /opt/backups -name "replyx_files_*.tar.gz" -mtime +7 -delete
```

---

## ✅ Результат деплоя на Timeweb

После выполнения всех этапов:

- 🌐 **Frontend:** http://5.129.246.24
- 🔧 **API:** http://5.129.246.24/api/docs
- 📊 **Status:** http://5.129.246.24/api/system/status
- 🤖 **Telegram боты:** Подключены через webhook на 5.129.246.24:8443

### Особенности для Timeweb:
- ✅ Оптимизировано под 4GB RAM
- ✅ Настроен swap для безопасности
- ✅ Логи ротируются для экономии места
- ✅ Мониторинг ресурсов включен

### Следующие шаги:
1. **Получить Yandex OAuth ключи** и заменить CHANGEME
2. **Настроить домен** и получить SSL сертификат
3. **Настроить мониторинг и алерты**
4. **Протестировать все функции**

**🎉 ReplyX готов к работе на вашем Timeweb сервере!**