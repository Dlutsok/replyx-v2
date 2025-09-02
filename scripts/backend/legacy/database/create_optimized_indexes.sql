-- Оптимизированные индексы для ChatAI MVP 9
-- Выполнять с CONCURRENTLY в production для избежания блокировок

-- ===========================================
-- КРИТИЧЕСКИ ВАЖНЫЕ ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ===========================================

-- 1. USERS TABLE - основа всей системы
-- Индекс для быстрого поиска активных пользователей по email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON users(email) WHERE status = 'active';

-- Индекс для поиска пользователей с подтвержденной почтой
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_confirmed 
ON users(is_email_confirmed, email) WHERE is_email_confirmed = true;

-- Индекс для сброса паролей
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_password_reset 
ON users(password_reset_token, password_reset_expires) 
WHERE password_reset_token IS NOT NULL;

-- 2. ASSISTANTS TABLE - ключевая сущность
-- Основной индекс для загрузки ассистентов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_user_active_created 
ON assistants(user_id, is_active, created_at DESC) WHERE is_active = true;

-- Индекс для поиска всех ассистентов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_user_id_created 
ON assistants(user_id, created_at DESC);

-- Индекс для website integration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assistants_website_integration 
ON assistants(user_id, website_integration_enabled) 
WHERE website_integration_enabled = true;

-- 3. DIALOGS TABLE - высоконагруженная таблица
-- Главный индекс для загрузки диалогов ассистента
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_assistant_started 
ON dialogs(assistant_id, started_at DESC);

-- Индекс для поиска диалогов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_user_started 
ON dialogs(user_id, started_at DESC);

-- Индекс для активных диалогов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_active 
ON dialogs(user_id, assistant_id, started_at DESC) WHERE ended_at IS NULL;

-- Индекс для handoff операций
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_handoff_status 
ON dialogs(handoff_status, handoff_requested_at) 
WHERE handoff_status != 'none';

-- Индекс для Telegram диалогов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_telegram_chat_id 
ON dialogs(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- Индекс для guest диалогов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_guest_id 
ON dialogs(guest_id) WHERE guest_id IS NOT NULL;

-- 4. DIALOG_MESSAGES TABLE - самая нагруженная таблица
-- Основной индекс для загрузки сообщений диалога (КРИТИЧЕСКИЙ!)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_dialog_timestamp 
ON dialog_messages(dialog_id, timestamp DESC);

-- Индекс для поиска сообщений ассистента
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_timestamp 
ON dialog_messages(sender, timestamp DESC);

-- Индекс для handoff сообщений
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_handoff_kind 
ON dialog_messages(message_kind, dialog_id, timestamp DESC) 
WHERE message_kind IN ('operator', 'system');

-- Составной индекс для статистики по ассистентам (устраняет N+1)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_dialog_sender_timestamp 
ON dialog_messages(dialog_id, sender, timestamp DESC);

-- 5. DOCUMENTS TABLE - файлы пользователей
-- Основной индекс для загрузки документов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_user_upload_date 
ON documents(user_id, upload_date DESC);

-- Индекс для поиска документов по хешу (дедупликация)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_doc_hash 
ON documents(doc_hash) WHERE doc_hash IS NOT NULL;

-- Индекс для поиска документов по имени файла
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_filename_user 
ON documents(user_id, filename);

-- 6. USER_KNOWLEDGE TABLE - связь документов с ассистентами
-- Критический индекс для RAG системы
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_assistant_importance 
ON user_knowledge(assistant_id, importance DESC, last_used DESC NULLS LAST);

-- Индекс для поиска знаний пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_user_doc 
ON user_knowledge(user_id, doc_id, assistant_id);

-- Индекс для часто используемых знаний
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_usage 
ON user_knowledge(assistant_id, usage_count DESC, last_used DESC) 
WHERE usage_count > 0;

-- 7. KNOWLEDGE_EMBEDDINGS TABLE - векторные эмбеддинги (КРИТИЧЕСКИЙ ДЛЯ RAG!)
-- Pre-filtering индекс для векторного поиска
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_assistant_importance 
ON knowledge_embeddings(assistant_id, importance DESC, created_at DESC);

-- Индекс для поиска по пользователю и ассистенту
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_user_assistant 
ON knowledge_embeddings(user_id, assistant_id, importance DESC);

-- Индекс для инкрементальной индексации
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_chunk_hash 
ON knowledge_embeddings(chunk_hash) WHERE chunk_hash IS NOT NULL;

-- Индекс по источнику эмбеддингов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_embeddings_source 
ON knowledge_embeddings(source, assistant_id) WHERE source IS NOT NULL;

-- ВЕКТОРНЫЙ ИНДЕКС (требует pgvector extension)
-- IVFFlat индекс для быстрого векторного поиска
-- Количество lists = sqrt(количество строк), оптимально для 100k записей
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_embeddings_ivfflat 
ON knowledge_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 316);

-- 8. BOT_INSTANCES TABLE - Telegram боты
-- Индекс для поиска активных ботов пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bot_instances_user_active 
ON bot_instances(user_id, is_active, platform) WHERE is_active = true;

-- Индекс для поиска ботов ассистента
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bot_instances_assistant_active 
ON bot_instances(assistant_id, is_active) WHERE is_active = true;

-- 9. AI_TOKEN_POOL TABLE - управление токенами
-- Индекс для балансировки нагрузки токенов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_tokens_active_priority 
ON ai_token_pool(is_active, priority ASC, last_used ASC) WHERE is_active = true;

-- Индекс для мониторинга использования токенов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_tokens_usage_reset 
ON ai_token_pool(current_daily_usage, daily_limit, last_reset_daily);

-- 10. BALANCE_TRANSACTIONS TABLE - биллинг
-- Основной индекс для истории транзакций пользователя
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balance_transactions_user_date 
ON balance_transactions(user_id, created_at DESC);

-- Индекс для поиска по типу транзакций
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_balance_transactions_type_date 
ON balance_transactions(transaction_type, created_at DESC);

-- 11. PROMO_CODES TABLE - промокоды
-- Индекс для поиска активных промокодов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promo_codes_active 
ON promo_codes(code, is_active, expires_at) WHERE is_active = true;

-- 12. REFERRAL_CODES TABLE - реферальная система
-- Индекс для поиска реферального кода
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referral_codes_code 
ON referral_codes(code, user_id);

-- 13. OPERATOR_PRESENCE TABLE - операторы
-- Индекс для поиска доступных операторов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_presence_status 
ON operator_presence(status, last_heartbeat DESC, active_chats) 
WHERE status = 'online';

-- 14. HANDOFF_AUDIT TABLE - аудит handoff операций
-- Индекс для аудита по диалогу
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_handoff_audit_dialog_seq 
ON handoff_audit(dialog_id, seq ASC);

-- Индекс для поиска по request_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_handoff_audit_request_id 
ON handoff_audit(request_id) WHERE request_id IS NOT NULL;

-- ===========================================
-- ДОПОЛНИТЕЛЬНЫЕ ИНДЕКСЫ ДЛЯ АНАЛИТИКИ
-- ===========================================

-- Аналитика по сообщениям за период
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_analytics_date 
ON dialog_messages(timestamp::date, sender);

-- Аналитика по диалогам
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dialogs_analytics_date 
ON dialogs(started_at::date, user_id, assistant_id);

-- Аналитика по документам
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_analytics_date 
ON documents(upload_date::date, user_id);

-- ===========================================
-- НАСТРОЙКИ PGVECTOR ДЛЯ ОПТИМАЛЬНОГО ПОИСКА
-- ===========================================

-- Настройки для IVFFlat (выполнить в сессии перед векторным поиском)
-- SET ivfflat.probes = 10;  -- Баланс между скоростью и точностью

-- Для быстрого поиска (менее точный):
-- SET ivfflat.probes = 1;

-- Для точного поиска (медленнее):  
-- SET ivfflat.probes = 20;

-- ===========================================
-- МОНИТОРИНГ ЭФФЕКТИВНОСТИ ИНДЕКСОВ
-- ===========================================

-- Запрос для проверки использования индексов
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
*/

-- Запрос для поиска неиспользуемых индексов
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
    AND indexrelid NOT IN (
        SELECT indexrelid FROM pg_constraint WHERE contype IN ('p','u')
    )
ORDER BY pg_relation_size(indexrelid) DESC;
*/

-- ===========================================
-- РЕКОМЕНДАЦИИ ПО ПРИМЕНЕНИЮ
-- ===========================================

-- 1. Выполнять индексы CONCURRENTLY в production
-- 2. Мониторить нагрузку на диск во время создания
-- 3. Проверить использование после внедрения
-- 4. Удалить неиспользуемые индексы через месяц
-- 5. Настроить автоматический VACUUM ANALYZE

-- Автоматический анализ статистики после создания индексов
ANALYZE;