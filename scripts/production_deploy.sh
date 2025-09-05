#!/bin/bash

# 🚀 ReplyX Production Database Deployment Script
# Безопасный деплой БД с проверками и rollback планом

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ReplyX Production Database Deployment${NC}"
echo "=================================================="

# Проверка переменных окружения
if [[ -z "${DATABASE_URL:-}" ]]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables OK${NC}"

# Функция для проверки подключения к БД
check_db_connection() {
    echo -n "🔌 Checking database connection... "
    if psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

# Функция создания бэкапа
create_backup() {
    local backup_file="backup_$(date +%Y%m%d_%H%M%S).dump"
    echo -e "${YELLOW}📦 Creating backup: $backup_file${NC}"
    
    if pg_dump --format=custom --file="$backup_file" "$DATABASE_URL"; then
        echo -e "${GREEN}✅ Backup created: $backup_file${NC}"
        echo "$backup_file" > .last_backup
        return 0
    else
        echo -e "${RED}❌ Backup failed${NC}"
        return 1
    fi
}

# Функция проверки расширения vector
check_vector_extension() {
    echo -n "🧩 Checking pgvector extension... "
    local result=$(psql "$DATABASE_URL" -t -c "SELECT extname FROM pg_extension WHERE extname='vector';")
    if [[ "$result" =~ "vector" ]]; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${YELLOW}NOT INSTALLED${NC}"
        echo -e "${BLUE}💡 Installing pgvector extension...${NC}"
        psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;" || return 1
        echo -e "${GREEN}✅ pgvector extension installed${NC}"
        return 0
    fi
}

# Функция проверки миграций
check_migration_state() {
    echo -e "${BLUE}🔄 Checking migration state...${NC}"
    
    cd "$(dirname "$0")/../backend" || exit 1
    
    local current=$(alembic current 2>/dev/null | grep -oE '[a-f0-9]{12}' || echo "none")
    local heads=$(alembic heads 2>/dev/null | grep -oE '[a-f0-9]{12}' || echo "none")
    
    echo "Current revision: $current"
    echo "Target revision:  $heads"
    
    if [[ "$current" == "$heads" ]] && [[ "$current" != "none" ]]; then
        echo -e "${GREEN}✅ Database is up to date${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Database needs migration${NC}"
        return 1
    fi
}

# Функция применения миграций
apply_migrations() {
    echo -e "${BLUE}🛠️  Applying migrations...${NC}"
    
    cd "$(dirname "$0")/../backend" || exit 1
    
    if alembic upgrade head; then
        echo -e "${GREEN}✅ Migrations applied successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Migration failed${NC}"
        return 1
    fi
}

# Функция проверки autogenerate noop
check_autogenerate_noop() {
    echo -e "${BLUE}🔍 Checking autogenerate noop status...${NC}"
    
    cd "$(dirname "$0")/../backend" || exit 1
    
    local noop_file="noop_prod_check_$(date +%s)"
    alembic revision --autogenerate -m "$noop_file" >/dev/null 2>&1
    
    local migration_file=$(find alembic/versions -name "*${noop_file}*.py" | head -1)
    
    if [[ -f "$migration_file" ]]; then
        local content=$(grep -E "def upgrade|def downgrade" -A 5 "$migration_file" | grep -v "pass" | grep -v "def " | grep -v "##" | grep -v "\"\"\"" | grep -E "\S")
        rm "$migration_file"
        
        if [[ -z "$content" ]]; then
            echo -e "${GREEN}✅ Perfect noop - schema is synchronized${NC}"
            return 0
        else
            echo -e "${RED}❌ Schema drift detected${NC}"
            echo -e "${YELLOW}Content: $content${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Could not create test migration${NC}"
        return 1
    fi
}

# Функция проверки индексов
check_indexes() {
    echo -e "${BLUE}🏗️  Checking critical indexes...${NC}"
    
    local vector_indexes=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM pg_indexes
        WHERE indexname IN (
          'knowledge_embeddings_embedding_cosine_idx',
          'knowledge_embeddings_embedding_l2_idx', 
          'query_embeddings_cache_embedding_cosine_idx'
        );
    ")
    
    local email_index=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*)
        FROM pg_indexes
        WHERE tablename='users' AND indexname LIKE 'ix_users_email';
    ")
    
    vector_indexes=$(echo $vector_indexes | tr -d ' ')
    email_index=$(echo $email_index | tr -d ' ')
    
    echo "Vector indexes: $vector_indexes/3"
    echo "Email index: $email_index/1"
    
    if [[ "$vector_indexes" == "3" && "$email_index" == "1" ]]; then
        echo -e "${GREEN}✅ All critical indexes present${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Some indexes missing (may be created during migration)${NC}"
        return 0
    fi
}

# Функция оптимизации после деплоя
post_deploy_optimization() {
    echo -e "${BLUE}⚡ Running post-deploy optimization...${NC}"
    
    psql "$DATABASE_URL" -c "
        -- Update table statistics for optimal query planning
        ANALYZE knowledge_embeddings;
        ANALYZE query_embeddings_cache;
        ANALYZE users;
        ANALYZE dialogs;
        ANALYZE dialog_messages;
        
        -- Set optimal vector search configuration
        ALTER DATABASE $(echo $DATABASE_URL | grep -oE '/[^/]+$' | cut -c2-) SET ivfflat.probes = 10;
    " || echo -e "${YELLOW}⚠️  Some optimization steps may have failed${NC}"
    
    echo -e "${GREEN}✅ Post-deploy optimization completed${NC}"
}

# Функция отображения статистики
show_database_stats() {
    echo -e "${BLUE}📊 Database Statistics:${NC}"
    
    psql "$DATABASE_URL" -c "
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_stat_get_live_tuples(c.oid) as live_tuples
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE schemaname = 'public' 
          AND pg_total_relation_size(schemaname||'.'||tablename) > 0
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
    "
}

# Функция bootstrap администратора
bootstrap_admin() {
    echo -e "${BLUE}🛡️  Checking admin bootstrap...${NC}"
    
    if [[ -n "${FIRST_ADMIN_EMAIL:-}" ]]; then
        echo "📧 FIRST_ADMIN_EMAIL detected: $FIRST_ADMIN_EMAIL"
        echo "🔧 Running admin bootstrap..."
        
        cd "$(dirname "$0")" || return 1
        
        if python admin_bootstrap.py; then
            echo -e "${GREEN}✅ Admin bootstrap completed${NC}"
        else
            echo -e "${YELLOW}⚠️  Admin bootstrap failed (non-critical)${NC}"
        fi
    else
        echo -e "${YELLOW}💡 Skipping admin bootstrap (FIRST_ADMIN_EMAIL not set)${NC}"
        echo "   To create admin later: export FIRST_ADMIN_EMAIL='admin@domain.com' && python scripts/admin_bootstrap.py"
    fi
}

# Функция rollback
rollback() {
    echo -e "${RED}🔄 ROLLBACK INITIATED${NC}"
    
    if [[ -f ".last_backup" ]]; then
        local backup_file=$(cat .last_backup)
        echo -e "${YELLOW}📦 Restoring from backup: $backup_file${NC}"
        
        if [[ -f "$backup_file" ]]; then
            pg_restore --clean --if-exists --dbname="$DATABASE_URL" "$backup_file"
            echo -e "${GREEN}✅ Database restored from backup${NC}"
        else
            echo -e "${RED}❌ Backup file not found: $backup_file${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No backup reference found${NC}"
    fi
}

# Обработка сигналов для безопасного выхода
trap rollback EXIT

# Основной процесс деплоя
main() {
    echo -e "${BLUE}Starting deployment checks...${NC}"
    
    # 1. Проверка подключения
    if ! check_db_connection; then
        echo -e "${RED}❌ Cannot connect to database${NC}"
        exit 1
    fi
    
    # 2. Создание бэкапа
    if ! create_backup; then
        echo -e "${RED}❌ Backup failed - aborting deployment${NC}"
        exit 1
    fi
    
    # 3. Проверка расширения pgvector
    if ! check_vector_extension; then
        echo -e "${RED}❌ pgvector extension check failed${NC}"
        exit 1
    fi
    
    # 4. Проверка состояния миграций
    needs_migration=false
    if ! check_migration_state; then
        needs_migration=true
    fi
    
    # 5. Применение миграций если нужно
    if [[ "$needs_migration" == "true" ]]; then
        echo -e "${YELLOW}📋 Applying migrations...${NC}"
        if ! apply_migrations; then
            echo -e "${RED}❌ Migration failed${NC}"
            exit 1
        fi
    fi
    
    # 6. Проверка noop статуса
    if ! check_autogenerate_noop; then
        echo -e "${RED}❌ Schema drift detected - manual review required${NC}"
        exit 1
    fi
    
    # 7. Проверка индексов
    check_indexes
    
    # 8. Пост-деплой оптимизация
    post_deploy_optimization
    
    # 9. Отображение статистики
    show_database_stats
    
    # 10. Bootstrap администратора (если нужно)
    bootstrap_admin
    
    # Убираем trap для rollback - деплой успешен
    trap - EXIT
    
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL${NC}"
    echo "=================================================="
    echo -e "${BLUE}Database is ready for production traffic${NC}"
    
    # Удаляем старые бэкапы (оставляем 5 последних)
    find . -name "backup_*.dump" -type f | sort | head -n -5 | xargs -r rm
    
    return 0
}

# Запуск основного процесса
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi