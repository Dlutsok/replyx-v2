# ReplyX Production Deployment Guide

## 📋 Pre-deployment Checklist

### 1. Server Requirements
- **OS**: Ubuntu 20.04+ или CentOS 8+
- **RAM**: Минимум 4GB (рекомендуется 8GB)
- **CPU**: 2+ cores
- **Disk**: 50GB+ SSD
- **Docker**: 20.10+
- **Docker Compose**: 1.29+

### 2. Domain and DNS
- Настроить A-запись: `replyx.ru` → IP сервера
- Настроить A-запись: `www.replyx.ru` → IP сервера

### 3. External Services
- **PostgreSQL**: Настроена и доступна
- **SSL Certificates**: Let's Encrypt или коммерческие

## 🚀 Deployment Steps

### Step 1: Transfer Files to Server
```bash
# На локальной машине
scp -r "/Users/dan/Documents/chatAI/MVP 13/Deployed" user@your-server:/opt/replyx/
scp -r "/Users/dan/Documents/chatAI/MVP 13/frontend" user@your-server:/opt/replyx/
scp -r "/Users/dan/Documents/chatAI/MVP 13/backend" user@your-server:/opt/replyx/
scp -r "/Users/dan/Documents/chatAI/MVP 13/workers" user@your-server:/opt/replyx/
```

### Step 2: Server Setup
```bash
# На сервере
cd /opt/replyx/Deployed

# Установить права
chmod +x deploy.sh init-db.sh

# Проверить конфигурацию
./deploy.sh status
```

### Step 3: Complete Deployment
```bash
# Полное развертывание (включая БД)
./deploy.sh

# Или поэтапное
./deploy.sh database      # КРИТИЧНО: Сначала БД!
./deploy.sh infrastructure
./deploy.sh backend  
./deploy.sh workers
./deploy.sh frontend
./deploy.sh nginx
```

## 📦 Docker Services Architecture

```
┌─────────────────────────────────────────┐
│               Nginx (80/443)            │
│          SSL + Reverse Proxy            │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐   ┌────▼────┐   ┌────▼────┐
│Frontend│   │ Backend │   │ Workers │
│:3000   │   │ :8000   │   │ :8443   │
│Next.js │   │ FastAPI │   │ Node.js │
└────────┘   └─────────┘   └─────────┘
                  │
            ┌─────▼─────┐
            │   Redis   │
            │   :6379   │
            └───────────┘
```

## 🔧 Configuration Files

### Required Files Structure:
```
/opt/replyx/
├── Deployed/
│   ├── .env.production          # ✅ Ready
│   ├── docker-compose.yml       # ✅ Ready  
│   ├── deploy.sh               # ✅ Ready (updated with DB init)
│   ├── init-db.sh              # ✅ Ready (database setup)
│   ├── ssl/                    # SSL certificates
│   └── nginx/nginx.conf        # ✅ Ready
├── frontend/
│   ├── Dockerfile              # ✅ Ready
│   └── [frontend files]
├── backend/
│   ├── Dockerfile              # ✅ Ready
│   └── [backend files]
└── workers/
    ├── Dockerfile              # ✅ Ready
    └── [workers files]
```

## 🔑 Environment Variables Status

### ✅ Configured:
- SECRET_KEY, JWT_SECRET_KEY
- OpenAI API Key + Proxy
- Database connection (PostgreSQL)
- Redis password
- Email/SMTP settings
- Telegram bot token
- SSL certificates (self-signed)

### ⚠️ Need Real Values:
- `YANDEX_CLIENT_ID` - production OAuth app
- `YANDEX_CLIENT_SECRET` - production OAuth app  
- Tinkoff payment keys (commented out)

### 🔑 Yandex OAuth Setup Required:
**CRITICAL**: Before deployment, register production OAuth app:
1. Go to https://oauth.yandex.ru/
2. Create new application for `replyx.ru`
3. Set callback URL: `https://replyx.ru/api/auth/yandex/callback`
4. Copy Client ID and Client Secret to `.env.production`
5. Replace CHANGEME values:
   ```
   YANDEX_CLIENT_ID=your_production_client_id
   YANDEX_CLIENT_SECRET=your_production_client_secret
   ```

## 🛠️ Manual Commands

### Build and Start Services:
```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop all services
docker-compose down
```

### Individual Service Management:
```bash
# Restart specific service
docker-compose restart backend

# View specific logs
docker-compose logs -f frontend

# Execute command in container
docker-compose exec backend bash
```

## 📊 Monitoring

### Health Checks:
- **Nginx**: `curl http://localhost/health`
- **Backend**: `curl http://localhost:8000/health`  
- **Frontend**: `curl http://localhost:3000`
- **Workers**: `curl http://localhost:8443/health`

### Log Locations:
- **Application logs**: `/opt/replyx/data/logs/`
- **Nginx logs**: Container logs via `docker-compose logs nginx`
- **System logs**: `/var/log/docker/`

## 🔒 Security Considerations

### SSL/TLS:
- Replace self-signed certificates with Let's Encrypt
- Enable HSTS headers (configured in nginx)
- Regular certificate renewal

### Firewall:
```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP  
ufw allow 443   # HTTPS
ufw enable
```

### Database:
- PostgreSQL должна быть недоступна из интернета
- Использовать сильные пароли
- Регулярные бэкапы

## 🔄 Updates and Maintenance

### Application Updates:
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

### Database Migrations:
```bash
# Execute migrations in backend container
docker-compose exec backend alembic upgrade head
```

### Backup:
```bash
# Database backup
docker-compose exec backend python scripts/backup_database.py

# Files backup  
tar -czf replyx-backup-$(date +%Y%m%d).tar.gz /opt/replyx/
```

## 🚨 Troubleshooting

### Common Issues:

1. **Port conflicts**: Check if ports 80, 443, 3000, 8000 are free
2. **Permission issues**: Ensure Docker has proper permissions
3. **SSL errors**: Verify certificate files exist and are valid
4. **Database connection**: Check PostgreSQL accessibility
5. **Memory issues**: Monitor with `docker stats`

### Debug Commands:
```bash
# Check container resource usage
docker stats

# Inspect container
docker-compose exec [service] bash

# View full logs
docker-compose logs --tail=100 [service]

# Test connectivity
docker-compose exec backend ping redis
```

## 📞 Support

После развертывания:
1. Тестировать все основные функции
2. Настроить мониторинг и алерты
3. Создать план резервного копирования
4. Настроить SSL через Let's Encrypt
5. Обновить DNS записи домена