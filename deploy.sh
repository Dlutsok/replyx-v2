#!/bin/bash
# =============================================================================
# AUTOMATED CORS SECURITY DEPLOYMENT SCRIPT
# =============================================================================

set -euo pipefail  # Строгий режим

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Конфигурация
DEPLOY_DIR="/opt/replyx/Deployed"
BACKUP_DIR="/opt/replyx/backups"
COMPOSE_FILE="docker-compose.prod.yml"

# Функции
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Проверка предварительных условий..."
    
    # Проверяем Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен"
        exit 1
    fi
    
    # Проверяем Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose не установлен"
        exit 1
    fi
    
    # Проверяем TAG
    if [[ -z "${TAG:-}" ]]; then
        log_error "Переменная TAG не установлена"
        echo "Использование: TAG=v1.0.0 ./deploy.sh"
        exit 1
    fi
    
    # Проверяем .env файл
    if [[ ! -f "$DEPLOY_DIR/.env" ]]; then
        log_error "Файл .env не найден в $DEPLOY_DIR"
        echo "Скопируйте .env.docker.example как .env и заполните значения"
        exit 1
    fi
    
    log_success "Предварительные условия выполнены"
}

create_backup() {
    log_info "Создание бэкапа базы данных..."
    
    mkdir -p "$BACKUP_DIR"
    
    local backup_file="$BACKUP_DIR/before_deploy_$(date +%Y%m%d_%H%M%S).sql"
    
    # Пытаемся создать бэкап через Docker
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U replyx_user replyx_prod > "$backup_file" 2>/dev/null; then
        log_success "Бэкап создан: $backup_file"
        echo "BACKUP_FILE=$backup_file" > /tmp/replyx_backup_info
    else
        log_warning "Не удалось создать бэкап через Docker"
        log_warning "Продолжить без бэкапа? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[yY]$ ]]; then
            log_error "Деплой отменен"
            exit 1
        fi
    fi
}

deploy_services() {
    log_info "Начинаем деплой сервисов..."
    
    cd "$DEPLOY_DIR"
    
    # Загружаем новые образы
    log_info "Загрузка образов (TAG=$TAG)..."
    if ! docker compose -f "$COMPOSE_FILE" pull; then
        log_error "Не удалось загрузить образы"
        exit 1
    fi
    
    # Выполняем миграции
    log_info "Выполнение миграций базы данных..."
    if ! docker compose -f "$COMPOSE_FILE" run --rm replyx-backend alembic upgrade head; then
        log_error "Ошибка выполнения миграций"
        log_error "Проверьте состояние БД или выполните откат"
        exit 1
    fi
    
    # Запускаем сервисы
    log_info "Запуск обновленных сервисов..."
    if ! docker compose -f "$COMPOSE_FILE" up -d; then
        log_error "Ошибка запуска сервисов"
        exit 1
    fi
    
    log_success "Сервисы обновлены и запущены"
}

wait_for_services() {
    log_info "Ожидание готовности сервисов..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -sf https://replyx.ru/health > /dev/null 2>&1; then
            log_success "Сервисы готовы к работе"
            return 0
        fi
        
        ((attempt++))
        log_info "Попытка $attempt/$max_attempts..."
        sleep 10
    done
    
    log_error "Сервисы не готовы после ${max_attempts} попыток"
    return 1
}

run_health_checks() {
    log_info "Выполнение проверок состояния..."
    
    local checks_passed=0
    local total_checks=4
    
    # 1. Health endpoint
    if curl -sf https://replyx.ru/health > /dev/null; then
        log_success "✓ Health check прошел"
        ((checks_passed++))
    else
        log_error "✗ Health check провалился"
    fi
    
    # 2. Main app CORS (with credentials)
    local response=$(curl -sI https://replyx.ru/api/login \
        -H "Origin: https://replyx.ru" \
        -H "Content-Type: application/json" 2>/dev/null || true)
    
    if echo "$response" | grep -q "Access-Control-Allow-Origin: https://replyx.ru" && \
       echo "$response" | grep -q "Access-Control-Allow-Credentials: true"; then
        log_success "✓ Main app CORS работает"
        ((checks_passed++))
    else
        log_error "✗ Main app CORS не работает"
    fi
    
    # 3. Widget preflight
    local widget_response=$(curl -sI https://replyx.ru/api/validate-widget-token \
        -X OPTIONS \
        -H "Origin: https://stencom.ru" \
        -H "Access-Control-Request-Method: POST" 2>/dev/null || true)
    
    if echo "$widget_response" | grep -q "HTTP/[0-9.]* 200" && \
       echo "$widget_response" | grep -q "Access-Control-Allow-Origin: https://stencom.ru" && \
       ! echo "$widget_response" | grep -q "Access-Control-Allow-Credentials"; then
        log_success "✓ Widget CORS работает"
        ((checks_passed++))
    else
        log_error "✗ Widget CORS не работает"
    fi
    
    # 4. Metrics endpoint
    if curl -sf https://replyx.ru/metrics | grep -q "widget_cors_requests_total" > /dev/null; then
        log_success "✓ Metrics работают"
        ((checks_passed++))
    else
        log_error "✗ Metrics не работают"
    fi
    
    log_info "Пройдено проверок: $checks_passed/$total_checks"
    
    if [[ $checks_passed -eq $total_checks ]]; then
        log_success "Все проверки пройдены!"
        return 0
    else
        log_error "Некоторые проверки провалились"
        return 1
    fi
}

show_rollback_info() {
    log_info "Информация для отката:"
    echo ""
    echo "Быстрый откат образов:"
    echo "  export PREV_TAG=<предыдущий_тег>"
    echo "  cd $DEPLOY_DIR"
    echo "  docker compose -f $COMPOSE_FILE pull"
    echo "  docker compose -f $COMPOSE_FILE up -d"
    echo ""
    
    if [[ -f "/tmp/replyx_backup_info" ]]; then
        source /tmp/replyx_backup_info
        echo "Восстановление БД из бэкапа:"
        echo "  docker compose -f $COMPOSE_FILE exec -T postgres psql -U replyx_user -d replyx_prod < $BACKUP_FILE"
        echo ""
    fi
}

main() {
    log_info "=== CORS Security Deployment ==="
    log_info "TAG: ${TAG}"
    log_info "Deploy Dir: $DEPLOY_DIR"
    log_info "================================="
    echo ""
    
    check_prerequisites
    create_backup
    deploy_services
    
    if wait_for_services && run_health_checks; then
        log_success "🎉 Деплой успешно завершен!"
        
        log_info "Мониторинг:"
        echo "  - Логи: docker compose -f $COMPOSE_FILE logs -f"
        echo "  - Метрики: https://replyx.ru/metrics"
        echo "  - Health: https://replyx.ru/health"
        echo ""
    else
        log_error "❌ Деплой завершился с ошибками"
        show_rollback_info
        exit 1
    fi
    
    show_rollback_info
}

# Trap для очистки
trap 'log_error "Деплой прерван"; show_rollback_info; exit 1' INT TERM

main "$@"