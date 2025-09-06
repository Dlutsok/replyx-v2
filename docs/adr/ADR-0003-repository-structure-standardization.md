# ADR-0003: Repository Structure Standardization

## Status
ACCEPTED

## Context
The ReplyX repository had grown organically with inconsistent directory structure:
- Mixed file types at root level (`uploads/`, `logs/`, `TASK/`)  
- No standardized import system across TypeScript/Python/Node.js
- Temporary directories (`test-artifacts/`, `11/`) mixed with production code
- Inconsistent path aliases and import conventions
- Agent working files (`TASK/`) committed to version control

This made the codebase harder to navigate, maintain, and onboard new developers.

## Decision
We will implement a standardized repository structure with:

### 1. Clean Top-Level Structure
```
/
├── backend/           # Python FastAPI backend
├── frontend/          # Next.js React application  
├── workers/           # Node.js background workers
├── docs/             # All documentation
├── scripts/          # Automation and utility scripts
├── tests/            # All tests and test reports
├── .github/          # CI/CD workflows
├── .claude/          # Agent working files (gitignored)
└── archive/          # Historical/deprecated files
```

### 2. Service-Specific Organization
**Backend (Python):**
- `api/` - FastAPI endpoints and routers
- `ai/` - AI providers, routing, prompts
- `core/` - Application startup, config, middleware
- `services/` - Business logic (use cases)
- `database/` - Models, CRUD, session management
- `integrations/` - External services (payments, etc.)
- `monitoring/` - Metrics, logging, tracing
- `security/` - Authentication, validation
- `uploads/` - File storage
- `logs/` - Application logs

**Frontend (TypeScript/React):**
- Expanded path aliases: `@/components`, `@/hooks`, `@/lib`, `@/contexts`
- Clear component hierarchy: `ui/`, `layout/`, `features/`, `common/`

**Workers (Node.js):**
- `master/` - Worker management
- `telegram/` - Telegram bot logic
- `services/` - Business logic
- `config/` - Configuration files

### 3. Import System Standardization
- **Python**: Absolute imports using `backend.module` pattern
- **TypeScript**: Path aliases (`@/components/*`, `@/hooks/*`)
- **Node.js**: Consistent relative imports with potential for aliases

### 4. CI Validation
- Automated structure validation in CI/CD
- Import pattern enforcement
- Prevention of new problematic directories

## Rationale

### Benefits:
1. **Developer Experience**: Consistent structure across all services
2. **Onboarding**: New developers can quickly understand the layout
3. **Maintainability**: Clear separation of concerns
4. **Scalability**: Structure supports growth without major refactoring
5. **CI/CD**: Automated validation prevents regression
6. **Clean History**: Git mv preserves file history during reorganization

### Alternative Considered:
- **Monorepo tools** (Nx, Lerna): Rejected due to added complexity for current team size
- **Language-specific repos**: Rejected due to tight coupling between services
- **No changes**: Rejected due to growing maintenance burden

## Implementation Plan

### Phase 1: Setup (No Code Changes)
- [x] Expand TypeScript path aliases
- [x] Create Python package structure
- [x] Create migration scripts
- [x] Set up CI validation

### Phase 2: Safe Migrations
- [ ] Move `uploads/` → `backend/uploads/`
- [ ] Move `test-artifacts/` → `tests/reports/`
- [ ] Move `payments/` → `backend/integrations/payments/`
- [ ] Move `tools/` → `scripts/tools/`
- [ ] Move `TASK/` → `archive/tasks/` (then ignore)

### Phase 3: Validation & Documentation
- [ ] Run structure validation CI
- [ ] Update configuration files
- [ ] Update documentation references

## Consequences

### Positive:
- Cleaner, more professional repository structure
- Easier navigation and maintenance
- Better separation of concerns
- Automated structure validation
- Preserved git history

### Negative:
- One-time migration effort required
- Some configuration files need updates
- Team needs to learn new path conventions

### Risks & Mitigation:
- **Risk**: Breaking changes during migration
  - **Mitigation**: Git mv preserves history; dry-run mode in scripts
- **Risk**: Missing configuration updates
  - **Mitigation**: Automated scanning for old path references
- **Risk**: CI/CD pipeline disruption
  - **Mitigation**: Phased approach; test in feature branch first

## Rollback Plan
If issues arise:
1. Git revert the reorganization commits (preserves history)
2. Restore old path aliases temporarily
3. Fix any broken references
4. Re-plan with lessons learned

## Compliance
This decision supports:
- Development team efficiency requirements
- Code maintainability standards
- Onboarding process improvements
- CI/CD automation goals

## Implementation Status
- **Phase 1**: ✅ Completed
- **Phase 2**: 🟡 Ready to execute
- **Phase 3**: ⏳ Pending Phase 2 completion

---
**Decision Date**: 2025-09-06  
**Decision Makers**: Repository Structure Agent, Development Team  
**Next Review**: After Phase 3 completion