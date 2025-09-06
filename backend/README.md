# ReplyX Backend

High-performance FastAPI backend for ReplyX MVP with scalable Telegram bot management and AI integration.

## 🏗️ Architecture Overview

The backend follows Clean Architecture principles with clear separation of concerns:

```
/backend/
  /api/               # 🌐 FastAPI routers & HTTP endpoints
  /services/          # 🔧 Business logic & use cases  
  /database/          # 🗄️ Models, CRUD operations, schemas
  /core/              # ⚙️ App configuration, auth, middleware
  /ai/                # 🤖 AI providers, prompts, token management
  /cache/             # ⚡ Redis caching layer
  /monitoring/        # 📊 Metrics, logging, health checks
  /integrations/      # 🔌 External service integrations
  /validators/        # ✅ Input validation & rate limiting
  /security/          # 🛡️ Security configurations
  /templates/         # 📧 Email & notification templates
  /utils/             # 🛠️ Helper utilities
  /schemas/           # 📋 Pydantic data schemas
  
  /scripts/           # 📜 Backend-specific scripts (moved to /scripts/backend/)
    /admin/           # 👥 User management tools
    /maintenance/     # 🔧 System maintenance scripts
    
  /alembic/           # 🗃️ Database migrations
  main.py             # 🚀 FastAPI application entry point
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### Installation

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Install Node.js dependencies for workers:**
```bash
cd ../workers && npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run database migrations:**
```bash
alembic upgrade head
```

5. **Start the FastAPI server:**
```bash
python3 main.py
# Or with uvicorn:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

6. **Start Telegram bot workers:**
```bash
cd ../workers && npm run start
# Or from project root:
node workers/scripts/start_scalable_system.js start
```

## 📁 Module Responsibilities

### API Layer (`/api/`)
HTTP endpoints organized by domain:
- **auth.py** - Authentication & authorization
- **users.py** - User management
- **assistants.py** - AI assistant management
- **dialogs.py** - Chat conversations
- **documents.py** - Document upload & processing
- **bots.py** - Telegram bot configuration
- **admin.py** - Administrative endpoints
- **sse.py** - Real-time Server-Sent Events connections (migrated from WebSocket)

### Services Layer (`/services/`)
Business logic and use cases:
- **bot_manager.py** - Bot lifecycle management
- **sse_manager.py** - SSE connection handling (replaces WebSocket)
- **sse_service.py** - SSE service layer
- **balance_service.py** - User billing & credits
- **embeddings_service.py** - Document vectorization
- **handoff_service.py** - Human-AI handoff logic
- **trial_service.py** - Trial period management

### Database Layer (`/database/`)
Data persistence and modeling:
- **models.py** - SQLAlchemy ORM models
- **schemas.py** - Pydantic data schemas
- **crud.py** - Database operations
- **connection.py** - Database connection setup

### AI Layer (`/ai/`)
AI integration and prompt management:
- **ai_providers.py** - OpenAI, Anthropic, etc. integrations
- **ai_token_manager.py** - Token counting & management
- **professional_prompts.py** - System prompts library

### Workers (`../workers/` - moved to project root)
Node.js Telegram bot processes:
- **telegram/bot_worker.js** - Individual bot instance
- **master/scalable_bot_manager.js** - Multi-bot orchestration

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/chatai

# Redis
REDIS_URL=redis://localhost:6379/0

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...

# Security
SECRET_KEY=your-secret-key
CORS_ORIGINS=https://yourapp.com,http://localhost:3000

# Telegram
TELEGRAM_BOT_TOKEN=bot-token-from-botfather
```

### Production Deployment
```bash
# Start production server
./start_production.sh

# Or with environment
ENVIRONMENT=production python3 main.py
```

## 📊 Monitoring & Observability

### Health Checks
- `GET /health` - Application health status
- `GET /metrics` - Prometheus metrics
- `GET /metrics/telegram-rate-limit` - Bot performance metrics

### Logging
- Application logs: `logs/api.log`
- Audit logs: `logs/audit.log`
- Automatic log rotation (daily, 7-day retention)

### Key Metrics
- HTTP request latency & count
- Database connection pool status  
- Redis availability
- SSE connections (Server-Sent Events)
- Telegram bot throughput

## 🛡️ Security Features

- **CSRF Protection** - Configurable CSRF middleware
- **Security Headers** - HSTS, CSP, X-Frame-Options
- **Rate Limiting** - Per-endpoint & per-user limits  
- **Input Validation** - Pydantic schemas & custom validators
- **Authentication** - JWT-based with refresh tokens
- **Authorization** - Role-based access control

## 🔄 Database Management

### Migrations
```bash
# ⚠️ PRODUCTION NOTE: Multiple migration heads exist
# Run deployment script to resolve before production:
./scripts/deploy_database_optimizations.sh

# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1

# Check migration status
alembic current
alembic heads
```

### Database Optimizations Applied
- **Connection Pool**: Optimized for production (15 + 20 overflow)
- **SSL Security**: Required for production environments  
- **Performance Indexes**: Added for critical query paths
- **Money Types**: Fixed to NUMERIC(12,2) for financial accuracy
- **Production Safety**: Disabled ORM create_all() in production

### Backup & Restore
```bash
# Database backup (moved to /scripts/backend/)
cd .. && python scripts/backend/admin/database_backup.py

# Monitor database size
python monitoring/db_size_monitor.py
```

## 🤖 Bot Management

### Start/Stop Bots
```bash
# Start all bots (from workers directory)
cd ../workers && npm run start

# Stop all bots  
cd ../workers && npm run stop

# Check status
cd ../workers && npm run status

# View logs
cd ../workers && npm run logs
```

### Bot Configuration
Bots are automatically created/updated based on database records in the `assistants` table.

## 🧪 Development

### Code Quality
- **Linting:** `ruff check .`
- **Formatting:** `black .`
- **Type checking:** `mypy .`
- **Import sorting:** `isort .`

### Testing
```bash
# Run tests - moved to /tests/backend/
cd ../tests/backend && python -m pytest integration/

# Test specific component
python -c "from database.connection import engine; print('DB: OK')"
```

## 📈 Performance

### Scalability
- Horizontal scaling via multiple worker processes
- Redis caching for frequently accessed data
- Connection pooling for database connections
- Rate limiting to prevent abuse

### Optimization Tips
- Use database indexes for frequent queries
- Cache expensive AI API calls
- Monitor and optimize slow database queries
- Use background tasks for heavy operations

## 🚨 Troubleshooting

### Common Issues

**Import Errors:**
```bash
# Ensure you're in the backend directory
cd /path/to/backend
python3 -c "from main import app; print('OK')"
```

**Database Connection:**
```bash
# Check database connectivity
python3 -c "from database.connection import engine; engine.execute('SELECT 1')"
```

**Bot Not Responding:**
```bash
# Check bot processes (from project root)
cd .. && node workers/scripts/start_scalable_system.js status

# Restart workers system
cd ../workers && npm restart
```

## 🔗 Related Documentation

- [API Documentation](../docs/api/) - OpenAPI/Swagger specs
- [Database Schema](../docs/db/) - Entity-relationship diagrams  
- [Deployment Guide](../docs/deployment/) - Production setup
- [Security Guidelines](../docs/security/) - Security best practices
- [Workers Documentation](../docs/runbooks/workers.md) - Node.js workers guide

## 📞 Support

For technical issues or questions:
1. Check the troubleshooting section above
2. Review application logs in `logs/`
3. Monitor system health via `/health` endpoint
4. Contact the development team

---

**Last Updated:** September 2025 (updated after repository reorganization)
**Version:** 1.0.0