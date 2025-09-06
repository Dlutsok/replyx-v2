# ReplyX Repository Structure Schema

## Overview

This document defines the standardized directory structure for the ReplyX project, ensuring consistency, maintainability, and clear separation of concerns.

## Root Level Structure

```
/
├── backend/           # Python FastAPI application
├── frontend/          # Next.js React application  
├── workers/           # Node.js Telegram bot workers
├── docs/              # Project documentation
├── scripts/           # Operations and maintenance scripts
├── .github/           # GitHub workflows and templates
├── .dev/              # Development tools and artifacts (gitignored)
└── alembic/           # Database migration tool (linked to backend)
```

## Backend Structure (Python/FastAPI)

```
backend/
├── __init__.py        # Package initialization
├── main.py            # Application entry point
├── ai/                # AI providers and routing
│   ├── __init__.py
│   ├── providers/     # LLM provider implementations
│   ├── routing/       # AI request routing logic
│   ├── prompts/       # Prompt templates and management
│   └── token_manager/ # Token usage tracking
├── api/               # FastAPI routers and endpoints
│   ├── __init__.py
│   ├── v1/           # API version 1 endpoints
│   ├── auth/         # Authentication endpoints
│   ├── admin/        # Admin-specific endpoints
│   └── webhooks/     # External webhook handlers
├── core/              # Application core components
│   ├── __init__.py
│   ├── config.py     # Configuration management
│   ├── dependencies.py # FastAPI dependencies
│   ├── middleware.py  # Custom middleware
│   └── security.py    # Security utilities
├── services/          # Business logic layer
│   ├── __init__.py
│   ├── ai_service.py
│   ├── chat_service.py
│   ├── user_service.py
│   └── billing_service.py
├── database/          # Database layer
│   ├── __init__.py
│   ├── models.py     # SQLAlchemy models
│   ├── crud.py       # CRUD operations
│   ├── session.py    # Database session management
│   └── utils/        # Database utilities
├── monitoring/        # Observability components
│   ├── __init__.py
│   ├── metrics.py    # Prometheus metrics
│   ├── logging.py    # Structured logging
│   └── tracing.py    # Distributed tracing
├── security/          # Security components
│   ├── __init__.py
│   ├── auth.py       # Authentication logic
│   ├── permissions.py # Authorization logic
│   └── validators.py  # Input validation
├── integrations/      # External service integrations
│   ├── __init__.py
│   ├── telegram/     # Telegram API integration
│   ├── payment/      # Payment processor integration
│   └── analytics/    # Analytics service integration
├── schemas/           # Pydantic schemas
│   ├── __init__.py
│   ├── user.py
│   ├── chat.py
│   └── billing.py
├── utils/             # Utility functions
│   ├── __init__.py
│   ├── helpers.py
│   └── decorators.py
└── tests/             # Test suite
    ├── __init__.py
    ├── conftest.py   # Pytest configuration
    ├── unit/         # Unit tests
    ├── integration/  # Integration tests
    └── fixtures/     # Test fixtures
```

## Frontend Structure (Next.js/React)

```
frontend/
├── package.json       # NPM configuration
├── next.config.js     # Next.js configuration
├── tsconfig.json      # TypeScript configuration
├── tailwind.config.js # Tailwind CSS configuration
├── components/        # React components
│   ├── common/       # Shared/reusable components
│   ├── layout/       # Layout components
│   ├── ui/          # UI component library
│   ├── dashboard/   # Dashboard-specific components
│   ├── admin/       # Admin interface components
│   ├── assistant/   # AI assistant components
│   ├── dialogs/     # Modal dialogs and overlays
│   └── landing/     # Landing page components
├── pages/            # Next.js pages (legacy router)
│   ├── api/         # API routes
│   ├── admin/       # Admin pages
│   ├── assistant/   # Assistant interface pages
│   └── _app.js      # App wrapper
├── app/              # Next.js 13+ app directory (if migrating)
│   ├── layout.tsx
│   ├── page.tsx
│   └── (routes)/    # Route groups
├── hooks/            # Custom React hooks
│   ├── useAuth.js
│   ├── useWebSocket.js
│   └── useLocalStorage.js
├── contexts/         # React context providers
│   ├── AuthContext.js
│   ├── ThemeContext.js
│   └── ChatContext.js
├── lib/              # Frontend libraries and utilities
│   ├── api.js       # API client
│   ├── auth.js      # Authentication utilities
│   ├── websocket.js # WebSocket client
│   └── utils.js     # General utilities
├── styles/           # CSS and styling
│   ├── globals.css  # Global styles
│   ├── components/  # Component-specific styles
│   └── layout/      # Layout-specific styles
├── constants/        # Frontend constants
│   ├── api.js       # API endpoints
│   ├── routes.js    # Route definitions
│   └── config.js    # Frontend configuration
├── config/           # Configuration files
│   ├── env.js       # Environment configuration
│   └── theme.js     # Theme configuration
├── public/           # Static assets
│   ├── images/      # Image assets
│   ├── icons/       # Icon files
│   └── favicon.ico  # Site favicon
├── utils/            # Utility functions
│   ├── formatters.js # Data formatting utilities
│   ├── validators.js # Form validation
│   └── helpers.js    # General helper functions
└── tests/            # Frontend tests
    ├── __tests__/   # Jest test files
    ├── components/  # Component tests
    └── utils/       # Utility tests
```

## Workers Structure (Node.js)

```
workers/
├── package.json       # NPM configuration
├── master/           # Master process management
│   ├── scalable_bot_manager.js # Main manager process
│   ├── worker_pool.js          # Worker pool management
│   └── health_monitor.js       # Health monitoring
├── telegram/         # Telegram bot workers
│   ├── bot_worker.js          # Individual bot worker
│   ├── message_handler.js     # Message processing
│   ├── webhook_handler.js     # Webhook processing
│   └── rate_limiter.js        # Rate limiting logic
├── services/         # Worker business logic
│   ├── ai_integration.js      # AI service integration
│   ├── user_management.js     # User management
│   └── analytics.js           # Analytics collection
├── config/           # Worker configuration
│   ├── bot_config.js         # Bot configuration
│   ├── redis_config.js       # Redis configuration
│   └── monitoring_config.js   # Monitoring configuration
├── scripts/          # Worker utilities
│   ├── cleanup_processes.js  # Process cleanup
│   ├── monitor_workers.js    # Worker monitoring
│   └── deploy_workers.js     # Deployment utilities
├── logs/             # Worker logs (gitignored)
└── tmp/              # Temporary files (gitignored)
```

## Documentation Structure

```
docs/
├── README.md          # Main project documentation
├── architecture/      # Architecture documentation
│   ├── overview.md
│   ├── service-catalog.md
│   ├── data-flow.md
│   └── deployment-architecture.md
├── api/              # API documentation
│   ├── openapi.json  # OpenAPI specification
│   ├── examples/     # API usage examples
│   └── authentication.md
├── adr/              # Architecture Decision Records
│   ├── ADR-0001-architecture-decisions.md
│   └── ADR-0002-structure-refactor.md
├── deployment/       # Deployment documentation
│   ├── guides/      # Deployment guides
│   └── infrastructure/ # Infrastructure documentation
├── development/      # Development guides
│   ├── setup.md     # Development setup
│   ├── contributing.md # Contribution guidelines
│   └── coding-standards.md
└── runbooks/         # Operational runbooks
    ├── monitoring.md
    ├── troubleshooting.md
    └── backup-restore.md
```

## Scripts Structure

```
scripts/
├── backend/          # Backend-specific scripts
│   ├── debug/       # Debugging utilities
│   ├── maintenance/ # Maintenance scripts
│   └── legacy/      # Legacy migration scripts
├── deployment/       # Deployment scripts
│   ├── deploy.sh    # Main deployment script
│   ├── rollback.sh  # Rollback script
│   └── health_check.sh # Health verification
├── ops/             # Operations scripts
│   ├── backup.sh    # Backup operations
│   ├── monitoring/  # Monitoring setup
│   └── load/        # Load testing scripts
└── maintenance/     # General maintenance
    ├── cleanup.sh   # Cleanup utilities
    └── updates.sh   # Update procedures
```

## Import Path Conventions

### Frontend (TypeScript/JavaScript)
```javascript
// Use @ aliases for internal modules
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/constants/api';

// Relative imports only for sibling files
import './Component.css';
import { helper } from './utils';
```

### Backend (Python)
```python
# Use absolute imports from backend package
from backend.services.ai_service import AIService
from backend.database.models import User
from backend.core.config import settings

# Relative imports only within same module
from .utils import helper_function
```

### Workers (Node.js)
```javascript
// Use # aliases for internal modules (if configured)
const { BotWorker } = require('#workers/telegram/bot_worker');
const config = require('#config/bot_config');

// Standard Node.js require for external modules
const express = require('express');
```

## Gitignore Standards

### Global Ignores
```gitignore
# Development artifacts
.dev/
.vscode/settings.json
.idea/

# Cache directories
.pytest_cache/
__pycache__/
node_modules/
.next/

# Test artifacts
test-artifacts/
*.log
*.tmp

# Environment files
.env.local
.env.*.local

# Build outputs
dist/
build/
*.egg-info/
```

## Validation Rules

### Prohibited Top-Level Directories
- Temporary directories (test-artifacts, tmp)
- Cache directories (.pytest_cache, __pycache__)
- Development artifacts (TASK, reports)
- IDE-specific directories (.vscode, .idea)

### Import Pattern Rules
- No deep relative imports (../../..) longer than 2 levels
- Use path aliases for cross-module imports
- Absolute imports for Python modules
- Consistent alias usage in TypeScript

### Naming Conventions
- **Directories**: lowercase with hyphens (kebab-case)
- **Files**: camelCase for JS/TS, snake_case for Python
- **Components**: PascalCase for React components
- **Constants**: UPPER_SNAKE_CASE

This schema ensures a scalable, maintainable repository structure that supports the growth and complexity of the ReplyX project while maintaining clear separation of concerns and consistent conventions.