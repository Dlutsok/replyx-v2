-- 🚀 ДОПОЛНИТЕЛЬНЫЕ ИНДЕКСЫ ДЛЯ ИСПРАВЛЕННЫХ N+1 ЗАПРОСОВ
-- Специальные индексы для оптимизации производительности после рефакторинга

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ /api/admin/users/detailed (исправленный N+1)
-- ============================================================================

-- Составной индекс для быстрого группирования диалогов по пользователям
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_user_stats_optimized 
ON dialogs (user_id, started_at DESC) 
INCLUDE (satisfaction);

-- Составной индекс для быстрого подсчета сообщений по пользователям
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialog_messages_user_count_optimized 
ON dialog_messages (dialog_id) 
INCLUDE (timestamp, sender);

-- Оптимизированный индекс для подсчета ассистентов по пользователям
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_user_count_optimized 
ON assistants (user_id) 
INCLUDE (is_active, created_at);

-- Оптимизированный индекс для подсчета документов по пользователям
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_user_count_optimized 
ON documents (user_id) 
INCLUDE (uploaded_at, file_size);

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ /api/knowledge/confirmed С EAGER LOADING
-- ============================================================================

-- Составной индекс для эффективного JOIN с документами
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_document_join 
ON user_knowledge (user_id, doc_id, assistant_id) 
INCLUDE (type, importance, usage_count, last_used);

-- Оптимизированный индекс для пагинации знаний
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_pagination 
ON user_knowledge (user_id, assistant_id, id DESC) 
INCLUDE (content, doc_type);

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ /api/documents С ПАГИНАЦИЕЙ
-- ============================================================================

-- Оптимизированный индекс для пагинации документов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_user_pagination 
ON documents (user_id, uploaded_at DESC, id) 
INCLUDE (filename, content_type, file_size);

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ УЛУЧШЕНИЯ JOIN ОПЕРАЦИЙ
-- ============================================================================

-- Индекс для быстрого JOIN между диалогами и сообщениями
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_messages_join 
ON dialogs (id, user_id) 
INCLUDE (assistant_id, started_at, ended_at);

-- Индекс для быстрого JOIN между знаниями и документами  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_knowledge_join 
ON documents (id, user_id) 
INCLUDE (filename, content_type);

-- ============================================================================
-- ЧАСТИЧНЫЕ ИНДЕКСЫ ДЛЯ ЧАСТО ИСПОЛЬЗУЕМЫХ ФИЛЬТРОВ
-- ============================================================================

-- Только для активных ассистентов с знаниями
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_active_assistants 
ON user_knowledge (user_id, assistant_id, importance DESC) 
WHERE assistant_id IS NOT NULL;

-- Только для диалогов с сообщениями (исключаем пустые диалоги)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_with_messages 
ON dialogs (user_id, started_at DESC) 
WHERE id IN (SELECT DISTINCT dialog_id FROM dialog_messages);

-- Только для подтвержденных пользователей (для админской панели)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_admin_panel_filter 
ON users (status, created_at DESC) 
WHERE is_email_confirmed = true;

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ АНАЛИТИЧЕСКИХ ЗАПРОСОВ
-- ============================================================================

-- Индекс для быстрого подсчета статистики пользователей
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_stats_aggregation 
ON users (id) 
INCLUDE (status, created_at, is_email_confirmed);

-- Индекс для аналитики диалогов по ассистентам
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_assistant_analytics 
ON dialogs (assistant_id, started_at, satisfaction) 
INCLUDE (user_id, ended_at, auto_response);

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ ПОИСКА И ФИЛЬТРАЦИИ
-- ============================================================================

-- Индекс для поиска пользователей по email/имени в админке
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_admin 
ON users (lower(email), lower(first_name)) 
INCLUDE (status, created_at);

-- Индекс для фильтрации документов по типу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_type_filter 
ON documents (user_id, content_type, uploaded_at DESC) 
INCLUDE (filename, file_size);

-- ============================================================================
-- ОБНОВЛЕНИЕ СТАТИСТИКИ
-- ============================================================================

-- Обновляем статистику для новых индексов
ANALYZE dialogs;
ANALYZE dialog_messages;
ANALYZE user_knowledge;
ANALYZE documents;
ANALYZE users;
ANALYZE assistants;

-- ============================================================================
-- КОММЕНТАРИИ К НОВЫМ ИНДЕКСАМ
-- ============================================================================

COMMENT ON INDEX idx_dialogs_user_stats_optimized IS 'Оптимизация для исправленного N+1 в /api/admin/users/detailed';
COMMENT ON INDEX idx_user_knowledge_document_join IS 'Быстрый JOIN для eager loading в /api/knowledge/confirmed';
COMMENT ON INDEX idx_documents_user_pagination IS 'Эффективная пагинация в /api/documents';
COMMENT ON INDEX idx_user_knowledge_pagination IS 'Оптимизированная пагинация знаний с фильтрацией по ассистенту';