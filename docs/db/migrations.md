# Database Migrations Guide

## Policy

- **Одна фича → одна миграция** (`YYYYMMDDHHMM_short_name.py`)
- **Squash каждые ~10 релизов** — отдельная ADR
- **Обязателен rollback-план** для risk-миграций
- **Idempotency** — все индексы с `IF NOT EXISTS`
- **CONCURRENTLY** для production без блокировок

## Recent Migrations

### 803b93aca2d2_add_critical_performance_indexes.py (2025-08-25)

**Purpose**: Implements critical performance indexes from DatabaseOptimizer analysis

**Tables affected**:
- users (3 indexes)
- assistants (3 indexes)  
- dialogs (5 indexes)
- dialog_messages (4 indexes)
- documents (3 indexes)
- user_knowledge (3 indexes)
- knowledge_embeddings (5 indexes + pgvector IVFFlat)
- bot_instances, ai_token_pool, balance_transactions
- promo_codes, referral_codes, operator_presence, handoff_audit

**Risk level**: Medium-High
- Creates 35+ indexes with CONCURRENTLY
- Includes pgvector extension and IVFFlat index
- Heavy performance impact during creation

**Performance impact**:
- Expected 3-10x improvement in query performance
- Vector search: 2-5s → 50-200ms
- Eliminates N+1 queries in assistants.py

**Rollback plan**: 
```bash
alembic downgrade 202508230001
```
All indexes have IF EXISTS checks for safe removal.

**Monitoring**:
```sql
-- Check index usage after deployment
SELECT indexname, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY idx_tup_read DESC;

-- Check unused indexes
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 202508230001_add_admin_analytics_indexes.py (2025-08-23)

**Purpose**: Analytics indexes for admin dashboard

**Risk level**: Low
- Only analytics queries affected
- CONCURRENTLY creation

### add_critical_indexes_for_operator_messages.py (2025-08-19)

**Purpose**: Critical indexes for operator message sending

**Risk level**: Low  
- Focused on Telegram bot operations

## Deployment Checklist

### Pre-deployment
- [ ] Full database backup
- [ ] Test on staging environment
- [ ] Verify available disk space (indexes ~20-30% of table size)
- [ ] Schedule deployment during off-peak hours
- [ ] Monitor system resources

### During deployment
- [ ] Monitor database locks: `SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock'`
- [ ] Monitor disk I/O and CPU usage
- [ ] Check index creation progress: `SELECT * FROM pg_stat_progress_create_index`

### Post-deployment
- [ ] Verify all indexes created: `\di idx_*` in psql
- [ ] Run ANALYZE on affected tables
- [ ] Check query performance with EXPLAIN ANALYZE
- [ ] Monitor pg_stat_user_indexes for usage
- [ ] Update monitoring dashboards

## Common Operations

```bash
# Check current migration state
alembic current

# Show migration history  
alembic history --verbose

# Dry-run migration (requires --sql)
alembic upgrade head --sql > migration_preview.sql

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade 202508230001
```
