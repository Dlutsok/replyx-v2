# API Endpoints Reference

**Last Updated:** 2025-09-04  
**📊 Total Endpoints:** 131+ endpoints across 20 API modules
**🔄 Auto-verified:** Endpoints checked against MVP 13 codebase

> 📋 **[Complete API Reference](endpoints_complete.md)** - Full auto-generated documentation of all 131 endpoints

Comprehensive reference for all ReplyX backend API endpoints. The FastAPI backend exposes RESTful APIs with JWT authentication, CSRF protection, and comprehensive rate limiting.

**Base URL:** `https://api.replyx.ru` (production) / `http://localhost:8000` (development)

## Authentication & Authorization

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required | Rate Limit |
|--------|----------|-------------|---------------|------------|
| `POST` | `/api/register` | User registration with email confirmation | No | 50/hour |
| `POST` | `/api/login` | User login (JWT + CSRF tokens) | No | 100/hour |
| `POST` | `/api/logout` | User logout (invalidate tokens) | Yes | - |
| `GET` | `/api/me` | Get current user profile | Yes | - |
| `POST` | `/api/change-password` | Change user password | Yes | 10/hour |
| `POST` | `/api/forgot-password` | Request password reset | No | 5/hour |
| `POST` | `/api/reset-password` | Reset password with token | No | 10/hour |
| `POST` | `/api/confirm-email` | Confirm email with code | No | 10/hour |
| `POST` | `/api/resend-confirmation` | Resend email confirmation | No | 5/hour |

**Authentication Flow:**
1. Register/login returns JWT access token and CSRF token
2. Include `Authorization: Bearer <token>` header
3. Include `X-CSRF-Token` header for state-changing operations
4. Tokens expire after configured time (default: 24 hours)

## User Management

### User Endpoints (`/api/users`)

| Method | Endpoint | Description | Auth Required | Admin Only |
|--------|----------|-------------|---------------|------------|
| `GET` | `/api/users/profile` | Get user profile details | Yes | No |
| `PUT` | `/api/users/profile` | Update user profile | Yes | No |
| `POST` | `/api/users/upload-avatar` | Upload user avatar | Yes | No |
| `DELETE` | `/api/users/delete-account` | Delete user account | Yes | No |
| `GET` | `/api/users/onboarding-status` | Get onboarding progress | Yes | No |
| `POST` | `/api/users/complete-onboarding-step` | Mark onboarding step complete | Yes | No |
| `POST` | `/api/users/skip-onboarding` | Skip onboarding process | Yes | No |

## Assistant Management

### Assistant Endpoints (`/api/assistants`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/assistants` | List user's assistants | Yes |
| `POST` | `/api/assistants` | Create new assistant | Yes |
| `GET` | `/api/assistants/{id}` | Get assistant details | Yes |
| `PUT` | `/api/assistants/{id}` | Update assistant configuration | Yes |
| `DELETE` | `/api/assistants/{id}` | Delete assistant | Yes |
| `POST` | `/api/assistants/{id}/reload` | Reload assistant configuration | Yes |
| `GET` | `/api/assistants/{id}/stats` | Get assistant usage statistics | Yes |
| `POST` | `/api/assistants/{id}/test` | Test assistant with sample message | Yes |

**Assistant Configuration:**
```json
{
  "name": "Customer Support Bot",
  "ai_model": "gpt-4o-mini",
  "system_prompt": "You are a helpful customer support assistant...",
  "website_integration_enabled": true,
  "is_active": true
}
```

## Dialog Management

### Dialog Endpoints (`/api/dialogs`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/dialogs` | List dialogs with filtering/pagination | Yes |
| `GET` | `/api/dialogs/{id}` | Get dialog details | Yes |
| `GET` | `/api/dialogs/{id}/messages` | Get dialog messages | Yes |
| `POST` | `/api/dialogs/{id}/messages` | Add message to dialog | Yes |
| `POST` | `/api/dialogs/{id}/takeover` | Manager takeover dialog | Yes |
| `POST` | `/api/dialogs/{id}/release` | Release dialog from manager | Yes |
| `GET` | `/api/dialogs/by-telegram-chat/{chat_id}` | Find dialog by Telegram chat | No |
| `GET` | `/api/dialogs/{id}/status` | Get dialog status for bots | No |

**Dialog Filtering Parameters:**
- `user_id`: Filter by user ID
- `assistant_id`: Filter by assistant
- `status`: Filter by dialog status
- `date_from`, `date_to`: Date range filtering
- `search`: Text search in messages
- `limit`, `offset`: Pagination

## Document Management

### Document Endpoints (`/api/documents`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/documents` | List uploaded documents | Yes |
| `POST` | `/api/documents/upload` | Upload document for knowledge base | Yes |
| `GET` | `/api/documents/{id}` | Get document details | Yes |
| `DELETE` | `/api/documents/{id}` | Delete document | Yes |
| `POST` | `/api/documents/{id}/reindex` | Re-index document for embeddings | Yes |
| `GET` | `/api/documents/{id}/knowledge` | Get extracted knowledge | Yes |
| `POST` | `/api/documents/bulk-upload` | Upload multiple documents | Yes |

**Supported Document Types:**
- PDF files (.pdf)
- Microsoft Word documents (.docx)
- Plain text files (.txt)
- Markdown files (.md)

## Bot Instance Management

### Bot Endpoints (`/api/bot-instances`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/bot-instances` | List user's bot instances | Yes |
| `POST` | `/api/bot-instances` | Create new Telegram bot | Yes |
| `GET` | `/api/bot-instances/{id}` | Get bot instance details | Yes |
| `PATCH` | `/api/bot-instances/{id}` | Update bot configuration | Yes |
| `DELETE` | `/api/bot-instances/{id}` | Delete bot instance | Yes |
| `POST` | `/api/start-bot/{id}` | Start bot instance | Yes |
| `POST` | `/api/stop-bot/{id}` | Stop bot instance | Yes |
| `GET` | `/api/bot-instances/{id}/assistant` | Get bot's assistant config | No |

**Bot Instance Configuration:**
```json
{
  "assistant_id": 123,
  "bot_token": "1234567890:AAAAAAAAAAAAAAAAAAAAAAAAAA",
  "platform": "telegram",
  "is_active": true
}
```

## Balance & Billing System

### Balance Endpoints (`/api/balance`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/balance/current` | Get current balance | Yes |
| `GET` | `/api/balance/stats` | Get balance statistics | Yes |
| `POST` | `/api/balance/topup` | Top up balance | Yes |
| `GET` | `/api/balance/transactions` | Get transaction history | Yes |
| `GET` | `/api/balance/transactions/detailed` | Get detailed transactions | Yes |
| `GET` | `/api/balance/prices` | Get service prices | No |
| `GET` | `/api/balance/check/{service_type}` | Check balance for service | Yes |
| `GET` | `/api/balance/usage-stats` | Get usage statistics | Yes |
| `GET` | `/api/balance/welcome-bonus-status` | Check welcome bonus status | Yes |
| `POST` | `/api/balance/claim-welcome-bonus` | Claim welcome bonus | Yes |

**Service Types & Pricing:**
- `ai_message`: AI assistant message (~0.001 ₽)
- `document_upload`: Document processing (~0.10 ₽)
- `bot_message`: Telegram bot message (~0.001 ₽)
- `embedding_generation`: Vector embedding (~0.0001 ₽)

## Handoff Management

### Handoff Endpoints (`/api/handoff`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/handoff/request` | Request operator handoff | Yes |
| `POST` | `/api/handoff/accept/{dialog_id}` | Accept handoff request | Yes |
| `POST` | `/api/handoff/release/{dialog_id}` | Release dialog back to AI | Yes |
| `GET` | `/api/handoff/queue` | Get handoff queue | Yes |
| `GET` | `/api/handoff/status/{dialog_id}` | Get handoff status | Yes |
| `POST` | `/api/handoff/auto-detect` | Trigger auto handoff detection | Yes |

**Handoff Status States:**
- `none`: No handoff requested
- `requested`: Handoff requested, waiting for operator
- `active`: Operator handling the dialog
- `resolved`: Handoff completed, back to AI

### Operator Endpoints (`/api/operator`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/operator/presence/heartbeat` | Update operator presence | Yes |
| `GET` | `/api/operator/presence/status` | Get presence status | Yes |
| `POST` | `/api/operator/presence/update` | Update availability settings | Yes |
| `GET` | `/api/operator/active-chats` | Get active assigned chats | Yes |

## Promotional System

### Promo Code Endpoints (`/api/promo`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/promo/apply` | Apply promo code to balance | Yes |
| `GET` | `/api/promo/validate/{code}` | Validate promo code | Yes |
| `GET` | `/api/promo/my-usage` | Get user's promo usage history | Yes |

### Referral Endpoints (`/api/referral`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/referral/my-code` | Get user's referral code | Yes |
| `GET` | `/api/referral/link` | Get referral link | Yes |
| `GET` | `/api/referral/stats` | Get referral statistics | Yes |
| `GET` | `/api/referral/my-referrals` | Get referrals made by user | Yes |
| `POST` | `/api/referral/register` | Register using referral code | No |

## AI & Token Management

### AI Chat Endpoints (`/api/ai-chat`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/ai-chat/message` | Send message to AI assistant | Yes |
| `POST` | `/api/ai-chat/stream` | Stream AI response (WebSocket) | Yes |
| `GET` | `/api/ai-chat/models` | Get available AI models | Yes |
| `GET` | `/api/ai-chat/usage` | Get AI usage statistics | Yes |

## Email & Support

### Email Endpoints (`/api/email`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/email/send-confirmation` | Send email confirmation | No |
| `POST` | `/api/email/send-password-reset` | Send password reset email | No |
| `POST` | `/api/email/send-support` | Send support request | Yes |

### Support Endpoints (`/api/support`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/support/ticket` | Create support ticket | Yes |
| `GET` | `/api/support/tickets` | List user's support tickets | Yes |
| `GET` | `/api/support/tickets/{id}` | Get support ticket details | Yes |
| `POST` | `/api/support/tickets/{id}/reply` | Reply to support ticket | Yes |

## WebSocket Connections

### Real-time Endpoints

| Endpoint | Protocol | Description | Auth Required |
|----------|----------|-------------|---------------|
| `/ws/dialog/{dialog_id}` | WebSocket | Real-time dialog updates | Yes |
| `/ws/site-dialog/{dialog_id}` | WebSocket | Site widget dialog updates | No |
| `/ws/widget-dialog/{dialog_id}` | WebSocket | Widget dialog updates | No |
| `/ws/operator/{operator_id}` | WebSocket | Operator dashboard updates | Yes |

**WebSocket Message Types:**
```json
{
  "type": "message_added",
  "data": {
    "dialog_id": 123,
    "message": { ... },
    "timestamp": "2025-08-22T10:00:00Z"
  }
}
```

## Administrative Endpoints

### Admin User Management (`/api/admin`)

| Method | Endpoint | Description | Admin Only |
|--------|----------|-------------|------------|
| `GET` | `/api/admin/users` | List all users | Yes |
| `PATCH` | `/api/admin/users/{id}` | Update user account | Yes |
| `DELETE` | `/api/admin/users/{id}` | Delete user account | Yes |
| `POST` | `/api/admin/users/{id}/balance/topup` | Adjust user balance | Yes |
| `GET` | `/api/admin/system-stats` | Get system statistics | Yes |
| `GET` | `/api/admin/realtime-stats` | Get real-time metrics | Yes |
| `GET` | `/api/admin/advanced-analytics` | Get advanced analytics | Yes |

### Admin AI Token Management

| Method | Endpoint | Description | Admin Only |
|--------|----------|-------------|------------|
| `GET` | `/api/admin/ai-tokens` | List AI token pool | Yes |
| `POST` | `/api/admin/ai-tokens` | Add AI token to pool | Yes |
| `PUT` | `/api/admin/ai-tokens/{id}` | Update AI token | Yes |
| `DELETE` | `/api/admin/ai-tokens/{id}` | Remove AI token | Yes |
| `GET` | `/api/admin/ai-tokens/{id}/usage` | Get token usage stats | Yes |

### Admin Analytics Endpoints

**New Analytics API** - Comprehensive analytics system with optimized queries and caching.

| Method | Endpoint | Description | Admin Only | Cache TTL |
|--------|----------|-------------|------------|-----------|
| `GET` | `/api/admin/analytics/overview` | General platform statistics | Yes | 5 min |
| `GET` | `/api/admin/analytics/users` | Detailed user analytics | Yes | 5 min |
| `GET` | `/api/admin/analytics/dialogs` | Dialog and AI usage statistics | Yes | 5 min |
| `GET` | `/api/admin/analytics/revenue` | Financial analytics and revenue | Yes | 5 min |

**Query Parameters:**
- `period`: `24h`, `7d`, `30d`, `90d`, `1y` (default: varies by endpoint)
- `page`: Page number for pagination (users endpoint only)
- `limit`: Items per page 1-100 (users endpoint only, default: 50)
- `sort_by`: Sort field - `created_at`, `last_activity`, `total_dialogs`, `balance` (users endpoint only)
- `order`: `asc` or `desc` (users endpoint only, default: desc)

**Analytics Overview Response:**
```json
{
  "total_users": 1250,
  "active_users_today": 87,
  "total_dialogs": 15420,
  "total_messages": 89340,
  "total_revenue": 12580.50,
  "growth_metrics": {
    "user_growth": 12.5,
    "dialog_growth": 8.2,
    "revenue_growth": 15.3,
    "activity_growth": 6.8
  }
}
```

**User Analytics Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "role": "user",
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z",
      "last_activity": "2024-08-23T15:45:00Z",
      "total_dialogs": 25,
      "balance": 100.50,
      "is_email_confirmed": true
    }
  ],
  "user_growth": {
    "total_users": 1250,
    "new_users_period": 45,
    "active_users_period": 234
  },
  "activity_stats": {
    "average_dialogs_per_user": 12.3,
    "confirmed_users": 1100,
    "admin_users": 5
  },
  "top_users": [
    {
      "user_id": 123,
      "email": "power_user@example.com",
      "message_count": 1250,
      "dialog_count": 45
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1250,
    "pages": 25
  }
}
```

**Dialog Analytics Response:**
```json
{
  "dialog_stats": {
    "total_dialogs": 15420,
    "dialogs_period": 234,
    "active_dialogs_24h": 45,
    "avg_messages_per_dialog": 5.8
  },
  "message_stats": {
    "total_messages": 89340,
    "messages_period": 1350,
    "ai_messages_period": 675,
    "user_messages_period": 675
  },
  "ai_usage": {
    "active_tokens": 3,
    "total_requests_today": 450,
    "average_response_time": 1.2
  },
  "popular_assistants": [
    {
      "assistant_id": 117,
      "name": "Support Assistant",
      "owner_email": "admin@example.com",
      "message_count": 125,
      "dialog_count": 35
    }
  ],
  "response_times": {
    "average_response_time": 1.5,
    "median_response_time": 1.2,
    "p95_response_time": 3.0
  }
}
```

**Revenue Analytics Response:**
```json
{
  "total_revenue": 12580.50,
  "revenue_by_period": {
    "current_period": 1250.00,
    "previous_period": 980.50
  },
  "balance_stats": {
    "total_user_balance": 5430.25,
    "total_spent": 8150.25,
    "average_balance": 4.34
  },
  "transaction_stats": {
    "total_transactions": 2340,
    "transactions_period": 156,
    "topup_transactions": 89,
    "spend_transactions": 67
  },
  "top_paying_users": [
    {
      "user_id": 456,
      "email": "premium_user@example.com",
      "total_paid": 500.00,
      "transaction_count": 12
    }
  ],
  "revenue_growth": {
    "current_period": 1250.00,
    "previous_period": 980.50,
    "growth_rate": 27.5,
    "growth_absolute": 269.50
  }
}
```

### Admin Settings Management

**System Settings API** - Complete administrative configuration management for ReplyX.

| Method | Endpoint | Description | Admin Only | Sensitive Data |
|--------|----------|-------------|------------|----------------|
| `GET` | `/api/admin/settings` | Get all system settings grouped by category | Yes | Masked |
| `GET` | `/api/admin/settings?category={cat}` | Get settings for specific category | Yes | Masked |
| `POST` | `/api/admin/settings/{category}/{key}` | Create new system setting | Yes | - |
| `PUT` | `/api/admin/settings/{category}/{key}` | Update existing setting | Yes | - |
| `DELETE` | `/api/admin/settings/{category}/{key}` | Delete setting (soft delete) | Yes | - |
| `POST` | `/api/admin/settings/bulk-update` | Update multiple settings at once | Yes | - |
| `POST` | `/api/admin/settings/test` | Test setting before applying | Yes | - |
| `GET` | `/api/admin/settings/categories` | Get available categories and descriptions | Yes | - |

**Available Categories:**
- `general` - System name, timezone, locale, maintenance mode
- `ai` - AI provider settings, models, token rotation
- `email` - SMTP configuration, email templates
- `security` - JWT settings, CSRF, rate limiting
- `limits` - User limits, quotas, file restrictions  
- `maintenance` - Backup settings, logs, monitoring

**Settings Response Example:**
```json
{
  "categories": [
    {
      "category": "general",
      "description": "Основные настройки системы",
      "settings": [
        {
          "id": 1,
          "category": "general",
          "key": "system_name",
          "value": "ReplyX",
          "data_type": "string",
          "is_sensitive": false,
          "description": "Название системы",
          "default_value": "ReplyX",
          "is_active": true,
          "created_at": "2025-01-26T10:00:00Z",
          "updated_at": "2025-01-26T10:00:00Z",
          "updated_by": 1
        }
      ]
    }
  ],
  "total_settings": 25,
  "last_updated": "2025-01-26T14:30:00Z"
}
```

**Create Setting Request:**
```json
{
  "category": "email",
  "key": "smtp_server", 
  "value": "smtp.yandex.ru",
  "data_type": "string",
  "is_sensitive": false,
  "description": "SMTP server address",
  "default_value": "smtp.yandex.ru"
}
```

**Bulk Update Request:**
```json
{
  "updates": [
    {
      "category": "ai",
      "key": "default_model", 
      "value": "gpt-4o"
    },
    {
      "category": "limits",
      "key": "max_file_size_mb",
      "value": "20"
    }
  ]
}
```

**Settings Test Request:**
```json
{
  "category": "email",
  "key": "smtp_server",
  "test_value": "smtp.gmail.com"
}
```

**Test Response:**
```json
{
  "success": true,
  "message": "SMTP server connection successful",
  "details": {
    "server": "smtp.gmail.com",
    "port": 465
  }
}
```

**Categories Response:**
```json
{
  "categories": [
    {
      "id": "general",
      "name": "Основные настройки",
      "description": "Название системы, timezone, локализация",
      "icon": "settings"
    },
    {
      "id": "ai",
      "name": "AI провайдеры", 
      "description": "Управление OpenAI токенами и моделями",
      "icon": "zap"
    }
  ]
}
```

**Security Notes:**
- Sensitive settings (passwords, tokens) are masked in GET responses as `***HIDDEN***`
- All endpoints require admin authentication via `get_current_admin` dependency
- Settings changes are logged with admin user ID and timestamp
- Soft delete is used - settings are deactivated, not permanently deleted
- Test endpoint allows validation without persisting changes

## System Endpoints

### Health & Monitoring

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | Health check endpoint | No |
| `GET` | `/metrics` | Prometheus metrics | No |
| `GET` | `/metrics/telegram-rate-limit` | Telegram rate limit metrics | No |
| `GET` | `/metrics/db-size` | Database size metrics | No |
| `GET` | `/api/csrf-token` | Get CSRF token | No |

### System Information

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/system/status` | System status information | No |
| `GET` | `/api/system/version` | Application version info | No |
| `GET` | `/api/system/config` | Public configuration | No |
| `GET` | `/api/system/health-detailed` | Detailed health check | No |

### Admin Bots Monitoring (`/api/admin/bots-monitoring`)

**New real-time bot monitoring system** - Comprehensive monitoring, management and control of all Telegram bot instances.

| Method | Endpoint | Description | Admin Only | Cache TTL |
|--------|----------|-------------|------------|-----------|
| `GET` | `/api/admin/bots-monitoring` | Get real-time bot monitoring data | Yes | - |
| `GET` | `/api/admin/bots-monitoring/stats` | Get aggregated bot statistics | Yes | - |
| `POST` | `/api/admin/bots/{bot_id}/action` | Perform bot management actions | Yes | - |

**Query Parameters (bots-monitoring):**
- `status`: Filter by bot status - `all`, `online`, `offline`, `error`, `starting` (default: all)
- `search`: Text search by bot name or ID
- `period`: Analysis period - `24h`, `7d`, `30d` (default: 7d)

**Query Parameters (stats):**
- `period`: Statistics period - `24h`, `7d`, `30d` (default: 7d)

**Bot Action Body:**
```json
{
  "action": "start" | "stop" | "restart"
}
```

**Bots Monitoring Response:**
```json
[
  {
    "id": "bot_123",
    "name": "Customer Support Bot",
    "status": "online",
    "user_email": "admin@example.com",
    "messages_count": 1250,
    "active_users": 45,
    "uptime": "5d 12h 30m",
    "last_activity": "2025-01-23T14:30:00Z",
    "performance": {
      "avg_response_time": 0.8,
      "errors_count": 2,
      "memory_usage": "145MB"
    }
  }
]
```

**Bot Stats Response:**
```json
{
  "active_bots": 12,
  "total_bots": 15,
  "messages_per_hour": 450,
  "active_users": 1200,
  "error_bots": 1,
  "changes": {
    "active_bots": +2,
    "messages_per_hour": +15,
    "active_users": +85,
    "error_bots": -1
  }
}
```

**Bot Status Codes:**
- `online`: Bot is running and processing messages
- `offline`: Bot is intentionally stopped
- `error`: Bot has crashed or configuration issues
- `starting`: Bot is in startup process
- `archived`: Bot is inactive and archived

## System Administration & Monitoring

### System Endpoints (`/api/system`)

**Comprehensive system monitoring endpoints for administrative dashboard with real-time metrics.**

| Method | Endpoint | Description | Auth Required | Response Model |
|--------|----------|-------------|---------------|----------------|
| `GET` | `/api/system/healthz` | Kubernetes liveness probe | No | Simple OK |
| `GET` | `/api/system/readyz` | Kubernetes readiness probe | No | Health summary |
| `GET` | `/api/system/status` | Basic system status | No | Status info |
| `GET` | `/api/system/health` | Comprehensive health check | No | `HealthCheckResponse` |
| `GET` | `/api/system/logs` | System logs with filtering | Admin | `SystemLogsResponse` |
| `GET` | `/api/system/database` | Database information | Admin | `DatabaseInfoResponse` |
| `GET` | `/api/system/cache` | Redis cache information | Admin | `CacheInfoResponse` |
| `POST` | `/api/system/cache/clear` | Clear Redis cache | Admin | `CacheClearResponse` |
| `GET` | `/api/system/performance` | System performance metrics | Admin | `PerformanceMetricsResponse` |
| `GET` | `/api/system/processes` | Running processes info | Admin | `ProcessesResponse` |

### System Health Check

**GET** `/api/system/health`

Comprehensive system health monitoring with real-time checks for critical components.

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-26T15:30:00Z",
  "response_time_ms": 45.2,
  "checks": {
    "api": {
      "status": "ok",
      "details": "FastAPI working"
    },
    "database": {
      "status": "ok", 
      "details": "PostgreSQL connection active"
    },
    "redis": {
      "status": "ok",
      "details": "Redis connected, hit rate: 85%"
    },
    "file_system": {
      "status": "ok",
      "details": "Uploads directory writable"
    },
    "disk": {
      "status": "ok",
      "details": "Free: 45.2GB/100GB"
    }
  },
  "summary": {
    "total_checks": 5,
    "passed": 5,
    "failed": 0,
    "degraded": 0
  }
}
```

### System Logs

**GET** `/api/system/logs`

Retrieve system logs with filtering and pagination.

**Query Parameters:**
- `level`: `all` | `error` | `warn` | `info` | `debug` (default: all)
- `search`: Text search in log messages
- `limit`: Number of logs to return (max 1000, default 100)
- `offset`: Pagination offset (default 0)  
- `time_range`: `1h` | `6h` | `24h` | `7d` (default: 24h)

**Response Example:**
```json
{
  "logs": [
    {
      "id": 1,
      "timestamp": "2025-08-26T15:25:00Z",
      "level": "info",
      "message": "API endpoint /health called successfully",
      "source": "fastapi",
      "user_id": null
    },
    {
      "id": 2,
      "timestamp": "2025-08-26T15:15:00Z", 
      "level": "warn",
      "message": "High CPU usage detected: 85%",
      "source": "system_monitor",
      "user_id": null
    }
  ],
  "total": 156,
  "has_more": true,
  "filters": {
    "level": "all",
    "search": null,
    "time_range": "24h"
  },
  "pagination": {
    "offset": 0,
    "limit": 100,
    "total_pages": 2
  }
}
```

### Database Information

**GET** `/api/system/database`

Get comprehensive database metrics and statistics.

**Response Example:**
```json
{
  "database_size": "2.5 GB",
  "tables_count": 25,
  "active_connections": 12,
  "large_tables": [
    {
      "schema": "public",
      "table": "dialog_messages", 
      "size": "1.2 GB",
      "bytes": 1288490188
    },
    {
      "schema": "public",
      "table": "documents",
      "size": "450 MB", 
      "bytes": 471859200
    }
  ],
  "status": "healthy"
}
```

### Cache Information

**GET** `/api/system/cache`

Get Redis cache statistics and health status.

**Response Example:**
```json
{
  "status": "healthy",
  "stats": {
    "hit_rate": 85.4,
    "memory_usage": "156MB",
    "total_keys": 1247,
    "expires_keys": 892, 
    "connected_clients": 3
  },
  "is_available": true
}
```

### Performance Metrics

**GET** `/api/system/performance`

Real-time system performance metrics including CPU, memory, disk, and network.

**Response Example:**
```json
{
  "cpu": {
    "usage_percent": 45.2,
    "cores": 4,
    "load_avg_1m": 1.2,
    "load_avg_5m": 1.1,
    "load_avg_15m": 0.9
  },
  "memory": {
    "total": 8589934592,
    "available": 4294967296, 
    "used": 4294967296,
    "usage_percent": 50.0,
    "free": 4294967296
  },
  "disk": {
    "total": 107374182400,
    "used": 53687091200,
    "free": 53687091200,
    "usage_percent": 50.0
  },
  "network": {
    "bytes_sent": 1048576000,
    "bytes_recv": 2097152000,
    "packets_sent": 1000000,
    "packets_recv": 1500000
  },
  "timestamp": "2025-08-26T15:30:00Z"
}
```

### System Processes

**GET** `/api/system/processes`

Get information about running system processes.

**Response Example:**
```json
{
  "processes": [
    {
      "pid": 1234,
      "name": "python",
      "cpu_percent": 15.5,
      "memory_percent": 8.2,
      "status": "running"
    },
    {
      "pid": 5678,
      "name": "postgres",
      "cpu_percent": 5.1,
      "memory_percent": 12.3, 
      "status": "running"
    }
  ],
  "total_processes": 2
}
```

### Cache Management

**POST** `/api/system/cache/clear`

Clear Redis cache by type or clear all cache.

**Query Parameters:**
- `cache_type`: `all` | `user_metrics` | `embeddings` | `sessions` (default: all)

**Response Example:**
```json
{
  "success": true,
  "cleared_keys": 1247,
  "cache_type": "all", 
  "message": "Кэш all успешно очищен"
}
```

### 🆕 **Recently Added Endpoints (Not Previously Documented):**

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/admin/advanced-analytics` | Advanced analytics with real calculations | Yes (Admin) |
| `GET` | `/api/admin/system-stats` | System statistics with real growth metrics | Yes (Admin) |
| `POST` | `/api/admin/analytics/refresh-cache` | Refresh analytics cache | Yes (Admin) |

## Error Handling

### Standard HTTP Status Codes

| Code | Description | Usage |
|------|-------------|--------|
| `200` | OK | Successful request |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid request data |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict (duplicate, state) |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "timestamp": "2025-08-22T10:00:00Z",
    "request_id": "req_123456"
  }
}
```

## Rate Limiting

### Rate Limit Headers

All API responses include rate limiting headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

### Rate Limit Configurations

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 100 requests | 1 hour |
| Registration | 50 requests | 1 hour |
| Password Reset | 5 requests | 1 hour |
| File Upload | 20 requests | 1 hour |
| AI Messages | 1000 requests | 1 hour |
| General API | 3600 requests | 1 hour |

## SDK and Integration

### JavaScript/TypeScript SDK

```javascript
import { ReplyXClient } from '@replyx/sdk';

const client = new ReplyXClient({
  apiUrl: 'https://api.replyx.ru',
  accessToken: 'your-jwt-token'
});

// Send message to assistant
const response = await client.dialogs.sendMessage(dialogId, {
  text: 'Hello, assistant!',
  sender: 'user'
});
```

### Widget Integration

```html
<script src="https://api.replyx.ru/widget.js"></script>
<script>
  ReplyXWidget.init({
    assistantId: '123',
    position: 'bottom-right',
    theme: 'light'
  });
</script>
```
