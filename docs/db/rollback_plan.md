# Database Rollback Plan - ReplyX MVP 13

**Last Updated:** 2025-09-14
**Version:** v1.3 - Production Ready
**Priority:** CRITICAL

Comprehensive rollback procedures for ReplyX database operations, migration failures, and emergency recovery scenarios.

## Quick Reference

### Emergency Contacts
- **Primary:** Database Team Lead
- **Secondary:** Backend Team Lead
- **Escalation:** DevOps + Product Owner
- **Communication:** #replyx-emergency (Slack)

### Immediate Actions (First 5 minutes)
```bash
# Health check
curl -f http://localhost:8000/health

# Database connectivity test
psql $DATABASE_URL -c "SELECT 1;"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

## Rollback Decision Matrix

| Issue Severity | Response Time | Rollback Type | Approval Required |
|---------------|--------------|---------------|-------------------|
| **CRITICAL** - Data corruption, >90% API failures | 0-5 minutes | Immediate code rollback | Executive |
| **HIGH** - Performance degradation >300% baseline | 5-15 minutes | Migration rollback | Team Lead |
| **MEDIUM** - Single feature failures | 15-60 minutes | Selective rollback | Developer |
| **LOW** - Minor performance issues | Next window | Planned rollback | Standard |

## Migration Rollback Procedures

### Current Migration Status
```bash
# Check current migration state
alembic current
alembic history --verbose

# Expected current head: 8 production migrations completed
# Latest: a1b2c3d4e5f6 (widget version field)
```

### Rollback by Migration ID

#### 1. Widget Version Rollback (Latest Migration)
```bash
# Rollback widget_version field addition
alembic downgrade fb3228f45466
```

#### 2. pgvector Performance Indexes Rollback
```bash
# CRITICAL: This rollback removes vector search optimization
# Impact: Vector search will be slower but still functional
alembic downgrade c4132f66258f

# Verify vector extension remains
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

#### 3. Complete Performance Indexes Rollback
```bash
# Remove all performance optimization indexes
alembic downgrade 165e5d314eaf

# WARNING: This will significantly impact performance
# All 30+ production indexes will be removed
```

#### 4. Full Schema Rollback to Baseline
```bash
# Nuclear option: Return to initial baseline schema
# DATA LOSS POSSIBLE - Create backup first!
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Rollback to initial migration
alembic downgrade 66ea5c9e3d91
```

### Manual Index Rollback (Emergency Only)

**Use only if Alembic rollback fails**

```sql
-- Remove critical performance indexes manually
DROP INDEX CONCURRENTLY IF EXISTS knowledge_embeddings_embedding_cosine_idx;
DROP INDEX CONCURRENTLY IF EXISTS idx_ai_token_usage_user_created;
DROP INDEX CONCURRENTLY IF EXISTS ix_knowledge_embeddings_user_assistant;
DROP INDEX CONCURRENTLY IF EXISTS ix_dialog_messages_dialog_id;
DROP INDEX CONCURRENTLY IF EXISTS ix_balance_transactions_user_created;

-- Verify removal
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexname LIKE 'idx_%' OR indexname LIKE 'ix_%'
ORDER BY tablename;
```

## Application Rollback Procedures

### 1. Code Deployment Rollback (2-5 minutes)
```bash
# Change to backend directory
cd /Users/dan/Documents/chatAI/MVP\ 13/backend

# Identify last stable commit
git log --oneline -10

# Rollback to known stable version
git checkout [STABLE_COMMIT_HASH]

# Restart backend service
# Option 1: systemd
sudo systemctl restart chatai-backend

# Option 2: PM2
pm2 reload replyx-backend

# Option 3: Manual restart
pkill -f "python.*main.py"
python3 main.py &

# Verify rollback success
curl -f http://localhost:8000/health
```

### 2. Configuration Rollback
```bash
# Restore previous configuration
cp .env.backup .env

# Restore database connection settings
export DATABASE_URL="[PREVIOUS_URL]"

# Verify configuration
python3 -c "from core.app_config import DATABASE_URL; print(DATABASE_URL)"
```

### 3. Dependencies Rollback
```bash
# If requirements.txt was updated, rollback
git checkout HEAD~1 -- requirements.txt
pip install -r requirements.txt

# Virtual environment rollback (if needed)
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Workers Rollback Procedures

### Bot Workers Rollback
```bash
# Check worker status
curl http://localhost:3001/status

# Rollback workers directory
cd /Users/dan/Documents/chatAI/MVP\ 13/workers
git checkout [STABLE_COMMIT]

# Restart bot manager
pkill -f "scalable_bot_manager"
npm start &

# Or using PM2
pm2 restart chatai-bot-manager

# Verify workers health
ps aux | grep bot_worker | wc -l
```

### Worker Configuration Rollback
```bash
# Restore previous worker config
cp config/production.json.backup config/production.json

# Restart with clean state
pkill -f "bot_worker"
npm run clean-restart
```

## Data Recovery Procedures

### 1. Database Backup Restoration
```bash
# Stop all services first
sudo systemctl stop chatai-backend
sudo systemctl stop chatai-bot-manager

# Create forensic backup of current state
pg_dump $DATABASE_URL > forensic_backup_$(date +%Y%m%d_%H%M%S).sql

# List available backups
ls -la backups/ | grep ".sql"

# Restore from backup (DESTRUCTIVE - all current data lost)
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'chatai' AND pid <> pg_backend_pid();"
dropdb chatai
createdb chatai
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql chatai < backups/[BACKUP_FILE].sql

# Restart services
sudo systemctl start chatai-backend
sudo systemctl start chatai-bot-manager
```

### 2. Partial Data Recovery
```bash
# Restore specific tables only
# Example: Restore users table only
pg_restore -t users --data-only backups/backup.sql | psql $DATABASE_URL

# Restore schema without data
pg_restore --schema-only backups/backup.sql | psql $DATABASE_URL
```

### 3. Point-in-Time Recovery (if WAL enabled)
```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore base backup
cp -R /backups/base/* /var/lib/postgresql/14/main/

# Create recovery configuration
cat > /var/lib/postgresql/14/main/recovery.signal

# Start PostgreSQL in recovery mode
sudo systemctl start postgresql

# Verify recovery
psql $DATABASE_URL -c "SELECT pg_is_in_recovery();"
```

## Validation & Testing

### Post-Rollback Validation Checklist

#### Immediate Checks (0-5 minutes)
```bash
# 1. System Health
curl -f http://localhost:8000/health
echo $? # Should be 0

# 2. Database Connectivity
psql $DATABASE_URL -c "SELECT version();"

# 3. Critical API Endpoints
curl -f http://localhost:8000/api/users/profile
curl -f http://localhost:8000/api/assistants
curl -f http://localhost:8000/api/dialogs

# 4. Authentication
curl -X POST http://localhost:8000/api/login -d '{"email":"test@example.com","password":"testpass"}'

# 5. Bot Workers
curl http://localhost:3001/status
```

#### Comprehensive Testing (5-30 minutes)
```python
# Run comprehensive validation script
python3 scripts/validate_rollback.py --full

# Expected output:
# ✅ Database connection: OK
# ✅ Core tables accessible: OK
# ✅ API endpoints responding: OK
# ✅ Authentication working: OK
# ✅ Bot workers active: OK
# ✅ File uploads functional: OK
# ✅ AI integration working: OK
```

#### Performance Validation
```bash
# Basic performance test
time psql $DATABASE_URL -c "SELECT COUNT(*) FROM dialog_messages;"
time psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
time psql $DATABASE_URL -c "SELECT COUNT(*) FROM assistants;"

# Load test (optional)
python3 scripts/load_test_basic.py --duration 60
```

### Success Criteria

**Technical Requirements:**
- [ ] All health checks pass
- [ ] API response times < 2 seconds
- [ ] Database queries execute without errors
- [ ] No critical errors in logs (last 10 minutes)
- [ ] Authentication/authorization working
- [ ] Bot workers responding to messages
- [ ] File upload/download functional

**Business Requirements:**
- [ ] Users can create assistants
- [ ] Users can send/receive messages
- [ ] Admin dashboard accessible
- [ ] Payment processing working
- [ ] No active user complaints
- [ ] System uptime > 99.5%

## Emergency Escalation

### Level 1: Technical Team (0-15 minutes)
- **Trigger:** Rollback doesn't resolve primary issue
- **Action:** Engage Database + Backend team leads
- **Timeline:** 15-minute emergency call
- **Options:** Alternative rollback strategy, partial restoration

### Level 2: Management (15-60 minutes)
- **Trigger:** Multiple rollback attempts fail
- **Action:** Engage Product Owner + Engineering Manager
- **Timeline:** 1-hour crisis meeting
- **Options:** Disaster recovery activation, customer communication

### Level 3: Executive (1+ hours)
- **Trigger:** System-wide failure, data loss suspected
- **Action:** Engage CTO + CEO
- **Timeline:** Executive decision within 2 hours
- **Options:** Full DR site activation, public incident response

## Incident Documentation

### Rollback Incident Report Template
```markdown
# Database Rollback Incident - [YYYYMMDD-HHMMSS]

## Summary
- **Date/Time:** [Start] - [End] (Duration: X hours)
- **Severity:** [CRITICAL/HIGH/MEDIUM/LOW]
- **Impact:** [User count affected, services impacted]
- **Root Cause:** [Brief description]

## Timeline
- [HH:MM] Issue detected: [How detected]
- [HH:MM] Rollback initiated: [Level and type]
- [HH:MM] Service restored: [Validation completed]
- [HH:MM] Incident closed: [All checks passed]

## Actions Taken
1. [Action 1] - [Outcome]
2. [Action 2] - [Outcome]
3. [Action 3] - [Outcome]

## Impact Assessment
- **Users Affected:** [Number and details]
- **Data Loss:** [None/Partial/Description]
- **Revenue Impact:** [Amount if applicable]
- **SLA Impact:** [Availability percentage]

## Lessons Learned
- **What Went Well:** [List]
- **What Could Improve:** [List]
- **Action Items:** [With owners and deadlines]

## Prevention Measures
- [ ] [Specific improvement 1]
- [ ] [Specific improvement 2]
- [ ] [Process update needed]
```

## Preventive Measures

### Pre-deployment Checklist
- [ ] Full backup completed and verified
- [ ] Staging environment tested with same changes
- [ ] Rollback procedure documented and tested
- [ ] Team notification sent
- [ ] Monitoring alerts configured
- [ ] Emergency contacts verified

### Regular Maintenance
- **Daily:** Backup verification and log review
- **Weekly:** Rollback procedure testing in staging
- **Monthly:** Complete disaster recovery drill
- **Quarterly:** Incident response plan review

### Monitoring & Alerts
```python
# Key metrics to monitor post-rollback
ROLLBACK_MONITORING = {
    "api_response_time_p95": "< 2000ms",
    "error_rate": "< 1%",
    "database_connections": "< 80% of max",
    "bot_workers_active": "> 95%",
    "disk_space_usage": "< 80%",
    "memory_usage": "< 80%"
}
```

## Tools & Scripts

### Essential Rollback Scripts
```bash
# Located in scripts/database/
./emergency_rollback.sh [level]     # Automated rollback
./validate_system.sh               # Post-rollback validation
./performance_check.sh             # Performance verification
./backup_before_rollback.sh        # Emergency backup
```

### Quick Commands
```bash
# Emergency aliases (add to .bashrc)
alias replyx-health="curl -f http://localhost:8000/health"
alias replyx-db-check="psql \$DATABASE_URL -c 'SELECT 1;'"
alias replyx-restart="sudo systemctl restart chatai-backend chatai-bot-manager"
alias replyx-logs="tail -f /var/log/chatai/backend.log"
```

---

**Remember:** The goal of any rollback is to restore service quickly while preserving data integrity. When in doubt, choose the more conservative approach and escalate to senior team members.

**Document Owner:** Database Team
**Review Schedule:** Monthly
**Emergency Phone:** [To be configured]