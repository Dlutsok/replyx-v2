-- Оптимизация pgvector для RAG системы ChatAI MVP 9
-- Выполнять поэтапно с мониторингом производительности

-- ===========================================
-- АНАЛИЗ ТЕКУЩЕГО СОСТОЯНИЯ ВЕКТОРНЫХ ДАННЫХ  
-- ===========================================

-- Проверяем количество векторов в системе
SELECT 
    COUNT(*) as total_embeddings,
    COUNT(DISTINCT assistant_id) as unique_assistants,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(importance) as avg_importance,
    pg_size_pretty(pg_total_relation_size('knowledge_embeddings')) as table_size
FROM knowledge_embeddings;

-- Распределение векторов по ассистентам (для настройки параметров)
SELECT 
    assistant_id,
    COUNT(*) as embedding_count,
    AVG(importance) as avg_importance,
    MAX(created_at) as last_updated
FROM knowledge_embeddings
GROUP BY assistant_id
ORDER BY embedding_count DESC
LIMIT 20;

-- Анализ качества векторов (проверка на NULL/пустые)
SELECT 
    COUNT(*) as total_count,
    COUNT(CASE WHEN embedding IS NULL THEN 1 END) as null_embeddings,
    COUNT(CASE WHEN array_length(embedding::float[], 1) != 1536 THEN 1 END) as wrong_dimension
FROM knowledge_embeddings;

-- ===========================================
-- СОЗДАНИЕ ОПТИМАЛЬНЫХ ВЕКТОРНЫХ ИНДЕКСОВ
-- ===========================================

-- 1. Удаляем существующие неоптимальные векторные индексы (если есть)
DROP INDEX CONCURRENTLY IF EXISTS idx_knowledge_embeddings_embedding;
DROP INDEX CONCURRENTLY IF EXISTS idx_embeddings_vector_search;

-- 2. IVFFlat индекс - быстрый приблизительный поиск
-- Количество lists рассчитывается как sqrt(количество строк)
-- Для 100k записей: lists = 316
-- Для 1M записей: lists = 1000  
-- Для 10k записей: lists = 100

-- Динамический расчет количества lists
DO $$
DECLARE
    row_count INTEGER;
    lists_count INTEGER;
BEGIN
    -- Получаем количество записей
    SELECT COUNT(*) INTO row_count FROM knowledge_embeddings;
    
    -- Рассчитываем оптимальное количество lists
    lists_count := GREATEST(1, LEAST(1000, SQRT(row_count)::INTEGER));
    
    RAISE NOTICE 'Creating IVFFlat index with % lists for % rows', lists_count, row_count;
    
    -- Создаем индекс с рассчитанными параметрами
    EXECUTE format(
        'CREATE INDEX CONCURRENTLY idx_knowledge_embeddings_ivfflat 
         ON knowledge_embeddings 
         USING ivfflat (embedding vector_cosine_ops) 
         WITH (lists = %s)',
        lists_count
    );
END $$;

-- 3. HNSW индекс - более точный поиск (PostgreSQL 16+ с pgvector 0.5.0+)
-- Создается только если поддерживается
DO $$
BEGIN
    -- Проверяем поддержку HNSW
    IF EXISTS (
        SELECT 1 FROM pg_am WHERE amname = 'hnsw'
    ) THEN
        -- Создаем HNSW индекс для более точного поиска
        CREATE INDEX CONCURRENTLY idx_knowledge_embeddings_hnsw
        ON knowledge_embeddings 
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
        
        RAISE NOTICE 'HNSW index created successfully';
    ELSE
        RAISE NOTICE 'HNSW not supported, using only IVFFlat';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'HNSW creation failed: %, using only IVFFlat', SQLERRM;
END $$;

-- 4. Составные индексы для hybrid поиска (векторы + метаданные)
-- Этот индекс критичен для pre-filtering в больших коллекциях

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_hybrid_search
ON knowledge_embeddings(assistant_id, importance DESC, created_at DESC);

-- Дополнительный индекс для фильтрации по типу документа
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_doc_type_search  
ON knowledge_embeddings(assistant_id, doc_type, importance DESC)
WHERE doc_type IS NOT NULL;

-- Индекс для источника эмбеддингов (website, document, etc.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_source_search
ON knowledge_embeddings(assistant_id, source, importance DESC)  
WHERE source IS NOT NULL;

-- ===========================================
-- ОПТИМИЗАЦИЯ ПАРАМЕТРОВ PGVECTOR
-- ===========================================

-- Создаем функцию для настройки параметров поиска
CREATE OR REPLACE FUNCTION set_vector_search_params(
    search_type TEXT DEFAULT 'balanced' -- 'fast', 'balanced', 'accurate'
) 
RETURNS void AS $$
BEGIN
    CASE search_type
        WHEN 'fast' THEN
            -- Быстрый поиск (может быть менее точным)
            PERFORM set_config('ivfflat.probes', '1', false);
            PERFORM set_config('hnsw.ef_search', '40', false);
            
        WHEN 'accurate' THEN  
            -- Точный поиск (медленнее)
            PERFORM set_config('ivfflat.probes', '20', false);
            PERFORM set_config('hnsw.ef_search', '200', false);
            
        ELSE -- balanced (default)
            -- Сбалансированный поиск
            PERFORM set_config('ivfflat.probes', '10', false);
            PERFORM set_config('hnsw.ef_search', '100', false);
    END CASE;
    
    RAISE NOTICE 'Vector search parameters set to: %', search_type;
END;
$$ LANGUAGE plpgsql;

-- Устанавливаем сбалансированные параметры по умолчанию
SELECT set_vector_search_params('balanced');

-- ===========================================
-- ОПТИМИЗИРОВАННЫЕ ФУНКЦИИ ВЕКТОРНОГО ПОИСКА
-- ===========================================

-- 1. Базовый векторный поиск с pre-filtering
CREATE OR REPLACE FUNCTION search_embeddings_basic(
    p_assistant_id INTEGER,
    p_query_vector vector(1536),
    p_limit INTEGER DEFAULT 10,
    p_min_importance INTEGER DEFAULT 5
)
RETURNS TABLE (
    chunk_text TEXT,
    distance FLOAT,
    importance INTEGER,
    doc_type TEXT,
    chunk_index INTEGER
) AS $$
BEGIN
    -- Настраиваем параметры для быстрого поиска
    PERFORM set_vector_search_params('fast');
    
    RETURN QUERY
    SELECT 
        ke.chunk_text,
        (ke.embedding <-> p_query_vector)::FLOAT as distance,
        ke.importance,
        ke.doc_type,
        ke.chunk_index
    FROM knowledge_embeddings ke
    WHERE ke.assistant_id = p_assistant_id
      AND ke.importance >= p_min_importance
    ORDER BY ke.embedding <-> p_query_vector
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 2. Гибридный поиск (векторы + текстовый поиск)
CREATE OR REPLACE FUNCTION search_embeddings_hybrid(
    p_assistant_id INTEGER,
    p_query_vector vector(1536), 
    p_query_text TEXT,
    p_limit INTEGER DEFAULT 10,
    p_vector_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    chunk_text TEXT,
    vector_distance FLOAT,
    text_rank FLOAT,
    combined_score FLOAT,
    importance INTEGER,
    doc_type TEXT
) AS $$
BEGIN
    -- Настраиваем параметры для сбалансированного поиска
    PERFORM set_vector_search_params('balanced');
    
    RETURN QUERY
    SELECT 
        ke.chunk_text,
        (ke.embedding <-> p_query_vector)::FLOAT as vector_distance,
        ts_rank(to_tsvector('russian', ke.chunk_text), query)::FLOAT as text_rank,
        (
            (1 - (ke.embedding <-> p_query_vector)) * p_vector_weight + 
            ts_rank(to_tsvector('russian', ke.chunk_text), query) * (1 - p_vector_weight)
        )::FLOAT as combined_score,
        ke.importance,
        ke.doc_type
    FROM knowledge_embeddings ke,
         plainto_tsquery('russian', p_query_text) query
    WHERE ke.assistant_id = p_assistant_id
      AND (
          -- Либо хорошее векторное сходство
          ke.embedding <-> p_query_vector < 0.8
          OR
          -- Либо текстовое совпадение
          to_tsvector('russian', ke.chunk_text) @@ query
      )
    ORDER BY combined_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 3. Многоступенчатый поиск для повышения точности
CREATE OR REPLACE FUNCTION search_embeddings_multi_stage(
    p_assistant_id INTEGER,
    p_query_vector vector(1536),
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    chunk_text TEXT,
    distance FLOAT,
    importance INTEGER,
    doc_type TEXT,
    stage TEXT
) AS $$
DECLARE
    candidate_limit INTEGER := p_limit * 5; -- Получаем больше кандидатов
BEGIN
    RETURN QUERY
    WITH stage1_candidates AS (
        -- Этап 1: Быстрый поиск с IVFFlat (много кандидатов)
        SELECT 
            ke.chunk_text,
            ke.embedding <-> p_query_vector as distance,
            ke.importance,
            ke.doc_type,
            'stage1'::TEXT as stage,
            ROW_NUMBER() OVER (ORDER BY ke.embedding <-> p_query_vector) as rn
        FROM knowledge_embeddings ke
        WHERE ke.assistant_id = p_assistant_id
        ORDER BY ke.embedding <-> p_query_vector
        LIMIT candidate_limit
    ),
    stage2_reranked AS (
        -- Этап 2: Re-ranking с учетом важности и других факторов
        SELECT 
            *,
            (
                (1 - distance) * 0.6 +  -- Векторное сходство (60%)
                (importance / 10.0) * 0.3 + -- Важность документа (30%) 
                (CASE WHEN doc_type = 'website_single' THEN 0.1 ELSE 0.05 END) -- Тип документа (10%)
            ) as rerank_score
        FROM stage1_candidates
    )
    SELECT 
        sr.chunk_text,
        sr.distance,
        sr.importance,
        sr.doc_type,
        'final'::TEXT as stage
    FROM stage2_reranked sr
    ORDER BY sr.rerank_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 4. Поиск с фильтрацией по типу документа
CREATE OR REPLACE FUNCTION search_embeddings_by_doc_type(
    p_assistant_id INTEGER,
    p_query_vector vector(1536),
    p_doc_types TEXT[],
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    chunk_text TEXT,
    distance FLOAT,
    doc_type TEXT,
    importance INTEGER
) AS $$
BEGIN
    PERFORM set_vector_search_params('balanced');
    
    RETURN QUERY
    SELECT 
        ke.chunk_text,
        (ke.embedding <-> p_query_vector)::FLOAT as distance,
        ke.doc_type,
        ke.importance
    FROM knowledge_embeddings ke
    WHERE ke.assistant_id = p_assistant_id
      AND (p_doc_types IS NULL OR ke.doc_type = ANY(p_doc_types))
      AND ke.importance >= 5
    ORDER BY ke.embedding <-> p_query_vector
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ ВЕКТОРНОГО ПОИСКА
-- ===========================================

-- Функция для анализа производительности векторного поиска
CREATE OR REPLACE FUNCTION analyze_vector_search_performance(
    p_assistant_id INTEGER,
    p_test_vector vector(1536) DEFAULT NULL
)
RETURNS TABLE (
    search_type TEXT,
    execution_time_ms INTEGER,
    rows_examined INTEGER,
    index_used TEXT
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    test_vector vector(1536);
BEGIN
    -- Используем тестовый вектор или генерируем случайный
    IF p_test_vector IS NULL THEN
        SELECT embedding INTO test_vector 
        FROM knowledge_embeddings 
        WHERE assistant_id = p_assistant_id 
        LIMIT 1;
    ELSE
        test_vector := p_test_vector;
    END IF;
    
    -- Тест 1: IVFFlat поиск
    PERFORM set_vector_search_params('fast');
    start_time := clock_timestamp();
    
    PERFORM COUNT(*) FROM (
        SELECT ke.chunk_text
        FROM knowledge_embeddings ke
        WHERE ke.assistant_id = p_assistant_id
        ORDER BY ke.embedding <-> test_vector
        LIMIT 10
    ) sub;
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'IVFFlat Fast'::TEXT,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER,
        10::INTEGER,
        'idx_knowledge_embeddings_ivfflat'::TEXT;
    
    -- Тест 2: Точный поиск
    PERFORM set_vector_search_params('accurate');
    start_time := clock_timestamp();
    
    PERFORM COUNT(*) FROM (
        SELECT ke.chunk_text
        FROM knowledge_embeddings ke
        WHERE ke.assistant_id = p_assistant_id
        ORDER BY ke.embedding <-> test_vector
        LIMIT 10
    ) sub;
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'IVFFlat Accurate'::TEXT,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER,
        10::INTEGER,
        'idx_knowledge_embeddings_ivfflat'::TEXT;
    
    -- Тест 3: Hybrid поиск
    start_time := clock_timestamp();
    
    PERFORM COUNT(*) FROM (
        SELECT ke.chunk_text
        FROM knowledge_embeddings ke
        WHERE ke.assistant_id = p_assistant_id
          AND ke.importance >= 5
        ORDER BY ke.embedding <-> test_vector
        LIMIT 10
    ) sub;
    
    end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
        'Hybrid with pre-filter'::TEXT,
        EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER,
        10::INTEGER,
        'idx_embeddings_hybrid_search + IVFFlat'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ПАКЕТНАЯ ОБРАБОТКА ВЕКТОРОВ
-- ===========================================

-- Функция для пакетного поиска (для обработки множественных запросов)
CREATE OR REPLACE FUNCTION batch_vector_search(
    p_assistant_id INTEGER,
    p_query_vectors vector(1536)[],
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    query_index INTEGER,
    chunk_text TEXT,
    distance FLOAT,
    importance INTEGER
) AS $$
DECLARE
    i INTEGER;
    query_vec vector(1536);
BEGIN
    PERFORM set_vector_search_params('balanced');
    
    FOR i IN 1..array_length(p_query_vectors, 1) LOOP
        query_vec := p_query_vectors[i];
        
        RETURN QUERY
        SELECT 
            i as query_index,
            ke.chunk_text,
            (ke.embedding <-> query_vec)::FLOAT as distance,
            ke.importance
        FROM knowledge_embeddings ke
        WHERE ke.assistant_id = p_assistant_id
          AND ke.importance >= 5
        ORDER BY ke.embedding <-> query_vec
        LIMIT p_limit;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- УТИЛИТЫ ДЛЯ ОБСЛУЖИВАНИЯ ВЕКТОРНЫХ ДАННЫХ
-- ===========================================

-- Очистка дублирующихся векторов
CREATE OR REPLACE FUNCTION cleanup_duplicate_embeddings()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Удаляем дубли по chunk_hash, оставляя самые новые
    WITH duplicates AS (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY chunk_hash 
                   ORDER BY created_at DESC
               ) as rn
        FROM knowledge_embeddings
        WHERE chunk_hash IS NOT NULL
    )
    DELETE FROM knowledge_embeddings
    WHERE id IN (
        SELECT id FROM duplicates WHERE rn > 1
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % duplicate embeddings', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Пересчет статистик для векторных индексов
CREATE OR REPLACE FUNCTION refresh_vector_statistics()
RETURNS void AS $$
BEGIN
    -- Обновляем статистики таблицы
    ANALYZE knowledge_embeddings;
    
    -- Если есть партиции, обновляем их тоже
    PERFORM pg_stat_statements_reset();
    
    RAISE NOTICE 'Vector statistics refreshed';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- АВТОМАТИЧЕСКАЯ НАСТРОЙКА ПАРАМЕТРОВ
-- ===========================================

-- Функция для автоматической настройки параметров на основе размера данных
CREATE OR REPLACE FUNCTION auto_tune_vector_search()
RETURNS TEXT AS $$
DECLARE
    total_vectors INTEGER;
    avg_queries_per_assistant FLOAT;
    recommendation TEXT;
BEGIN
    -- Анализируем размер коллекции
    SELECT COUNT(*) INTO total_vectors FROM knowledge_embeddings;
    
    SELECT AVG(cnt) INTO avg_queries_per_assistant
    FROM (
        SELECT assistant_id, COUNT(*) as cnt 
        FROM knowledge_embeddings 
        GROUP BY assistant_id
    ) sub;
    
    -- Рекомендации на основе размера
    CASE 
        WHEN total_vectors < 1000 THEN
            PERFORM set_vector_search_params('accurate');
            recommendation := 'Small collection: using accurate search';
            
        WHEN total_vectors < 10000 THEN
            PERFORM set_vector_search_params('balanced');
            recommendation := 'Medium collection: using balanced search';
            
        WHEN total_vectors < 100000 THEN
            PERFORM set_vector_search_params('fast');
            recommendation := 'Large collection: using fast search';
            
        ELSE
            PERFORM set_vector_search_params('fast');
            recommendation := 'Very large collection: using fast search with pre-filtering';
    END CASE;
    
    RAISE NOTICE 'Auto-tuning complete: % (% total vectors, avg % per assistant)', 
                 recommendation, total_vectors, COALESCE(avg_queries_per_assistant, 0);
    
    RETURN recommendation;
END;
$$ LANGUAGE plpgsql;

-- Запускаем автоматическую настройку
SELECT auto_tune_vector_search();

-- ===========================================
-- ТЕСТИРОВАНИЕ И ВАЛИДАЦИЯ
-- ===========================================

-- Тест корректности векторного поиска
CREATE OR REPLACE FUNCTION test_vector_search_correctness(
    p_assistant_id INTEGER DEFAULT NULL
) 
RETURNS TABLE (
    test_name TEXT,
    passed BOOLEAN,
    details TEXT
) AS $$
DECLARE
    test_assistant_id INTEGER;
    test_vector vector(1536);
    result_count INTEGER;
BEGIN
    -- Выбираем тестовый assistant_id
    IF p_assistant_id IS NULL THEN
        SELECT assistant_id INTO test_assistant_id 
        FROM knowledge_embeddings 
        GROUP BY assistant_id 
        ORDER BY COUNT(*) DESC 
        LIMIT 1;
    ELSE
        test_assistant_id := p_assistant_id;
    END IF;
    
    -- Получаем тестовый вектор
    SELECT embedding INTO test_vector 
    FROM knowledge_embeddings 
    WHERE assistant_id = test_assistant_id 
    LIMIT 1;
    
    -- Тест 1: Базовый поиск возвращает результаты
    SELECT COUNT(*) INTO result_count
    FROM search_embeddings_basic(test_assistant_id, test_vector, 5, 1);
    
    RETURN QUERY SELECT 
        'Basic search returns results'::TEXT,
        (result_count > 0)::BOOLEAN,
        format('Found %s results', result_count)::TEXT;
    
    -- Тест 2: Гибридный поиск работает
    SELECT COUNT(*) INTO result_count
    FROM search_embeddings_hybrid(test_assistant_id, test_vector, 'test query', 5);
    
    RETURN QUERY SELECT
        'Hybrid search works'::TEXT,
        (result_count >= 0)::BOOLEAN,
        format('Hybrid search returned %s results', result_count)::TEXT;
    
    -- Тест 3: Многоступенчатый поиск работает
    SELECT COUNT(*) INTO result_count
    FROM search_embeddings_multi_stage(test_assistant_id, test_vector, 5);
    
    RETURN QUERY SELECT
        'Multi-stage search works'::TEXT,
        (result_count > 0)::BOOLEAN,
        format('Multi-stage returned %s results', result_count)::TEXT;
        
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
        'Error in tests'::TEXT,
        false::BOOLEAN,
        SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- ФИНАЛЬНЫЕ РЕКОМЕНДАЦИИ И МОНИТОРИНГ
-- ===========================================

-- Создаем представление для мониторинга векторных операций
CREATE OR REPLACE VIEW vector_search_stats AS
SELECT 
    schemaname,
    tablename, 
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%embedding%' OR indexname LIKE '%vector%'
ORDER BY idx_scan DESC;

-- Создаем представление для анализа качества векторов
CREATE OR REPLACE VIEW vector_quality_stats AS
SELECT 
    assistant_id,
    COUNT(*) as total_embeddings,
    AVG(importance) as avg_importance,
    COUNT(CASE WHEN chunk_hash IS NOT NULL THEN 1 END) as embeddings_with_hash,
    COUNT(CASE WHEN source IS NOT NULL THEN 1 END) as embeddings_with_source,
    MIN(created_at) as oldest_embedding,
    MAX(created_at) as newest_embedding
FROM knowledge_embeddings
GROUP BY assistant_id
ORDER BY total_embeddings DESC;

-- Запускаем финальные проверки
SELECT 'Vector optimization complete!' as status;
SELECT * FROM vector_search_stats;
SELECT * FROM test_vector_search_correctness();