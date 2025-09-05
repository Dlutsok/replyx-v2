# 🔧 Operations Runbooks

**Complete operational procedures for ChatAI platform management**

This section contains step-by-step guides for deploying, monitoring, troubleshooting, and maintaining all ChatAI components.

---

## 📋 **Quick Index**

### **🚨 Emergency Procedures:**
- **[Backend Issues](backend.md#emergency-procedures)** - API down, database problems
- **[Frontend Issues](frontend.md#emergency-procedures)** - Website not loading, build failures  
- **[Worker Issues](workers.md#emergency-procedures)** - Bot manager crashes, Telegram issues
- **[Bots Issues](bots-monitoring.md#emergency-procedures)** - Individual bot failures, monitoring alerts
- **[Admin Operations](admin-user-operations.md#emergency-procedures)** - User management, data recovery

### **📚 Complete Runbooks:**
| Runbook | Description | Use Case |
|---------|-------------|----------|
| **[backend.md](backend.md)** | FastAPI/Python backend operations | API troubleshooting, database issues |
| **[frontend.md](frontend.md)** | Next.js/React frontend operations | Website deployment, performance issues |
| **[workers.md](workers.md)** | Node.js bot workers management | Telegram bots, webhook issues |
| **[bots-monitoring.md](bots-monitoring.md)** | Real-time bots monitoring and management | Bot health monitoring, troubleshooting bot issues |
| **[admin-user-operations.md](admin-user-operations.md)** | Admin panel operations | User management, system administration |
| **[release.md](release.md)** | Deployment and release procedures | Production deployments, rollbacks |

---

## 🚨 **Emergency Quick Actions**

### **System Down - First Response (2 minutes):**

```bash
# 1. Check all services status
systemctl status chatai-backend
systemctl status chatai-frontend  
pm2 status

# 2. Check logs for errors
tail -f /var/log/chatai/*.log

# 3. Quick restart if needed
systemctl restart chatai-backend
pm2 restart all
```

### **Database Issues:**
```bash
# Check database connectivity
sudo -u postgres psql -c "SELECT version();"

# Check ChatAI database
sudo -u postgres psql chatai -c "SELECT COUNT(*) FROM users;"

# If connection issues
systemctl restart postgresql
```

### **High Load Issues:**
```bash
# Check system resources
htop
df -h
free -h

# Check process usage
ps aux | grep -E "(python|node|npm)" | head -10
```

**Complete emergency guide:** [backend.md#emergency-procedures](backend.md#emergency-procedures)

---

## 🚀 **Daily Operations**

### **Health Checks (Run Daily):**

```bash
#!/bin/bash
# Daily health check script

echo "=== ChatAI Health Check $(date) ==="

# Backend health
curl -sf http://localhost:8000/health > /dev/null && echo "✅ Backend OK" || echo "❌ Backend FAILED"

# Frontend health  
curl -sf http://localhost:3000/api/health > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend FAILED"

# Database health
sudo -u postgres psql chatai -c "SELECT 1;" > /dev/null 2>&1 && echo "✅ Database OK" || echo "❌ Database FAILED"

# Redis health
redis-cli ping > /dev/null && echo "✅ Redis OK" || echo "❌ Redis FAILED"

# Bot manager health
pm2 describe scalable_bot_manager > /dev/null 2>&1 && echo "✅ Bot Manager OK" || echo "❌ Bot Manager FAILED"
```

### **Log Monitoring:**
```bash
# Watch for errors across all services
tail -f /var/log/chatai/*.log | grep -i error

# Monitor specific components
journalctl -fu chatai-backend
pm2 logs --lines 50
```

### **Backup Verification:**
```bash
# Verify database backups
ls -la /opt/chatai/backups/db/
pg_dump --version chatai_backup_$(date +%Y%m%d).sql

# Verify file backups
ls -la /opt/chatai/backups/files/
```

---

## 📊 **Monitoring & Alerts**

### **Key Metrics to Monitor:**

#### **Backend (FastAPI):**
- **Health Endpoint:** `GET /health` - Should return 200
- **Response Time:** < 500ms for 95% of requests
- **Error Rate:** < 1% of requests
- **Memory Usage:** < 80% of available RAM
- **Database Connections:** < 80% of pool

#### **Frontend (Next.js):**
- **Health Endpoint:** `GET /api/health` - Should return 200
- **Page Load Time:** < 3 seconds
- **Build Status:** No compilation errors
- **Bundle Size:** < 2MB compressed

#### **Workers (Node.js):**
- **Bot Manager:** Process running in PM2
- **Worker Count:** Match expected bot instances
- **Memory Usage:** < 150MB per worker
- **Telegram API:** No rate limit violations

#### **Database (PostgreSQL):**
- **Connection Count:** < 80% of max_connections
- **Disk Usage:** < 80% of available space
- **Backup Status:** Daily backups completing
- **Replication Lag:** < 1 second (if applicable)

### **Automated Monitoring Setup:**

```bash
# Setup monitoring cron job
cat > /etc/cron.d/chatai-monitoring << 'EOF'
*/5 * * * * root /opt/chatai/scripts/health-check.sh
0 * * * * root /opt/chatai/scripts/hourly-metrics.sh
0 8 * * * root /opt/chatai/scripts/daily-report.sh
EOF
```

---

## 🔧 **Common Maintenance Tasks**

### **Weekly Maintenance (Every Sunday):**

```bash
#!/bin/bash
# Weekly maintenance script

# 1. Update system packages (test environment first)
apt update && apt list --upgradable

# 2. Rotate logs
logrotate /etc/logrotate.d/chatai

# 3. Clean up old files
find /var/log/chatai -name "*.log.*" -mtime +7 -delete
find /tmp -name "chatai-*" -mtime +1 -delete

# 4. Database maintenance
sudo -u postgres psql chatai -c "VACUUM ANALYZE;"
sudo -u postgres psql chatai -c "REINDEX DATABASE chatai;"

# 5. Check disk space
df -h | grep -E "(80%|90%|9[0-9]%)" && echo "⚠️ Disk space warning"

# 6. Performance check
/opt/chatai/scripts/performance-check.sh
```

### **Monthly Maintenance (First Sunday):**

```bash
#!/bin/bash
# Monthly maintenance script

# 1. Security updates
apt update && apt upgrade -y

# 2. Certificate renewal (if using Let's Encrypt)
certbot renew --quiet

# 3. Database full backup
pg_dump chatai > /opt/chatai/backups/monthly/chatai_$(date +%Y%m).sql

# 4. Dependencies audit
cd /opt/chatai/backend && pip audit
cd /opt/chatai/frontend && npm audit

# 5. Performance baseline
/opt/chatai/scripts/performance-baseline.sh
```

---

## 🐛 **Troubleshooting Decision Tree**

### **API Not Responding:**
```
1. Check backend health: curl localhost:8000/health
   ├─ 200 OK → Check frontend: curl localhost:3000/api/health
   │   ├─ 200 OK → Check external connectivity/DNS
   │   └─ Not OK → See frontend.md troubleshooting
   └─ Not OK → See backend.md troubleshooting
```

### **Slow Performance:**
```
1. Check system resources: htop, df -h, free -h
   ├─ High CPU → Check processes, restart if needed
   ├─ High Memory → Check for memory leaks, restart services
   ├─ High Disk I/O → Check database queries, optimize
   └─ Network Issues → Check external API limits
```

### **Database Issues:**
```
1. Check database status: systemctl status postgresql
   ├─ Not Running → systemctl start postgresql
   ├─ Running → Check connections: sudo -u postgres psql
   │   ├─ Can't Connect → Check authentication, logs
   │   └─ Connected → Check ChatAI database access
   └─ Failed → Check logs: journalctl -u postgresql
```

### **Bot Issues:**
```
1. Check bot manager: pm2 status
   ├─ Not Running → pm2 start ecosystem.config.js
   ├─ Running → Check individual bots: pm2 logs
   │   ├─ Telegram Errors → Check tokens, webhook URLs
   │   └─ API Errors → Check backend connectivity
   └─ Failed → See workers.md troubleshooting
```

---

## 📱 **Mobile Quick Reference**

### **Emergency Commands (SSH from mobile):**

```bash
# Quick system check
curl -s localhost:8000/health && echo "Backend OK" || echo "Backend DOWN"
systemctl is-active chatai-backend chatai-frontend postgresql redis

# Quick restart
systemctl restart chatai-backend && echo "Backend restarted"
pm2 restart all && echo "Frontend/Workers restarted"

# Check recent errors
tail -20 /var/log/chatai/api.log | grep ERROR
journalctl -u chatai-backend --since "10 minutes ago" | grep ERROR
```

### **Mobile Monitoring Apps:**
- **PM2 Mobile App** - Monitor Node.js processes
- **Server Monitor Apps** - System resource monitoring
- **Slack/Discord** - Set up alerts for critical issues

---

## 🔗 **Integration with External Tools**

### **Monitoring Stack:**
- **Prometheus** - Metrics collection
- **Grafana** - Dashboards and visualization  
- **AlertManager** - Alert routing and notifications
- **ELK Stack** - Log aggregation and analysis

### **Notification Channels:**
- **Slack/Discord** - Real-time alerts
- **Email** - Daily/weekly reports
- **SMS** - Critical system failures
- **PagerDuty** - On-call management

### **Backup Solutions:**
- **PostgreSQL** - pg_dump + compression
- **Files** - rsync to remote location
- **Configuration** - Git repository backup
- **Secrets** - Encrypted vault backup

---

## 📚 **Related Documentation**

### **Architecture:**
- **[System Overview](../architecture/overview.md)** - Complete system architecture
- **[Technology Stack](../architecture/technology-stack.md)** - All technologies used
- **[Service Catalog](../architecture/service-catalog.md)** - Service dependencies

### **Development:**
- **[Backend Guide](../backend/structure-guide.md)** - Backend development
- **[Frontend Guide](../frontend/structure-guide.md)** - Frontend development
- **[API Documentation](../api/README.md)** - API reference

### **Security:**
- **[Authentication](../security/authentication.md)** - Security implementation
- **[Threat Model](../security/threat_model.md)** - Security considerations

---

**📅 Last Updated:** 2025-01-23  
**🔧 Runbooks:** 6 comprehensive guides  
**🚨 Emergency Procedures:** Covered for all components including bot monitoring  
**📊 Monitoring:** Complete observability setup documented


