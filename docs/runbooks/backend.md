# Runbook — Backend Operations

**Last Updated:** 2025-09-04 (verified against MVP 13)

## Quick Start Guide

### Development Environment Setup

#### Prerequisites
```bash
# Install Python 3.9+
python3 --version

# Install PostgreSQL with pgvector extension
sudo apt install postgresql postgresql-contrib
sudo apt install postgresql-14-pgvector

# Install Redis
sudo apt install redis-server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
```

#### Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
vim .env

# Required variables:
DATABASE_URL=postgresql://user:password@localhost:5432/chatai
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=sk-your-openai-key
```

#### Database Setup
```bash
# Create database and user
sudo -u postgres psql -c "CREATE DATABASE chatai;"
sudo -u postgres psql -c "CREATE USER chatai WITH ENCRYPTED PASSWORD 'password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chatai TO chatai;"

# Enable pgvector extension
sudo -u postgres psql -d chatai -c "CREATE EXTENSION vector;"

# Run migrations
alembic upgrade head
```

#### Start Development Server
```bash
cd backend
pip install -r requirements.txt
python3 main.py

# Server will start on http://localhost:8000
# API docs available at http://localhost:8000/docs
```

## Production Operations

### Service Management

#### SystemD Service Control
```bash
# Check service status
sudo systemctl status chatai-backend
sudo systemctl status chatai-bot-manager

# Start/stop services
sudo systemctl start chatai-backend
sudo systemctl stop chatai-backend
sudo systemctl restart chatai-backend

# Enable/disable auto-start
sudo systemctl enable chatai-backend
sudo systemctl disable chatai-backend

# View service logs
sudo journalctl -u chatai-backend -f
sudo journalctl -u chatai-bot-manager -f
```

#### Process Management
```bash
# Check running processes
ps aux | grep python | grep main.py
ps aux | grep node | grep scalable_bot_manager

# Kill processes (if needed)
pkill -f "python.*main.py"
pkill -f "scalable_bot_manager.js"

# Check port usage
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :3001
```

### Health Monitoring

#### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:8000/health

# Prometheus metrics
curl http://localhost:8000/metrics

# Database size monitoring
curl http://localhost:8000/metrics/db-size

# Bot rate limit status
curl http://localhost:8000/metrics/telegram-rate-limit

# CSRF token (for frontend)
curl http://localhost:8000/api/csrf-token
```

#### Health Check Response Examples
```json
# Healthy system
{
  "status": "healthy",
  "timestamp": 1640995200.123,
  "components": {
    "database": {"status": "healthy"},
    "redis": {"status": "healthy"},
    "ai_token_manager": {"status": "healthy"}
  }
}

# Unhealthy system
{
  "status": "unhealthy",
  "timestamp": 1640995200.123,
  "components": {
    "database": {"status": "unhealthy", "error": "Connection timeout"},
    "redis": {"status": "healthy"},
    "ai_token_manager": {"status": "healthy"}
  }
}
```

## Database Operations

### Migration Management
```bash
# Check current migration status
alembic current

# View migration history
alembic history --verbose

# Upgrade to latest migration
alembic upgrade head

# Upgrade to specific revision
alembic upgrade abc123

# Downgrade to previous revision
alembic downgrade -1

# Create new migration
alembic revision --autogenerate -m "Add new feature"

# Show SQL for migration (without executing)
alembic upgrade head --sql
```

### Database Maintenance
```bash
# Create database backup
python scripts/database_backup.py

# Check database size
psql $DATABASE_URL -c "\dt+"

# Analyze table statistics
psql $DATABASE_URL -c "ANALYZE;"

# Reindex for performance
psql $DATABASE_URL -c "REINDEX DATABASE chatai;"

# Check for unused indexes
psql $DATABASE_URL -c "
SELECT schemaname, tablename, indexname, idx_size, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
JOIN (
    SELECT indexname, pg_size_pretty(pg_relation_size(indexrelname::regclass)) as idx_size
    FROM pg_stat_user_indexes
) idx_sizes USING (indexname)
WHERE idx_tup_read = 0 AND idx_tup_fetch = 0
ORDER BY pg_relation_size(indexrelname::regclass) DESC;
"
```

### Query Performance Analysis
```bash
# Enable query logging (postgresql.conf)
log_statement = 'all'
log_min_duration_statement = 1000  # Log queries > 1 second

# Check slow queries
psql $DATABASE_URL -c "
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"

# Check table sizes
psql $DATABASE_URL -c "
SELECT 
    schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;
"
```

## Bot Management Operations

### Bot Worker Management
```bash
# Check bot manager status
curl http://localhost:3001/status

# List all active bots
curl http://localhost:8000/api/bot-instances-all

# Start specific bot
curl -X POST http://localhost:8000/api/start-bot/123

# Stop specific bot
curl -X POST http://localhost:8000/api/stop-bot/123

# Check bot worker processes
ps aux | grep bot_worker | wc -l

# Monitor bot memory usage
ps aux | grep bot_worker | awk '{sum += $6} END {print "Total Memory: " sum/1024 "MB"}'
```

### Bot Performance Monitoring
```bash
# Bot rate limit metrics
curl -s http://localhost:8000/metrics/telegram-rate-limit

# Detailed bot statistics
curl -s http://localhost:8000/api/telegram/rate-limit/stats

# Individual bot stats
curl -s http://localhost:8000/api/telegram/rate-limit/stats/bot123

# Bot worker logs
tail -f backend/logs/api.log | grep -i "bot\|worker"
```

## AI Token Management

### Token Pool Operations
```bash
# List all AI tokens (admin only)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:8000/api/admin/ai-tokens

# Add new AI token
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Token1","token":"sk-...","priority":1}' \
     http://localhost:8000/api/admin/ai-tokens

# Update token settings
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"daily_limit":20000}' \
     http://localhost:8000/api/admin/ai-tokens/1

# Check token usage
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     http://localhost:8000/api/admin/ai-tokens/1/usage
```

### Token Performance Monitoring
```bash
# Token usage statistics from database
psql $DATABASE_URL -c "
SELECT 
    atp.name,
    atp.current_daily_usage,
    atp.daily_limit,
    atp.error_count,
    atp.last_used,
    COUNT(atu.id) as total_requests,
    AVG(atu.response_time) as avg_response_time
FROM ai_token_pool atp
LEFT JOIN ai_token_usage atu ON atp.id = atu.token_id
WHERE atp.is_active = true
GROUP BY atp.id, atp.name, atp.current_daily_usage, atp.daily_limit, atp.error_count, atp.last_used
ORDER BY total_requests DESC;
"
```

## Log Management

### Log File Locations
```bash
# Application logs
tail -f backend/logs/api.log
tail -f backend/logs/api.log.$(date +%Y-%m-%d)

# Audit logs
tail -f backend/logs/audit.log
tail -f backend/logs/audit.log.$(date +%Y-%m-%d)

# System logs
sudo journalctl -u chatai-backend -f
sudo journalctl -u chatai-bot-manager -f
```

### Log Analysis Commands
```bash
# Recent errors
grep ERROR backend/logs/api.log | tail -20

# Failed authentication attempts
grep -E "(401|403|Unauthorized|Forbidden)" backend/logs/api.log

# Database connection issues
grep -i "database.*error\|connection.*failed" backend/logs/api.log

# Bot worker issues
grep -i "bot.*error\|worker.*failed" backend/logs/api.log

# Performance issues (slow requests)
grep -E "duration.*[5-9][0-9]{3}|duration.*[0-9]{5}" backend/logs/api.log

# Memory warnings
grep -i "memory\|oom\|out of memory" backend/logs/api.log
```

### Log Rotation Management
```bash
# Check log rotation configuration
cat /etc/logrotate.d/chatai

# Force log rotation
sudo logrotate -f /etc/logrotate.d/chatai

# Check disk usage of logs
du -h backend/logs/

# Clean old logs (manual)
find backend/logs/ -name "*.log.*" -mtime +7 -delete
```

## Security Operations

### Security Monitoring
```bash
# Check failed login attempts
grep "login.*failed\|authentication.*failed" backend/logs/audit.log | tail -20

# Check for brute force attacks
awk '/login.*failed/ {ip=$NF; count[ip]++} END {for (i in count) if (count[i] > 5) print i, count[i]}' backend/logs/audit.log

# Review suspicious activities
grep -E "(suspicious|anomaly|unusual)" backend/logs/audit.log

# Check Fail2ban status
sudo fail2ban-client status
sudo fail2ban-client status chatai-backend
```

### SSL/TLS Certificate Management
```bash
# Check certificate expiry
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Verify certificate chain
openssl s_client -connect yourdomain.com:443 -showcerts

# Test SSL configuration
sslscan yourdomain.com
testssl.sh yourdomain.com
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Database Connection Issues
**Symptoms:** Health check fails, 500 errors, database timeouts
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection limits
psql $DATABASE_URL -c "SHOW max_connections;"
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check for long-running queries
psql $DATABASE_URL -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"

# Kill long-running queries (if needed)
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = 12345;"
```

#### 2. Redis Connection Issues
**Symptoms:** Cache misses, session issues, rate limiting problems
```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping

# Check Redis memory usage
redis-cli info memory

# Check connected clients
redis-cli info clients

# Clear Redis cache (if needed)
redis-cli flushdb
```

#### 3. Bot Worker Issues
**Symptoms:** Bots not responding, high memory usage, worker crashes
```bash
# Check worker processes
ps aux | grep bot_worker

# Check memory usage per worker
ps aux | grep bot_worker | awk '{print $2, $6}' | sort -k2 -nr

# Restart bot manager
sudo systemctl restart chatai-bot-manager

# Check for orphaned processes
ps aux | grep defunct
```

#### 4. High Memory Usage
**Symptoms:** System slow, OOM kills, swap usage
```bash
# Check system memory
free -h

# Check process memory usage
ps aux --sort=-%mem | head -20

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full python3 main.py

# Enable memory profiling (development)
pip install memory-profiler
python -m memory_profiler main.py
```

#### 5. Performance Issues
**Symptoms:** Slow response times, high CPU usage, timeouts
```bash
# Check CPU usage
top -p $(pgrep -f "python.*main.py")

# Profile application (development)
pip install py-spy
py-spy record -o profile.svg -d 60 -p $(pgrep -f "python.*main.py")

# Check database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Enable query logging temporarily
psql $DATABASE_URL -c "ALTER SYSTEM SET log_min_duration_statement = 100;"
psql $DATABASE_URL -c "SELECT pg_reload_conf();"
```

### Emergency Procedures

#### Complete System Restart
```bash
# Stop all services
sudo systemctl stop chatai-backend
sudo systemctl stop chatai-bot-manager
sudo systemctl stop nginx  # if using nginx proxy

# Check for remaining processes
ps aux | grep -E "(python.*main|node.*scalable)" | grep -v grep

# Kill remaining processes if needed
sudo pkill -f "python.*main.py"
sudo pkill -f "scalable_bot_manager"

# Start services
sudo systemctl start chatai-backend
sudo systemctl start chatai-bot-manager
sudo systemctl start nginx

# Verify health
curl http://localhost:8000/health
```

#### Database Recovery
```bash
# Stop application
sudo systemctl stop chatai-backend

# Create emergency backup
pg_dump $DATABASE_URL > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Check database integrity
psql $DATABASE_URL -c "SELECT pg_database_size(current_database());"

# Restore from backup (if needed)
dropdb chatai_backup  # Create backup db first
createdb chatai_backup
psql chatai_backup < latest_backup.sql

# Start application
sudo systemctl start chatai-backend
```

## Performance Optimization

### Database Optimization
```bash
# Update table statistics
psql $DATABASE_URL -c "ANALYZE;"

# Check index usage
psql $DATABASE_URL -c "
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;
"

# Vacuum tables
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check for bloated tables
psql $DATABASE_URL -c "
SELECT
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup::float / (n_live_tup + n_dead_tup + 1) * 100, 2) AS dead_percentage
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_percentage DESC;
"
```

### Application Performance Tuning
```bash
# Check SQLAlchemy connection pool
# Add to main.py for monitoring:
# from sqlalchemy import event
# @event.listens_for(engine, "connect")
# def connect(dbapi_connection, connection_record):
#     print(f"Pool size: {engine.pool.size()}")
#     print(f"Checked out: {engine.pool.checkedout()}")

# Monitor slow endpoints
grep -E "duration.*[1-9][0-9]{3}" backend/logs/api.log | cut -d' ' -f6,8 | sort | uniq -c | sort -nr

# Profile specific endpoints
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:8000/api/dialogs
```

This runbook should be used as a reference for all backend operational tasks. Update this document as new procedures are developed or existing ones change.
