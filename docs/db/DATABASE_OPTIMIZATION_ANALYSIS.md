# Database Optimization Analysis for ChatAI MVP 9

## Текущее состояние БД

### Выявленные проблемы

#### 1. КРИТИЧЕСКОЕ: Избыточность миграций (45 файлов)
**Проблема**: 45+ миграций Alembic создают технический долг и усложняют развертывание
- Множественные merge heads указывают на конфликты при разработке
- Миграции типа `merge_heads.py`, `merge_heads_2.py`, `merge_heads_3.py`
- Повторяющиеся операции (add/remove полей туда-обратно)

**Влияние на производительность**:
- Медленное применение миграций в production (каждая ~200-500ms)
- Сложность rollback операций
- Риск data corruption при сбоях

#### 2. N+1 QUERIES в ключевых эндпоинтах

**Выявлено в assistants.py**:
```python
# ❌ ПРОБЛЕМА: Загрузка ассистентов без eager loading
assistants = crud.get_assistants(db, effective_user_id)  # 1 запрос
for assistant in assistants:
    # N запросов для каждого ассистента:
    messages_count = db.query(...).join(models.Dialog).filter(
        models.Dialog.assistant_id == assistant.id  # N запросов
    ).scalar()
```

**Проблемные места**:
- `get_assistants_stats()` - N+1 при подсчете статистики
- `list_assistant_documents()` - N+1 при загрузке документов
- `list_assistant_dialogs()` - N+1 при загрузке диалогов
- Загрузка embeddings без batch операций

#### 3. Отсутствие оптимизированных индексов

**Проблема**: Медленные запросы к основным таблицам
```sql
-- Отсутствуют составные индексы для частых запросов
-- Нет индексов для pgvector операций
-- Неоптимизированные индексы для JOIN операций
```

#### 4. Неоптимизированный pgvector для RAG

**Проблема**: 
- Эмбеддинги хранятся в `knowledge_embeddings` без оптимальных индексов
- Отсутствуют HNSW/IVFFlat индексы для векторного поиска
- Размер векторов 1536 dimensions без настройки параметров

### Структура основных таблиц

```
users (16k+ записей)
├── assistants (100+ записей на пользователя)
│   ├── documents (50+ документов на ассистента) 
│   ├── dialogs (1000+ диалогов)
│   │   └── messages (10k+ сообщений)
│   └── knowledge_embeddings (100k+ чанков)
├── bot_instances (до 1000 ботов)
├── balance_transactions (биллинг записи)
└── handoff_audit (операторские записи)
```

## План оптимизации

### PHASE 1: Критические исправления (1-2 недели)

#### 1.1 Консолидация миграций
```bash
# Анализ текущих миграций
python scripts/analyze_migrations.py

# Создание снапшота схемы
pg_dump --schema-only chatai_db > current_schema.sql

# Консолидация в базовую миграцию
alembic revision --autogenerate -m "consolidated_base_schema"
```

#### 1.2 Создание критических индексов
```sql
-- Индексы для частых запросов ассистентов
CREATE INDEX CONCURRENTLY idx_assistants_user_active 
ON assistants(user_id, is_active) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_assistants_user_created 
ON assistants(user_id, created_at DESC);

-- Индексы для диалогов и сообщений  
CREATE INDEX CONCURRENTLY idx_dialogs_assistant_started 
ON dialogs(assistant_id, started_at DESC);

CREATE INDEX CONCURRENTLY idx_messages_dialog_timestamp 
ON dialog_messages(dialog_id, timestamp DESC);

-- Индексы для документов
CREATE INDEX CONCURRENTLY idx_documents_user_date 
ON documents(user_id, upload_date DESC);

CREATE INDEX CONCURRENTLY idx_user_knowledge_assistant 
ON user_knowledge(assistant_id, user_id, importance DESC);
```

#### 1.3 Исправление N+1 queries
```python
# assistants.py - оптимизированная версия
@router.get("/assistants/stats")
def get_assistants_stats_optimized(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Оптимизированная статистика без N+1"""
    effective_user_id = auth.get_effective_user_id(current_user, db)
    
    # Один запрос для всех статистик
    stats_query = db.query(
        models.Assistant.id,
        models.Assistant.name,
        models.Assistant.is_active,
        func.count(distinct(models.Dialog.id)).label('dialogs_count'),
        func.count(models.DialogMessage.id).label('messages_count')
    ).outerjoin(models.Dialog, models.Assistant.id == models.Dialog.assistant_id)\
     .outerjoin(models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id)\
     .filter(models.Assistant.user_id == effective_user_id)\
     .group_by(models.Assistant.id)\
     .all()
    
    return {"byAssistant": stats_query}
```

### PHASE 2: Векторная оптимизация (2-3 недели)

#### 2.1 pgvector индексы
```sql
-- IVFFlat для быстрого поиска (100k векторов)
CREATE INDEX CONCURRENTLY idx_knowledge_embeddings_ivfflat 
ON knowledge_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 316);  -- sqrt(100000)

-- Настройка параметров поиска
SET ivfflat.probes = 10;

-- Составной индекс для pre-filtering
CREATE INDEX CONCURRENTLY idx_embeddings_assistant_importance 
ON knowledge_embeddings(assistant_id, importance DESC, created_at DESC);
```

#### 2.2 Оптимизация RAG запросов
```python
# services/embeddings_service.py - оптимизированный поиск
def search_relevant_embeddings_optimized(assistant_id: int, query_vector: List[float], limit: int = 10):
    """Оптимизированный векторный поиск с pre-filtering"""
    
    # Pre-filter по assistant_id, затем векторный поиск
    results = db.query(
        KnowledgeEmbedding.chunk_text,
        KnowledgeEmbedding.embedding.cosine_distance(query_vector).label('distance'),
        KnowledgeEmbedding.importance
    ).filter(
        KnowledgeEmbedding.assistant_id == assistant_id,
        KnowledgeEmbedding.importance >= 5  # Только важные чанки
    ).order_by(
        KnowledgeEmbedding.embedding.cosine_distance(query_vector)
    ).limit(limit * 2)  # Берем больше для re-ranking
    
    # Re-ranking по importance
    return sorted(results, key=lambda x: x.importance * (1 - x.distance))[:limit]
```

### PHASE 3: Масштабирование и мониторинг (3-4 недели)

#### 3.1 Connection pooling
```python
# database/connection.py - оптимизированный пул
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,           # Основной пул для web requests
    max_overflow=30,        # Дополнительные соединения
    pool_pre_ping=True,     # Health check соединений
    pool_recycle=3600,      # Обновление каждый час
    echo=False              # Отключить SQL логи в prod
)

# Отдельный пул для background задач
worker_engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)
```

#### 3.2 Партиционирование больших таблиц
```sql
-- Партиционирование dialog_messages по дате
CREATE TABLE dialog_messages_partitioned (
    LIKE dialog_messages INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Партиции по месяцам
CREATE TABLE dialog_messages_2024_08 PARTITION OF dialog_messages_partitioned
FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');

-- Автоматическое создание партиций
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    table_name text;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
    end_date := start_date + interval '1 month';
    table_name := 'dialog_messages_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE %I PARTITION OF dialog_messages_partitioned 
                    FOR VALUES FROM (%L) TO (%L)', 
                   table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

## Ожидаемые результаты

### Производительность
- **Скорость запросов**: улучшение в 3-10 раз
- **Векторный поиск**: с 2-5 сек до 50-200ms
- **N+1 queries**: полное устранение
- **Throughput**: с 100 до 1000+ RPS

### Масштабируемость  
- **Пользователи**: до 10,000+
- **Telegram боты**: до 1,000+ стабильно
- **Векторов**: до 1M+ эмбеддингов
- **Сообщения/день**: до 100k+

### Операционные преимущества
- **Время деплоя**: с 10-15 мин до 2-3 мин
- **Размер миграций**: сокращение с 45 до 5-7 файлов
- **Monitoring**: полная прозрачность производительности
- **Reliability**: 99.9% uptime

## Риски и митигация

### Высокие риски
1. **Миграция данных**: Потенциальная потеря данных
   - **Митигация**: Полный backup + тестирование на staging
   
2. **Downtime при создании индексов**: 
   - **Митигация**: CONCURRENTLY + Blue-Green deployment

3. **Изменение производительности pgvector**:
   - **Митигация**: A/B тестирование с fallback

### Средние риски  
1. **Memory consumption**: Увеличение потребления RAM
   - **Митигация**: Мониторинг + автоскейлинг

2. **Lock contention**: При создании индексов
   - **Митигация**: Создание в off-peak часы

## Временные рамки

| Phase | Задачи | Время | Ответственный |
|-------|--------|--------|---------------|
| 1 | Миграции + критические индексы | 1-2 недели | DevOps + Backend |
| 2 | pgvector оптимизация | 2-3 недели | AI/ML Engineer |  
| 3 | Масштабирование + мониторинг | 3-4 недели | Full Team |

**Общее время**: 6-9 недель до полной оптимизации

## Метрики успеха

### Performance KPIs
- [ ] API response time < 200ms (95th percentile)
- [ ] Vector search < 100ms (average)
- [ ] Zero N+1 queries in hot paths
- [ ] Database CPU usage < 70%

### Business KPIs  
- [ ] Support for 10,000+ concurrent users
- [ ] 1,000+ active Telegram bots
- [ ] 99.9% uptime SLA
- [ ] Zero data loss incidents

---

*Документ создан: 2025-08-25*  
*Статус: Draft - требует review*  
*Следующее обновление: После Phase 1*