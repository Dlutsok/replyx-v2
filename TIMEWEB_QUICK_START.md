# ⚡ ReplyX на Timeweb - Быстрый старт

**Сервер:** 5.129.246.24  
**Спецификации:** 2x3.3GHz CPU, 4GB RAM, 50GB NVMe  
**ОС:** Ubuntu 24.04  

---

## 🚀 Автоматическое развертывание (1 команда)

```bash
# 1. Установите пароль PostgreSQL админа
export PGPASSWORD="ваш-postgres-admin-пароль"

# 2. Запустите автоматический деплой
./timeweb_deploy.sh

# Время выполнения: ~10-15 минут
```

**Результат:** Полностью работающая система на http://5.129.246.24

---

## 🎯 Быстрые команды

### Управление системой
```bash
# Мониторинг ресурсов
./timeweb_deploy.sh monitor

# Просмотр логов
./timeweb_deploy.sh logs

# Статус контейнеров  
./timeweb_deploy.sh status
```

### SSH доступ к серверу
```bash
# Подключение к серверу
ssh root@5.129.246.24

# Переход в рабочую директорию
cd /opt/replyx
```

### Docker управление на сервере
```bash
# Просмотр всех контейнеров
docker compose ps

# Перезапуск сервиса
docker compose restart backend

# Просмотр логов сервиса
docker compose logs -f backend

# Остановка системы
docker compose down

# Полный перезапуск
docker compose up -d
```

---

## 🔍 Проверка работы

### Health Checks
```bash
# Все сервисы должны отвечать:
curl http://5.129.246.24:8000/health    # Backend ✅
curl http://5.129.246.24:8443/health    # Workers ✅  
curl http://5.129.246.24:3000           # Frontend ✅
curl http://5.129.246.24/health         # Nginx ✅
```

### Веб-интерфейс
- 🌐 **Главная:** http://5.129.246.24
- 🔧 **API документация:** http://5.129.246.24/api/docs
- 📊 **Статус системы:** http://5.129.246.24/api/system/status

---

## ⚠️ Критичные настройки

### 🔑 Yandex OAuth (ОБЯЗАТЕЛЬНО!)
После деплоя **немедленно** замените ключи:

1. Идите на https://oauth.yandex.ru/
2. Создайте приложение для `http://5.129.246.24` 
3. Callback URL: `http://5.129.246.24/api/auth/yandex/callback`
4. На сервере отредактируйте:

```bash
ssh root@5.129.246.24
nano /opt/replyx/Deployed/.env.production

# Замените:
YANDEX_CLIENT_ID=ваш_реальный_client_id
YANDEX_CLIENT_SECRET=ваш_реальный_client_secret
```

5. Перезапустите backend:
```bash
cd /opt/replyx/Deployed
docker compose restart backend
```

---

## 📊 Мониторинг ресурсов Timeweb

### Автоматический мониторинг
```bash
# На сервере создан скрипт:
/opt/replyx/monitor_timeweb.sh

# Показывает:
# - Использование RAM (из 4GB)
# - Использование диска (из 50GB) 
# - Статус Docker контейнеров
# - Top процессы по памяти
```

### Ручная проверка ресурсов
```bash
# Память
free -h

# Диск  
df -h

# Docker статистика
docker stats --no-stream
```

### Критические лимиты
- **RAM:** > 3.5GB = критично (добавлен swap 2GB)
- **Disk:** > 45GB = критично
- **CPU:** > 90% длительно = проблема

---

## 🔧 Частые проблемы и решения

### Контейнер не запускается
```bash
# Проверить логи
docker compose logs [service]

# Перезапустить
docker compose restart [service]

# Если не помогает - полный перезапуск
docker compose down && docker compose up -d
```

### Не хватает памяти
```bash
# Освободить память
docker system prune -f

# Проверить swap
free -h | grep Swap

# Если swap не активен
swapon /swapfile
```

### База данных недоступна
```bash
# Проверить подключение к внешней БД
psql -h 192.168.0.4 -p 5432 -U gen_user -d replyx_production

# Если недоступна - проверить сетевые настройки
```

### SSL/Домен не работает
```bash
# Пока используем IP, домен настроить позже
# Проверить что все сервисы доступны по IP:
curl http://5.129.246.24/health
```

---

## 📈 Оптимизация для 4GB RAM

### Уже настроено автоматически:
- ✅ Swap файл 2GB создан
- ✅ Docker log rotation настроен  
- ✅ Memory limits для контейнеров
- ✅ Минимальные ресурсы для каждого сервиса

### Дополнительные оптимизации:
```bash
# Очистка Docker кэша (если место заканчивается)
docker system prune -af
docker volume prune -f

# Очистка старых логов
journalctl --vacuum-time=7d

# Настройка swappiness (уже настроено)
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

---

## 🔄 Backup и обновления

### Создание бэкапа
```bash
# На сервере
mkdir -p /opt/backups

# Бэкап БД
pg_dump postgresql://gen_user:q%3F%7C%3E7!gzi%2BS.jJ@192.168.0.4:5432/replyx_production > /opt/backups/replyx_$(date +%Y%m%d).sql

# Бэкап файлов
tar -czf /opt/backups/replyx_files_$(date +%Y%m%d).tar.gz /opt/replyx/
```

### Обновление системы
```bash
# Получить новый код
cd /opt/replyx
git pull origin main

# Пересборка и перезапуск
cd Deployed  
docker compose build --no-cache
docker compose up -d
```

---

## ✅ Чеклист успешного деплоя

- [ ] Все health checks возвращают 200
- [ ] Веб-интерфейс загружается на http://5.129.246.24
- [ ] API документация доступна на /api/docs
- [ ] Yandex OAuth ключи заменены с CHANGEME на реальные
- [ ] Создан первый администратор системы
- [ ] Мониторинг ресурсов показывает норму (<3.5GB RAM)
- [ ] Логи контейнеров без критических ошибок
- [ ] Telegram бот отвечает (если настроен)

---

## 📞 Поддержка

### Если что-то не работает:

1. **Проверьте мониторинг:** `/opt/replyx/monitor_timeweb.sh`
2. **Посмотрите логи:** `./timeweb_deploy.sh logs`  
3. **Проверьте статус:** `./timeweb_deploy.sh status`
4. **Обратитесь к полной инструкции:** `TIMEWEB_SERVER_DEPLOYMENT.md`

### Контакты для критических проблем:
- 📧 Email поддержки проекта
- 🔧 Техническая документация в папке `docs/`

---

**⚡ СИСТЕМА ГОТОВА К РАБОТЕ НА ВАШЕМ TIMEWEB СЕРВЕРЕ!**

Время полного развертывания: **10-15 минут**  
Адрес системы: **http://5.129.246.24**