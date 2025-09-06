# ReplyX Repository Structure Analysis & Standardization Plan

## Current Structure Assessment

### ✅ Well-Organized Directories
- `backend/` - Python FastAPI application (good internal structure)
- `frontend/` - Next.js application (good internal structure) 
- `workers/` - Node.js Telegram bot workers (good internal structure)
- `docs/` - Well-organized documentation after RAD refactoring
- `scripts/` - Organized scripts after RAD refactoring
- `tests/` - Good test organization

### ⚠️ Problematic Directories
- `TASK/` - Agent working files (should be moved to `.claude/` or ignored)
- `archive/` - Contains old versions (`11/`, `Deployed/`, `reports/`)
- `test-artifacts/` - Test outputs (should be in `tests/reports/`)
- `logs/` - Application logs (should be in `backend/logs/` or `workers/logs/`)
- `uploads/` - User uploads (should be in `backend/uploads/`)
- `payments/` - Payment configs (should be in `backend/integrations/`)
- `tools/` - Utility tools (should be in `scripts/tools/`)
- `configs/` - Loose configs (should be integrated into service directories)

### 🔧 Import System Issues
- **Frontend**: Has basic aliases (`@/*`) but could be more specific
- **Backend**: No formal package structure, relies on relative imports
- **Workers**: No alias system, basic Node.js imports

## Target Structure

```
/
├── backend/                 # Python FastAPI backend
│   ├── api/                # FastAPI routers & endpoints
│   ├── ai/                 # AI providers, routing, prompts
│   ├── core/               # App startup, config, middleware
│   ├── services/           # Business logic (use cases)
│   ├── database/           # Models, CRUD, session management
│   ├── integrations/       # External services (payments, etc.)
│   ├── monitoring/         # Metrics, logging, tracing
│   ├── security/           # Auth, validation, encryption
│   ├── uploads/            # File storage (moved from root)
│   ├── logs/               # Application logs (moved from root)
│   └── main.py             # Application entry point
│
├── frontend/               # Next.js 13+ application
│   ├── app/                # App router pages (Next.js 13)
│   ├── components/         # React components
│   │   ├── ui/             # Basic UI components
│   │   ├── layout/         # Layout components
│   │   ├── features/       # Feature-specific components
│   │   └── common/         # Shared components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # API clients, utilities
│   ├── styles/             # CSS, Tailwind configs
│   ├── constants/          # App constants
│   └── public/             # Static assets
│
├── workers/                # Node.js background workers
│   ├── master/             # Master worker manager
│   ├── telegram/           # Telegram bot workers
│   ├── services/           # Worker business logic
│   ├── config/             # Worker configurations
│   └── logs/               # Worker logs
│
├── docs/                   # Documentation (already well organized)
│   ├── architecture/       # System architecture docs
│   ├── api/               # API documentation
│   ├── deployment/        # Deployment guides
│   └── ...                # Other docs
│
├── scripts/                # Automation scripts (already well organized)
│   ├── backend/           # Backend-specific scripts
│   ├── deployment/        # Deployment scripts
│   ├── maintenance/       # Maintenance scripts
│   └── reorganization/    # This reorganization effort
│
├── tests/                  # All tests and test reports
│   ├── backend/           # Backend tests
│   ├── frontend/          # Frontend tests
│   ├── e2e/               # End-to-end tests
│   └── reports/           # Test reports (moved from test-artifacts)
│
├── .github/               # CI/CD workflows
├── .claude/               # Claude agent working files
└── archive/               # Historical files (kept but isolated)
```

## Standardization Plan

### Phase 1: Path Aliases & Import System
1. **Frontend TypeScript aliases** - Expand to more specific paths
2. **Backend Python packaging** - Create proper package structure
3. **Workers Node.js aliases** - Add import aliases for workers

### Phase 2: Safe Directory Migrations
1. Move `uploads/` → `backend/uploads/`
2. Move `logs/` → `backend/logs/` + `workers/logs/`
3. Move `payments/` → `backend/integrations/payments/`
4. Move `tools/` → `scripts/tools/`
5. Move `test-artifacts/` → `tests/reports/`
6. Move `TASK/` → `.claude/tasks/` (and add to .gitignore)
7. Move `configs/` content to appropriate service directories

### Phase 3: CI & Validation
1. Structure validation workflow
2. Import linting rules
3. Path consistency checks

## Risk Assessment

### Low Risk
- Alias additions (backward compatible)
- Moving ignored directories (`logs/`, `uploads/`)
- Documentation updates

### Medium Risk
- Config file movements (need to update references)
- Test artifact relocations (CI may reference old paths)

### High Risk
- Core code imports (would require careful testing)
- Production deployment paths (need deployment script updates)

## Implementation Strategy

1. **Aliases First** - Add all path aliases before any moves
2. **Gradual Migration** - Move non-code assets first
3. **Validation Gates** - Test imports after each move
4. **Rollback Plan** - Keep git history for all moves