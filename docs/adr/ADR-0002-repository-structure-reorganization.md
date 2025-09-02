# ADR-0002: Repository Structure Reorganization

**Date:** 2025-09-02  
**Status:** Accepted  
**Authors:** Repo Structure Agent  

## Context

The ChatAI MVP 13 repository had grown organically and developed structural issues that hindered maintainability and clarity:

1. **Technology Mixing**: Node.js workers (with node_modules) were located inside the Python backend/ directory
2. **Scattered Tests**: 13 integration test files and 4 debug scripts were mixed with production code in backend/
3. **Duplicated Scripts**: Root-level scripts/ and backend/scripts/ served different purposes but lacked clear organization  
4. **Root Directory Clutter**: Multiple documentation reports and test files were scattered in the project root
5. **Inconsistent Naming**: Mixed snake_case and kebab-case conventions across directories

## Decision

We will reorganize the repository structure to achieve clear separation of concerns:

### New Structure

```
/
├── backend/                    # Python FastAPI application
│   ├── api/, services/, database/, core/, ai/   # Business logic (unchanged)
│   └── main.py
├── workers/                    # Node.js Telegram workers (moved from backend/)
│   ├── master/, telegram/, services/
│   └── package.json
├── frontend/                   # Next.js application (unchanged)
├── tests/                      # All test files (new)
│   ├── backend/
│   │   ├── integration/        # Former backend/test_*.py files
│   │   └── debug/              # Former backend/debug_*.py files
│   └── e2e/                    # Root-level test files
├── scripts/                    # Consolidated automation scripts
│   ├── backend/legacy/         # Former backend/scripts/
│   ├── ops/                    # Former root scripts/
│   └── reorganization/         # This reorganization tooling
├── tools/                      # Project utilities
│   └── reports/                # Documentation reports from root
└── docs/                       # Project documentation (unchanged)
```

### Specific Changes

1. **Workers Separation**: `backend/workers/` → `/workers/`
   - Moved Node.js application out of Python directory
   - Maintains clean technology boundaries

2. **Test Consolidation**: 
   - `backend/test_*.py` (13 files) → `/tests/backend/integration/`
   - `backend/debug_*.py` (4 files) → `/tests/backend/debug/`
   - Root test files → `/tests/e2e/`

3. **Scripts Organization**:
   - `backend/scripts/` → `/scripts/backend/legacy/`
   - Root `scripts/` → `/scripts/ops/`

4. **Root Cleanup**:
   - `*.md` reports → `/tools/reports/`

## Rationale

### Benefits

1. **Clear Technology Separation**: Node.js and Python components are now clearly separated at the top level
2. **Centralized Testing**: All tests are now discoverable in a single `/tests/` hierarchy  
3. **Organized Automation**: Scripts are categorized by purpose and technology
4. **Cleaner Root**: Essential files only, reducing cognitive load
5. **Preserved Business Logic**: No changes to core application code in `/api/`, `/services/`, `/database/`

### Risk Mitigation

- **Zero Business Logic Changes**: All production code remains in original locations
- **Git History Preserved**: Used `git mv` for all file moves
- **Safe Execution**: Used dry-run testing and logging for all moves
- **Rollback Capability**: All changes are atomic git operations

## Implementation

The reorganization was executed in 4 phases:

1. **Phase 1**: Move Node.js workers to root level
2. **Phase 2**: Consolidate test files into `/tests/` hierarchy  
3. **Phase 3**: Organize scripts by purpose and technology
4. **Phase 4**: Clean up root directory files

All moves used `git mv` to preserve history and were executed with extensive logging.

## Consequences

### Positive

- **Improved Maintainability**: Clear separation of concerns makes the codebase easier to navigate
- **Better Testing**: Centralized test location improves discoverability and CI integration
- **Technology Clarity**: Distinct boundaries between Python backend, Node.js workers, and React frontend
- **Reduced Cognitive Load**: Cleaner root directory focuses attention on essential project files

### Neutral

- **Path Updates**: Some documentation may reference old paths (can be updated incrementally)
- **IDE Adjustments**: Developers may need to update bookmarks/favorites

### Risk Assessment

**LOW RISK**: No business logic changes, all moves preserve git history, rollback is straightforward

## Compliance

This reorganization aligns with common industry practices:
- Monorepo structure with clear technology boundaries
- Centralized testing directory
- Organized automation scripts
- Clean project root

The new structure follows conventions from successful projects like Next.js, Django, and modern monorepos.