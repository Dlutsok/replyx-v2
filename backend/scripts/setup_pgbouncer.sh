#!/bin/bash

# 🚀 УСТАНОВКА И НАСТРОЙКА PGBOUNCER ДЛЯ CHATAI
# Настраивает высокопроизводительное pooling соединений PostgreSQL

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Определение путей
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_DIR="$PROJECT_ROOT/backend/config"

# Проверка прав администратора
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Скрипт должен запускаться с правами root для системной установки"
    fi
}

# Определение дистрибутива
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        error "Не удалось определить операционную систему"
    fi
    
    info "Обнаружена ОС: $OS $VERSION"
}

# Установка PgBouncer
install_pgbouncer() {
    log "Установка PgBouncer..."
    
    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y pgbouncer postgresql-client
            ;;
        centos|rhel|rocky|almalinux)
            yum install -y epel-release
            yum install -y pgbouncer postgresql
            ;;
        fedora)
            dnf install -y pgbouncer postgresql
            ;;
        *)
            error "Неподдерживаемая ОС: $OS"
            ;;
    esac
    
    log "PgBouncer установлен"
}

# Создание пользователей и БД
setup_database_users() {
    log "Настройка пользователей базы данных..."
    
    # Загружаем настройки из .env
    if [[ -f "$PROJECT_ROOT/backend/.env" ]]; then
        source "$PROJECT_ROOT/backend/.env"
    elif [[ -f "$PROJECT_ROOT/.env" ]]; then
        source "$PROJECT_ROOT/.env"
    fi
    
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME:-chat_ai}
    DB_ADMIN_USER=${DB_USER:-dan}
    
    # Создаем пользователя приложения с ограниченными правами
    APP_USER="chat_ai_app"
    APP_PASSWORD=$(openssl rand -base64 32)
    
    # Создаем пользователя мониторинга
    MONITOR_USER="chat_ai_monitor"  
    MONITOR_PASSWORD=$(openssl rand -base64 32)
    
    # SQL скрипт для создания пользователей
    cat > /tmp/create_pgbouncer_users.sql << EOF
-- Создаем пользователя приложения
DROP USER IF EXISTS $APP_USER;
CREATE USER $APP_USER WITH PASSWORD '$APP_PASSWORD';

-- Даем права на подключение к БД
GRANT CONNECT ON DATABASE $DB_NAME TO $APP_USER;

-- Даем права на схему public  
GRANT USAGE ON SCHEMA public TO $APP_USER;

-- Даем права на все таблицы в public
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO $APP_USER;

-- Даем права на последовательности
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO $APP_USER;

-- Даем права на будущие объекты
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $APP_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO $APP_USER;

-- Создаем пользователя мониторинга (только чтение)
DROP USER IF EXISTS $MONITOR_USER;
CREATE USER $MONITOR_USER WITH PASSWORD '$MONITOR_PASSWORD';
GRANT CONNECT ON DATABASE $DB_NAME TO $MONITOR_USER;
GRANT USAGE ON SCHEMA public TO $MONITOR_USER;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO $MONITOR_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO $MONITOR_USER;

-- Создаем пользователей PgBouncer
DROP USER IF EXISTS pgbouncer;
CREATE USER pgbouncer WITH PASSWORD 'pgbouncer_secret';
GRANT CONNECT ON DATABASE $DB_NAME TO pgbouncer;
EOF
    
    # Выполняем SQL скрипт
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" -f /tmp/create_pgbouncer_users.sql; then
        log "Пользователи базы данных созданы"
        
        # Сохраняем пароли в файл
        cat > "$CONFIG_DIR/pgbouncer_credentials.txt" << EOF
# PgBouncer Credentials - НЕ КОММИТИТЬ В GIT!
APP_USER=$APP_USER
APP_PASSWORD=$APP_PASSWORD
MONITOR_USER=$MONITOR_USER  
MONITOR_PASSWORD=$MONITOR_PASSWORD
EOF
        chmod 600 "$CONFIG_DIR/pgbouncer_credentials.txt"
        
        info "Учетные данные сохранены в $CONFIG_DIR/pgbouncer_credentials.txt"
    else
        error "Не удалось создать пользователей базы данных"
    fi
    
    rm -f /tmp/create_pgbouncer_users.sql
}

# Создание файла аутентификации
create_auth_file() {
    log "Создание файла аутентификации..."
    
    # Загружаем credentials
    source "$CONFIG_DIR/pgbouncer_credentials.txt"
    
    # Создаем userlist.txt для PgBouncer
    mkdir -p /etc/pgbouncer
    
    # Генерируем MD5 хеши паролей
    APP_MD5=$(echo -n "$APP_PASSWORD$APP_USER" | md5sum | cut -d' ' -f1)
    MONITOR_MD5=$(echo -n "$MONITOR_PASSWORD$MONITOR_USER" | md5sum | cut -d' ' -f1)
    ADMIN_MD5="md5d6a35858d61d85e4a82ab1fb044aba9d" # пароль: admin
    
    cat > /etc/pgbouncer/userlist.txt << EOF
"$APP_USER" "md5$APP_MD5"
"$MONITOR_USER" "md5$MONITOR_MD5"  
"admin" "$ADMIN_MD5"
"postgres" "trust"
EOF
    
    chmod 640 /etc/pgbouncer/userlist.txt
    chown root:pgbouncer /etc/pgbouncer/userlist.txt 2>/dev/null || true
    
    log "Файл аутентификации создан"
}

# Настройка конфигурации PgBouncer
setup_pgbouncer_config() {
    log "Настройка конфигурации PgBouncer..."
    
    # Загружаем настройки
    source "$CONFIG_DIR/pgbouncer_credentials.txt"
    
    if [[ -f "$PROJECT_ROOT/backend/.env" ]]; then
        source "$PROJECT_ROOT/backend/.env"
    fi
    
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME:-chat_ai}
    
    # Создаем конфигурацию на основе шаблона
    sed -e "s/chat_ai = host=localhost/chat_ai = host=$DB_HOST/" \
        -e "s/port=5432/port=$DB_PORT/" \
        -e "s/user=chat_ai_app/user=$APP_USER/" \
        "$CONFIG_DIR/pgbouncer.ini" > /etc/pgbouncer/pgbouncer.ini
    
    # Создаем директории для логов и PID
    mkdir -p /var/log/pgbouncer
    mkdir -p /var/run/pgbouncer
    
    # Устанавливаем права
    chmod 644 /etc/pgbouncer/pgbouncer.ini
    chown -R pgbouncer:pgbouncer /var/log/pgbouncer /var/run/pgbouncer 2>/dev/null || {
        # Если пользователь pgbouncer не существует, создаем его
        useradd -r -s /bin/false pgbouncer 2>/dev/null || true
        chown -R pgbouncer:pgbouncer /var/log/pgbouncer /var/run/pgbouncer
    }
    
    log "Конфигурация PgBouncer настроена"
}

# Создание systemd сервиса
create_systemd_service() {
    log "Создание systemd сервиса..."
    
    cat > /etc/systemd/system/pgbouncer.service << 'EOF'
[Unit]
Description=PgBouncer connection pooler for ChatAI
After=postgresql.service
Wants=postgresql.service

[Service]
Type=notify
User=pgbouncer
Group=pgbouncer
ExecStart=/usr/bin/pgbouncer /etc/pgbouncer/pgbouncer.ini
ExecReload=/bin/kill -HUP $MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutSec=120
NotifyAccess=all

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/pgbouncer /var/run/pgbouncer
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictRealtime=true
RestrictNamespaces=true

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable pgbouncer
    
    log "Systemd сервис создан и включен"
}

# Настройка logrotate
setup_logrotate() {
    log "Настройка ротации логов..."
    
    cat > /etc/logrotate.d/pgbouncer << 'EOF'
/var/log/pgbouncer/pgbouncer.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    su pgbouncer pgbouncer
}
EOF
    
    log "Logrotate настроен"
}

# Тестирование подключения
test_connection() {
    log "Тестирование подключения к PgBouncer..."
    
    # Стартуем сервис если не запущен
    systemctl start pgbouncer || error "Не удалось запустить PgBouncer"
    
    # Ждем несколько секунд для запуска
    sleep 3
    
    # Проверяем статус
    if systemctl is-active pgbouncer >/dev/null; then
        log "PgBouncer успешно запущен"
    else
        error "PgBouncer не запустился"
    fi
    
    # Тестируем подключение к административной консоли
    if psql -h 127.0.0.1 -p 6432 -U admin pgbouncer -c "SHOW POOLS;" >/dev/null 2>&1; then
        log "Административная консоль доступна"
    else
        warn "Административная консоль недоступна"
    fi
    
    # Тестируем подключение к БД через PgBouncer
    source "$CONFIG_DIR/pgbouncer_credentials.txt"
    if PGPASSWORD="$APP_PASSWORD" psql -h 127.0.0.1 -p 6432 -U "$APP_USER" -d chat_ai -c "SELECT 1;" >/dev/null 2>&1; then
        log "Подключение к БД через PgBouncer работает"
    else
        warn "Не удалось подключиться к БД через PgBouncer"
    fi
}

# Создание скриптов мониторинга
create_monitoring_scripts() {
    log "Создание скриптов мониторинга..."
    
    # Скрипт статистики PgBouncer
    cat > /usr/local/bin/pgbouncer-stats << 'EOF'
#!/bin/bash
# Статистика PgBouncer

echo "=== PgBouncer Status ==="
systemctl status pgbouncer --no-pager -l

echo -e "\n=== PgBouncer Pools ==="
psql -h 127.0.0.1 -p 6432 -U admin pgbouncer -c "SHOW POOLS;"

echo -e "\n=== PgBouncer Databases ==="
psql -h 127.0.0.1 -p 6432 -U admin pgbouncer -c "SHOW DATABASES;"

echo -e "\n=== PgBouncer Stats ==="
psql -h 127.0.0.1 -p 6432 -U admin pgbouncer -c "SHOW STATS;"

echo -e "\n=== Active Connections ==="
psql -h 127.0.0.1 -p 6432 -U admin pgbouncer -c "SHOW CLIENTS;" | head -20
EOF
    
    chmod +x /usr/local/bin/pgbouncer-stats
    
    # Скрипт перезагрузки конфигурации
    cat > /usr/local/bin/pgbouncer-reload << 'EOF'
#!/bin/bash
# Перезагрузка конфигурации PgBouncer без простоя

echo "Перезагружаем конфигурацию PgBouncer..."
psql -h 127.0.0.1 -p 6432 -U admin pgbouncer -c "RELOAD;"
echo "Готово!"
EOF
    
    chmod +x /usr/local/bin/pgbouncer-reload
    
    log "Скрипты мониторинга созданы"
}

# Обновление конфигурации приложения
update_app_config() {
    log "Обновление конфигурации приложения..."
    
    # Создаем production .env с PgBouncer
    cat > "$PROJECT_ROOT/backend/.env.production" << EOF
# 🚀 ChatAI Backend - Production Environment Configuration

# Environment
ENVIRONMENT=production

# Database Configuration (через PgBouncer)
DB_HOST=127.0.0.1
DB_PORT=6432
DB_NAME=chat_ai
DB_USER=chat_ai_app
DB_PASSWORD=\$(получить из $CONFIG_DIR/pgbouncer_credentials.txt)
DB_SSL_MODE=require

# Database Pool Settings (через PgBouncer управляется)
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
DB_ECHO=false

# Security
SECRET_KEY=\$(генерировать новый ключ для продакшена)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS (Production)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email/SMTP (Production)
YANDEX_SMTP_USER=your-production-email@domain.com
YANDEX_SMTP_PASS=your-production-password
SMTP_SERVER=smtp.yandex.ru
SMTP_PORT=465
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME="ChatAI Production"

# Frontend/Backend URLs (Production)
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Monitoring
DB_SIZE_THRESHOLD_GB=50
DB_DISK_USAGE_THRESHOLD=0.8
DB_MONITOR_EMAIL_ALERTS=true
DB_MONITOR_ALERT_EMAILS=admin@yourdomain.com

# Backup
BACKUP_RETENTION_DAYS=90
BACKUP_WEBHOOK_URL=https://your-monitoring.com/webhooks/backup
EOF
    
    info "Создан шаблон production конфигурации: $PROJECT_ROOT/backend/.env.production"
    warn "Обновите пароли и домены в production конфигурации!"
}

# Финальный отчет
show_final_report() {
    log "Установка PgBouncer завершена!"
    echo ""
    info "Компоненты:"
    info "  ✓ PgBouncer установлен и настроен"
    info "  ✓ Пользователи БД созданы"
    info "  ✓ Systemd сервис настроен"  
    info "  ✓ Logrotate настроен"
    info "  ✓ Мониторинг скрипты созданы"
    
    echo ""
    info "Подключение:"
    info "  Хост: 127.0.0.1"
    info "  Порт: 6432" 
    info "  База: chat_ai"
    info "  Пользователь: chat_ai_app"
    
    echo ""
    info "Полезные команды:"
    info "  sudo systemctl status pgbouncer     # Статус сервиса"
    info "  sudo pgbouncer-stats               # Статистика пулов"
    info "  sudo pgbouncer-reload              # Перезагрузка конфигурации"
    info "  sudo journalctl -u pgbouncer -f    # Логи в реальном времени"
    
    echo ""
    info "Мониторинг:"
    info "  psql -h 127.0.0.1 -p 6432 -U admin pgbouncer"
    info "    \\> SHOW POOLS;     # Состояние пулов"
    info "    \\> SHOW STATS;     # Статистика"
    info "    \\> SHOW CLIENTS;   # Активные клиенты"
    
    echo ""
    warn "ВАЖНО: Обновите .env.production с реальными паролями и настройками!"
    warn "ВАЖНО: Настройте файрвол для доступа только с localhost:6432"
    warn "ВАЖНО: Регулярно мониторьте SHOW STATS для оптимизации pool_size"
}

# Основная функция
main() {
    log "Установка и настройка PgBouncer для ChatAI..."
    
    check_root
    detect_os
    install_pgbouncer
    setup_database_users
    create_auth_file
    setup_pgbouncer_config
    create_systemd_service
    setup_logrotate
    test_connection
    create_monitoring_scripts
    update_app_config
    show_final_report
    
    log "Установка завершена успешно!"
}

# Обработка аргументов
case "${1:-}" in
    --help|-h)
        echo "Использование: $0 [опции]"
        echo ""
        echo "Опции:"
        echo "  --test-only    Только тестирование существующей установки"
        echo "  --help         Показать эту справку"
        echo ""
        echo "Требования:"
        echo "  - Права root"
        echo "  - Доступная PostgreSQL БД"
        echo "  - Настроенный .env файл"
        exit 0
        ;;
    --test-only)
        test_connection
        ;;
    *)
        main
        ;;
esac