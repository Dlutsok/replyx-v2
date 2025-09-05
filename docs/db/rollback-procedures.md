# Database Optimization Rollback Procedures
## ReplyX - Emergency Recovery Guide

**Created**: 2025-08-25  
**Version**: 1.0  
**Priority**: CRITICAL  

---

## 🚨 Emergency Contacts

**Before executing any rollback**, notify:
- **Database Team Lead**: Immediate notification
- **Backend Team Lead**: Code-related rollbacks
- **DevOps Team Lead**: Infrastructure issues
- **Product Owner**: Business impact assessment

### Emergency Communication
- **Slack**: #replyx-emergency
- **Email**: emergency-db@replyx.com
- **Phone**: [Emergency Hotline]

---

## 📋 Rollback Decision Matrix

### When to Execute Rollback

| Severity | Trigger | Response Time | Approval Required |
|----------|---------|---------------|-------------------|
| **CRITICAL** | Data corruption, >90% API errors | Immediate (0-5 min) | Executive approval |
| **HIGH** | Performance degradation >300% | Fast (5-15 min) | Team Lead approval |
| **MEDIUM** | Single feature failures | Standard (15-60 min) | Developer approval |
| **LOW** | Minor performance issues | Planned (next window) | Standard process |

---

## 🔄 Phase-Specific Rollback Procedures

### PHASE 1: Critical Indexes & N+1 Fixes

#### **Rollback Level 1: Code Deployment (2-5 minutes)**
```bash
# 1. Immediate API rollback
cd /Users/dan/Documents/chatAI/MVP 11/backend
git log --oneline -5  # Identify last stable commit
git checkout [LAST_STABLE_COMMIT_HASH]

# 2. Restart services
pm2 reload replyx-backend
systemctl restart nginx

# 3. Verify rollback success
curl -f http://localhost:8000/health
python3 -c "import requests; print(requests.get('http://localhost:8000/api/health').status_code)"
```

#### **Rollback Level 2: Index Removal (5-15 minutes)**
```sql
-- Check current running queries before rollback
SELECT pid, state, query, query_start 
FROM pg_stat_activity 
WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%';

-- Execute Alembic rollback (RECOMMENDED - maintains state consistency)
-- This will run the downgrade() method from the migration
```bash
cd /Users/dan/Documents/chatAI/MVP 11/backend
alembic downgrade 202508230001
```

-- OR manual index removal if Alembic fails (EMERGENCY ONLY)
```sql
-- CRITICAL: Remove pgvector index first (can cause locks)
DROP INDEX CONCURRENTLY IF EXISTS idx_knowledge_embeddings_ivfflat;

-- Remove performance-critical indexes  
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_dialog_timestamp;
DROP INDEX CONCURRENTLY IF EXISTS idx_assistants_user_active_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_dialogs_assistant_started;
DROP INDEX CONCURRENTLY IF EXISTS idx_embeddings_assistant_importance;

-- Remove remaining critical indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_documents_user_upload_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_knowledge_assistant_importance;

-- Verify index removal
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

#### **Migration-specific Rollback (803b93aca2d2)**
```bash
# Specific rollback for critical performance indexes migration
# This migration creates 35+ indexes and pgvector extension

# 1. Check migration status
alembic current
# Should show: 803b93aca2d2 (head)

# 2. Execute controlled rollback
alembic downgrade 202508230001

# 3. Verify rollback success
psql $DATABASE_URL -c "
SELECT COUNT(*) as remaining_idx_count 
FROM pg_indexes 
WHERE indexname LIKE 'idx_users_email_active%' 
   OR indexname LIKE 'idx_assistants_user_active%'
   OR indexname LIKE 'idx_knowledge_embeddings_ivfflat%';
"
# Should return: remaining_idx_count | 0

# 4. Check pgvector extension status
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
# Extension will remain (safe to keep)

# 5. Verify critical queries still work (may be slower)
psql $DATABASE_URL -c "
SELECT COUNT(*) FROM dialog_messages WHERE dialog_id = 1;
SELECT COUNT(*) FROM assistants WHERE user_id = 1;
"
```

#### **Rollback Level 3: Full Database Restore (30-60 minutes)**
```bash
# ONLY in case of data corruption or critical schema issues
# This is the LAST RESORT option

# 1. Stop all application services
pm2 stop all
systemctl stop nginx

# 2. Create current state backup (for forensic analysis)
pg_dump $DATABASE_URL > backups/failed_state_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Restore from pre-optimization backup
pg_restore --clean --if-exists --dbname=$DATABASE_URL backups/pre_optimization_backup.sql

# 4. Verify database integrity
psql $DATABASE_URL -c "SELECT version();"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM assistants;"

# 5. Restart services
pm2 start all
systemctl start nginx

# 6. Full system health check
bash scripts/health_check_full.sh
```

### PHASE 2: Vector Optimization Rollback

#### **Vector Index Rollback (10-30 minutes)**
```sql
-- Remove vector indexes safely
DROP INDEX CONCURRENTLY IF EXISTS idx_knowledge_embeddings_ivfflat;
DROP INDEX CONCURRENTLY IF EXISTS idx_knowledge_embeddings_hnsw;

-- Reset vector search configuration to defaults
SELECT set_vector_search_params('default');

-- Verify vector search still works (may be slower)
SELECT id, similarity_score 
FROM search_embeddings_simple('test query', 5, NULL)
LIMIT 1;
```

#### **pgvector Configuration Rollback**
```sql
-- Reset all pgvector optimizations to safe defaults
ALTER SYSTEM RESET shared_preload_libraries;
ALTER SYSTEM RESET max_connections;
ALTER SYSTEM RESET work_mem;

-- Restart PostgreSQL (requires maintenance window)
-- systemctl restart postgresql
```

### PHASE 3: Migration Consolidation Rollback

#### **Migration State Rollback**
```bash
# 1. Identify current migration state
alembic current
alembic history --verbose

# 2. Rollback to pre-consolidation state
alembic downgrade [PRE_CONSOLIDATION_MIGRATION_ID]

# 3. Verify database schema integrity
python3 scripts/database/validate_schema.py

# 4. Regenerate migration files if needed
rm alembic/versions/consolidated_*.py
alembic revision --autogenerate -m "Restore original migrations"
```

### PHASE 4: Monitoring & Scaling Rollback

#### **Monitoring Rollback**
```bash
# Stop performance monitoring
pkill -f monitor_performance.py

# Remove monitoring tables/views if they cause issues
psql $DATABASE_URL -c "DROP VIEW IF EXISTS performance_metrics CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS query_performance_log CASCADE;"
```

#### **Connection Pooling Rollback**
```python
# Revert connection pool settings in database/connection.py
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,  # Back to simple connection handling
    pool_pre_ping=False
)
```

---

## 🔍 Post-Rollback Validation

### Immediate Checks (0-5 minutes)
```bash
# 1. Application health
curl -f http://localhost:8000/health

# 2. Database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# 3. Critical API endpoints
curl -f http://localhost:8000/api/assistants/stats
curl -f http://localhost:8000/api/dialogs/recent

# 4. Telegram bot functionality
curl -X POST http://localhost:8000/api/webhooks/telegram/test_bot
```

### Comprehensive Validation (5-15 minutes)
```python
# Execute validation script
python3 scripts/database/validate_rollback.py --full

# Expected outputs:
# ✅ Database connection: OK
# ✅ Core tables accessible: OK  
# ✅ API endpoints responding: OK
# ✅ Telegram webhooks: OK
# ✅ File uploads: OK
# ✅ User authentication: OK
```

### Performance Baseline Re-establishment (15-30 minutes)
```bash
# Run performance benchmarks to establish new baseline
python3 scripts/database/benchmark_performance.py --duration 10

# Compare with pre-optimization metrics
python3 scripts/database/compare_baselines.py \
    --before backups/pre_optimization_metrics.json \
    --current current_metrics.json
```

---

## 📊 Rollback Success Criteria

### Technical Criteria
- [ ] All API endpoints respond within 5 seconds
- [ ] Database queries execute without errors
- [ ] No critical errors in application logs
- [ ] Telegram bots send/receive messages successfully
- [ ] User authentication works properly
- [ ] File upload/download functional

### Business Criteria  
- [ ] User complaints decrease within 1 hour
- [ ] Support ticket volume returns to normal
- [ ] Revenue-generating features operational
- [ ] No data loss reported
- [ ] System uptime restored to >99%

---

## 🚨 Escalation Procedures

### Rollback Failure - Level 1
**If basic rollback fails:**
1. **Immediate Action**: Contact Database Team Lead
2. **Timeline**: 15 minutes to assess
3. **Options**: 
   - Alternative rollback strategy
   - Partial system restoration
   - External vendor support

### Rollback Failure - Level 2
**If database restore fails:**
1. **Immediate Action**: Contact DevOps + Database leads
2. **Timeline**: 30 minutes emergency meeting
3. **Options**:
   - Cloud backup restoration
   - Disaster recovery site activation
   - Emergency maintenance mode

### Rollback Failure - Level 3
**If complete system failure:**
1. **Immediate Action**: Contact Executive Team
2. **Timeline**: Executive decision within 1 hour
3. **Options**:
   - Full disaster recovery
   - Customer communication plan
   - External crisis management

---

## 📝 Incident Documentation

### Rollback Incident Report Template
```markdown
# Database Rollback Incident Report

**Incident ID**: DB-ROLLBACK-[YYYYMMDD-HHMMSS]
**Date**: [Date]
**Duration**: [Start time] - [End time]
**Severity**: [CRITICAL/HIGH/MEDIUM/LOW]

## Trigger Event
- **What happened**: 
- **When detected**: 
- **Detection method**: 
- **Initial symptoms**: 

## Rollback Actions Taken
- **Phase affected**: 
- **Rollback level executed**: 
- **Commands executed**: 
- **Time to restore**: 

## Impact Assessment
- **Users affected**: 
- **Services impacted**: 
- **Data loss**: [Yes/No + details]
- **Revenue impact**: 

## Lessons Learned
- **Root cause**: 
- **Prevention measures**: 
- **Process improvements**: 
- **Documentation updates needed**: 

## Follow-up Actions
- [ ] Post-incident review scheduled
- [ ] Process documentation updated  
- [ ] Team training planned
- [ ] Monitoring improvements implemented
```

---

## 🔧 Rollback Tools & Scripts

### Essential Scripts Locations
```bash
# Core rollback scripts
/backend/scripts/database/rollback_indexes.sql
/backend/scripts/database/rollback_migrations.py
/backend/scripts/database/validate_rollback.py
/backend/scripts/database/emergency_restore.sh

# Monitoring scripts
/backend/scripts/database/check_system_health.py
/backend/scripts/database/benchmark_performance.py
/backend/scripts/database/compare_baselines.py

# Emergency contact lists
/backend/docs/emergency_contacts.json
/backend/docs/escalation_matrix.json
```

### Pre-configured Rollback Commands
```bash
# Create emergency rollback alias
alias emergency-rollback-phase1="cd /path/to/backend && git checkout main && pm2 reload replyx-backend"
alias emergency-rollback-indexes="psql \$DATABASE_URL -f scripts/database/rollback_indexes.sql"
alias emergency-health-check="python3 scripts/database/validate_rollback.py --quick"
```

---

## 📞 Communication Templates

### Internal Team Notification
```
🚨 DATABASE ROLLBACK IN PROGRESS 🚨

Phase: [Phase Number]
Severity: [Level]
ETA to resolution: [Time]
Current status: [Brief status]

Actions taken:
- [Action 1]
- [Action 2]

Next update: [Time]
Contact: [Lead name] in #replyx-emergency
```

### Customer Communication (if needed)
```
ReplyX Service Update

We are currently experiencing technical difficulties and are working to restore full service. 

Impact: [Brief description]
Estimated resolution: [Time]
Workaround: [If available]

We will update you every 30 minutes until resolved.
Thank you for your patience.
```

---

## ✅ Rollback Testing

### Monthly Rollback Drill Schedule
- **Week 1**: Phase 1 rollback simulation
- **Week 2**: Phase 2 rollback simulation  
- **Week 3**: Phase 3 rollback simulation
- **Week 4**: Full system rollback drill

### Rollback Drill Checklist
- [ ] Test environment prepared
- [ ] Team notification sent
- [ ] Rollback procedures executed
- [ ] Performance verified
- [ ] Documentation updated
- [ ] Lessons learned captured
- [ ] Next drill scheduled

---

**Remember**: The best rollback is one you never need. Always test thoroughly in staging, plan carefully, and have multiple checkpoint validations before production deployment.

**Document Version**: 1.0  
**Last Updated**: 2025-08-25  
**Next Review**: 2025-09-25  
**Owner**: Database Optimization Team