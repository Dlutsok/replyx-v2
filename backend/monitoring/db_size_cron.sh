#!/bin/bash

# Cron скрипт для мониторинга размера БД ChatAI
# Запускается каждый час для отслеживания роста БД

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="/var/log/chatai-db-monitor.log"
MONITOR_SCRIPT="$SCRIPT_DIR/db_size_monitor.py"

# Логирование
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Проверка окружения
check_environment() {
    if [[ ! -f "$MONITOR_SCRIPT" ]]; then
        error "Скрипт мониторинга не найден: $MONITOR_SCRIPT"
    fi
    
    if [[ ! -f "$PROJECT_ROOT/.env" ]]; then
        warn "Файл .env не найден: $PROJECT_ROOT/.env"
    fi
    
    # Создаем директорию для логов если не существует
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Проверяем права на запись в лог файл
    if ! touch "$LOG_FILE" 2>/dev/null; then
        warn "Нет прав для записи в лог файл: $LOG_FILE"
        LOG_FILE="/tmp/chatai-db-monitor.log"
        warn "Используем временный лог файл: $LOG_FILE"
    fi
}

# Основная функция мониторинга
run_monitoring() {
    log "Запуск мониторинга размера БД..."
    
    cd "$PROJECT_ROOT"
    
    # Активируем виртуальное окружение если есть
    if [[ -f "venv/bin/activate" ]]; then
        source venv/bin/activate
        log "Активировано виртуальное окружение"
    elif [[ -f ".venv/bin/activate" ]]; then
        source .venv/bin/activate
        log "Активировано виртуальное окружение (.venv)"
    fi
    
    # Запускаем мониторинг
    if python3 "$MONITOR_SCRIPT" >> "$LOG_FILE" 2>&1; then
        exit_code=$?
        case $exit_code in
            0)
                log "Мониторинг завершен успешно (статус: здоровый)"
                ;;
            1)
                warn "Мониторинг завершен с предупреждениями (статус: предупреждение)"
                ;;
            2)
                error "Мониторинг обнаружил критические проблемы (статус: критический)"
                ;;
            *)
                error "Мониторинг завершился с неожиданным кодом: $exit_code"
                ;;
        esac
    else
        error "Ошибка выполнения скрипта мониторинга"
    fi
}

# Очистка старых логов
cleanup_logs() {
    # Оставляем только последние 7 дней логов
    if [[ -f "$LOG_FILE" ]]; then
        # Создаем архив старых логов
        if [[ $(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE" 2>/dev/null) -gt 10485760 ]]; then # > 10MB
            log "Архивирование больших лог файлов..."
            gzip -c "$LOG_FILE" > "${LOG_FILE}.$(date +%Y%m%d_%H%M%S).gz"
            > "$LOG_FILE"  # Очищаем текущий лог файл
        fi
        
        # Удаляем архивы старше 7 дней
        find "$(dirname "$LOG_FILE")" -name "$(basename "$LOG_FILE").*.gz" -mtime +7 -delete 2>/dev/null || true
    fi
}

# Проверка конфигурации алертов
check_alert_config() {
    # Проверяем переменные окружения для алертов
    if [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
        
        if [[ "$DB_MONITOR_EMAIL_ALERTS" == "true" ]]; then
            if [[ -z "$DB_MONITOR_ALERT_EMAILS" ]] || [[ -z "$SMTP_HOST" ]]; then
                warn "Email алерты включены, но не настроены SMTP параметры"
            else
                log "Email алерты настроены для: $DB_MONITOR_ALERT_EMAILS"
            fi
        fi
        
        # Проверяем пороговые значения
        DB_SIZE_THRESHOLD_GB=${DB_SIZE_THRESHOLD_GB:-10}
        DISK_USAGE_THRESHOLD=${DB_DISK_USAGE_THRESHOLD:-0.85}
        
        log "Настроенные пороги: БД=${DB_SIZE_THRESHOLD_GB}GB, Диск=$(echo "$DISK_USAGE_THRESHOLD * 100" | bc)%"
    fi
}

# Отправка heartbeat (опционально)
send_heartbeat() {
    # Если настроен healthcheck URL, отправляем heartbeat
    if [[ -n "$HEALTHCHECK_URL" ]]; then
        if curl -fsS --retry 3 "$HEALTHCHECK_URL" >/dev/null 2>&1; then
            log "Heartbeat отправлен успешно"
        else
            warn "Не удалось отправить heartbeat"
        fi
    fi
}

# Генерация отчета в JSON для интеграции
generate_json_report() {
    local report_file="/tmp/chatai-db-monitor-report.json"
    
    if python3 "$MONITOR_SCRIPT" > "$report_file" 2>/dev/null; then
        log "JSON отчет сгенерирован: $report_file"
        
        # Если настроен webhook, отправляем отчет
        if [[ -n "$MONITOR_WEBHOOK_URL" ]]; then
            if curl -fsS -X POST -H "Content-Type: application/json" \
                    -d "@$report_file" "$MONITOR_WEBHOOK_URL" >/dev/null 2>&1; then
                log "Отчет отправлен на webhook"
            else
                warn "Не удалось отправить отчет на webhook"
            fi
        fi
    else
        warn "Не удалось сгенерировать JSON отчет"
    fi
}

# Главная функция
main() {
    log "=== Запуск мониторинга размера БД ChatAI ==="
    
    check_environment
    check_alert_config
    cleanup_logs
    
    # Основной мониторинг
    run_monitoring
    
    # Дополнительные функции
    generate_json_report
    send_heartbeat
    
    log "=== Мониторинг завершен ==="
}

# Обработка сигналов
trap 'error "Скрипт прерван сигналом"' INT TERM

# Проверка аргументов командной строки
case "${1:-}" in
    --test)
        log "Тестовый запуск мониторинга"
        check_environment
        python3 "$MONITOR_SCRIPT" --help 2>/dev/null || python3 "$MONITOR_SCRIPT"
        ;;
    --cleanup)
        log "Очистка старых логов"
        cleanup_logs
        ;;
    --config)
        log "Проверка конфигурации"
        check_alert_config
        ;;
    *)
        main
        ;;
esac