#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Database configuration from .env.production or environment variables
DB_HOST="${DB_HOST:-192.168.0.4}"
DB_PORT="${DB_PORT:-5432}"
DB_ADMIN_USER="${DB_ADMIN_USER:-postgres}"
DB_ADMIN_PASS="${PGPASSWORD:-}"  # Use PGPASSWORD env var
DB_NAME="${DB_NAME:-replyx_production}"
DB_USER="${DB_USER:-gen_user}"
DB_PASS="${DB_PASS:-q?|>7!gzi+S.jJ}"

print_status() {
    echo -e "${GREEN}[ИНФО]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ВНИМАНИЕ]${NC} $1"
}

print_error() {
    echo -e "${RED}[ОШИБКА]${NC} $1"
}

# Check if database admin credentials are provided
check_admin_credentials() {
    if [ -z "$DB_ADMIN_PASS" ]; then
        print_error "Пароль администратора PostgreSQL не указан!"
        echo ""
        echo "Укажите пароль администратора PostgreSQL через переменную окружения:"
        echo "export PGPASSWORD=ваш-пароль-postgres"
        echo "./init-db.sh"
        echo ""
        echo "Или добавьте его в файл .env.production как PGPASSWORD"
        exit 1
    fi
    print_status "Используются учетные данные администратора PostgreSQL из переменных окружения"
}

# Test database connection
test_connection() {
    print_status "Проверка подключения к серверу PostgreSQL..."
    
    export PGPASSWORD="$DB_ADMIN_PASS"
    
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c "SELECT version();" > /dev/null 2>&1; then
        print_error "Не удается подключиться к серверу PostgreSQL!"
        print_error "Проверьте:"
        echo "  1. Сервер PostgreSQL запущен на $DB_HOST:$DB_PORT"
        echo "  2. Учетные данные администратора корректны"
        echo "  3. Сетевое подключение"
        exit 1
    fi
    
    print_status "Подключение успешно!"
}

# Create database and user
create_database() {
    print_status "Создание базы данных и пользователя..."
    
    export PGPASSWORD="$DB_ADMIN_PASS"
    
    # Create user if not exists
    print_status "Создание пользователя '$DB_USER'..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c "
        DO \$\$
        BEGIN
            CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'User $DB_USER already exists';
        END
        \$\$;
    "
    
    # Create database if not exists
    print_status "Создание базы данных '$DB_NAME'..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c "
        SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
    "
    
    # Grant privileges
    print_status "Предоставление привилегий..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -c "
        GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
        ALTER USER $DB_USER CREATEDB;
    "
}

# Install pgvector extension
install_pgvector() {
    print_status "Установка расширения pgvector..."
    
    export PGPASSWORD="$DB_PASS"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE EXTENSION IF NOT EXISTS vector;
    "
    
    if [ $? -eq 0 ]; then
        print_status "Расширение pgvector успешно установлено!"
    else
        print_error "Не удалось установить расширение pgvector!"
        print_error "Убедитесь, что pgvector установлен на сервере PostgreSQL:"
        echo "  Ubuntu/Debian: apt install postgresql-15-pgvector"
        echo "  CentOS/RHEL: yum install pgvector"
        exit 1
    fi
}

# Test application database connection
test_app_connection() {
    print_status "Проверка подключения приложения к базе данных..."
    
    export PGPASSWORD="$DB_PASS"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
        print_status "Приложение может подключиться к базе данных!"
        
        # Test vector extension
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
            print_status "База данных готова для миграций!"
        fi
    else
        print_error "Приложение не может подключиться к базе данных!"
        exit 1
    fi
}

# Main execution
main() {
    print_status "🗄️  Инициализация базы данных ReplyX"
    echo "=================================="
    
    print_warning "Этот скрипт выполнит:"
    echo "  1. Создание базы данных: $DB_NAME"
    echo "  2. Создание пользователя: $DB_USER"
    echo "  3. Установку расширения pgvector"
    echo "  4. Проверку подключения приложения"
    echo ""
    
    # Check for non-interactive mode
    if [ "${INIT_DB_NON_INTERACTIVE:-0}" = "1" ] || [ "${CI:-false}" = "true" ] || [ -n "${AUTO_CONFIRM:-}" ]; then
        print_status "Неинтерактивный режим: автоматическое подтверждение"
    else
        read -p "Продолжить? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Прервано пользователем"
            exit 0
        fi
    fi
    
    check_admin_credentials
    test_connection
    create_database
    install_pgvector
    test_app_connection
    
    print_status "🎉 Инициализация базы данных завершена!"
    print_status "Теперь можно запустить: docker-compose up -d backend"
    print_status "Backend автоматически выполнит миграции при запуске"
}

# Handle script arguments
case "${1:-init}" in
    "test")
        check_admin_credentials
        test_connection
        test_app_connection
        ;;
    "init"|"")
        main
        ;;
    "-y"|"--yes")
        export AUTO_CONFIRM=1
        main
        ;;
    *)
        echo "Использование: $0 [init|test|-y|--yes]"
        echo ""
        echo "  init     - Инициализация базы данных (по умолчанию)"
        echo "  test     - Проверка подключения к базе данных"
        echo "  -y|--yes - Неинтерактивный режим (автоподтверждение)"
        echo ""
        echo "Переменные окружения для неинтерактивного режима:"
        echo "  INIT_DB_NON_INTERACTIVE=1 - неинтерактивный режим"
        echo "  CI=true                   - автоматически в CI/CD"
        echo "  AUTO_CONFIRM=любое        - автоподтверждение"
        exit 1
        ;;
esac