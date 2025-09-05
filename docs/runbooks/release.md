# Runbook — Release / CI-CD

Пайплайн: build → test → migrate → canary → full → rollback.

- Alembic миграции до трафика
- Канареечный деплой
- План отката на каждую миграцию
