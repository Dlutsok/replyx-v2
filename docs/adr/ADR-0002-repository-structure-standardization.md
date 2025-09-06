# ADR-0002: Repository Structure Standardization

## Status
Accepted

## Context

After the RAD (Rapid Application Development) agent completed the initial reorganization of the ReplyX repository, we identified the need for further standardization to ensure:

1. **Consistency**: Unified naming conventions and directory structures across all components
2. **Maintainability**: Clear separation of concerns and predictable file locations
3. **Developer Experience**: Simplified import patterns and navigation
4. **Scalability**: Structure that can accommodate future growth and new components
5. **Quality Assurance**: Automated validation to prevent structural regression

### Issues Identified

- Mixed import patterns (relative vs. alias-based)
- Temporary directories and cache files in version control
- Inconsistent naming conventions across modules
- Lack of automated structure validation
- Missing standardized path aliases for Node.js workers

## Decision

We will implement a comprehensive repository structure standardization following these principles:

### 1. Top-Level Directory Structure
```
/
├── backend/           # Python FastAPI application
├── frontend/          # Next.js React application  
├── workers/           # Node.js Telegram bot workers
├── docs/              # Project documentation
├── scripts/           # Operations and maintenance scripts
├── .github/           # GitHub workflows and templates
├── .dev/              # Development tools and artifacts (gitignored)
└── alembic/           # Database migration tool
```

### 2. Import System Standardization

#### Frontend (TypeScript/JavaScript)
- Use `@/` aliases for all internal modules
- Avoid deep relative imports (more than 2 levels)
- Standardized aliases: `@/components/`, `@/hooks/`, `@/utils/`, etc.

#### Backend (Python)
- Use absolute imports from `backend` package
- Consistent module structure with clear separation of concerns
- Avoid relative imports except within same module

#### Workers (Node.js)
- Implement `#` aliases in `package.json` imports
- Standardized patterns: `#workers/`, `#services/`, `#config/`

### 3. Automated Structure Validation
- GitHub Actions workflow for continuous validation
- Prohibition of temporary/cache directories in version control
- Import pattern validation
- Directory naming convention enforcement

### 4. Directory Organization Standards

#### Backend Structure
```
backend/
├── ai/              # AI providers, routing, prompts
├── api/             # FastAPI routers/endpoints
├── core/            # App core, middleware, configs
├── database/        # Models, CRUD, schema utils
├── services/        # Business logic layer
├── monitoring/      # Metrics, logging, health
├── security/        # Auth, permissions, validation
├── integrations/    # External service connectors
└── tests/           # Test suite
```

#### Frontend Structure
```
frontend/
├── components/      # React components (organized by domain)
├── hooks/           # Custom React hooks
├── lib/             # Frontend utilities and API clients
├── styles/          # CSS and styling components
├── contexts/        # React context providers
├── constants/       # Frontend constants
└── config/          # Configuration files
```

#### Workers Structure
```
workers/
├── master/          # Master process management
├── telegram/        # Telegram bot logic
├── services/        # Worker business logic
├── config/          # Worker configuration
└── scripts/         # Worker utilities
```

## Implementation Strategy

### Phase 1: Immediate (Implemented)
1. ✅ Update `.gitignore` for cache/artifact directories
2. ✅ Configure import aliases in `workers/package.json`
3. ✅ Create structure validation GitHub Actions workflow
4. ✅ Generate safe cleanup and migration scripts

### Phase 2: Short-term (Next 1 week)
1. Run cleanup scripts to remove temporary directories
2. Execute import standardization scripts
3. Test all applications to ensure imports work correctly
4. Enable structure validation in CI pipeline

### Phase 3: Long-term (Next 1 month)
1. Full migration of all import patterns
2. Developer tooling integration (IDE configurations)
3. Advanced linting rules for structure enforcement
4. Documentation updates and developer onboarding improvements

## Tools and Scripts Created

### 1. Repository Cleanup Script
- `scripts/repo_cleanup_safe.sh`: Safe removal of temporary directories and cache files
- Supports dry-run mode for preview
- Creates backups before removal
- Updates `.gitignore` automatically

### 2. Import Standardization Script
- `scripts/standardize_imports.py`: Automated import pattern standardization
- Supports frontend, backend, and workers
- Dry-run capability for safe testing
- Comprehensive reporting

### 3. Structure Validation Workflow
- `.github/workflows/structure-validation.yml`: Automated CI validation
- Validates directory structure, import patterns, and naming conventions
- Generates detailed reports
- Prevents regression through PR checks

## Benefits

### Immediate Benefits
- ✅ Clean repository without temporary files
- ✅ Consistent import patterns across all modules
- ✅ Automated validation prevents structural regression
- ✅ Improved developer onboarding experience

### Long-term Benefits
- 🔄 Reduced cognitive load for developers
- 🔄 Easier code navigation and maintenance
- 🔄 Better scalability for new features
- 🔄 Enhanced code review process

## Risks and Mitigation

### Low Risk
- **Configuration changes**: Backward compatible alias additions
- **Documentation updates**: No impact on functionality
- **Mitigation**: Thorough testing and gradual rollout

### Medium Risk
- **Import pattern changes**: May break some imports during migration
- **Mitigation**: Automated scripts with backup creation, comprehensive testing

### High Risk
- **None identified**: The structure is fundamentally sound, changes are incremental

## Rollback Plan

If issues arise during implementation:

1. **Immediate rollback**: Git revert of specific commits
2. **Restore from backups**: Use backup files created by scripts
3. **Selective revert**: Roll back only problematic components
4. **Emergency procedure**: Disable CI validation temporarily

## Validation Criteria

### Success Metrics
- [ ] All imports use standardized patterns (95%+ compliance)
- [ ] No temporary directories in version control
- [ ] CI structure validation passes consistently
- [ ] Developer feedback is positive (< 2 friction points reported)
- [ ] No functionality regressions after migration

### Monitoring
- GitHub Actions workflow success rate
- Developer productivity metrics (time to find files, import errors)
- Code review feedback on structure-related issues

## Related Decisions

- **ADR-0001**: Initial architecture decisions
- **Future ADR**: Module federation strategy (if needed)
- **Future ADR**: Testing strategy standardization

## References

- [Repository Structure Analysis](../architecture/REPO_STRUCTURE_ANALYSIS.md)
- [Directory Structure Schema](../architecture/DIRECTORY_STRUCTURE_SCHEMA.md)
- [RAD Agent Documentation](../architecture/service-catalog.md)

---

**Decision Date**: 2025-09-06  
**Decision Makers**: System Architecture Team, RAD Agent, Repo Structure Agent  
**Next Review**: 2025-10-06 (1 month after implementation)