# 🚀 Руководство по продакшн-развертыванию ReplyX

## Быстрый старт

```bash
# 1. Установить переменные окружения
export DATABASE_URL="postgresql://user:password@host:port/database"

# 2. Запустить автоматизированное развертывание
./scripts/production_deploy.sh

# 3. Проверить развертывание
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

## Предварительные требования

### Сервер базы данных
- ✅ PostgreSQL 14+ с расширением `pgvector`
- ✅ Роль БД с правами `CREATE EXTENSION` и `CREATE` на схему
- ✅ Достаточное дисковое пространство (рекомендуется 2x от текущего размера данных для индексов)

### Переменные окружения
```bash
# Обязательные
DATABASE_URL="postgresql://user:pass@host:port/db"

# Рекомендуемые настройки для продакшена
DB_POOL_SIZE=15
DB_MAX_OVERFLOW=20
DB_SSL_MODE=require
DB_ECHO=false
```

## Статус цепочки миграций

Текущие готовые к продакшену миграции:
```
66ea5c9e3d91 → 165e5d314eaf → 6d3478c239ce → c4132f66258f → 23081a5beb71 → fb3228f45466
    ↓              ↓              ↓              ↓              ↓              ↓
 базовая       perf индексы   исправ. ограничений завершение   email индекс  pgvector индексы
```

**Статус**: ✅ **ГОТОВ К ПРОДАКШЕНУ**

## Процесс развертывания

### Автоматизированное развертывание
```bash
./scripts/production_deploy.sh
```

Скрипт выполнит:
1. ✅ Проверка подключения к базе данных
2. ✅ Создание автоматического бэкапа (custom формат)
3. ✅ Установка расширения pgvector при необходимости
4. ✅ Применение всех ожидающих миграций
5. ✅ Проверка noop статуса автогенерации
6. ✅ Проверка критических индексов
7. ✅ Запуск пост-деплой оптимизации
8. ✅ Отображение статистики базы данных

### Ручное развертывание
```bash
# 1. Создать бэкап
pg_dump --format=custom --file=backup_$(date +%Y%m%d_%H%M%S).dump "$DATABASE_URL"

# 2. Применить миграции
cd backend && alembic upgrade head

# 3. Проверить развертывание
alembic revision --autogenerate -m "verify_noop"
# Должна быть пустой - если да:
rm alembic/versions/*verify_noop*.py

# 4. Оптимизировать
psql "$DATABASE_URL" -c "
  ANALYZE knowledge_embeddings;
  ANALYZE query_embeddings_cache;
  ALTER DATABASE $(basename $DATABASE_URL) SET ivfflat.probes = 10;
"
```

## Проверка продакшена

### Основные проверки
```sql
-- 1. Расширение установлено
SELECT extname FROM pg_extension WHERE extname='vector';

-- 2. Критические индексы присутствуют
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname IN (
  'knowledge_embeddings_embedding_cosine_idx',
  'knowledge_embeddings_embedding_l2_idx', 
  'query_embeddings_cache_embedding_cosine_idx',
  'ix_users_email'
);

-- 3. Таблицы заполнены (после запуска приложения)
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_stat_get_live_tuples(c.oid) as rows
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Тестирование производительности
```sql
-- Тест векторного поиска по сходству (после загрузки эмбеддингов)
EXPLAIN ANALYZE 
SELECT chunk_text, embedding <-> '[0.1,0.2,...]'::vector as distance
FROM knowledge_embeddings 
ORDER BY embedding <-> '[0.1,0.2,...]'::vector 
LIMIT 5;
```

## Процедуры отката

### Безопасный откат (только индексы)
```bash
# Откатить последнюю миграцию (индексы pgvector)
alembic downgrade -1
```

### Аварийное восстановление
```bash
# Восстановить из бэкапа
pg_restore --clean --if-exists --dbname="$DATABASE_URL" backup_YYYYMMDD_HHMMSS.dump
```

## Мониторинг и обслуживание

### Проверки состояния
```bash
# Мониторинг размера базы данных
python backend/monitoring/db_size_monitor.py

# Статус миграций
alembic current
alembic heads
```

### Настройка производительности
```sql
-- Настроить точность vs скорость векторного поиска
SET ivfflat.probes = 15;  -- Выше = точнее, медленнее

-- Мониторинг использования индексов
SELECT 
  schemaname, tablename, indexname, 
  idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Проверка медленных запросов
SELECT 
  query, 
  mean_exec_time, 
  calls, 
  total_exec_time
FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC;
```

### Регулярное обслуживание
```sql
-- Еженедельное обслуживание (рекомендуется в период низкого трафика)
VACUUM (ANALYZE) knowledge_embeddings;
VACUUM (ANALYZE) query_embeddings_cache;
VACUUM (ANALYZE) dialogs;
VACUUM (ANALYZE) dialog_messages;

-- Ежемесячное обновление статистики индексов
REINDEX INDEX CONCURRENTLY knowledge_embeddings_embedding_cosine_idx;
```

## Соображения безопасности

### Права доступа к базе данных
```sql
-- Роль для продакшена (минимальные права)
GRANT CONNECT ON DATABASE replyx_prod TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Роль для миграций (расширенные права)
GRANT CREATE ON SCHEMA public TO migration_user;
GRANT CREATE ON DATABASE replyx_prod TO migration_user;
```

### Безопасность подключений
- ✅ Использовать SSL соединения (`sslmode=require`)
- ✅ Хранить учетные данные в переменных окружения
- ✅ Настроить таймауты подключений
- ✅ Включить пулинг соединений

## Устранение неполадок

### Частые проблемы

**Ошибка создания индекса:**
```bash
# Проверить недействительные индексы
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE indexdef LIKE '%INVALID%';

# Удалить и пересоздать
DROP INDEX CONCURRENTLY knowledge_embeddings_embedding_cosine_idx;
# Затем перезапустить миграцию
```

**Таймаут миграции:**
```bash
# Временно увеличить maintenance_work_mem
SET maintenance_work_mem = '1GB';
```

**Расширение vector не найдено:**
```sql
-- Установить расширение вручную
CREATE EXTENSION IF NOT EXISTS vector;

-- Проверить установку
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
```

## Поддержка

- **Документация**: `docs/db/runbook.md`
- **Мониторинг**: `backend/monitoring/db_size_monitor.py`
- **Справочник схемы**: `docs/db/schema.md`

---

**Статус продакшена**: ✅ **ГОТОВ К РАЗВЕРТЫВАНИЮ**

База данных была тщательно протестирована и оптимизирована для продакшн-нагрузок с функциями безопасности, производительности и надежности корпоративного уровня.