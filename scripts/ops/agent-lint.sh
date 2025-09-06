#!/usr/bin/env bash
set -e

# RAD Agent - Code to Documentation Synchronization Checker
# Проверяет соответствие кода и документации

MODE="${1:-warn}"  # warn или fail
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "🤖 RAD Agent: Code-to-Documentation Synchronization Check"
echo "📂 Project: $PROJECT_ROOT"
echo "🔧 Mode: $MODE"
echo

WARNINGS=0
ERRORS=0

# Функция для логирования предупреждений
warn() {
    echo "⚠️  WARNING: $1"
    WARNINGS=$((WARNINGS + 1))
}

# Функция для логирования ошибок  
error() {
    echo "❌ ERROR: $1"
    ERRORS=$((ERRORS + 1))
}

# Функция для успешных проверок
success() {
    echo "✅ $1"
}

echo "🔍 Checking API Documentation Sync..."

# 1. Проверка синхронизации API endpoints
BACKEND_API_FILES=$(find "$PROJECT_ROOT/backend/api" -name "*.py" | wc -l | tr -d ' ')
API_DOCS_FILES=$(find "$PROJECT_ROOT/docs/api" -name "*.md" | wc -l | tr -d ' ')

if [ -f "$PROJECT_ROOT/docs/api/openapi.json" ]; then
    OPENAPI_ENDPOINTS=$(python3 -c "
import json
try:
    with open('$PROJECT_ROOT/docs/api/openapi.json', 'r') as f:
        spec = json.load(f)
    endpoints = sum(len([m for m in methods.keys() if m in ['get','post','put','patch','delete']]) 
                   for methods in spec.get('paths', {}).values())
    print(endpoints)
except:
    print(0)
")
    success "OpenAPI spec found with $OPENAPI_ENDPOINTS endpoints"
else
    warn "OpenAPI specification not found at docs/api/openapi.json"
fi

echo
echo "🗄️  Checking Database Documentation Sync..."

# 2. Проверка синхронизации схемы БД
DATABASE_MODELS=$(find "$PROJECT_ROOT/backend/database" -name "*.py" | wc -l | tr -d ' ')
DB_DOCS=$(find "$PROJECT_ROOT/docs/db" -name "*.md" | wc -l | tr -d ' ')

if [ -f "$PROJECT_ROOT/docs/db/schema.sql" ]; then
    success "Database schema.sql found"
else
    warn "Database schema.sql not found at docs/db/schema.sql"
fi

if [ -f "$PROJECT_ROOT/docs/db/schema_current.md" ]; then
    success "Current database schema docs found"
else
    warn "Current database schema docs not found at docs/db/schema_current.md"
fi

echo
echo "🔌 Checking WebSocket/SSE Events Documentation..."

# 3. Проверка документации событий WebSocket/SSE
if [ -f "$PROJECT_ROOT/docs/realtime/events.md" ]; then
    success "WebSocket/SSE events documentation found"
    
    # Проверяем наличие версий событий
    VERSIONED_EVENTS=$(grep -c "@v[0-9]" "$PROJECT_ROOT/docs/realtime/events.md" 2>/dev/null || echo 0)
    if [ "$VERSIONED_EVENTS" -gt 0 ]; then
        success "Found $VERSIONED_EVENTS versioned events in docs/realtime/events.md"
    else
        warn "No versioned events found in docs/realtime/events.md (should use @vN notation)"
    fi
else
    warn "WebSocket/SSE events documentation not found at docs/realtime/events.md"
fi

echo
echo "🚀 Checking Deployment Documentation..."

# 4. Проверка документации деплоя
DEPLOYMENT_SCRIPTS=$(find "$PROJECT_ROOT/scripts/deployment" -name "*.sh" 2>/dev/null | wc -l | tr -d ' ')
DEPLOYMENT_DOCS=$(find "$PROJECT_ROOT/docs/deployment" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')

if [ "$DEPLOYMENT_SCRIPTS" -gt 0 ] && [ "$DEPLOYMENT_DOCS" -gt 0 ]; then
    success "Deployment scripts ($DEPLOYMENT_SCRIPTS) and docs ($DEPLOYMENT_DOCS) found"
else
    warn "Mismatch: $DEPLOYMENT_SCRIPTS deployment scripts vs $DEPLOYMENT_DOCS deployment docs"
fi

echo
echo "📋 Checking Runbooks Coverage..."

# 5. Проверка coverage runbooks
RUNBOOKS=$(find "$PROJECT_ROOT/docs/runbooks" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$RUNBOOKS" -ge 4 ]; then
    success "Found $RUNBOOKS runbooks (minimum 4 required: backend, frontend, workers, release)"
else
    warn "Found only $RUNBOOKS runbooks, minimum 4 required"
fi

echo
echo "🏗️  Checking ADR Documentation..."

# 6. Проверка ADR
ADR_COUNT=$(find "$PROJECT_ROOT/docs/adr" -name "ADR-*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$ADR_COUNT" -gt 0 ]; then
    success "Found $ADR_COUNT Architecture Decision Records"
    
    # Проверяем последний ADR
    LATEST_ADR=$(ls "$PROJECT_ROOT/docs/adr"/ADR-*.md 2>/dev/null | sort -V | tail -1)
    if [ -n "$LATEST_ADR" ]; then
        LATEST_ADR_NUM=$(basename "$LATEST_ADR" .md | grep -o '[0-9]\+' | tail -1)
        success "Latest ADR: #$LATEST_ADR_NUM"
    fi
else
    error "No Architecture Decision Records found in docs/adr/"
fi

echo
echo "👥 Checking CODEOWNERS Coverage..."

# 7. Проверка CODEOWNERS
if [ -f "$PROJECT_ROOT/CODEOWNERS" ]; then
    success "CODEOWNERS file found"
    
    # Проверяем покрытие основных директорий
    COVERED_DIRS=0
    for dir in "docs/" "backend/" "frontend/" "scripts/" "configs/"; do
        if grep -q "$dir" "$PROJECT_ROOT/CODEOWNERS" 2>/dev/null; then
            COVERED_DIRS=$((COVERED_DIRS + 1))
        fi
    done
    
    if [ "$COVERED_DIRS" -ge 3 ]; then
        success "CODEOWNERS covers $COVERED_DIRS/5 major directories"
    else
        warn "CODEOWNERS only covers $COVERED_DIRS/5 major directories"
    fi
else
    warn "CODEOWNERS file not found"
fi

echo
echo "📊 SUMMARY:"
echo "=========="
echo "Backend API files: $BACKEND_API_FILES"
echo "API docs files: $API_DOCS_FILES" 
echo "Database models: $DATABASE_MODELS"
echo "DB docs files: $DB_DOCS"
echo "Deployment scripts: $DEPLOYMENT_SCRIPTS"
echo "Deployment docs: $DEPLOYMENT_DOCS"
echo "Runbooks: $RUNBOOKS"
echo "ADRs: $ADR_COUNT"

echo
echo "🎯 RESULTS:"
echo "==========="
SUCCESS_COUNT=$(($BACKEND_API_FILES + $API_DOCS_FILES + $DATABASE_MODELS + $DB_DOCS + $RUNBOOKS + $ADR_COUNT))
echo "✅ Components found: $SUCCESS_COUNT"
echo "⚠️  Warnings: $WARNINGS"
echo "❌ Errors: $ERRORS"

# Определяем exit code на основе режима
if [ "$MODE" = "fail" ]; then
    if [ "$ERRORS" -gt 0 ]; then
        echo
        echo "💥 FAILED: $ERRORS error(s) found in fail mode"
        exit 1
    elif [ "$WARNINGS" -gt 0 ]; then
        echo
        echo "⚠️  PASSED with warnings: $WARNINGS warning(s) in fail mode"
        exit 0
    else
        echo
        echo "🎉 ALL CHECKS PASSED in fail mode"
        exit 0
    fi
else
    # warn mode
    if [ "$ERRORS" -gt 0 ]; then
        echo
        echo "⚠️  PASSED with errors: $ERRORS error(s) in warn mode (would fail in strict mode)"
        exit 0
    else
        echo
        echo "🎉 ALL CHECKS PASSED in warn mode"
        exit 0
    fi
fi