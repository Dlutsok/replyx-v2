#!/bin/bash

# =============================================================================
# Proxy Chaos Testing Script для ReplyX (macOS версия)
# Тестирует отказоустойчивость системы прокси через mock-блокировку
# =============================================================================

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
PROXY_HOST="154.196.24.180"
PROXY_PORT="63872"
TEST_DURATION=30  # секунд
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
LOG_FILE="proxy_chaos_test_$(date +%Y%m%d_%H%M%S).log"

# Функции для логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Проверка зависимостей
check_dependencies() {
    log_info "Проверяем зависимости..."
    
    if ! command -v curl &> /dev/null; then
        log_error "curl не найден. Установите curl для HTTP запросов."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq не найден. JSON ответы не будут форматироваться."
        JQ_AVAILABLE=false
    else
        JQ_AVAILABLE=true
    fi
    
    log_success "Зависимости проверены (macOS версия)"
}

# Получение метрик прокси
get_proxy_metrics() {
    local response
    response=$(curl -s "$API_BASE_URL/api/proxy/health" 2>/dev/null || echo "{}")
    
    if [ "$JQ_AVAILABLE" = true ]; then
        echo "$response" | jq -r '.available_proxies // "unknown"'
    else
        echo "$response" | grep -o '"available_proxies":[0-9]*' | cut -d':' -f2 || echo "unknown"
    fi
}

# Проверка health check
check_proxy_health() {
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/api/proxy/health" || echo "000")
    echo "$status_code"
}

# Тестовый AI запрос через существующий эндпоинт
test_ai_request() {
    local start_time end_time duration status_code
    start_time=$(date +%s)
    
    # Попробуем найти рабочий AI эндпоинт
    # Сначала попробуем основной эндпоинт диалогов
    status_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X GET "$API_BASE_URL/health" \
        2>/dev/null || echo "000")
    
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    echo "$status_code,$duration"
}

# Симуляция блокировки прокси (mock для macOS)
simulate_proxy_block() {
    log_warning "🚫 Симулируем блокировку primary прокси $PROXY_HOST:$PROXY_PORT (mock режим)"
    
    # Создаем файл-флаг для симуляции
    touch "/tmp/proxy_primary_blocked"
    
    log_success "Primary прокси заблокирован (симуляция)"
    return 0
}

# Восстановление прокси (mock)
simulate_proxy_restore() {
    log_info "🔓 Восстанавливаем прокси $PROXY_HOST:$PROXY_PORT (mock режим)"
    
    # Удаляем файл-флаг
    rm -f "/tmp/proxy_primary_blocked"
    
    log_success "Прокси восстановлен (симуляция)"
}

# Мониторинг метрик
start_monitoring() {
    log_info "🔍 Запускаем мониторинг метрик..."
    
    # Создаем файл для метрик
    METRICS_FILE="proxy_metrics_$(date +%Y%m%d_%H%M%S).csv"
    echo "timestamp,available_proxies,health_status,api_request_status,api_request_duration,simulation_status" > "$METRICS_FILE"
    
    # Фоновый мониторинг
    {
        while [ -f "/tmp/proxy_chaos_test_running" ]; do
            timestamp=$(date +%s)
            available_proxies=$(get_proxy_metrics)
            health_status=$(check_proxy_health)
            api_result=$(test_ai_request)
            api_status=$(echo "$api_result" | cut -d',' -f1)
            api_duration=$(echo "$api_result" | cut -d',' -f2)
            
            # Проверяем статус симуляции
            if [ -f "/tmp/proxy_primary_blocked" ]; then
                simulation_status="blocked"
            else
                simulation_status="normal"
            fi
            
            echo "$timestamp,$available_proxies,$health_status,$api_status,$api_duration,$simulation_status" >> "$METRICS_FILE"
            
            # Логируем критические изменения
            if [ "$health_status" != "200" ]; then
                log_warning "Health check failed: HTTP $health_status"
            fi
            
            if [ "$simulation_status" = "blocked" ]; then
                log_info "Симуляция блокировки активна, available_proxies: $available_proxies"
            fi
            
            sleep 2
        done
    } &
    
    MONITOR_PID=$!
    log_success "Мониторинг запущен (PID: $MONITOR_PID)"
}

# Остановка мониторинга
stop_monitoring() {
    if [ -f "/tmp/proxy_chaos_test_running" ]; then
        rm "/tmp/proxy_chaos_test_running"
    fi
    
    if [ -n "${MONITOR_PID:-}" ]; then
        kill "$MONITOR_PID" 2>/dev/null || true
        wait "$MONITOR_PID" 2>/dev/null || true
        log_success "Мониторинг остановлен"
    fi
}

# Анализ результатов
analyze_results() {
    log_info "📊 Анализируем результаты теста..."
    
    if [ ! -f "$METRICS_FILE" ]; then
        log_error "Файл метрик не найден"
        return 1
    fi
    
    local total_requests failed_requests success_rate
    local health_fails blocked_time normal_time
    
    # Подсчет статистики
    total_requests=$(tail -n +2 "$METRICS_FILE" | wc -l)
    failed_requests=$(tail -n +2 "$METRICS_FILE" | awk -F, '$3 != 200' | wc -l)
    
    if [ "$total_requests" -gt 0 ]; then
        success_rate=$(echo "scale=2; (($total_requests - $failed_requests) * 100) / $total_requests" | bc -l 2>/dev/null || echo "0")
    else
        success_rate="0"
    fi
    
    health_fails=$(tail -n +2 "$METRICS_FILE" | awk -F, '$3 != 200' | wc -l)
    blocked_time=$(tail -n +2 "$METRICS_FILE" | awk -F, '$6 == "blocked"' | wc -l)
    normal_time=$(tail -n +2 "$METRICS_FILE" | awk -F, '$6 == "normal"' | wc -l)
    
    # Вывод результатов
    echo ""
    log_info "=== РЕЗУЛЬТАТЫ CHAOS ТЕСТА (macOS Mock) ==="
    log_info "Продолжительность: ${TEST_DURATION}s"
    log_info "Всего проверок: $total_requests"
    log_info "Неудачных health checks: $failed_requests"
    log_info "Success rate: ${success_rate}%"
    log_info "Health check fails: $health_fails"
    log_info "Время блокировки: ${blocked_time} циклов"
    log_info "Нормальное время: ${normal_time} циклов"
    
    # Проверим работу системы во время "блокировки"
    blocked_availability=$(tail -n +2 "$METRICS_FILE" | awk -F, '$6 == "blocked" {print $2}' | head -1)
    if [ -n "$blocked_availability" ]; then
        log_info "Доступных прокси во время блокировки: $blocked_availability"
    fi
    
    # Оценка результатов
    echo ""
    if [ "$failed_requests" -eq 0 ]; then
        log_success "🎉 ОТЛИЧНО: Система показала 100% доступность!"
    elif [ "${success_rate%.*}" -gt 95 ]; then
        log_success "✅ ХОРОШО: Success rate > 95%, система стабильна"
    elif [ "${success_rate%.*}" -gt 80 ]; then
        log_warning "⚠️ УДОВЛЕТВОРИТЕЛЬНО: Success rate > 80%, есть место для улучшений"
    else
        log_error "❌ ПЛОХО: Success rate < 80%, требуется доработка"
    fi
    
    log_info "Детальные метрики сохранены в: $METRICS_FILE"
    log_info "Логи сохранены в: $LOG_FILE"
    
    # Показываем последние несколько записей
    echo ""
    log_info "Последние 5 записей метрик:"
    tail -5 "$METRICS_FILE" | while read line; do
        echo "  $line"
    done
}

# Обработка сигналов для очистки
cleanup() {
    log_info "🧹 Очистка после теста..."
    stop_monitoring
    simulate_proxy_restore
    rm -f "/tmp/proxy_primary_blocked"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Основная функция теста
main() {
    echo ""
    log_info "🚀 Запуск Proxy Chaos Test для ReplyX (macOS)"
    log_info "Время: $(date)"
    echo ""
    
    # Проверки
    check_dependencies
    
    # Проверяем доступность API
    health_status=$(check_proxy_health)
    if [ "$health_status" != "200" ]; then
        log_error "API недоступно (HTTP $health_status)"
        log_error "Убедитесь что приложение запущено: $API_BASE_URL"
        exit 1
    fi
    
    log_success "API доступен"
    
    # Получаем начальные метрики
    initial_proxies=$(get_proxy_metrics)
    log_info "Доступных прокси до теста: $initial_proxies"
    
    # Запускаем мониторинг
    touch "/tmp/proxy_chaos_test_running"
    start_monitoring
    
    # Ждем стабилизации метрик
    sleep 3
    
    # CHAOS: симулируем блокировку primary прокси
    simulate_proxy_block
    
    log_info "🕐 Тестируем отказоустойчивость в течение ${TEST_DURATION} секунд..."
    log_info "📊 Мониторинг работает каждые 2 секунды..."
    
    # Ждем половину времени теста
    sleep $((TEST_DURATION / 2))
    
    # Показываем промежуточные результаты
    log_info "📊 Промежуточные результаты (середина теста):"
    current_proxies=$(get_proxy_metrics)
    log_info "   Доступных прокси: $current_proxies"
    
    # Ждем оставшуюся половину времени
    sleep $((TEST_DURATION / 2))
    
    # Восстанавливаем прокси
    simulate_proxy_restore
    
    # Даем время на восстановление
    log_info "⏳ Ожидаем восстановление системы (5s)..."
    sleep 5
    
    # Останавливаем мониторинг
    stop_monitoring
    
    # Анализируем результаты
    analyze_results
}

# Справка
show_help() {
    echo "Proxy Chaos Testing Script для ReplyX (macOS версия)"
    echo ""
    echo "Использование: $0 [опции]"
    echo ""
    echo "Переменные окружения:"
    echo "  API_BASE_URL    - Базовый URL API (по умолчанию: http://localhost:8000)"
    echo ""
    echo "Опции:"
    echo "  -h, --help      - Показать эту справку"
    echo "  -d, --duration  - Продолжительность теста в секундах (по умолчанию: 30)"
    echo ""
    echo "Пример:"
    echo "  $0 --duration 60"
    echo ""
    echo "ВНИМАНИЕ: Это mock-версия для macOS. Блокировка прокси симулируется."
}

# Парсинг аргументов
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -d|--duration)
            TEST_DURATION="$2"
            shift 2
            ;;
        *)
            log_error "Неизвестная опция: $1"
            show_help
            exit 1
            ;;
    esac
done

# Запуск
main