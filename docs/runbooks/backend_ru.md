# Runbook — Операции Backend

**Последнее обновление:** 4 сентября 2025 г. (проверено против MVP 13)

## Краткое руководство по запуску

### Настройка среды разработки

#### Предварительные требования
```bash
# Установить Python 3.9+
python3 --version

# Установить PostgreSQL с расширением pgvector
sudo apt install postgresql postgresql-contrib
sudo apt install postgresql-14-pgvector

# Установить Redis
sudo apt install redis-server

# Создать виртуальную среду
python3 -m venv venv
source venv/bin/activate
```

#### Конфигурация среды
```bash
# Скопировать шаблон окружения
cp .env.example .env

# Редактировать конфигурацию
vim .env

# Необходимые переменные:
DATABASE_URL=postgresql://user:password@localhost:5432/chatai
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=ваш-секретный-ключ
OPENAI_API_KEY=sk-ваш-openai-ключ
```

#### Настройка базы данных
```bash
# Создать базу данных и пользователя
sudo -u postgres psql -c "CREATE DATABASE chatai;"
sudo -u postgres psql -c "CREATE USER chatai WITH ENCRYPTED PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chatai TO chatai;"

# Включить расширение pgvector
sudo -u postgres psql -d chatai -c "CREATE EXTENSION vector;"

# Запустить миграции
alembic upgrade head
```

#### Запуск сервера разработки
```bash
cd backend
pip install -r requirements.txt
python3 main.py

# Сервер запустится на http://localhost:8000
# API документация доступна на http://localhost:8000/docs
```

## Операции в Production

### Управление сервисами

#### Управление systemD сервисами
```bash
# Проверить статус сервисов
sudo systemctl status chatai-backend
sudo systemctl status chatai-bot-manager

# Запуск/остановка сервисов
sudo systemctl start chatai-backend
sudo systemctl stop chatai-backend
sudo systemctl restart chatai-backend

# Включить/отключить автозапуск
sudo systemctl enable chatai-backend
sudo systemctl disable chatai-backend

# Просмотр логов сервисов
sudo journalctl -u chatai-backend -f
sudo journalctl -u chatai-bot-manager -f
```

#### Управление процессами
```bash
# Проверить запущенные процессы
ps aux | grep python3 | grep main.py
ps aux | grep node | grep scalable_bot_manager

# Завершить процессы (если необходимо)
pkill -f "python3.*main.py"
pkill -f "scalable_bot_manager.js"

# Проверить использование портов
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :3001
```

### Мониторинг состояния

#### Health Check endpoints
```bash
# Базовая проверка здоровья
curl http://localhost:8000/health

# Prometheus метрики
curl http://localhost:8000/metrics

# Мониторинг размера БД
curl http://localhost:8000/metrics/db-size

# Статус rate limit ботов
curl http://localhost:8000/metrics/telegram-rate-limit

# CSRF токен (для frontend)
curl http://localhost:8000/api/csrf-token
```

#### Примеры ответов Health Check
```json
# Здоровая система
{
  "status": "healthy",
  "timestamp": 1640995200.123,
  "components": {
    "database": {"status": "healthy"},
    "redis": {"status": "healthy"},
    "ai_token_manager": {"status": "healthy"}
  }
}

# Нездоровая система
{
  "status": "unhealthy",
  "timestamp": 1640995200.123,
  "components": {
    "database": {"status": "unhealthy", "error": "Connection timeout"},
    "redis": {"status": "healthy"},
    "ai_token_manager": {"status": "healthy"}
  }
}
```

## Операции с базой данных

### Управление миграциями
```bash
# Проверить текущий статус миграции
alembic current

# Посмотреть историю миграций
alembic history --verbose

# Обновить до последней миграции
alembic upgrade head

# Обновить до конкретной ревизии
alembic upgrade abc123

# Откатить к предыдущей ревизии
alembic downgrade -1

# Создать новую миграцию
alembic revision --autogenerate -m "Добавить новую функцию"

# Показать SQL миграции (без выполнения)
alembic upgrade head --sql
```

### Обслуживание базы данных
```bash
# Создать резервную копию БД
python3 scripts/database_backup.py

# Проверить размер БД
psql $DATABASE_URL -c "\dt+"

# Анализ статистики таблиц
psql $DATABASE_URL -c "ANALYZE;"

# Переиндексация для производительности
psql $DATABASE_URL -c "REINDEX DATABASE chatai;"

# Проверка неиспользуемых индексов
psql $DATABASE_URL -c "
SELECT schemaname, tablename, indexname, idx_size, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
JOIN (
    SELECT indexname, pg_size_pretty(pg_relation_size(indexrelname::regclass)) as idx_size
    FROM pg_stat_user_indexes
) idx_sizes USING (indexname)
WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
ORDER BY pg_relation_size(indexrelname::regclass) DESC;
"
```

### Анализ производительности запросов
```bash
# Включить логирование запросов (postgresql.conf)
log_statement = 'all'
log_min_duration_statement = 1000  # Логировать запросы > 1 секунды

# Проверить медленные запросы
psql $DATABASE_URL -c "
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"

# Проверить размеры таблиц
psql $DATABASE_URL -c "
SELECT
    schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
"
```

## Операции управления ботами

### Управление Bot воркерами
```bash
# Проверить статус bot manager
curl http://localhost:3001/status

# Список всех активных ботов
curl http://localhost:8000/api/bot-instances-all

# Запустить конкретного бота
curl -X POST http://localhost:8000/api/start-bot/123

# Остановить конкретного бота
curl -X POST http://localhost:8000/api/stop-bot/123

# Проверить процессы bot worker
ps aux | grep bot_worker | wc -l

# Мониторинг использования памяти ботами
ps aux | grep bot_worker | awk '{sum += $6} END {print "Общая память: " sum/1024 "MB"}'
```

### Мониторинг производительности ботов
```bash
# Метрики rate limit ботов
curl -s http://localhost:8000/metrics/telegram-rate-limit

# Детальная статистика ботов
curl -s http://localhost:8000/api/telegram/rate-limit/stats

# Статистика отдельного бота
curl -s http://localhost:8000/api/telegram/rate-limit/stats/bot123

# Логи bot worker
tail -f backend/logs/api.log | grep -i "bot\|worker"
```

## Управление AI токенами

### Операции с Token Pool
```bash
# Список всех AI токенов (только admin)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:8000/api/admin/ai-tokens

# Добавить новый AI токен
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Token1","token":"sk-...","priority":1}' \
     http://localhost:8000/api/admin/ai-tokens

# Обновить настройки токена
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"daily_limit":20000}' \
     http://localhost:8000/api/admin/ai-tokens/1

# Проверить использование токена
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:8000/api/admin/ai-tokens/1/usage
```

### Мониторинг производительности токенов
```bash
# Статистика использования токенов из БД
psql $DATABASE_URL -c "
SELECT
    atp.name,
    atp.current_daily_usage,
    atp.daily_limit,
    atp.error_count,
    atp.last_used,
    COUNT(atu.id) as total_requests,
    AVG(atu.response_time) as avg_response_time
FROM ai_token_pool atp
LEFT JOIN ai_token_usage atu ON atp.id = atu.token_id
WHERE atp.is_active = true
GROUP BY atp.id, atp.name, atp.current_daily_usage, atp.daily_limit, atp.error_count, atp.last_used
ORDER BY total_requests DESC;
"
```

## Управление логами

### Расположение файлов логов
```bash
# Логи приложения
tail -f backend/logs/api.log
tail -f backend/logs/api.log.$(date +%Y-%m-%d)

# Audit логи
tail -f backend/logs/audit.log
tail -f backend/logs/audit.log.$(date +%Y-%m-%d)

# Системные логи
sudo journalctl -u chatai-backend -f
sudo journalctl -u chatai-bot-manager -f
```

### Команды анализа логов
```bash
# Последние ошибки
grep ERROR backend/logs/api.log | tail -20

# Неудачные попытки аутентификации
grep -E "(401|403|Unauthorized|Forbidden)" backend/logs/api.log

# Проблемы с подключением к БД
grep -i "database.*error\|connection.*failed" backend/logs/api.log

# Проблемы с bot worker
grep -i "bot.*error\|worker.*failed" backend/logs/api.log

# Проблемы производительности (медленные запросы)
grep -E "duration.*[5-9][0-9]{3}|duration.*[0-9]{5}" backend/logs/api.log

# Предупреждения о памяти
grep -i "memory\|oom\|out of memory" backend/logs/api.log
```

### Управление ротацией логов
```bash
# Проверить конфигурацию ротации логов
cat /etc/logrotate.d/chatai

# Принудительная ротация логов
sudo logrotate -f /etc/logrotate.d/chatai

# Проверить использование диска логами
du -h backend/logs/

# Очистка старых логов (вручную)
find backend/logs/ -name "*.log.*" -mtime +7 -delete
```

## Операции безопасности

### Мониторинг безопасности
```bash
# Проверить неудачные попытки входа
grep "login.*failed\|authentication.*failed" backend/logs/audit.log | tail -20

# Проверить атаки brute force
awk '/login.*failed/ {ip=$NF; count[ip]++} END {for (i in count) if (count[i] > 5) print i, count[i]}' backend/logs/audit.log

# Проверить подозрительные активности
grep -E "(suspicious|anomaly|unusual)" backend/logs/audit.log

# Проверить статус Fail2ban
sudo fail2ban-client status
sudo fail2ban-client status chatai-backend
```

### Управление SSL/TLS сертификатами
```bash
# Проверить истечение сертификата
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Проверить цепочку сертификатов
openssl s_client -connect yourdomain.com:443 -showcerts

# Тестировать конфигурацию SSL
sslscan yourdomain.com
testssl.sh yourdomain.com
```

## Руководство по устранению неполадок

### Распространенные проблемы и решения

#### 1. Проблемы с подключением к БД
**Симптомы:** Health check не проходит, ошибки 500, таймауты БД
```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Тестировать подключение
psql $DATABASE_URL -c "SELECT 1;"

# Проверить лимиты подключений
psql $DATABASE_URL -c "SHOW max_connections;"
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Проверить долго выполняющиеся запросы
psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"

# Завершить долго выполняющиеся запросы (если необходимо)
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = 12345;"
```

#### 2. Проблемы с подключением к Redis
**Симптомы:** Промахи кэша, проблемы с сессиями, проблемы rate limiting
```bash
# Проверить статус Redis
sudo systemctl status redis

# Тестировать подключение Redis
redis-cli ping

# Проверить использование памяти Redis
redis-cli info memory

# Проверить подключенных клиентов
redis-cli info clients

# Очистить кэш Redis (если необходимо)
redis-cli flushdb
```

#### 3. Проблемы с Bot Worker
**Симптомы:** Боты не отвечают, высокое использование памяти, сбои воркеров
```bash
# Проверить процессы воркеров
ps aux | grep bot_worker

# Проверить использование памяти на воркер
ps aux | grep bot_worker | awk '{print $2, $6}' | sort -k2 -nr

# Перезапустить bot manager
sudo systemctl restart chatai-bot-manager

# Проверить зомби-процессы
ps aux | grep defunct
```

#### 4. Высокое использование памяти
**Симптомы:** Медленная система, OOM kills, использование swap
```bash
# Проверить системную память
free -h

# Проверить использование памяти процессами
ps aux --sort=-%mem | head -20

# Проверить утечки памяти
valgrind --tool=memcheck --leak-check=full python3 main.py

# Включить профилирование памяти (разработка)
pip install memory-profiler
python3 -m memory_profiler main.py
```

#### 5. Проблемы производительности
**Симптомы:** Медленное время ответа, высокое использование CPU, таймауты
```bash
# Проверить использование CPU
top -p $(pgrep -f "python.*main.py")

# Профилирование приложения (разработка)
pip install py-spy
py-spy record -o profile.svg -d 60 -p $(pgrep -f "python.*main.py")

# Проверить производительность БД
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Временно включить логирование запросов
psql $DATABASE_URL -c "ALTER SYSTEM SET log_min_duration_statement = 100;"
psql $DATABASE_URL -c "SELECT pg_reload_conf();"
```

### Экстренные процедуры

#### Полный перезапуск системы
```bash
# Остановить все сервисы
sudo systemctl stop chatai-backend
sudo systemctl stop chatai-bot-manager
sudo systemctl stop nginx  # если используется nginx прокси

# Проверить оставшиеся процессы
ps aux | grep -E "(python.*main|node.*scalable)" | grep -v grep

# Завершить оставшиеся процессы при необходимости
sudo pkill -f "python.*main.py"
sudo pkill -f "scalable_bot_manager"

# Запустить сервисы
sudo systemctl start chatai-backend
sudo systemctl start chatai-bot-manager
sudo systemctl start nginx

# Проверить здоровье
curl http://localhost:8000/health
```

#### Восстановление базы данных
```bash
# Остановить приложение
sudo systemctl stop chatai-backend

# Создать экстренную резервную копию
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Проверить целостность БД
psql $DATABASE_URL -c "SELECT pg_database_size(current_database());"

# Восстановить из резервной копии (при необходимости)
dropdb chatai_backup  # Сначала создать резервную БД
createdb chatai_backup
psql chatai_backup < latest_backup.sql

# Запустить приложение
sudo systemctl start chatai-backend
```

## Оптимизация производительности

### Оптимизация базы данных
```bash
# Обновить статистику таблиц
psql $DATABASE_URL -c "ANALYZE;"

# Проверить использование индексов
psql $DATABASE_URL -c "
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
"

# Vacuum таблиц
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Проверить раздутые таблицы
psql $DATABASE_URL -c "
SELECT
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup::float / (n_live_tup + n_dead_tup + 1) * 100, 2) AS dead_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_percentage DESC;
"
```

### Настройка производительности приложения
```bash
# Проверить SQLAlchemy connection pool
# Добавить в main.py для мониторинга:
# from sqlalchemy import event
# @event.listens_for(engine, "connect")
# def connect(dbapi_connection, connection_record):
#     print(f"Pool size: {engine.pool.size()}")
#     print(f"Checked out: {engine.pool.checkedout()}")

# Мониторинг медленных endpoints
grep -E "duration.*[1-9][0-9]{3}" backend/logs/api.log | cut -d' ' -f6,8 | sort | uniq -c | sort -nr

# Профилирование конкретных endpoints
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:8000/api/dialogs
```

Этот runbook следует использовать как справочник для всех операционных задач backend. Обновляйте этот документ по мере разработки новых процедур или изменения существующих.