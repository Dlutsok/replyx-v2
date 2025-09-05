#!/bin/bash
# RAD Agent Documentation Linter
# Проверяет синхронизацию кода и документации для ChatAI MVP 13

set -e
set +e  # Отключаем немедленный выход при ошибках для более гибкой обработки

# Конфигурация
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FAIL_MODE="${FAIL_MODE:-warn}"  # warn/fail
VERBOSE="${VERBOSE:-false}"

# Цвета для вывода
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Счетчики проблем
ERRORS=0
WARNINGS=0
CHECKS=0

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((ERRORS++))
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

check_counter() {
    ((CHECKS++))
}

# Проверка существования путей в документации
check_file_paths() {
    log "🔍 Проверяю пути к файлам в документации..."
    
    # Проверяем старые пути к воркерам (если директория docs существует)
    if [ -d "$PROJECT_ROOT/docs/" ]; then
        check_counter
        if grep -r "backend/master/" "$PROJECT_ROOT/docs/" > /dev/null 2>&1 || true; then
            if grep -r "backend/master/" "$PROJECT_ROOT/docs/" > /dev/null 2>&1; then
                warn "Найдены устаревшие пути 'backend/master/' в документации"
                if [ "$VERBOSE" = "true" ]; then
                    grep -rn "backend/master/" "$PROJECT_ROOT/docs/" || true
                fi
            else
                success "Старые пути 'backend/master/' не найдены"
            fi
        fi
        
        check_counter
        if grep -r "backend/worker/" "$PROJECT_ROOT/docs/" > /dev/null 2>&1; then
            warn "Найдены устаревшие пути 'backend/worker/' в документации"
            if [ "$VERBOSE" = "true" ]; then
                grep -rn "backend/worker/" "$PROJECT_ROOT/docs/"
            fi
        else
            success "Старые пути 'backend/worker/' не найдены"
        fi
    else
        warn "Директория docs/ не найдена, пропускаем проверку путей"
    fi
    
    # Проверяем корректность новых путей
    check_counter
    if [ -f "$PROJECT_ROOT/workers/master/scalable_bot_manager.js" ]; then
        success "Файл workers/master/scalable_bot_manager.js существует"
    else
        warn "Файл workers/master/scalable_bot_manager.js не найден"
    fi
    
    check_counter
    if [ -f "$PROJECT_ROOT/workers/telegram/bot_worker.js" ]; then
        success "Файл workers/telegram/bot_worker.js существует"
    else
        warn "Файл workers/telegram/bot_worker.js не найден"
    fi
}

# Проверка OpenAPI схемы
check_openapi_schema() {
    log "📋 Проверяю актуальность OpenAPI схемы..."
    
    check_counter
    if [ -f "$PROJECT_ROOT/docs/api/openapi.json" ]; then
        # Проверяем дату последнего изменения
        schema_date=$(stat -f %m "$PROJECT_ROOT/docs/api/openapi.json" 2>/dev/null || echo "0")
        code_date=$(find "$PROJECT_ROOT/backend/api" -name "*.py" -type f -exec stat -f %m {} \; | sort -n | tail -1)
        
        if [ "$code_date" -gt "$schema_date" ]; then
            warn "OpenAPI схема устарела. Код API изменен позже схемы"
        else
            success "OpenAPI схема актуальна"
        fi
    else
        warn "OpenAPI схема не найдена в docs/api/openapi.json"
    fi
}

# Проверка структуры документации
check_doc_structure() {
    log "📁 Проверяю структуру документации..."
    
    required_files=(
        "docs/architecture/overview.md"
        "docs/architecture/service-catalog.md"
        "docs/runbooks/workers.md"
        "docs/runbooks/backend.md"
        "docs/runbooks/frontend.md"
        "docs/api/endpoints.md"
        "docs/realtime/events.md"
    )
    
    for file in "${required_files[@]}"; do
        check_counter
        if [ -f "$PROJECT_ROOT/$file" ]; then
            success "✓ $file"
        else
            error "✗ Отсутствует обязательный файл: $file"
        fi
    done
}

# Проверка соответствия API эндпоинтов
check_api_endpoints() {
    log "🔌 Проверяю соответствие API эндпоинтов..."
    
    check_counter
    if [ -f "$PROJECT_ROOT/backend/main.py" ]; then
        # Извлекаем роутеры из main.py
        routers=$(grep -E "app\.include_router" "$PROJECT_ROOT/backend/main.py" | wc -l)
        if [ "$routers" -gt 10 ]; then
            success "Найдено $routers роутеров в main.py"
        else
            warn "Найдено только $routers роутеров, ожидалось больше"
        fi
    else
        error "Файл backend/main.py не найден"
    fi
}

# Проверка событий WebSocket
check_websocket_events() {
    log "🔄 Проверяю документацию WebSocket событий..."
    
    check_counter
    if [ -f "$PROJECT_ROOT/docs/realtime/events.md" ]; then
        # Проверяем, есть ли таблица событий
        if grep -q "| Event" "$PROJECT_ROOT/docs/realtime/events.md"; then
            success "Таблица WebSocket событий найдена"
        else
            warn "Таблица WebSocket событий отсутствует или имеет неправильный формат"
        fi
    else
        warn "Файл docs/realtime/events.md не найден"
    fi
}

# Проверка CODEOWNERS
check_codeowners() {
    log "👥 Проверяю файл CODEOWNERS..."
    
    check_counter
    if [ -f "$PROJECT_ROOT/CODEOWNERS" ]; then
        if grep -q "workers/" "$PROJECT_ROOT/CODEOWNERS"; then
            success "CODEOWNERS покрывает workers/"
        else
            warn "CODEOWNERS не покрывает структуру workers"
        fi
    else
        warn "Файл CODEOWNERS отсутствует"
    fi
}

# Главная функция
main() {
    echo "🤖 RAD Agent Documentation Linter v1.0"
    echo "📁 Проект: ChatAI MVP 13"
    echo "🔧 Режим: $FAIL_MODE"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    check_file_paths
    check_openapi_schema  
    check_doc_structure
    check_api_endpoints
    check_websocket_events
    check_codeowners
    
    echo ""
    echo "📊 РЕЗУЛЬТАТЫ ПРОВЕРКИ:"
    echo "   ✅ Выполнено проверок: $CHECKS"
    echo "   ⚠️  Предупреждений: $WARNINGS" 
    echo "   ❌ Ошибок: $ERRORS"
    echo ""
    
    if [ "$ERRORS" -gt 0 ]; then
        if [ "$FAIL_MODE" = "fail" ]; then
            error "❌ Проверка завершилась с ошибками. CI должен упасть."
            exit 1
        else
            warn "⚠️ Найдены ошибки, но режим 'warn' - продолжаем"
            exit 0
        fi
    elif [ "$WARNINGS" -gt 0 ]; then
        warn "⚠️ Есть предупреждения, но критических ошибок нет"
        exit 0
    else
        success "✅ Все проверки пройдены успешно!"
        exit 0
    fi
}

# Обработка аргументов
while [[ $# -gt 0 ]]; do
    case $1 in
        --fail-mode)
            FAIL_MODE="fail"
            shift
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        -h|--help)
            echo "RAD Agent Documentation Linter"
            echo ""
            echo "Опции:"
            echo "  --fail-mode    Режим строгих проверок (fail на любых ошибках)"
            echo "  --verbose      Подробный вывод"
            echo "  -h, --help     Показать справку"
            echo ""
            echo "Переменные окружения:"
            echo "  FAIL_MODE=warn|fail   Режим работы (по умолчанию: warn)"
            echo "  VERBOSE=true|false    Подробный вывод (по умолчанию: false)"
            exit 0
            ;;
        *)
            echo "Неизвестная опция: $1"
            exit 1
            ;;
    esac
done

main "$@"