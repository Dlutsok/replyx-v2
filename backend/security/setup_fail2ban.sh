#!/bin/bash

# Скрипт установки и настройки fail2ban для ChatAI
# Поддерживает Ubuntu/Debian и CentOS/RHEL

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

# Проверка прав администратора
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Этот скрипт должен быть запущен с правами root (sudo)"
    fi
}

# Определение ОС
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [[ -f /etc/redhat-release ]]; then
        OS="centos"
    elif [[ -f /etc/debian_version ]]; then
        OS="debian"
    else
        error "Неподдерживаемая операционная система"
    fi
    
    info "Обнаружена ОС: $OS $OS_VERSION"
}

# Установка fail2ban
install_fail2ban() {
    log "Установка fail2ban..."
    
    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y fail2ban iptables
            ;;
        centos|rhel|fedora)
            if command -v dnf >/dev/null 2>&1; then
                dnf install -y fail2ban iptables-services
            else
                yum install -y fail2ban iptables-services
            fi
            ;;
        *)
            error "Неподдерживаемая ОС для автоматической установки: $OS"
            ;;
    esac
    
    # Включаем и запускаем fail2ban
    systemctl enable fail2ban
    systemctl enable iptables 2>/dev/null || true
    
    log "fail2ban установлен успешно"
}

# Резервное копирование существующих конфигураций
backup_configs() {
    log "Создание резервных копий конфигураций..."
    
    BACKUP_DIR="/etc/fail2ban/backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [[ -f /etc/fail2ban/jail.local ]]; then
        cp /etc/fail2ban/jail.local "$BACKUP_DIR/"
        info "Создана резервная копия jail.local"
    fi
    
    if [[ -d /etc/fail2ban/filter.d ]]; then
        cp -r /etc/fail2ban/filter.d "$BACKUP_DIR/"
        info "Создана резервная копия filter.d"
    fi
    
    log "Резервные копии созданы в: $BACKUP_DIR"
}

# Определение пути к проекту ChatAI
detect_project_path() {
    # Ищем проект относительно текущего скрипта
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
    
    if [[ ! -f "$PROJECT_ROOT/main.py" ]]; then
        error "Не найден main.py в корне проекта. Убедитесь, что скрипт запущен из правильной директории."
    fi
    
    LOGS_PATH="$PROJECT_ROOT/logs"
    if [[ ! -d "$LOGS_PATH" ]]; then
        warn "Директория логов не найдена: $LOGS_PATH"
        read -p "Введите путь к директории логов ChatAI: " LOGS_PATH
        if [[ ! -d "$LOGS_PATH" ]]; then
            error "Указанная директория логов не существует: $LOGS_PATH"
        fi
    fi
    
    info "Проект найден: $PROJECT_ROOT"
    info "Логи найдены: $LOGS_PATH"
}

# Настройка фильтра fail2ban
setup_filter() {
    log "Настройка фильтра fail2ban для ChatAI..."
    
    FILTER_FILE="/etc/fail2ban/filter.d/chatai.conf"
    
    cat > "$FILTER_FILE" << 'EOF'
# fail2ban filter для ChatAI application
# 
# Этот фильтр обнаруживает неудачные попытки аутентификации в логах ChatAI
# и блокирует IP адреса при множественных неудачных попытках

[Definition]

# Паттерн для обнаружения неудачных попыток входа
# Формат лога: YYYY-MM-DD HH:MM:SS,mmm | WARNING | user_id | user_login | failed | {...}
failregex = ^.*\|\s*WARNING\s*\|\s*\w*\s*\|\s*user_login\s*\|\s*failed\s*\|.*"ip_address":\s*"<HOST>".*$

# Паттерн для обнаружения попыток доступа к защищенным эндпоинтам без авторизации
            ^.*\|\s*WARNING\s*\|\s*\w*\s*\|\s*unauthorized_access\s*\|\s*failed\s*\|.*"ip_address":\s*"<HOST>".*$

# Паттерн для обнаружения подозрительной активности по API
            ^.*\|\s*ERROR\s*\|\s*\w*\s*\|\s*api_abuse\s*\|\s*failed\s*\|.*"ip_address":\s*"<HOST>".*$

# Паттерн для обнаружения CSRF атак
            ^.*\|\s*WARNING\s*\|\s*\w*\s*\|\s*csrf_violation\s*\|\s*failed\s*\|.*"ip_address":\s*"<HOST>".*$

# Паттерн для обнаружения попыток SQL инъекций (если такие логируются)
            ^.*\|\s*ERROR\s*\|\s*\w*\s*\|\s*sql_injection_attempt\s*\|\s*failed\s*\|.*"ip_address":\s*"<HOST>".*$

# Паттерн для обнаружения попыток загрузки вредоносных файлов
            ^.*\|\s*WARNING\s*\|\s*\w*\s*\|\s*malicious_file_upload\s*\|\s*failed\s*\|.*"ip_address":\s*"<HOST>".*$

# Паттерн для обнаружения превышения rate limit
            ^.*\|\s*WARNING\s*\|\s*\w*\s*\|\s*rate_limit_exceeded\s*\|\s*failed\s*\|.*"ip_address":\s*"<HOST>".*$

# Паттерн для FastAPI/uvicorn логов с 401/403 статусами
            ^.*\s+<HOST>\s+.*\s+(401|403)\s+.*$

# Паттерн для nginx логов (если используется)
            ^<HOST>\s+.*\s+\"(GET|POST|PUT|DELETE|PATCH)\s+.*\s+(401|403|404)\s+.*$

# Игнорировать успешные операции
ignoreregex = ^.*\|\s*INFO\s*\|\s*\w*\s*\|\s*user_login\s*\|\s*success\s*\|.*$
              ^.*\s+<HOST>\s+.*\s+200\s+.*$
              ^.*\s+<HOST>\s+.*\s+201\s+.*$

# Параметры таймингов для анализа логов
datepattern = ^%%Y-%%m-%%d %%H:%%M:%%S

[Init]
maxlines = 1
EOF

    info "Фильтр создан: $FILTER_FILE"
}

# Настройка jail конфигурации
setup_jail() {
    log "Настройка jail конфигурации..."
    
    JAIL_FILE="/etc/fail2ban/jail.local"
    
    # Получаем email для уведомлений
    read -p "Введите email для уведомлений (или нажмите Enter для пропуска): " ADMIN_EMAIL
    if [[ -z "$ADMIN_EMAIL" ]]; then
        ADMIN_EMAIL="admin@your-domain.com"
    fi
    
    cat > "$JAIL_FILE" << EOF
# fail2ban jail конфигурация для ChatAI application
# Этот файл: /etc/fail2ban/jail.local

[DEFAULT]
# Исключить локальные IP адреса и доверенные сети
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16

# Время блокировки по умолчанию (1 час)
bantime = 3600

# Период наблюдения за неудачными попытками (10 минут)
findtime = 600

# Максимальное количество неудачных попыток перед блокировкой
maxretry = 5

# Backend для блокировки (iptables)
banaction = iptables-multiport

# Action по умолчанию - блокировать и отправить email
action = %(action_mwl)s

# Email для уведомлений
destemail = $ADMIN_EMAIL
sender = fail2ban@your-domain.com

# Jail для защиты от брут-форс атак на аутентификацию ChatAI
[chatai-auth]
enabled = true
filter = chatai
logpath = $LOGS_PATH/audit.log
maxretry = 3
findtime = 300
bantime = 1800
port = 8000
protocol = tcp

# Jail для защиты от API abuse
[chatai-api-abuse]
enabled = true
filter = chatai
logpath = $LOGS_PATH/audit.log
          $LOGS_PATH/api.log
maxretry = 10
findtime = 600
bantime = 3600
port = 8000
protocol = tcp

# Jail для защиты nginx (если используется)
[chatai-nginx]
enabled = false
filter = nginx-limit-req
logpath = /var/log/nginx/access.log
maxretry = 5
findtime = 600
bantime = 7200
port = 80,443
protocol = tcp

# Jail для защиты от CSRF атак
[chatai-csrf]
enabled = true
filter = chatai
logpath = $LOGS_PATH/audit.log
maxretry = 2
findtime = 300
bantime = 3600
port = 8000
protocol = tcp

# Jail для защиты от SQL injection попыток
[chatai-sqli]
enabled = true
filter = chatai
logpath = $LOGS_PATH/audit.log
maxretry = 1
findtime = 300
bantime = 86400
port = 8000
protocol = tcp

# Jail для защиты от превышения rate limit
[chatai-ratelimit]
enabled = true
filter = chatai
logpath = $LOGS_PATH/audit.log
maxretry = 20
findtime = 300
bantime = 1800
port = 8000
protocol = tcp

# Jail для защиты SSH (рекомендуется всегда включать)
[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
maxretry = 3
findtime = 600
bantime = 3600
EOF

    info "Jail конфигурация создана: $JAIL_FILE"
}

# Создание cron задачи для мониторинга
setup_monitoring() {
    log "Настройка мониторинга fail2ban..."
    
    MONITOR_SCRIPT="$PROJECT_ROOT/backend/security/fail2ban_monitor.py"
    
    if [[ ! -f "$MONITOR_SCRIPT" ]]; then
        warn "Скрипт мониторинга не найден: $MONITOR_SCRIPT"
        return
    fi
    
    # Делаем скрипт исполняемым
    chmod +x "$MONITOR_SCRIPT"
    
    # Создаем cron задачу для ежечасного мониторинга
    CRON_JOB="0 * * * * python3 $MONITOR_SCRIPT > /var/log/fail2ban_monitor.log 2>&1"
    
    # Добавляем в crontab root'а
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | sort -u | crontab -
    
    info "Настроена cron задача для мониторинга fail2ban (каждый час)"
}

# Создание systemd сервиса для мониторинга
setup_systemd_monitoring() {
    log "Создание systemd сервиса для мониторинга..."
    
    cat > /etc/systemd/system/chatai-fail2ban-monitor.service << EOF
[Unit]
Description=ChatAI fail2ban monitoring service
After=network.target

[Service]
Type=oneshot
User=root
ExecStart=/usr/bin/python3 $PROJECT_ROOT/backend/security/fail2ban_monitor.py
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    cat > /etc/systemd/system/chatai-fail2ban-monitor.timer << EOF
[Unit]
Description=ChatAI fail2ban monitoring timer
Requires=chatai-fail2ban-monitor.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable chatai-fail2ban-monitor.timer
    systemctl start chatai-fail2ban-monitor.timer
    
    info "Systemd мониторинг настроен и запущен"
}

# Тестирование конфигурации
test_configuration() {
    log "Тестирование конфигурации fail2ban..."
    
    # Проверяем синтаксис конфигурации
    if fail2ban-client -t; then
        log "Синтаксис конфигурации корректен"
    else
        error "Ошибка в конфигурации fail2ban"
    fi
    
    # Перезапускаем fail2ban
    systemctl restart fail2ban
    
    sleep 3
    
    # Проверяем статус
    if systemctl is-active --quiet fail2ban; then
        log "fail2ban успешно запущен"
    else
        error "Не удалось запустить fail2ban"
    fi
    
    # Проверяем статус jails
    log "Статус jails:"
    fail2ban-client status || warn "Не удалось получить статус jails"
}

# Создание скрипта для управления
create_management_script() {
    log "Создание скрипта управления fail2ban..."
    
    MGMT_SCRIPT="/usr/local/bin/chatai-fail2ban"
    
    cat > "$MGMT_SCRIPT" << 'EOF'
#!/bin/bash

# Скрипт управления fail2ban для ChatAI

show_help() {
    echo "Использование: $0 [команда]"
    echo ""
    echo "Команды:"
    echo "  status           - Показать статус всех jails"
    echo "  unban <ip>       - Разблокировать IP адрес"
    echo "  ban <ip>         - Заблокировать IP адрес"
    echo "  logs             - Показать последние события"
    echo "  monitor          - Запустить мониторинг"
    echo "  restart          - Перезапустить fail2ban"
    echo "  help             - Показать эту справку"
}

case "$1" in
    status)
        echo "=== Статус fail2ban ==="
        fail2ban-client status
        echo ""
        for jail in $(fail2ban-client status | grep "Jail list:" | cut -d: -f2 | tr ',' ' '); do
            if [[ -n "$jail" ]]; then
                echo "=== Jail: $jail ==="
                fail2ban-client status "$jail"
                echo ""
            fi
        done
        ;;
    unban)
        if [[ -z "$2" ]]; then
            echo "Использование: $0 unban <ip_address>"
            exit 1
        fi
        echo "Разблокировка IP: $2"
        for jail in $(fail2ban-client status | grep "Jail list:" | cut -d: -f2 | tr ',' ' '); do
            if [[ -n "$jail" ]]; then
                fail2ban-client set "$jail" unbanip "$2" 2>/dev/null && echo "Разблокирован в jail: $jail"
            fi
        done
        ;;
    ban)
        if [[ -z "$2" ]]; then
            echo "Использование: $0 ban <ip_address>"
            exit 1
        fi
        echo "Блокировка IP: $2"
        fail2ban-client set chatai-auth banip "$2"
        ;;
    logs)
        echo "=== Последние события fail2ban ==="
        tail -50 /var/log/fail2ban.log
        ;;
    monitor)
        if [[ -f "/opt/chatai/backend/security/fail2ban_monitor.py" ]]; then
            python3 /opt/chatai/backend/security/fail2ban_monitor.py
        else
            echo "Скрипт мониторинга не найден"
        fi
        ;;
    restart)
        echo "Перезапуск fail2ban..."
        systemctl restart fail2ban
        echo "fail2ban перезапущен"
        ;;
    help|*)
        show_help
        ;;
esac
EOF

    chmod +x "$MGMT_SCRIPT"
    info "Создан скрипт управления: $MGMT_SCRIPT"
}

# Финальный отчет
show_final_report() {
    log "Установка и настройка fail2ban завершена!"
    echo ""
    info "Созданы файлы:"
    info "  - /etc/fail2ban/filter.d/chatai.conf (фильтр)"
    info "  - /etc/fail2ban/jail.local (конфигурация jails)"
    info "  - /usr/local/bin/chatai-fail2ban (скрипт управления)"
    echo ""
    info "Настроенные jails:"
    info "  - chatai-auth (защита аутентификации)"
    info "  - chatai-api-abuse (защита от API abuse)"
    info "  - chatai-csrf (защита от CSRF)"
    info "  - chatai-sqli (защита от SQL injection)"
    info "  - chatai-ratelimit (защита от rate limit)"
    info "  - sshd (защита SSH)"
    echo ""
    info "Полезные команды:"
    info "  - sudo chatai-fail2ban status      # Статус всех jails"
    info "  - sudo chatai-fail2ban unban <ip>  # Разблокировать IP"
    info "  - sudo chatai-fail2ban logs        # Показать логи"
    info "  - sudo fail2ban-client status      # Нативная команда fail2ban"
    echo ""
    warn "ВАЖНО: Обновите email в /etc/fail2ban/jail.local для получения уведомлений"
    warn "ВАЖНО: Проверьте пути к логам в jail конфигурации"
}

# Основная функция
main() {
    log "Начало установки и настройки fail2ban для ChatAI"
    
    check_root
    detect_os
    detect_project_path
    
    # Проверяем, установлен ли уже fail2ban
    if command -v fail2ban-client >/dev/null 2>&1; then
        warn "fail2ban уже установлен"
        read -p "Продолжить настройку? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    else
        install_fail2ban
    fi
    
    backup_configs
    setup_filter
    setup_jail
    setup_monitoring
    setup_systemd_monitoring
    create_management_script
    test_configuration
    show_final_report
    
    log "Установка завершена успешно!"
}

# Запуск основной функции
main "$@"