# ChatAI Backend Structure Reorganization Plan

## Current Issues Identified

### 1. **Import Problems**
- ✅ FIXED: `from database import` in main.py - corrected to proper module path
- Multiple files importing with inconsistent paths
- Some modules using relative imports beyond 2 levels

### 2. **Mixed Technologies**
- Python backend mixed with Node.js components
- `package.json`, `node_modules/` in Python project
- Telegram bots on Node.js mixed with Python API

### 3. **File Organization Issues**
- Too many files in backend root (20+ files)
- Debug/test files in production code
- Scripts scattered across multiple directories
- Logs committed to git repository

## Proposed Target Structure

```
/backend/
  /api/               # FastAPI routers (existing, well organized)
  /services/          # Business logic (existing, good)
  /database/          # Models, CRUD, schemas (existing, good)
  /core/              # App config, auth, middleware (existing, good)
  /ai/                # AI providers, prompts, token manager (existing, good)
  /cache/             # Redis cache (existing, good)
  /monitoring/        # Metrics, logging, health checks (existing, good)
  /integrations/      # External services (existing, good)
  /validators/        # Input validation (existing, good)
  /security/          # Security configs (existing, good)
  /templates/         # Email templates (existing, good)
  /utils/             # Helper utilities (existing, good)
  /schemas/           # Pydantic schemas (existing, good)
  
  /scripts/           # All management scripts
    /admin/           # Admin tools (create_admin.py, cleanup_users.py)
    /maintenance/     # Maintenance scripts
    /monitoring/      # Monitoring scripts
    
  /workers/           # Node.js components (separate from Python)
    /telegram/        # Telegram bot workers
    /master/          # Bot management
    
  /alembic/           # Database migrations (existing, keep as is)
  /logs/              # Runtime logs (gitignored)
  /data/              # Runtime data (gitignored)
  
  main.py             # FastAPI app entry point
  requirements.txt    # Python dependencies
  alembic.ini        # Alembic config
```

## Migration Plan (Safe Steps)

### Phase 1: Cleanup Non-Critical Files
1. Move debug/test files to /scripts/debug/ or delete
2. Move admin tools to /scripts/admin/
3. Add logs/ and data/ to .gitignore
4. Clean up old alembic merge heads

### Phase 2: Separate Node.js Components
1. Create /workers/telegram/ and /workers/master/
2. Move Node.js files with proper package.json
3. Update start scripts to work with new structure

### Phase 3: Fix Import Paths
1. Ensure all Python imports use absolute paths from backend root
2. Add proper __init__.py files where needed
3. Test all imports work correctly

### Phase 4: Documentation
1. Create backend/README.md with new structure
2. Document service responsibilities
3. Update deployment scripts

## Files to Move/Reorganize

### Move to /scripts/admin/
- cleanup_users.py
- create_admin.py

### Move to /scripts/maintenance/
- debug_working_hours.py
- enhanced_bot_logging.py
- reindex_document_with_gpt4o.py

### Move to /workers/telegram/
- master/scalable_bot_manager.js
- worker/bot_worker.js
- package.json (create separate for workers)

### Clean up / Delete
- logs/ directory (add to .gitignore)
- node_modules/ (will be recreated in /workers/)
- Old alembic merge head files

### Keep in Root
- main.py
- requirements.txt
- alembic.ini
- start_production.sh

## Risk Assessment

### LOW RISK
- Moving debug/admin scripts
- Adding .gitignore entries
- Documentation updates

### MEDIUM RISK  
- Reorganizing Node.js workers (needs testing)
- Cleaning up alembic migrations

### HIGH RISK
- None identified (structure is already well organized)

## Rollback Plan

1. All moves use `git mv` to preserve history
2. Create backup branch before major changes
3. Keep old import paths working during transition
4. Test each phase before proceeding

## Success Criteria

- ✅ All imports work correctly
- ✅ FastAPI server starts without errors
- ✅ Telegram bots function properly
- ✅ Database migrations work
- ✅ Production deployment unchanged
- ✅ Clear documentation of new structure