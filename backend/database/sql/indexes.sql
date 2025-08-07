-- 🚀 ОПТИМИЗАЦИЯ ИНДЕКСОВ ДЛЯ ChatAI PRODUCTION
-- Индексы для повышения производительности часто используемых запросов

-- ============================================================================
-- ПОЛЬЗОВАТЕЛИ (users)
-- ============================================================================

-- Индекс для поиска по email (уникальный)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users (email);

-- Индекс для фильтрации по статусу и роли
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status_role 
ON users (status, role);

-- Индекс для поиска активных пользователей
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_activity 
ON users (status, last_activity) 
WHERE status = 'active';

-- Индекс для OAuth интеграций
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_google_id 
ON users (google_id) 
WHERE google_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_yandex_id 
ON users (yandex_id) 
WHERE yandex_id IS NOT NULL;

-- ============================================================================
-- АССИСТЕНТЫ (assistants)
-- ============================================================================

-- Индекс для получения ассистентов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_user_active 
ON assistants (user_id, is_active);

-- Индекс для поиска по модели AI
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_ai_model 
ON assistants (ai_model);

-- Индекс для сортировки по дате создания
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_created_at 
ON assistants (created_at DESC);

-- ============================================================================
-- ДИАЛОГИ (dialogs)
-- ============================================================================

-- Индекс для получения диалогов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_user_started 
ON dialogs (user_id, started_at DESC);

-- Индекс для диалогов ассистента
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_assistant_started 
ON dialogs (assistant_id, started_at DESC);

-- Индекс для Telegram диалогов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_telegram_chat 
ON dialogs (telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;

-- Индекс для веб диалогов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_guest_id 
ON dialogs (guest_id) 
WHERE guest_id IS NOT NULL;

-- Индекс для поиска по рейтингу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_satisfaction 
ON dialogs (satisfaction) 
WHERE satisfaction IS NOT NULL;

-- Индекс для активных диалогов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_active 
ON dialogs (user_id, ended_at) 
WHERE ended_at IS NULL;

-- ============================================================================
-- СООБЩЕНИЯ ДИАЛОГОВ (dialog_messages)
-- ============================================================================

-- Индекс для получения сообщений диалога
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialog_messages_dialog_timestamp 
ON dialog_messages (dialog_id, timestamp);

-- Индекс для поиска по отправителю
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialog_messages_sender 
ON dialog_messages (sender, timestamp);

-- Индекс для рассылок
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialog_messages_broadcast 
ON dialog_messages (broadcast_id) 
WHERE broadcast_id IS NOT NULL;

-- Индекс для полнотекстового поиска (если нужен)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialog_messages_text_gin 
-- ON dialog_messages USING gin(to_tsvector('russian', text));

-- ============================================================================
-- БАЗЫ ЗНАНИЙ (user_knowledge)
-- ============================================================================

-- Индекс для получения знаний пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_user_assistant 
ON user_knowledge (user_id, assistant_id);

-- Индекс для поиска по документу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_doc_id 
ON user_knowledge (doc_id);

-- Индекс для сортировки по важности
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_importance 
ON user_knowledge (importance DESC, last_used DESC);

-- Индекс для статистики использования
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_usage 
ON user_knowledge (usage_count DESC, last_used DESC);

-- ============================================================================
-- ДОКУМЕНТЫ (documents)
-- ============================================================================

-- Индекс для получения документов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_user_uploaded 
ON documents (user_id, uploaded_at DESC);

-- Индекс для поиска по типу файла
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_content_type 
ON documents (content_type);

-- Индекс для поиска по размеру
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_file_size 
ON documents (file_size);

-- ============================================================================
-- БОТЫ (bot_instances)
-- ============================================================================

-- Индекс для получения ботов пользователя (через ассистента)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bot_instances_assistant_active 
ON bot_instances (assistant_id, is_active);

-- Индекс для поиска по платформе
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bot_instances_platform 
ON bot_instances (platform, is_active);

-- Индекс для пользователя (если есть прямая связь)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bot_instances_user_id 
ON bot_instances (user_id) 
WHERE user_id IS NOT NULL;

-- ============================================================================
-- AI ТОКЕНЫ (ai_tokens)
-- ============================================================================

-- Индекс для активных токенов по приоритету
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_tokens_active_priority 
ON ai_tokens (is_active, priority DESC) 
WHERE is_active = true;

-- Индекс для поиска по модели
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_tokens_model_access 
ON ai_tokens (model_access);





-- ============================================================================
-- РАССЫЛКИ (broadcasts)
-- ============================================================================

-- Индекс для получения рассылок пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_broadcasts_user_created 
ON broadcasts (user_id, created_at DESC);

-- Индекс для статистики прочтения
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_broadcast_reads_broadcast_user 
ON broadcast_reads (broadcast_id, user_id);

-- ============================================================================
-- СОСТАВНЫЕ ИНДЕКСЫ ДЛЯ СЛОЖНЫХ ЗАПРОСОВ
-- ============================================================================

-- Индекс для аналитики диалогов по дате и пользователю
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_analytics 
ON dialogs (user_id, started_at, satisfaction, assistant_id) 
WHERE started_at IS NOT NULL;

-- Индекс для статистики сообщений по месяцам
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialog_messages_monthly_stats 
ON dialog_messages (
    date_trunc('month', timestamp), 
    sender
) WHERE sender IN ('user', 'assistant');

-- Индекс для поиска активных диалогов с сообщениями
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_dialogs_with_messages 
ON dialogs (user_id, assistant_id, started_at) 
WHERE ended_at IS NULL;

-- ============================================================================
-- ЧАСТИЧНЫЕ ИНДЕКСЫ ДЛЯ ЭКОНОМИИ МЕСТА
-- ============================================================================

-- Только для подтвержденных пользователей
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_confirmed_active 
ON users (email, last_activity) 
WHERE is_email_confirmed = true AND status = 'active';

-- Только для диалогов с рейтингом
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_rated 
ON dialogs (user_id, satisfaction, started_at) 
WHERE satisfaction IS NOT NULL;

-- ============================================================================
-- ИНДЕКСЫ ДЛЯ МОНИТОРИНГА И ЛОГИРОВАНИЯ
-- ============================================================================

-- Индекс для мониторинга активности пользователей
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_activity_monitoring 
ON users (last_activity, status);

-- Индекс для анализа использования ассистентов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_usage_analysis 
ON assistants (ai_model, created_at, is_active);

-- ============================================================================
-- ОБНОВЛЕНИЕ СТАТИСТИКИ ПОСЛЕ СОЗДАНИЯ ИНДЕКСОВ
-- ============================================================================

-- Обновляем статистику таблиц для лучшего планирования запросов
ANALYZE users;
ANALYZE assistants;
ANALYZE dialogs;
ANALYZE dialog_messages;
ANALYZE user_knowledge;
ANALYZE documents;
ANALYZE bot_instances;
ANALYZE ai_tokens;

ANALYZE broadcasts;
ANALYZE broadcast_reads;

-- ============================================================================
-- КОММЕНТАРИИ К ИНДЕКСАМ
-- ============================================================================

COMMENT ON INDEX idx_users_email IS 'Уникальный индекс для быстрого поиска пользователей по email';
COMMENT ON INDEX idx_dialogs_user_started IS 'Индекс для получения диалогов пользователя с сортировкой по дате';
COMMENT ON INDEX idx_dialog_messages_dialog_timestamp IS 'Индекс для быстрого получения сообщений диалога';
COMMENT ON INDEX idx_user_knowledge_user_assistant IS 'Индекс для получения базы знаний пользователя/ассистента';
COMMENT ON INDEX idx_assistants_user_active IS 'Индекс для получения активных ассистентов пользователя';