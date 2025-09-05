# Руководство по эксплуатации БД ReplyX

## Развертывание с нуля

```bash
createdb replyx_prod
# (если расширение устанавливается миграцией)
alembic upgrade head
```

## Резервное копирование и восстановление

```bash
pg_dump --format=custom --file=backup.dump "$DB_URL"
pg_restore --clean --if-exists --dbname="$DB_URL" backup.dump
```

## Технические проверки

- `SELECT extname FROM pg_extension WHERE extname='vector';` — расширение установлено.
- `alembic heads` — один head.
- `alembic revision --autogenerate` — noop.

## Частые проблемы

- **Расхождения автогенерации**: проверь server_default, длины String, типы (vector(1536)).
- **Дубли уникальностей**: оставляем UniqueConstraint, старые CREATE UNIQUE INDEX удаляем миграцией.
- **Перф-индексы «мигают» в автогенерации**: дополни PERF_INDEXES в env.py.

## Откат (пример)

```bash
alembic downgrade -1
# или до конкретной ревизии
alembic downgrade 66ea5c9e3d91
```

## Продакшн-чеклист

- Права на CREATE EXTENSION "vector" (или ставится DBA/скриптом заранее).
- `alembic upgrade head` успешно на чистой БД той же версии Postgres.
- Бэкап после апгрейда сохранён и протестирован pg_restore.
- Нет вызовов `Base.metadata.create_all()` на боевом пути.

## Текущее состояние миграций

**Current head**: `fb3228f45466` (pgvector performance indexes)

**Цепочка миграций**:
1. `66ea5c9e3d91` - Начальная схема на основе текущих моделей
2. `165e5d314eaf` - Производительные индексы для продакшена  
3. `6d3478c239ce` - Исправление именования уникальных ограничений
4. `c4132f66258f` - Завершение исправления уникальных ограничений
5. `23081a5beb71` - Добавление индекса email пользователей
6. `fb3228f45466` - pgvector индексы производительности (CONCURRENTLY)

## Управление индексами производительности (Вариант B)

Индексы производительности управляются отдельно от моделей во избежание шума автогенерации:

```python
# В alembic/env.py
PERF_INDEXES = {
    "idx_dialogs_user_started",
    "idx_dialogs_handoff_status",
    "idx_dialogs_assistant_created",
    "idx_dialog_messages_dialog_timestamp",
    "idx_dialog_messages_kind_timestamp", 
    "idx_dialog_messages_sender_timestamp",
    "idx_documents_user_upload",
    "idx_documents_hash",
    "idx_knowledge_embeddings_user_doc",
    "idx_knowledge_embeddings_assistant_importance",
    "idx_knowledge_embeddings_source_created",
    "idx_knowledge_embeddings_chunk_hash",
    "idx_balance_transactions_user_created",
    "idx_balance_transactions_type_created",
    "idx_payments_user_created", 
    "idx_payments_status_created",
    "idx_ai_token_usage_token_created",
    "idx_ai_token_usage_user_model",
    "ix_start_page_events_created_at",
    "idx_start_events_user_created",
    "idx_start_events_session_created",
    "idx_start_events_type_created",
    "idx_start_events_step_created",
    "idx_user_knowledge_user_assistant",
    "idx_user_knowledge_doc_type",
    "idx_user_knowledge_last_used",
    # pgvector индексы производительности (критично для продакшена)
    "knowledge_embeddings_embedding_cosine_idx",
    "knowledge_embeddings_embedding_l2_idx",
    "query_embeddings_cache_embedding_cosine_idx",
}

def include_object(obj, name, type_, reflected, compare_to):
    if type_ == "index" and name in PERF_INDEXES:
        return False
    return True
```

## Диагностические команды

Проверка дублирующих уникальных ограничений:
```sql
SELECT con.conname AS uq_name, c.relname AS table_name,
       regexp_replace(pg_get_constraintdef(con.oid), '^UNIQUE \\((.*)\\)', '\\1') AS columns
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
WHERE con.contype = 'u'
ORDER BY 2,1;
```

Проверка уникальных индексов:
```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND indexdef ILIKE '%UNIQUE%';
```

Проверка текущего состояния миграций:
```bash
alembic current
alembic heads
```

Тестирование noop автогенерации:
```bash
alembic revision --autogenerate -m "noop_test"
# Должна генерировать пустую миграцию с только 'pass' утверждениями
rm backend/alembic/versions/*noop_test*.py
```

## Оптимизация pgvector для продакшена

После загрузки данных в knowledge_embeddings и query_embeddings_cache:

```sql
-- Анализ таблиц для оптимального планирования запросов
ANALYZE knowledge_embeddings;
ANALYZE query_embeddings_cache;

-- Оптимизация точности векторного поиска (подбери по производительности)
SET ivfflat.probes = 10;  -- Выше = точнее, медленнее
```

**Заметки о производительности IVFFLAT индексов:**
- Создавай индексы ПОСЛЕ загрузки начальных данных для оптимального кластеринга
- `lists = 100` для knowledge_embeddings (подстраивай по размеру данных: sqrt(rows))  
- `lists = 50` для query_embeddings_cache (меньшая таблица)
- Мониторь и настраивай параметр `ivfflat.probes` (обычно 1-20)

**Создание индексов в продакшене:**
- Все индексы используют `CONCURRENTLY` во избежание блокировок таблиц
- Создаются внутри `autocommit_block()` во избежание конфликтов транзакций
- Безопасно запускать в рабочее время без простоя

## Чеклист перед продакшен-развертыванием

### Перед развертыванием
- [ ] Расширение PostgreSQL `vector` установлено на продакшн-сервере
- [ ] Роль БД имеет права `CREATE EXTENSION` и `CREATE` на схему
- [ ] Alembic `DATABASE_URL` указывает на продакшн-БД
- [ ] Цепочка миграций совпадает с ожидаемой последовательностью:
  ```
  66ea5c9e3d91 → 165e5d314eaf → 6d3478c239ce → c4132f66258f → 23081a5beb71 → fb3228f45466
  ```
- [ ] Автогенерация производит noop на staging окружении
- [ ] `alembic/env.py` имеет корректную фильтрацию `include_object`
- [ ] Свежий `pg_dump` бэкап создан перед развертыванием
- [ ] Мониторинг БД и алерты настроены

### Команды быстрой проверки в продакшене

**Проверка состояния миграций:**
```bash
alembic heads && alembic current
alembic revision --autogenerate -m "noop_prod_check"
# Должна быть пустой - если да, очистить:
rm alembic/versions/*noop_prod_check*.py
```

**Проверка расширений и индексов:**
```sql
-- Расширение установлено
SELECT extname FROM pg_extension WHERE extname='vector';

-- pgvector IVFFLAT индексы созданы
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname IN (
  'knowledge_embeddings_embedding_cosine_idx',
  'knowledge_embeddings_embedding_l2_idx', 
  'query_embeddings_cache_embedding_cosine_idx'
);

-- Стандартный индекс email
SELECT indexname FROM pg_indexes
WHERE tablename='users' AND indexname LIKE 'ix_users_email';
```

**Пост-деплой оптимизация:**
```sql
-- Обновление статистики таблиц для оптимального планирования запросов
ANALYZE knowledge_embeddings;
ANALYZE query_embeddings_cache;

-- Настройка точности vs скорости векторного поиска (начни с 10)
SET ivfflat.probes = 10;  -- Выше = точнее, медленнее
```

## Эксплуатация в продакшене

### Управление индексами
- **Неверные индексы**: Если `CREATE INDEX CONCURRENTLY` упал, удали и пересоздай
- **Переиндексация**: При значительном росте данных, пересоздай с подстроенным параметром `lists`
- **Параметры**: `lists ≈ sqrt(rows)` для оптимальной производительности

### Настройка производительности
- **maintenance_work_mem**: Увеличивай во время создания индексов
- **ivfflat.probes**: Настраивай исходя из требований точности vs скорости (диапазон 1-20)
- **Регулярный VACUUM**: Планируй для больших таблиц (knowledge_embeddings, dialogs)

### Процедуры отката
- **Безопасный откат**: `alembic downgrade -1` (использует `DROP INDEX CONCURRENTLY`)
- **Аварийное восстановление**: Используй свежий `pg_dump` бэкап при необходимости
- **Откат только индексов**: Удали векторные индексы вручную при необходимости

### Мониторинг
- **Долгие транзакции**: Алерт на транзакции > 5 минут
- **Использование индексов**: Мониторь `pg_stat_user_indexes` для неиспользуемых индексов
- **Производительность векторного поиска**: Отслеживай время запросов для поиска по сходству