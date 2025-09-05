# Service Catalog

> Кратко опиши каждый сервис: входная точка, зависимости, runbook.

## Backend /api
- Entry: `backend/main.py`
- Contract: OpenAPI (см. `docs/api/openapi.md`)
- Depends: DB, AI, Billing, Realtime
- Runbook: `docs/runbooks/backend.md`

## Realtime
- Entry: `backend/services/websocket_manager.py`
- Events: `docs/realtime/events.md`

## Workers (Node) - Relocated to Root
- Orchestrator: `workers/master/scalable_bot_manager.js` (moved from backend/)
- Workers: `workers/telegram/bot_worker.js` (moved from backend/)
- Runbook: `docs/runbooks/workers.md`

## Bots Monitoring
- Entry: `/admin-bots-monitoring` (frontend), `/api/admin/bots-monitoring` (API)
- Components: `useBotsMonitoring`, `BotsMonitoringGrid`, `BotsStatsCards`
- Real-time: Auto-refresh every 30s, WebSocket integration ready
- Depends: Workers, Database, PM2 Process Manager
- Documentation: `docs/admin/bots-monitoring.md`
- Runbook: `docs/runbooks/bots-monitoring.md`

## AI
- Providers: `backend/ai/ai_providers.py`
- Routing: `backend/ai/ai_assistant.py`, `ai_token_manager.py`
- Docs: `docs/ai/routing.md`, `docs/ai/prompts.md`

## Billing
- Tables: Balance, Transactions
- Docs: `docs/billing/model.md`, `docs/billing/limits_quotas.md`

## Database
- Models: `backend/database/models.py`
- Migrations: `alembic/versions/**`
- Docs: `docs/db/schema.md`, `docs/db/migrations.md`

## Frontend
- Next.js pages & components
- UI rules: CLAUDE.md / UI agent
- Runbook: `docs/runbooks/frontend.md`
