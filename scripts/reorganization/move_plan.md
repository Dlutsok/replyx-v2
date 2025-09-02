# ChatAI MVP 13 Repository Reorganization Plan

## Phase 1: Node.js Workers Separation
- Move `backend/workers/` → `/workers/`
- Update imports in worker files
- Update any references in backend Python code

## Phase 2: Test Files Consolidation
- Create `/tests/backend/` structure
- Move all `backend/test_*.py` → `/tests/backend/integration/`
- Move all `backend/debug_*.py` → `/tests/backend/debug/`
- Move root `test_*.py` → `/tests/e2e/`

## Phase 3: Scripts Organization
- Move `backend/scripts/` → `/scripts/backend/`
- Move root `scripts/` → `/scripts/ops/`
- Merge overlapping functionality

## Phase 4: Root Cleanup
- Move documentation reports to `/tools/reports/`
- Ensure only essential files remain in root

## File Mapping

### Workers (Phase 1)
```
backend/workers/config/          → workers/config/
backend/workers/logs/            → workers/logs/
backend/workers/master/          → workers/master/
backend/workers/node_modules/    → workers/node_modules/
backend/workers/package.json     → workers/package.json
backend/workers/package-lock.json → workers/package-lock.json
backend/workers/services/        → workers/services/
backend/workers/telegram/        → workers/telegram/
backend/workers/tmp/             → workers/tmp/
```

### Tests (Phase 2)
```
backend/test_telegram_delivery.py           → tests/backend/integration/
backend/test_telegram_operator_message.py   → tests/backend/integration/
backend/test_widget_billing.py              → tests/backend/integration/
backend/test_qa_embeddings.py               → tests/backend/integration/
backend/test_qa_search.py                   → tests/backend/integration/
backend/test_qa_search2.py                  → tests/backend/integration/
backend/test_vector_search.py               → tests/backend/integration/
backend/test_full_qa_pipeline.py            → tests/backend/integration/
backend/test_widget_qa.py                   → tests/backend/integration/
backend/test_widget_domain_validation.py    → tests/backend/integration/
backend/test_widget_personalization.py      → tests/backend/integration/
backend/test_widget_settings_full_flow.py   → tests/backend/integration/
backend/test_widget_config_api.py           → tests/backend/integration/

backend/debug_qa_search.py         → tests/backend/debug/
backend/debug_qa_simple.py         → tests/backend/debug/
backend/debug_qa_indexing.py       → tests/backend/debug/
backend/debug_vector_condition.py  → tests/backend/debug/

test_document_upload.py           → tests/e2e/
check_admin_user.py               → tests/e2e/
```

### Scripts (Phase 3)
```
backend/scripts/ → scripts/backend/
scripts/        → scripts/ops/
```

### Reports (Phase 4)
```
IMPLEMENTATION_REPORT.md           → tools/reports/
SECURITY_RECOMMENDATIONS.md       → tools/reports/
WIDGET_BILLING_IMPLEMENTATION.md  → tools/reports/
```

## Risk Assessment

**LOW RISK:**
- File moves without code changes
- Test file relocations
- Documentation moves

**MINIMAL RISK:**
- Import path updates (can be scripted)
- Configuration updates

**NO RISK:**
- Business logic remains untouched
- Core application structure preserved