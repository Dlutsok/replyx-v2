#!/bin/bash

# =============================================================================
# Proxy Chaos Testing Script для ReplyX
# Тестирует отказоустойчивость системы прокси через блокировку primary прокси
# =============================================================================

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация (primary прокси для блокировки)
PROXY_HOST="154.196.24.180"
PROXY_PORT="63872"
# Secondary proxy: 154.195.184.24:62704 (используется для фейловера)
TEST_DURATION=60  # секунд
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
    
    if ! command -v iptables &> /dev/null; then
        log_error "iptables не найден. Требуются права sudo для блокировки прокси."
        exit 1
    fi
    
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
    
    log_success "Зависимости проверены"
}

# Получение метрик прокси
get_proxy_metrics() {
    local response
    response=$(curl -s "$API_BASE_URL/api/proxy/metrics" -H "Authorization: Bearer $API_TOKEN" 2>/dev/null || echo "{}")
    
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

# Тестовый AI запрос
test_ai_request() {
    local start_time end_time duration status_code
    start_time=$(date +%s.%3N)
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$API_BASE_URL/api/ai/completion" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_TOKEN" \
        -d '{"messages":[{"role":"user","content":"Test"}],"model":"gpt-4o-mini"}' \
        2>/dev/null || echo "000")
    
    end_time=$(date +%s.%3N)
    duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    
    echo "$status_code,$duration"
}

# Блокировка прокси через iptables
block_proxy() {
    log_warning "🚫 Блокируем primary прокси $PROXY_HOST:$PROXY_PORT"
    
    # Блокируем исходящие соединения к прокси
    sudo iptables -I OUTPUT -d "$PROXY_HOST" -p tcp --dport "$PROXY_PORT" -j REJECT --reject-with tcp-reset 2>/dev/null || {
        log_error "Не удалось заблокировать прокси. Проверьте права sudo."
        return 1
    }
    
    log_success "Прокси заблокирован через iptables"
}

# Разблокировка прокси
unblock_proxy() {
    log_info "🔓 Разблокируем прокси $PROXY_HOST:$PROXY_PORT"
    
    # Удаляем правила блокировки
    sudo iptables -D OUTPUT -d "$PROXY_HOST" -p tcp --dport "$PROXY_PORT" -j REJECT --reject-with tcp-reset 2>/dev/null || true
    
    log_success "Прокси разблокирован"
}

# Мониторинг метрик
start_monitoring() {
    log_info "🔍 Запускаем мониторинг метрик..."
    
    # Создаем файл для метрик
    METRICS_FILE="proxy_metrics_$(date +%Y%m%d_%H%M%S).csv"
    echo "timestamp,available_proxies,health_status,ai_request_status,ai_request_duration" > "$METRICS_FILE"
    
    # Фоновый мониторинг
    {
        while [ -f "/tmp/proxy_chaos_test_running" ]; do
            timestamp=$(date +%s)
            available_proxies=$(get_proxy_metrics)
            health_status=$(check_proxy_health)
            ai_result=$(test_ai_request)
            ai_status=$(echo "$ai_result" | cut -d',' -f1)
            ai_duration=$(echo "$ai_result" | cut -d',' -f2)
            
            echo "$timestamp,$available_proxies,$health_status,$ai_status,$ai_duration" >> "$METRICS_FILE"
            
            # Логируем критические изменения
            if [ "$health_status" != "200" ]; then
                log_warning "Health check failed: HTTP $health_status"
            fi
            
            if [ "$ai_status" != "200" ]; then
                log_warning "AI request failed: HTTP $ai_status"
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
    local max_duration min_duration avg_duration
    local health_fails proxy_switches
    
    # Подсчет статистики
    total_requests=$(tail -n +2 "$METRICS_FILE" | wc -l)
    failed_requests=$(tail -n +2 "$METRICS_FILE" | awk -F, '$4 != 200' | wc -l)
    success_rate=$(echo "scale=2; (($total_requests - $failed_requests) * 100) / $total_requests" | bc -l 2>/dev/null || echo "0")
    
    health_fails=$(tail -n +2 "$METRICS_FILE" | awk -F, '$3 != 200' | wc -l)
    
    # Анализ времени ответа (только для успешных запросов)
    tail -n +2 "$METRICS_FILE" | awk -F, '$4 == 200 {print $5}' > "/tmp/response_times.txt"
    if [ -s "/tmp/response_times.txt" ]; then
        max_duration=$(sort -n "/tmp/response_times.txt" | tail -1)
        min_duration=$(sort -n "/tmp/response_times.txt" | head -1)
        avg_duration=$(awk '{sum+=$1; count++} END {printf "%.3f", sum/count}' "/tmp/response_times.txt" 2>/dev/null || echo "0")
    else
        max_duration="N/A"
        min_duration="N/A"  
        avg_duration="N/A"
    fi
    
    # Вывод результатов
    echo ""
    log_info "=== РЕЗУЛЬТАТЫ CHAOS ТЕСТА ==="
    log_info "Продолжительность: ${TEST_DURATION}s"
    log_info "Всего запросов: $total_requests"
    log_info "Неудачных запросов: $failed_requests"
    log_info "Success rate: ${success_rate}%"
    log_info "Health check fails: $health_fails"
    log_info "Response time (успешные): min=${min_duration}s, avg=${avg_duration}s, max=${max_duration}s"
    
    # Оценка результатов
    echo ""
    if [ "$failed_requests" -eq 0 ]; then
        log_success "🎉 ОТЛИЧНО: Система показала 100% отказоустойчивость!"
    elif [ "$success_rate" -gt 95 ]; then
        log_success "✅ ХОРОШО: Success rate > 95%, система отказоустойчива"
    elif [ "$success_rate" -gt 80 ]; then
        log_warning "⚠️ УДОВЛЕТВОРИТЕЛЬНО: Success rate > 80%, есть место для улучшений"
    else
        log_error "❌ ПЛОХО: Success rate < 80%, требуется доработка отказоустойчивости"
    fi
    
    log_info "Детальные метрики сохранены в: $METRICS_FILE"
    log_info "Логи сохранены в: $LOG_FILE"
    
    # Очистка временных файлов
    rm -f "/tmp/response_times.txt"
}

# Обработка сигналов для очистки
cleanup() {
    log_info "🧹 Очистка после теста..."
    stop_monitoring
    unblock_proxy
    exit 0
}

trap cleanup SIGINT SIGTERM

# Основная функция теста
main() {
    echo ""
    log_info "🚀 Запуск Proxy Chaos Test для ReplyX"
    log_info "Время: $(date)"
    echo ""
    
    # Проверки
    check_dependencies
    
    # Проверяем API токен
    if [ -z "${API_TOKEN:-}" ]; then
        log_error "Переменная API_TOKEN не установлена. Экспортируйте токен администратора:"
        log_error "export API_TOKEN=your-admin-token"
        exit 1
    fi
    
    # Проверяем доступность API
    health_status=$(check_proxy_health)
    if [ "$health_status" != "200" ]; then
        log_error "API недоступно или прокси уже имеют проблемы (HTTP $health_status)"
        log_error "Убедитесь что приложение запущено: $API_BASE_URL"
        exit 1
    fi
    
    log_success "Предварительные проверки пройдены"
    
    # Получаем начальные метрики
    initial_proxies=$(get_proxy_metrics)
    log_info "Доступных прокси до теста: $initial_proxies"
    
    if [ "$initial_proxies" = "unknown" ] || [ "$initial_proxies" -lt 2 ]; then
        log_error "Недостаточно прокси для теста отказоустойчивости (нужно минимум 2)"
        exit 1
    fi
    
    # Запускаем мониторинг
    touch "/tmp/proxy_chaos_test_running"
    start_monitoring
    
    # Ждем стабилизации метрик
    sleep 5
    
    # CHAOS: блокируем primary прокси
    if ! block_proxy; then
        stop_monitoring
        exit 1
    fi
    
    log_info "🕐 Тестируем отказоустойчивость в течение ${TEST_DURATION} секунд..."
    
    # Ждем завершения теста
    sleep "$TEST_DURATION"
    
    # Восстанавливаем прокси
    unblock_proxy
    
    # Даем время на восстановление
    log_info "⏳ Ожидаем восстановление системы (10s)..."
    sleep 10
    
    # Останавливаем мониторинг
    stop_monitoring
    
    # Анализируем результаты
    analyze_results
}

# Справка
show_help() {
    echo "Proxy Chaos Testing Script для ReplyX"
    echo ""
    echo "Использование: $0 [опции]"
    echo ""
    echo "Переменные окружения:"
    echo "  API_TOKEN       - Токен администратора для доступа к API (обязательно)"
    echo "  API_BASE_URL    - Базовый URL API (по умолчанию: http://localhost:8000)"
    echo ""
    echo "Опции:"
    echo "  -h, --help      - Показать эту справку"
    echo "  -d, --duration  - Продолжительность теста в секундах (по умолчанию: 60)"
    echo ""
    echo "Пример:"
    echo "  export API_TOKEN=your-admin-token"
    echo "  $0 --duration 120"
    echo ""
    echo "Скрипт тестирует отказоустойчивость системы прокси путем блокировки"
    echo "primary прокси и мониторинга переключения на резервные прокси."
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