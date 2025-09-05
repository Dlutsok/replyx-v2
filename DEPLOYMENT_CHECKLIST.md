# 🚀 CORS Security Deployment Checklist

## ✅ Пре-деплой проверки

### 1. Конфигурация (.env.production)
```bash
# 🔐 КРИТИЧНО! Проверьте эти настройки:
CORS_ORIGINS=https://replyx.ru,https://www.replyx.ru  # БЕЗ "*"!
ENABLE_CSRF_PROTECTION=false                          # Отключаем для API виджетов
SITE_SECRET=<уникальный_секрет>                      # Для JWT виджетов
SECRET_KEY=<другой_уникальный_секрет>                # Для основного приложения
```

### 2. Nginx конфигурация
```nginx
# Убедитесь, что Nginx НЕ добавляет свои CORS заголовки
# Закомментируйте или удалите эти строки:
# add_header 'Access-Control-Allow-Origin' '*';
# add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';

# Добавьте только это:
add_header Vary Origin always;
```

### 3. Backup базы данных
```bash
# ОБЯЗАТЕЛЬНО! Сделайте бэкап перед деплоем
pg_dump replyx_prod > /opt/replyx/backups/before_cors_update_$(date +%Y%m%d_%H%M%S).sql
```

## 🔄 Процедура деплоя

### Шаг 1: Остановка сервисов
```bash
systemctl stop replyx-backend
systemctl stop replyx-workers
```

### Шаг 2: Обновление кода
```bash
cd /opt/replyx
git pull origin main
```

### Шаг 3: Проверка Alembic
```bash
cd /opt/replyx/backend
./check_alembic.sh

# Если нужно выравнивание:
alembic stamp head
```

### Шаг 4: Обновление конфигурации
```bash
cp .env.production.example .env.production
nano .env.production  # Заполните реальными значениями
```

### Шаг 5: Установка зависимостей
```bash
pip install -r requirements.txt
```

### Шаг 6: Запуск сервисов
```bash
systemctl start replyx-backend
systemctl start replyx-workers

# Проверка статуса
systemctl status replyx-backend
systemctl status replyx-workers
```

## 🧪 Тестирование после деплоя

### Автоматические тесты
```bash
cd /opt/replyx/backend
./deployment_tests.sh
```

### Ручная проверка критичных функций

#### 1. Health Check
```bash
curl -sS https://replyx.ru/health
# Ожидаем: {"status": "healthy", ...}
```

#### 2. Админ-панель (основное приложение)
```bash
curl -sS https://replyx.ru/api/login \
  -H "Origin: https://replyx.ru" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"test"}' -i

# Должно быть:
# Access-Control-Allow-Origin: https://replyx.ru
# Access-Control-Allow-Credentials: true
```

#### 3. Виджет preflight
```bash
curl -sS https://replyx.ru/api/validate-widget-token \
  -X OPTIONS \
  -H "Origin: https://stencom.ru" \
  -H "Access-Control-Request-Method: POST" -i

# Должно быть:
# HTTP/1.1 200 OK
# Access-Control-Allow-Origin: https://stencom.ru
# НЕТ Access-Control-Allow-Credentials
```

#### 4. Блокировка злонамеренных доменов
```bash
curl -sS https://replyx.ru/api/validate-widget-token \
  -X OPTIONS \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: POST" -i

# Должно быть:
# HTTP/1.1 403 Forbidden ИЛИ нет CORS заголовков
```

### Мониторинг
```bash
# Проверка метрик
curl -sS https://replyx.ru/metrics | grep widget_

# Должны быть:
# widget_cors_requests_total
# widget_token_validations_total  
# widget_blocked_origins_total
```

## 📊 Проверка логов

```bash
# Backend логи
journalctl -u replyx-backend -f --since "5 minutes ago"

# Ищем:
# ✅ "🌐 Основные CORS домены: ['https://replyx.ru', ...]"
# ✅ "🔐 DynamicCORSMiddleware инициализирован"
# ✅ "⚠️ CSRF Protection отключена (разработка)"

# Workers логи  
journalctl -u replyx-workers -f --since "5 minutes ago"
```

## 🚨 План отката (если что-то пошло не так)

### Быстрый откат (немедленно)
```bash
# 1. Останавливаем сервисы
systemctl stop replyx-backend replyx-workers

# 2. Возвращаем старую конфигурацию
cd /opt/replyx
git checkout HEAD~1  # Возврат к предыдущему коммиту

# 3. Временная заплатка для виджетов
export CORS_ORIGINS="https://replyx.ru,https://www.replyx.ru,https://stencom.ru"
export ENABLE_CSRF_PROTECTION=false

# 4. Запускаем сервисы
systemctl start replyx-backend replyx-workers

# 5. Проверяем
curl -sS https://replyx.ru/health
```

### Полный откат (если нужно восстановление БД)
```bash
# 1. Остановка сервисов
systemctl stop replyx-backend replyx-workers

# 2. Восстановление БД из бэкапа
psql -U replyx_user -d replyx_prod < /opt/replyx/backups/before_cors_update_YYYYMMDD_HHMMSS.sql

# 3. Откат кода
git checkout HEAD~1

# 4. Старая конфигурация
cp .env.production.backup .env.production  # Если есть бэкап

# 5. Запуск
systemctl start replyx-backend replyx-workers
```

## 📈 Мониторинг после деплоя

### Первые 30 минут
- [ ] Health check каждые 5 минут
- [ ] Проверка admin-панели каждые 10 минут  
- [ ] Мониторинг логов на ошибки CORS
- [ ] Проверка метрик `widget_blocked_origins_total`

### Первые 24 часа  
- [ ] Анализ метрик безопасности в Grafana
- [ ] Проверка работы виджетов на внешних сайтах
- [ ] Мониторинг производительности
- [ ] Проверка отсутствия регрессий в основном приложении

### Alerting (настройте в Grafana)
```
# Подозрительная активность виджетов
increase(widget_blocked_origins_total[5m]) > 10

# Ошибки валидации токенов
increase(widget_token_validations_total{result="invalid"}[5m]) > 50

# Общие ошибки приложения
increase(http_requests_total{status=~"5.."}[5m]) > 100
```

## 🎯 Критерии успешного деплоя

### ✅ Безопасность
- [ ] CORS_ORIGINS не содержит "*"
- [ ] Основное приложение работает только с replyx.ru
- [ ] Виджеты работают без credentials
- [ ] Злонамеренные домены блокируются
- [ ] Метрики безопасности работают

### ✅ Функциональность
- [ ] Админ-панель доступна и работает
- [ ] API эндпоинты отвечают корректно
- [ ] Виджеты работают на внешних сайтах
- [ ] WebSocket соединения стабильны
- [ ] Health check возвращает 200

### ✅ Производительность
- [ ] Время отклика API < 500ms
- [ ] Нет лишних CORS проверок
- [ ] Memory usage в норме
- [ ] CPU usage в норме

## 📞 Контакты в случае проблем

**Разработчик**: Claude Code Assistant  
**Документация**: `CORS_SECURITY_IMPLEMENTATION_REPORT.md`  
**Логи**: `/var/log/replyx/` + `journalctl -u replyx-backend`  
**Метрики**: `https://replyx.ru/metrics`  

---

## 🏁 Финальная проверка

После выполнения всех шагов убедитесь:

1. **Безопасность**: `./deployment_tests.sh` прошел успешно
2. **Функциональность**: админ-панель и виджеты работают  
3. **Мониторинг**: метрики собираются, алерты настроены
4. **Документация**: команда знает о изменениях
5. **Backup**: восстановление протестировано

**🎉 Деплой CORS безопасности завершен!**