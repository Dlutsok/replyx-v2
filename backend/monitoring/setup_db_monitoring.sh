#!/bin/bash

# Скрипт установки мониторинга размера БД для ChatAI
# Настраивает cron задачи, systemd сервисы и алерты

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Логирование
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Проверка прав администратора для системных настроек
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        SYSTEM_INSTALL=true
        log "Запуск с правами root - будут настроены systemd сервисы"
    else
        SYSTEM_INSTALL=false
        warn "Запуск без прав root - только пользовательские cron задачи"
    fi
}

# Определение путей
setup_paths() {
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    
    if [[ ! -f "$PROJECT_ROOT/main.py" ]]; then
        error "Не найден main.py в корне проекта: $PROJECT_ROOT"
    fi
    
    MONITOR_SCRIPT="$SCRIPT_DIR/db_size_monitor.py"
    CRON_SCRIPT="$SCRIPT_DIR/db_size_cron.sh"
    
    if [[ ! -f "$MONITOR_SCRIPT" ]]; then
        error "Не найден скрипт мониторинга: $MONITOR_SCRIPT"
    fi
    
    if [[ ! -f "$CRON_SCRIPT" ]]; then
        error "Не найден cron скрипт: $CRON_SCRIPT"
    fi
    
    info "Проект найден: $PROJECT_ROOT"
    info "Скрипт мониторинга: $MONITOR_SCRIPT"
}

# Проверка зависимостей Python
check_python_dependencies() {
    log "Проверка Python зависимостей..."
    
    cd "$PROJECT_ROOT"
    
    # Проверяем наличие psutil
    if ! python3 -c "import psutil" 2>/dev/null; then
        warn "Модуль psutil не найден, устанавливаем..."
        pip3 install psutil
    fi
    
    # Проверяем наличие других зависимостей
    missing_deps=()
    
    for dep in sqlalchemy fastapi; do
        if ! python3 -c "import $dep" 2>/dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        warn "Отсутствующие зависимости: ${missing_deps[*]}"
        info "Устанавливайте через: pip3 install ${missing_deps[*]}"
    else
        log "Все Python зависимости найдены"
    fi
}

# Настройка переменных окружения
setup_environment() {
    log "Настройка переменных окружения..."
    
    ENV_FILE="$PROJECT_ROOT/.env"
    
    if [[ ! -f "$ENV_FILE" ]]; then
        warn "Файл .env не найден, создаем базовую конфигурацию..."
        cat > "$ENV_FILE" << 'EOF'
# Настройки мониторинга БД
DB_SIZE_THRESHOLD_GB=10
TABLE_SIZE_THRESHOLD_GB=1
DB_DISK_USAGE_THRESHOLD=0.85
DB_GROWTH_THRESHOLD_MB_DAY=100

# Email алерты (опционально)
DB_MONITOR_EMAIL_ALERTS=false
DB_MONITOR_ALERT_EMAILS=admin@your-domain.com

# SMTP настройки
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Webhook для отчетов (опционально)
MONITOR_WEBHOOK_URL=

# Healthcheck URL (опционально)
HEALTHCHECK_URL=
EOF
        info "Создан файл .env с базовыми настройками"
        warn "Обновите настройки в $ENV_FILE для email алертов"
    fi
    
    # Проверяем существующие настройки
    source "$ENV_FILE" 2>/dev/null || true
    
    info "Настроенные пороги:"
    info "  - Размер БД: ${DB_SIZE_THRESHOLD_GB:-10}GB"
    info "  - Размер таблицы: ${TABLE_SIZE_THRESHOLD_GB:-1}GB"
    info "  - Использование диска: $(echo "${DB_DISK_USAGE_THRESHOLD:-0.85} * 100" | bc 2>/dev/null || echo "85")%"
    info "  - Рост БД: ${DB_GROWTH_THRESHOLD_MB_DAY:-100}MB/день"
    
    if [[ "${DB_MONITOR_EMAIL_ALERTS:-false}" == "true" ]]; then
        info "  - Email алерты: включены для ${DB_MONITOR_ALERT_EMAILS:-не указано}"
    else
        info "  - Email алерты: отключены"
    fi
}

# Установка cron задачи
setup_cron() {
    log "Настройка cron задачи..."
    
    # Cron задача для выполнения каждый час
    CRON_JOB="0 * * * * $CRON_SCRIPT"
    
    # Проверяем, не установлена ли уже задача
    if crontab -l 2>/dev/null | grep -q "$CRON_SCRIPT"; then
        warn "Cron задача уже существует"
    else
        # Добавляем новую задачу
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        log "Cron задача установлена: ежечасный мониторинг БД"
    fi
    
    # Показываем текущие cron задачи
    info "Текущие cron задачи:"
    crontab -l 2>/dev/null | grep -E "(chatai|db.*monitor)" || info "  (нет задач мониторинга БД)"
}

# Установка systemd сервиса (только с правами root)
setup_systemd() {
    if [[ "$SYSTEM_INSTALL" != "true" ]]; then
        warn "Пропускаем установку systemd - нет прав root"
        return
    fi
    
    log "Настройка systemd сервиса..."
    
    # Создаем systemd сервис
    cat > /etc/systemd/system/chatai-db-monitor.service << EOF
[Unit]
Description=ChatAI Database Size Monitor
After=network.target postgresql.service

[Service]
Type=oneshot
User=postgres
WorkingDirectory=$PROJECT_ROOT
ExecStart=/usr/bin/python3 $MONITOR_SCRIPT
StandardOutput=journal
StandardError=journal
Environment=PYTHONPATH=$PROJECT_ROOT/backend

[Install]
WantedBy=multi-user.target
EOF

    # Создаем systemd таймер
    cat > /etc/systemd/system/chatai-db-monitor.timer << EOF
[Unit]
Description=ChatAI Database Size Monitor Timer
Requires=chatai-db-monitor.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Перезагружаем systemd и включаем таймер
    systemctl daemon-reload
    systemctl enable chatai-db-monitor.timer
    systemctl start chatai-db-monitor.timer
    
    log "Systemd сервис настроен и запущен"
    
    # Показываем статус
    info "Статус таймера:"
    systemctl status chatai-db-monitor.timer --no-pager -l || true
}

# Создание директорий для логов и данных
setup_directories() {
    log "Создание директорий..."
    
    # Директория для логов мониторинга
    if [[ "$SYSTEM_INSTALL" == "true" ]]; then
        LOG_DIR="/var/log/chatai"
        mkdir -p "$LOG_DIR"
        chown postgres:postgres "$LOG_DIR" 2>/dev/null || true
        chmod 755 "$LOG_DIR"
    else
        LOG_DIR="$PROJECT_ROOT/data/logs"
        mkdir -p "$LOG_DIR"
    fi
    
    # Директория для данных мониторинга
    DATA_DIR="$PROJECT_ROOT/data"
    mkdir -p "$DATA_DIR"
    
    info "Директории созданы:"
    info "  - Логи: $LOG_DIR"
    info "  - Данные: $DATA_DIR"
}

# Тестирование мониторинга
test_monitoring() {
    log "Тестирование мониторинга..."
    
    cd "$PROJECT_ROOT"
    
    # Запускаем тестовый мониторинг
    if python3 "$MONITOR_SCRIPT" >/dev/null 2>&1; then
        log "Тест мониторинга прошел успешно"
    else
        warn "Тест мониторинга завершился с ошибками"
        info "Запустите вручную для диагностики: python3 $MONITOR_SCRIPT"
    fi
    
    # Тестируем cron скрипт
    if "$CRON_SCRIPT" --test >/dev/null 2>&1; then
        log "Тест cron скрипта прошел успешно"
    else
        warn "Тест cron скрипта завершился с ошибками"
    fi
}

# Настройка логротации
setup_logrotate() {
    if [[ "$SYSTEM_INSTALL" != "true" ]]; then
        warn "Пропускаем настройку logrotate - нет прав root"
        return
    fi
    
    log "Настройка logrotate..."
    
    cat > /etc/logrotate.d/chatai-db-monitor << 'EOF'
/var/log/chatai-db-monitor.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su postgres postgres
}

/var/log/chatai/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
    su postgres postgres
}
EOF

    info "Logrotate настроен для автоматической ротации логов"
}

# Создание скрипта управления
create_management_script() {
    log "Создание скрипта управления..."
    
    MGMT_SCRIPT="/usr/local/bin/chatai-db-monitor"
    
    if [[ "$SYSTEM_INSTALL" == "true" ]]; then
        cat > "$MGMT_SCRIPT" << EOF
#!/bin/bash

# Скрипт управления мониторингом БД ChatAI

show_help() {
    echo "Использование: \$0 [команда]"
    echo ""
    echo "Команды:"
    echo "  status           - Показать статус мониторинга"
    echo "  report           - Сгенерировать отчет"
    echo "  test             - Тестовый запуск"
    echo "  logs             - Показать логи"
    echo "  enable           - Включить мониторинг"
    echo "  disable          - Отключить мониторинг"
    echo "  restart          - Перезапустить таймер"
    echo "  help             - Показать эту справку"
}

case "\$1" in
    status)
        echo "=== Статус systemd таймера ==="
        systemctl status chatai-db-monitor.timer --no-pager
        echo ""
        echo "=== Последние запуски ==="
        journalctl -u chatai-db-monitor.service -n 5 --no-pager
        ;;
    report)
        echo "=== Генерация отчета ==="
        python3 $MONITOR_SCRIPT
        ;;
    test)
        echo "=== Тестовый запуск ==="
        $CRON_SCRIPT --test
        ;;
    logs)
        echo "=== Логи мониторинга ==="
        journalctl -u chatai-db-monitor.service -f
        ;;
    enable)
        systemctl enable chatai-db-monitor.timer
        systemctl start chatai-db-monitor.timer
        echo "Мониторинг включен"
        ;;
    disable)
        systemctl stop chatai-db-monitor.timer
        systemctl disable chatai-db-monitor.timer
        echo "Мониторинг отключен"
        ;;
    restart)
        systemctl restart chatai-db-monitor.timer
        echo "Таймер перезапущен"
        ;;
    help|*)
        show_help
        ;;
esac
EOF
        chmod +x "$MGMT_SCRIPT"
        info "Создан скрипт управления: $MGMT_SCRIPT"
    else
        info "Пропускаем создание системного скрипта управления - нет прав root"
    fi
}

# Финальный отчет
show_final_report() {
    log "Установка мониторинга размера БД завершена!"
    echo ""
    info "Созданы компоненты:"
    info "  - Python скрипт мониторинга: $MONITOR_SCRIPT"
    info "  - Cron скрипт: $CRON_SCRIPT"
    info "  - Cron задача: ежечасное выполнение"
    
    if [[ "$SYSTEM_INSTALL" == "true" ]]; then
        info "  - Systemd сервис: chatai-db-monitor"
        info "  - Systemd таймер: chatai-db-monitor.timer"
        info "  - Скрипт управления: /usr/local/bin/chatai-db-monitor"
        info "  - Logrotate конфигурация"
    fi
    
    echo ""
    info "Мониторируемые параметры:"
    info "  - Общий размер БД"
    info "  - Размеры таблиц и индексов"
    info "  - Свободное место на диске"
    info "  - Скорость роста БД"
    info "  - Количество строк в таблицах"
    
    echo ""
    info "Алерты настроены для:"
    info "  - Превышения размера БД"
    info "  - Нехватки дискового пространства"
    info "  - Быстрого роста БД"
    info "  - Больших таблиц"
    
    echo ""
    info "Полезные команды:"
    if [[ "$SYSTEM_INSTALL" == "true" ]]; then
        info "  - sudo chatai-db-monitor status     # Статус мониторинга"
        info "  - sudo chatai-db-monitor report     # Генерация отчета"
        info "  - sudo chatai-db-monitor logs       # Просмотр логов"
    else
        info "  - python3 $MONITOR_SCRIPT            # Ручной запуск"
        info "  - crontab -l                         # Просмотр cron задач"
    fi
    info "  - curl http://localhost:8000/metrics/db-size  # Prometheus метрики"
    
    echo ""
    warn "ВАЖНО: Обновите настройки в $PROJECT_ROOT/.env для email алертов"
    warn "ВАЖНО: Проверьте пороговые значения под ваши требования"
}

# Основная функция
main() {
    log "Начало установки мониторинга размера БД для ChatAI"
    
    check_permissions
    setup_paths
    check_python_dependencies
    setup_directories
    setup_environment
    
    if [[ "$SYSTEM_INSTALL" == "true" ]]; then
        setup_systemd
        setup_logrotate
        create_management_script
    else
        setup_cron
    fi
    
    test_monitoring
    show_final_report
    
    log "Установка завершена успешно!"
}

# Запуск основной функции
main "$@"