# Service Catalog - ReplyX MVP 13

**Last Updated:** 2025-09-14
**Version:** v1.3 - Complete Service Documentation

Comprehensive catalog of all services, entry points, dependencies, and operational procedures for the ReplyX platform.

## 1. Backend API Service

**Entry Point:** `backend/main.py`
**Technology:** FastAPI 0.104+ / Python 3.9+
**Port:** 8000 (HTTP)

**Description:** Main backend API service providing RESTful endpoints, authentication, business logic, and real-time communications.

**Key Components:**
- 24 API modules (auth, assistants, dialogs, documents, balance, etc.)
- JWT authentication with CSRF protection
- Server-Sent Events (SSE) for real-time updates
- PostgreSQL + Redis integration
- AI provider routing and token management

**Dependencies:**
- **Database:** PostgreSQL 14+ with pgvector
- **Cache:** Redis 6+
- **AI Providers:** OpenAI API, YandexGPT (optional)
- **External Services:** SMTP, Payment gateways

**Health Check:** `GET /health`
**Metrics:** `GET /metrics` (Prometheus format)
**Documentation:** `docs/api/endpoints.md`
**Runbook:** `docs/runbooks/backend.md`

**Critical Files:**
- `core/app_config.py` - Configuration management
- `database/models.py` - ORM models
- `services/` - Business logic services
- `alembic/versions/` - Database migrations

## 2. Real-time Communications Service

**Entry Point:** `services/sse_manager.py`
**Technology:** Server-Sent Events (SSE)
**Port:** 8000 (same as backend)

**Description:** Real-time communication service for live updates, operator handoff, and system notifications.

**Key Features:**
- SSE connections for dialogs and admin dashboard
- Redis Pub/Sub for inter-service messaging
- WebSocket bridge compatibility (legacy)
- Connection management and heartbeat monitoring

**Events:** `docs/realtime/events.md`
**Architecture:** `docs/realtime/sse-architecture.md`
**Migration Guide:** `docs/realtime/websocket-to-sse.md`

**Dependencies:**
- **Backend API:** FastAPI lifespan integration
- **Redis:** Pub/Sub messaging
- **Frontend:** EventSource connections

## 3. Telegram Bot Workers

**Entry Point:** `workers/master/scalable_bot_manager.js`
**Technology:** Node.js 18+ / Express.js
**Port:** 3001 (HTTP health checks)

**Description:** Scalable Telegram bot management system supporting 1000+ concurrent bot instances with process isolation.

**Architecture:**
- **Master Process:** `scalable_bot_manager.js` - Bot orchestration
- **Worker Processes:** `telegram/bot_worker.js` - Individual bot instances
- **Process Isolation:** Each bot runs in separate Node.js worker
- **Rate Limiting:** Telegram API compliance (30 msg/sec per bot)

**Features:**
- Automatic worker restart on crashes
- IPC communication between master and workers
- Advanced rate limiting and message queuing
- Health monitoring and performance metrics

**Health Check:** `GET http://localhost:3001/status`
**Dependencies:**
- **Backend API:** Bot configuration and message processing
- **Database:** Bot instances and dialog data
- **Telegram API:** Bot token validation and webhook setup

**Documentation:** `docs/runbooks/workers.md`
**Monitoring:** `docs/admin/bots-monitoring.md`

## 4. AI Services Subsystem

**Entry Point:** `ai/ai_providers.py`
**Technology:** Python async/await
**Integrated with:** Backend API

**Description:** Intelligent AI routing system with multi-provider support, token pooling, and automatic failover.

**Key Components:**
- **AI Providers** (`ai_providers.py`) - Multi-provider integration
- **Token Manager** (`ai_token_manager.py`) - Token pooling and rotation
- **Proxy Manager** (`proxy_manager.py`) - Proxy failover system
- **Training System** (`training_system.py`) - AI improvement

**Supported Providers:**
- OpenAI (GPT-4o, GPT-4o-mini, GPT-4)
- YandexGPT (Russian optimization)
- Anthropic Claude (backup)
- GigaChat (compliance)

**Features:**
- Intelligent routing based on use case
- Circuit breaker for failed providers
- Token usage analytics and cost optimization
- Proxy pool with automatic failover

**Documentation:** `docs/ai/routing.md`
**Admin API:** `/api/admin/ai-tokens`

## 5. Billing & Balance System

**Entry Point:** `services/balance_service.py`
**Database Tables:** `user_balances`, `balance_transactions`, `service_prices`
**Integrated with:** Backend API

**Description:** Comprehensive billing system with service pricing, transaction tracking, and payment gateway integration.

**Features:**
- Multi-service pricing (AI messages, documents, bot messages)
- Real-time balance tracking and quotas
- Transaction history and analytics
- Promo codes and referral system
- YooKassa payment integration

**Services Pricing:**
- AI Message: ~0.001 ₽
- Document Upload: ~0.10 ₽
- Bot Message: ~0.001 ₽
- Embedding Generation: ~0.0001 ₽

**API Endpoints:** `/api/balance/*`
**Documentation:** `docs/billing/model.md`, `docs/billing/limits_quotas.md`

## 6. Database Service

**Technology:** PostgreSQL 14+ with pgvector extension
**Entry Point:** `database/connection.py`
**Port:** 5432

**Description:** Primary data persistence layer with vector search capabilities for AI embeddings.

**Key Features:**
- 30+ optimized tables with proper relationships
- pgvector extension for semantic search
- Comprehensive indexing for performance
- Alembic migrations for schema management
- Connection pooling and query optimization

**Critical Tables:**
- `users` - User accounts and authentication
- `assistants` - AI assistant configurations
- `dialogs` - Conversation management
- `dialog_messages` - Individual messages
- `knowledge_embeddings` - Vector search data
- `ai_token_pool` - AI token management

**Performance:**
- 30+ production-ready indexes
- IVFFLAT vector similarity indexes
- Connection pooling with SQLAlchemy
- Query optimization and monitoring

**Migrations:** `alembic/versions/` (8 production-ready migrations)
**Schema:** `docs/db/schema.md`
**Runbook:** `docs/runbooks/database.md`

## 7. Cache & Session Service

**Technology:** Redis 6+
**Entry Point:** `cache/redis_cache.py`
**Port:** 6379

**Description:** High-performance caching and session management service.

**Use Cases:**
- Session storage and management
- API response caching
- Rate limiting counters
- Pub/Sub messaging for real-time features
- AI token usage tracking

**Features:**
- Automatic TTL management
- Cache hit rate monitoring
- Pub/Sub for event distribution
- Session data encryption

**Health Check:** `redis-cli ping`
**Monitoring:** Built into `/health` endpoint

## 8. Frontend Service

**Entry Point:** `frontend/pages/`
**Technology:** Next.js 13.5.11 / React 18.2.0
**Port:** 3000 (HTTP)

**Description:** Modern React-based frontend with comprehensive admin dashboard and customer widget.

**Key Features:**
- 39 pages including full admin panel
- 19 custom React hooks
- Tailwind CSS with design tokens
- Mantine UI components
- Real-time SSE integration

**Main Sections:**
- **User Dashboard:** Assistant management, dialogs, documents
- **Admin Panel:** System monitoring, user management, analytics
- **Chat Widget:** Embeddable customer support widget
- **Operator Interface:** Human handoff management

**Dependencies:**
- **Backend API:** All data and business logic
- **SSE Service:** Real-time updates
- **Authentication:** JWT token validation

**Runbook:** `docs/runbooks/frontend.md`
**Architecture:** `docs/frontend/structure-guide.md`

## 9. Monitoring & Analytics Service

**Entry Point:** `monitoring/` (multiple components)
**Technology:** Prometheus metrics / Custom analytics
**Integrated with:** Backend API

**Description:** Comprehensive monitoring, metrics collection, and business analytics system.

**Components:**
- **Prometheus Metrics:** System and business metrics
- **Health Monitoring:** Component status tracking
- **Audit Logging:** Security and compliance tracking
- **Database Monitoring:** Size tracking and growth analysis
- **Rate Limit Monitoring:** Telegram API compliance

**Metrics Categories:**
- **System Metrics:** CPU, memory, disk, network
- **Application Metrics:** API response times, error rates
- **Business Metrics:** User activity, revenue, bot usage
- **AI Metrics:** Token usage, model performance

**Endpoints:**
- `/health` - System health status
- `/metrics` - Prometheus metrics
- `/api/admin/analytics/*` - Business analytics

## 10. Security Service

**Entry Point:** `core/security/` (multiple modules)
**Technology:** JWT, CSRF, CORS middlewares
**Integrated with:** Backend API

**Description:** Multi-layered security system with authentication, authorization, and threat protection.

**Components:**
- **Authentication:** JWT tokens with configurable expiration
- **CSRF Protection:** Dynamic token validation
- **CORS Management:** Dynamic origin-based policies
- **Security Headers:** HSTS, CSP, X-Frame-Options
- **Rate Limiting:** Per-endpoint and per-user limits
- **Fail2ban Integration:** Intrusion prevention

**Features:**
- Role-based access control (user/admin/operator)
- Dynamic CSP for iframe embedding
- File-based secret management
- Security event logging and alerting

**Documentation:** `docs/security/threat_model.md`
**Implementation:** `docs/security/authentication.md`

## 11. Document Management Service

**Entry Point:** `services/document_service.py`
**Storage:** `/uploads` directory
**Integrated with:** Backend API

**Description:** Document processing and knowledge base management system.

**Features:**
- Multi-format document support (PDF, DOCX, TXT, MD)
- Vector embedding generation for semantic search
- Document chunking and indexing
- Knowledge base version management
- File validation and security scanning

**Supported Formats:**
- PDF documents
- Microsoft Word (.docx)
- Plain text (.txt)
- Markdown (.md)

**AI Integration:**
- Automatic text extraction
- Vector embedding generation
- Semantic search with pgvector
- Context-aware AI responses

**API Endpoints:** `/api/documents/*`

## 12. Admin Dashboard Service

**Entry Point:** `/api/admin/*` (Backend) + `pages/admin/*` (Frontend)
**Technology:** FastAPI + Next.js
**Authentication:** Admin role required

**Description:** Comprehensive administrative interface for system management and monitoring.

**Key Features:**
- **User Management:** Account administration and support
- **System Analytics:** Real-time metrics and business intelligence
- **AI Token Management:** Provider configuration and monitoring
- **Bot Monitoring:** Real-time bot status and performance
- **System Settings:** Configuration management
- **Security Monitoring:** Audit logs and security alerts

**Real-time Features:**
- Live system metrics
- Bot performance monitoring
- User activity tracking
- Revenue analytics

**API Coverage:** 20+ admin-specific endpoints
**Documentation:** `docs/admin/architecture.md`

## Service Dependencies Matrix

| Service | PostgreSQL | Redis | OpenAI | Telegram | SMTP | Files |
|---------|-----------|-------|--------|----------|------|-------|
| **Backend API** | ✅ Primary | ✅ Cache | ✅ AI | ➖ API Only | ✅ Emails | ✅ Uploads |
| **SSE Service** | ➖ Read Only | ✅ Pub/Sub | ➖ None | ➖ None | ➖ None | ➖ None |
| **Bot Workers** | ✅ Dialogs | ✅ State | ➖ None | ✅ Primary | ➖ None | ➖ None |
| **AI Service** | ✅ Tokens | ✅ Cache | ✅ Primary | ➖ None | ➖ None | ➖ None |
| **Frontend** | ➖ None | ➖ None | ➖ None | ➖ None | ➖ None | ➖ None |

## Service Startup Order

**Production Deployment Sequence:**
1. **PostgreSQL** - Database service (first)
2. **Redis** - Cache and messaging
3. **Backend API** - Core application service
4. **Bot Workers** - Telegram bot management
5. **Frontend** - User interface (last)

**Health Check Sequence:**
```bash
# 1. Check database
psql $DATABASE_URL -c "SELECT 1;"

# 2. Check Redis
redis-cli ping

# 3. Check backend
curl http://localhost:8000/health

# 4. Check bot workers
curl http://localhost:3001/status

# 5. Check frontend
curl http://localhost:3000/
```

## Emergency Contacts & Runbooks

| Service | Primary Runbook | Emergency Procedure | Health Check |
|---------|----------------|-------------------|--------------|
| **Backend API** | `docs/runbooks/backend.md` | Restart service | `/health` |
| **Bot Workers** | `docs/runbooks/workers.md` | Restart manager | `:3001/status` |
| **Database** | `docs/runbooks/database.md` | Check connections | `psql -c "SELECT 1"` |
| **Frontend** | `docs/runbooks/frontend.md` | Rebuild/restart | Manual check |
| **Redis** | `docs/runbooks/backend.md` | Restart service | `redis-cli ping` |

This service catalog provides a comprehensive overview of all ReplyX platform services, their interdependencies, and operational procedures for production environments.
