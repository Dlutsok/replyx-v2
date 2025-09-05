# 🤖 Bots Monitoring Runbook

**Comprehensive operational guide for monitoring and managing ChatAI Telegram bots**

This runbook covers all procedures for monitoring bot health, diagnosing issues, performing maintenance, and ensuring optimal performance of the ChatAI bot infrastructure.

---

## 📋 **Quick Reference**

### **🚨 Emergency Bot Commands:**
```bash
# Check all bots status
pm2 status

# Restart all bots
pm2 restart all

# Check bot manager
pm2 describe scalable_bot_manager

# View recent bot logs
pm2 logs --lines 50 | grep ERROR
```

### **📊 Key Health Indicators:**
- **Active Bots**: Should match expected count
- **Response Time**: < 2 seconds average
- **Error Rate**: < 1% of messages
- **Uptime**: > 99% per bot
- **Memory Usage**: < 150MB per bot instance

---

## 🎯 **Monitoring Dashboard Access**

### **Web Interface**
```
URL: https://your-domain.com/admin-bots-monitoring
Auth: Admin credentials required
Features:
  - Real-time bot status
  - Performance metrics
  - Bot management controls
  - Detailed bot information
```

### **Dashboard Sections**
1. **Overview Cards**: Active bots, messages/hour, active users, error count
2. **Filters Panel**: Search, status filter, time period selection  
3. **Bots Grid**: Comprehensive bot listing with actions
4. **Bot Details**: Detailed modal with metrics and controls

---

## 🔍 **Daily Monitoring Procedures**

### **Morning Health Check (Run Daily at 09:00)**

```bash
#!/bin/bash
# Daily bot health check script

echo "=== ChatAI Bots Health Check $(date) ==="

# 1. Check PM2 bot manager status
echo "🔍 Bot Manager Status:"
pm2 describe scalable_bot_manager | grep -E "(status|uptime|cpu|memory)"

# 2. Count active bot instances  
echo "🤖 Active Bots Count:"
pm2 list | grep "bot_worker" | wc -l

# 3. Check for recent errors
echo "🚨 Recent Errors (last 1 hour):"
pm2 logs --lines 1000 --timestamp | grep -E "(ERROR|error)" | grep "$(date '+%Y-%m-%d %H')" | wc -l

# 4. Memory usage check
echo "💾 Memory Usage:"
pm2 monit --json | grep -E "(memory|cpu)"

# 5. Database bot instances
echo "🗄️ Database Bots:"
sudo -u postgres psql chatai -c "SELECT status, COUNT(*) FROM bot_instances GROUP BY status;"

# 6. Telegram API connectivity
echo "🌐 Telegram API Test:"
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe" | grep -q '"ok":true' && echo "✅ OK" || echo "❌ FAILED"

# 7. Summary
echo "📊 Health Check Complete - $(date)"
```

### **Continuous Monitoring (Automated)**

**Setup monitoring cron job:**
```bash
# Add to crontab
crontab -e

# Monitor bots every 5 minutes
*/5 * * * * /opt/chatai/scripts/bots-health-check.sh

# Hourly detailed metrics
0 * * * * /opt/chatai/scripts/bots-metrics-collect.sh  

# Daily comprehensive report
0 9 * * * /opt/chatai/scripts/bots-daily-report.sh
```

---

## 🚨 **Emergency Procedures**

### **All Bots Down - First Response (2 minutes):**

```bash
# 1. Quick status check
pm2 status | head -20

# 2. Check system resources
free -h && df -h && ps aux | head -10

# 3. Check bot manager
pm2 describe scalable_bot_manager

# 4. Emergency restart if needed
pm2 restart scalable_bot_manager

# 5. Check database connectivity  
sudo -u postgres psql chatai -c "SELECT 1;" || systemctl restart postgresql

# 6. Monitor recovery
watch "pm2 status | grep bot_worker"
```

### **Individual Bot Issues:**

```bash
# Check specific bot logs
pm2 logs bot_worker_123 --lines 100

# Restart specific bot
pm2 restart bot_worker_123

# Check bot database record
sudo -u postgres psql chatai -c "SELECT * FROM bot_instances WHERE id = '123';"

# Test bot manually
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d "chat_id=${TEST_CHAT_ID}&text=Health check"
```

### **High Memory Usage:**

```bash
# Find memory-hungry bots
pm2 monit | grep -A2 -B2 "Memory"

# Restart high-memory bot instances
pm2 restart $(pm2 jlist | jq -r '.[] | select(.monit.memory > 200000000) | .name')

# Check for memory leaks
pm2 logs | grep -i "memory\|heap\|allocation" | tail -50
```

### **Telegram API Rate Limiting:**

```bash
# Check rate limit status
grep "rate limit" /var/log/chatai/bots.log | tail -20

# Implement backoff strategy
pm2 restart all --wait-ready --listen-timeout 10000

# Monitor API response codes
tail -f /var/log/chatai/telegram-api.log | grep -E "(429|5[0-9][0-9])"
```

---

## 🔧 **Bot Management Operations**

### **Starting New Bot Instance**

```bash
# Via Admin Dashboard
1. Navigate to /admin-bots-monitoring
2. Click "Add New Bot" 
3. Configure bot settings
4. Click "Start Bot"

# Via Command Line  
pm2 start ecosystem.config.js --only bot_worker_new
```

### **Stopping Bot Instance**

```bash
# Graceful shutdown via dashboard
# OR command line:

pm2 stop bot_worker_123
pm2 delete bot_worker_123

# Update database status
sudo -u postgres psql chatai -c "UPDATE bot_instances SET status = 'stopped' WHERE id = '123';"
```

### **Bot Configuration Update**

```bash
# 1. Stop bot instance
pm2 stop bot_worker_123

# 2. Update configuration in database
sudo -u postgres psql chatai -c "UPDATE bot_instances SET config = '...' WHERE id = '123';"

# 3. Reload bot with new config
pm2 restart bot_worker_123

# 4. Verify configuration applied
pm2 logs bot_worker_123 | grep "Configuration loaded"
```

### **Bulk Bot Operations**

```bash
# Restart all bots in maintenance window
pm2 restart all --wait-ready

# Stop all error bots
pm2 stop $(pm2 jlist | jq -r '.[] | select(.pm2_env.status == "errored") | .name')

# Update all bots to latest version
cd /opt/chatai/backend/worker/
git pull
pm2 reload ecosystem.config.js
```

---

## 📊 **Performance Monitoring**

### **Key Performance Indicators (KPI)**

#### **Bot Health Metrics:**
```bash
# Active bots ratio
echo "scale=2; $(pm2 list | grep -c "online") / $(pm2 list | wc -l) * 100" | bc
# Target: > 95%

# Average response time
grep "response_time" /var/log/chatai/bots.log | awk '{sum += $3; count++} END {print sum/count}'
# Target: < 2 seconds

# Error rate per hour
grep "ERROR" /var/log/chatai/bots.log | grep "$(date '+%Y-%m-%d %H')" | wc -l
# Target: < 10 errors/hour

# Memory usage per bot
pm2 monit | grep -A1 "Memory" | grep MB | awk '{print $1}' | sort -n
# Target: < 150MB per bot
```

#### **Business Metrics:**
```sql
-- Messages processed per hour
SELECT COUNT(*) / 24 as avg_messages_per_hour
FROM dialog_messages 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Active users per bot
SELECT bot_id, COUNT(DISTINCT user_id) as active_users
FROM dialogs 
WHERE updated_at >= NOW() - INTERVAL '1 hour'
GROUP BY bot_id;

-- Bot uptime percentage  
SELECT bot_id,
  EXTRACT(EPOCH FROM (NOW() - last_restart)) / 3600 as uptime_hours,
  CASE WHEN status = 'online' THEN 100.0 ELSE 0.0 END as uptime_percent
FROM bot_instances;
```

### **Performance Alerts Setup**

```bash
# Create alert script
cat > /opt/chatai/scripts/bot-alerts.sh << 'EOF'
#!/bin/bash

# Check bot count
BOT_COUNT=$(pm2 list | grep "bot_worker" | grep -c "online")
if [ $BOT_COUNT -lt 5 ]; then
  echo "ALERT: Only $BOT_COUNT bots online" | mail -s "Bot Alert" admin@yourcompany.com
fi

# Check memory usage
HIGH_MEMORY_BOTS=$(pm2 monit | grep -c "Memory: [2-9][0-9][0-9]MB")
if [ $HIGH_MEMORY_BOTS -gt 0 ]; then
  echo "ALERT: $HIGH_MEMORY_BOTS bots using high memory" | mail -s "Memory Alert" admin@yourcompany.com
fi

# Check error rate
ERROR_COUNT=$(grep "ERROR" /var/log/chatai/bots.log | grep "$(date '+%Y-%m-%d %H')" | wc -l)
if [ $ERROR_COUNT -gt 50 ]; then
  echo "ALERT: High error rate: $ERROR_COUNT errors this hour" | mail -s "Error Alert" admin@yourcompany.com
fi
EOF

chmod +x /opt/chatai/scripts/bot-alerts.sh

# Add to crontab for every 10 minutes
*/10 * * * * /opt/chatai/scripts/bot-alerts.sh
```

---

## 🐛 **Troubleshooting Guide**

### **Bot Not Starting**

```
Symptoms: Bot shows "stopped" or "errored" status
Diagnosis steps:
1. Check PM2 logs: pm2 logs bot_worker_123 --lines 50
2. Check bot token validity: Test API call
3. Check database connectivity: psql connection test
4. Check file permissions: ls -la /opt/chatai/worker/
5. Check system resources: free -h, df -h

Common fixes:
- Invalid token: Update in bot_instances table
- Missing dependencies: npm install in worker directory
- Port conflicts: Check if port already in use
- Memory exhaustion: Restart with more memory limit
```

### **High Response Times**

```
Symptoms: Messages taking > 5 seconds to respond
Diagnosis steps:
1. Check system load: htop, iostat
2. Check database performance: pg_stat_activity
3. Check external API latencies: curl timing tests
4. Check bot worker CPU: pm2 monit

Common fixes:
- Database optimization: Add indexes, VACUUM
- Scale bot instances: Add more workers
- External API timeouts: Implement retry logic
- Code optimization: Profile slow functions
```

### **Memory Leaks**

```
Symptoms: Bot memory usage continuously growing
Diagnosis steps:
1. Monitor memory over time: pm2 monit
2. Check for unclosed connections: netstat
3. Profile memory usage: Node.js heap dumps
4. Check log file sizes: du -sh /var/log/chatai/

Common fixes:
- Restart affected bots: pm2 restart bot_worker_123
- Fix code leaks: Review event listeners, timers
- Implement memory limits: PM2 max_memory_restart
- Log rotation: logrotate configuration
```

### **Telegram API Errors**

```
Common error codes and solutions:

400 Bad Request:
- Check message format and parameters
- Validate chat_id exists and bot has access

401 Unauthorized:
- Bot token expired or invalid
- Update token in bot_instances table

403 Forbidden:  
- Bot blocked by user
- Bot removed from group/channel
- Update bot status in database

429 Rate Limited:
- Implement exponential backoff
- Distribute load across multiple bot tokens
- Monitor request frequency

500 Internal Server Error:
- Telegram API temporary issue
- Implement retry logic with delays
```

---

## 🔄 **Maintenance Procedures**

### **Weekly Maintenance (Every Sunday 02:00)**

```bash
#!/bin/bash
# Weekly bot maintenance script

echo "🔧 Starting weekly bot maintenance - $(date)"

# 1. Backup bot configurations
sudo -u postgres pg_dump -t bot_instances chatai > /opt/chatai/backups/bot_instances_$(date +%Y%m%d).sql

# 2. Rotate bot logs  
pm2 flush
find /opt/chatai/logs -name "*.log" -mtime +7 -delete

# 3. Update bot worker code
cd /opt/chatai/backend/worker/
git pull origin main

# 4. Install dependencies updates
npm audit fix --force

# 5. Restart bots with rolling deployment
BOT_INSTANCES=$(pm2 jlist | jq -r '.[].name' | grep bot_worker)
for bot in $BOT_INSTANCES; do
  echo "Restarting $bot..."
  pm2 restart "$bot" --wait-ready
  sleep 10  # Wait between restarts
done

# 6. Verify all bots online
sleep 60
ONLINE_COUNT=$(pm2 list | grep -c "online")
echo "✅ $ONLINE_COUNT bots online after maintenance"

# 7. Database maintenance
sudo -u postgres psql chatai -c "DELETE FROM dialog_messages WHERE created_at < NOW() - INTERVAL '30 days';"
sudo -u postgres psql chatai -c "VACUUM ANALYZE;"

# 8. Performance baseline
/opt/chatai/scripts/bot-performance-test.sh

echo "✅ Weekly maintenance completed - $(date)"
```

### **Monthly Bot Audit (First Sunday)**

```bash
#!/bin/bash
# Monthly bot audit and optimization

# 1. Bot usage analysis
echo "📊 Bot Usage Report:"
sudo -u postgres psql chatai -c "
  SELECT 
    bi.id,
    bi.name,
    COUNT(d.id) as total_dialogs,
    COUNT(dm.id) as total_messages,
    AVG(EXTRACT(EPOCH FROM (d.updated_at - d.created_at))) as avg_session_duration
  FROM bot_instances bi
  LEFT JOIN dialogs d ON d.bot_id = bi.id
  LEFT JOIN dialog_messages dm ON dm.dialog_id = d.id
  WHERE d.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY bi.id, bi.name
  ORDER BY total_messages DESC;
"

# 2. Inactive bot cleanup
sudo -u postgres psql chatai -c "
  UPDATE bot_instances 
  SET status = 'archived' 
  WHERE id IN (
    SELECT bi.id FROM bot_instances bi
    LEFT JOIN dialogs d ON d.bot_id = bi.id AND d.created_at >= NOW() - INTERVAL '30 days'
    WHERE d.id IS NULL
  );
"

# 3. Performance optimization
/opt/chatai/scripts/optimize-bot-configs.sh

# 4. Security audit
/opt/chatai/scripts/bot-security-audit.sh

echo "✅ Monthly audit completed"
```

---

## 📈 **Monitoring Integration**

### **Prometheus Metrics Export**

```javascript
// Add to bot worker code
const promClient = require('prom-client');

// Bot-specific metrics
const botMessages = new promClient.Counter({
  name: 'chatai_bot_messages_total',
  help: 'Total messages processed by bot',
  labelNames: ['bot_id', 'status']
});

const botResponseTime = new promClient.Histogram({
  name: 'chatai_bot_response_time_seconds', 
  help: 'Bot response time in seconds',
  labelNames: ['bot_id']
});

// Update metrics in message handler
botMessages.inc({ bot_id: '123', status: 'success' });
botResponseTime.observe({ bot_id: '123' }, responseTime);
```

### **Grafana Dashboard Queries**

```prometheus
# Bot uptime percentage
(up{job="chatai-bots"} * 100)

# Average response time
rate(chatai_bot_response_time_seconds_sum[5m]) / rate(chatai_bot_response_time_seconds_count[5m])

# Messages per second
rate(chatai_bot_messages_total[5m])

# Error rate
rate(chatai_bot_messages_total{status="error"}[5m]) / rate(chatai_bot_messages_total[5m])
```

### **Slack/Discord Alerts**

```bash
# Webhook notification script
send_alert() {
  local message=$1
  local severity=$2
  
  curl -X POST "https://hooks.slack.com/your-webhook-url" \
    -H 'Content-type: application/json' \
    --data "{\"text\":\"🤖 ChatAI Bots Alert [$severity]: $message\"}"
}

# Usage in monitoring scripts
if [ $ERROR_COUNT -gt 10 ]; then
  send_alert "High error count: $ERROR_COUNT errors in last hour" "WARNING"
fi
```

---

## 📚 **Reference Information**

### **Bot Status Codes**
- **online**: Bot is running and processing messages
- **offline**: Bot is stopped intentionally  
- **error**: Bot crashed or has configuration issues
- **starting**: Bot is in the process of starting up
- **archived**: Bot is inactive and archived

### **Important File Locations**
```
/opt/chatai/backend/worker/          # Bot worker code
/opt/chatai/logs/bots/               # Bot log files
/etc/pm2/ecosystem.config.js         # PM2 configuration
/opt/chatai/scripts/                 # Maintenance scripts
/var/log/chatai/telegram-api.log     # Telegram API logs
```

### **Database Tables**
- **bot_instances**: Bot configuration and status
- **dialogs**: Active conversations
- **dialog_messages**: Message history
- **users**: Bot users information

### **External Dependencies**
- **PM2**: Process manager for Node.js
- **PostgreSQL**: Database storage
- **Redis**: Caching and session storage  
- **Telegram Bot API**: Message delivery
- **Node.js**: Runtime environment

---

## 🔗 **Related Documentation**

### **Architecture:**
- **[Bot Monitoring System](../admin/bots-monitoring.md)** - System architecture
- **[Service Catalog](../architecture/service-catalog.md)** - Service dependencies

### **API:**
- **[Admin Endpoints](../api/endpoints.md)** - Bot management API
- **[WebSocket Events](../realtime/events.md)** - Real-time updates

### **Security:**
- **[Authentication](../security/authentication.md)** - Admin access control
- **[Threat Model](../security/threat_model.md)** - Security considerations

---

**📅 Last Updated:** 2025-01-23  
**🤖 Coverage:** Complete bot infrastructure monitoring  
**🚨 Emergency Procedures:** All critical scenarios covered  
**📊 Monitoring:** Automated alerts and metrics collection  
**🔧 Maintenance:** Scheduled and on-demand procedures