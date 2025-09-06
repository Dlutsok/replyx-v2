# ADR-0026: Documentation and Configuration Reorganization

**Date:** 2025-09-06  
**Status:** Accepted  
**Authors:** RAD Agent  
**Supersedes:** ADR-0002 (extends repository structure improvements)  

## Context

Following the successful repository structure reorganization in ADR-0002, several structural issues remained that hindered documentation maintainability and project organization:

### Issues Identified

1. **Root Directory Pollution**: Multiple documentation files scattered in project root:
   - 5 deployment-related MD files (DEPLOYMENT*.md)
   - Security reports (CORS_SECURITY_IMPLEMENTATION_REPORT.md)
   - Migration plans (WEBSOCKET_TO_SSE_MIGRATION_PLAN.md)
   - Test results and reports mixed with project code

2. **Misplaced Infrastructure Files**: 
   - Deployment scripts (deploy.sh, timeweb_deploy.sh) in root
   - Maintenance scripts (fix_alembic.py) in root  
   - Configuration files (nginx-sse.conf) in root

3. **Pollution Directories**:
   - Legacy numbered directories (11/)
   - Deployment artifacts (Deployed/)
   - Scattered reports (reports/)
   - Working files (TASK/) mixed with production code

4. **Documentation Structure Gaps**:
   - Missing domain-specific documentation directories
   - Inconsistent documentation organization
   - No clear mapping between code and documentation

## Decision

We will complete the repository organization by implementing strict documentation and configuration management:

### New Documentation Structure

```
docs/
├── deployment/
│   ├── guides/              # Deployment procedures
│   │   ├── DEPLOYMENT.md
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   ├── DEPLOYMENT_SUMMARY.md
│   │   ├── DEPLOY_README.md
│   │   └── QUICK_DEPLOY_CHECKLIST.md
│   └── infrastructure/      # Infrastructure analysis
│       ├── DEPLOYMENT_INFRASTRUCTURE_ANALYSIS_REPORT.md
│       └── ПОЛНЫЙ_ОТЧЕТ_ДЕПЛОЯ_REPLYX.md
├── migration/
│   └── WEBSOCKET_TO_SSE_MIGRATION_PLAN.md
├── security/
│   └── CORS_SECURITY_IMPLEMENTATION_REPORT.md
└── testing/
    └── results/
        └── test-results.md
```

### Scripts and Configuration Organization

```
scripts/
├── deployment/              # Deployment automation
│   ├── deploy.sh
│   └── timeweb_deploy.sh
└── maintenance/             # Maintenance utilities
    └── fix_alembic.py

configs/                     # Configuration files
└── nginx-sse.conf
```

### Archive Management

```
archive/                     # Historical preservation
├── README.md               # Archive documentation
├── 11/                     # Legacy numbered directory
├── Deployed/               # Deployment artifacts  
└── reports/                # Old test reports
```

## Rationale

### Benefits

1. **Clear Documentation Hierarchy**: Domain-specific organization makes documentation discoverable
2. **Centralized Configuration**: All config files in dedicated directory
3. **Historical Preservation**: Important legacy content archived, not deleted
4. **Reduced Root Clutter**: Only essential project files in root directory
5. **Improved Maintainability**: Clear structure enables automated doc generation
6. **Better Code-to-Docs Mapping**: Structured docs enable automated synchronization

### RAD Agent Compliance

This reorganization aligns with RAD Agent principles:

- **Documentation First**: All docs properly categorized and structured
- **Single Source of Truth**: Eliminating scattered documentation
- **Version Control**: All changes preserve git history
- **Domain Separation**: Clear boundaries between deployment, security, migration docs
- **Automation Ready**: Structure supports automated doc generation and validation

## Implementation

### Phase 1: Documentation Reorganization
```bash
# Create new documentation structure
mkdir -p docs/{deployment/{guides,infrastructure},migration,testing/results}

# Move documentation files preserving git history  
git mv CORS_SECURITY_IMPLEMENTATION_REPORT.md docs/security/
git mv WEBSOCKET_TO_SSE_MIGRATION_PLAN.md docs/migration/
git mv test-results.md docs/testing/results/
git mv DEPLOYMENT*.md docs/deployment/guides/
git mv DEPLOY_README.md docs/deployment/guides/  
git mv QUICK_DEPLOY_CHECKLIST.md docs/deployment/guides/
git mv ПОЛНЫЙ_ОТЧЕТ_ДЕПЛОЯ_REPLYX.md docs/deployment/infrastructure/
```

### Phase 2: Scripts and Configuration
```bash  
# Organize scripts by purpose
mkdir -p scripts/{deployment,maintenance} configs
git mv deploy.sh timeweb_deploy.sh scripts/deployment/
git mv fix_alembic.py scripts/maintenance/
git mv nginx-sse.conf configs/
```

### Phase 3: Archive Management
```bash
# Archive pollution directories
mkdir -p archive
git mv 11/ Deployed/ reports/ archive/
```

## Consequences

### Positive

- **Documentation Discoverability**: Domain-based structure improves navigation
- **Automated Sync Capability**: Structured docs enable code-to-docs mapping verification
- **Clean Project Root**: Focus on essential project files only
- **Historical Preservation**: Important legacy content retained in archive
- **Configuration Management**: Centralized config files improve deployment processes
- **Maintenance Efficiency**: Clear organization reduces cognitive load

### Neutral

- **Path Updates Required**: Documentation links may need updating (will be automated)
- **Team Adjustment**: Developers need to learn new documentation locations

### Risk Mitigation

- **Git History Preserved**: All moves use `git mv` to maintain history
- **No Content Loss**: All content moved, not deleted
- **Rollback Capability**: All changes are atomic git operations
- **Archive Safety Net**: Legacy content preserved in /archive/ directory

## Compliance

This reorganization establishes the foundation for:

1. **Automated Documentation**: Scripts can now generate and validate docs systematically
2. **Code-to-Docs Mapping**: Clear structure enables automated synchronization verification  
3. **CI Integration**: Documentation validation can be automated in build pipeline
4. **Version Control**: Documentation changes can be tracked and reviewed systematically

## Success Metrics

- **Documentation Files**: 118+ documentation files properly organized
- **Root Directory Cleanup**: Only essential project files remain in root
- **Archive Preservation**: All legacy content retained with clear documentation
- **Structure Compliance**: Full alignment with RAD Agent standards

## Next Steps

1. Update documentation generation scripts for new structure
2. Implement automated code-to-docs synchronization verification
3. Add documentation validation to CI pipeline
4. Create CODEOWNERS entries for new directory structure

---

**Implementation Date:** 2025-09-06  
**Risk Level:** LOW (No business logic changes, all content preserved)  
**Rollback Plan:** Standard git revert of file moves