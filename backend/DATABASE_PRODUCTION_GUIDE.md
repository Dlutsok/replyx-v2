# 🗄️ Production Database Setup Guide

## Critical Database Optimizations Applied

### ✅ Connection Pool Optimization
```bash
# Environment variables for production
DB_POOL_SIZE=15        # Optimized for single instance
DB_MAX_OVERFLOW=20     # Prevents connection exhaustion  
DB_POOL_TIMEOUT=30     # Connection timeout
DB_POOL_RECYCLE=3600   # 1 hour connection recycling
```

### ✅ SSL Security Enhancement
```bash
# Production SSL settings
DB_SSL_MODE=require    # Mandatory SSL for production
DB_HOST=your-private-db-host.internal  # Private network only
```

### ✅ Database Schema Protection
- `create_all()` disabled for production environment
- Only Alembic migrations allowed in production
- Environment variable: `ENVIRONMENT=production`

### ✅ Performance Indexes Added
```sql
-- Dialog performance indexes
CREATE INDEX idx_dialog_messages_dialog_created ON dialog_messages (dialog_id, timestamp);
CREATE INDEX idx_dialog_messages_user_created ON dialog_messages (sender, timestamp);
CREATE INDEX idx_dialogs_user_started ON dialogs (user_id, started_at);

-- Document indexes  
CREATE INDEX idx_documents_user_upload ON documents (user_id, upload_date);

-- Embeddings indexes
CREATE INDEX idx_knowledge_embeddings_doc ON knowledge_embeddings (doc_id, chunk_index);
CREATE INDEX idx_knowledge_embeddings_user ON knowledge_embeddings (user_id, doc_type);

-- Payment indexes
CREATE UNIQUE INDEX idx_payments_order_unique ON payments (order_id);
CREATE INDEX idx_payments_user_created ON payments (user_id, created_at);

-- Balance indexes
CREATE INDEX idx_balance_transactions_user_created ON balance_transactions (user_id, created_at);
```

### ✅ Money Types Fixed
- `NUMERIC(12,2)` for all monetary values (prevents floating point errors)
- CHECK constraints for positive amounts
- Currency field added with validation
- Unique constraints for payment IDs

## 🚨 Production Deployment Checklist

### Database Setup
1. **Create separate database roles:**
   ```sql
   -- Migration role (full privileges)
   CREATE ROLE owner_user WITH LOGIN PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE chat_ai TO owner_user;
   
   -- Application role (limited privileges)  
   CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';
   GRANT CONNECT ON DATABASE chat_ai TO app_user;
   GRANT USAGE ON SCHEMA public TO app_user;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
   ```

2. **Network Security:**
   - Database accessible only from private VPC
   - Firewall rules: allow only from application servers
   - No public internet access to database

3. **Apply migrations:**
   ```bash
   # Run with owner_user credentials
   export DATABASE_URL=postgresql://owner_user:password@db-host:5432/chat_ai?sslmode=require
   alembic upgrade head
   ```

### Environment Variables
```bash
# Production environment
ENVIRONMENT=production

# Database connection (private network)
DB_HOST=your-db-private-host.internal
DB_PORT=5432
DB_NAME=chat_ai
DB_USER=app_user
DB_PASSWORD=your_secure_password
DB_SSL_MODE=require

# Connection pooling
DB_POOL_SIZE=15
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
```

## 🔧 Additional Optimizations Recommended

### PgBouncer Setup
```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
chat_ai = host=db-host port=5432 dbname=chat_ai

[pgbouncer]  
listen_port = 6432
listen_addr = localhost
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
reserve_pool_size = 5
```

### PostgreSQL Settings (postgresql.conf)
```ini
# Connection settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB

# Logging
log_min_duration_statement = 1000  # Log slow queries >1s
log_statement = 'mod'              # Log data modifications

# Performance
random_page_cost = 1.1             # For SSD storage
checkpoint_timeout = 10min
max_wal_size = 2GB
```

### pgvector Optimization
```sql
-- Create HNSW index for vector search
CREATE INDEX knowledge_embeddings_vec_hnsw 
ON knowledge_embeddings 
USING hnsw (embedding vector_l2_ops) 
WITH (m = 16, ef_construction = 200);
```

## 📊 Monitoring Setup

### Database Size Monitoring
- Script: `backend/monitoring/db_size_monitor.py`
- Thresholds: 10GB database, 1GB table, 85% disk usage
- Email alerts configured

### Performance Monitoring  
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query to find slow queries
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## ⚡ Performance Tuning

### Partitioning (Future)
```sql
-- Partition large tables by date
CREATE TABLE dialog_messages_2024_01 PARTITION OF dialog_messages
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Retention Policies
- Keep raw events: 90-180 days
- Archive to aggregated tables
- Automatic cleanup of old embeddings cache

## 🔐 Security Hardscaping

### Database Firewall Rules
```bash
# Only allow application servers
ufw allow from 10.0.1.0/24 to any port 5432
ufw deny 5432
```

### Backup Strategy  
```bash
# Daily automated backups
pg_dump -h db-host -U backup_user chat_ai | gzip > backup_$(date +%Y%m%d).sql.gz

# Point-in-time recovery setup
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

## 🚨 Troubleshooting

### Common Issues
1. **Connection pool exhausted:** Increase `max_overflow` or add PgBouncer
2. **Slow queries:** Check missing indexes with `EXPLAIN ANALYZE` 
3. **Migration conflicts:** Resolve Alembic heads before deployment
4. **SSL connection errors:** Verify certificates and `sslmode=require`

### Health Checks
```bash
# Test database connectivity
psql "postgresql://app_user:password@db-host:5432/chat_ai?sslmode=require" -c "SELECT 1;"

# Check pool statistics
curl http://localhost:8000/health/database
```