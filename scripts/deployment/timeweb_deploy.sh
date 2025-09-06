#!/bin/bash

# 🚀 Автоматическое развертывание ReplyX на Timeweb сервере
# Сервер: 5.129.246.24 (2x3.3GHz, 4GB RAM, 50GB NVMe)
# ОС: Ubuntu 24.04

set -euo pipefail

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'  
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Переменные Timeweb сервера
SERVER_IP="5.129.246.24"
SERVER_USER="root"
DEPLOY_PATH="/opt/replyx"

print_status() {
    echo -e "${GREEN}[✅ СТАТУС]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠️  ВНИМАНИЕ]${NC} $1"
}

print_error() {
    echo -e "${RED}[❌ ОШИБКА]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ️  ИНФО]${NC} $1"
}

# Проверка подключения к серверу
check_server_connection() {
    print_info "Проверка подключения к Timeweb серверу..."
    
    if ssh -o ConnectTimeout=5 $SERVER_USER@$SERVER_IP "echo 'Подключение OK'" >/dev/null 2>&1; then
        print_status "Подключение к серверу $SERVER_IP установлено"
    else
        print_error "Не удается подключиться к серверу $SERVER_IP"
        print_error "Проверьте:"
        echo "  1. SSH ключи настроены правильно"
        echo "  2. Сервер доступен"
        echo "  3. Пароль root известен"
        exit 1
    fi
}

# Копирование файлов на сервер
copy_files_to_server() {
    print_info "Копирование файлов проекта на Timeweb сервер..."
    
    # Создаем директорию на сервере
    ssh $SERVER_USER@$SERVER_IP "mkdir -p $DEPLOY_PATH"
    
    # Копируем файлы проекта
    print_status "Копируем Deployed/..."
    scp -r Deployed $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/
    
    print_status "Копируем frontend/..."
    scp -r frontend $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/
    
    print_status "Копируем backend/..."
    scp -r backend $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/
    
    print_status "Копируем workers/..."
    scp -r workers $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/
    
    print_status "Копируем scripts/..."
    scp -r scripts $SERVER_USER@$SERVER_IP:$DEPLOY_PATH/
    
    # Устанавливаем права
    ssh $SERVER_USER@$SERVER_IP "
        cd $DEPLOY_PATH
        chmod +x Deployed/deploy.sh
        chmod +x Deployed/init-db.sh  
        chmod +x scripts/production_deploy.sh
        find . -name '*.sh' -type f -exec chmod +x {} \;
    "
    
    print_status "Файлы успешно скопированы на сервер"
}

# Установка и настройка сервера
setup_server() {
    print_info "Настройка Timeweb сервера..."
    
    ssh $SERVER_USER@$SERVER_IP << 'EOF'
        # Обновление системы
        echo "🔄 Обновление Ubuntu 24.04..."
        apt update && apt upgrade -y
        
        # Установка утилит
        echo "📦 Установка необходимых утилит..."
        apt install -y curl wget git unzip htop nano tree postgresql-client jq
        
        # Установка Docker
        echo "🐳 Установка Docker..."
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            systemctl enable docker
            systemctl start docker
            rm get-docker.sh
        fi
        
        # docker compose v2 plugin (иногда не ставится автоматом)
        echo "🔧 Установка docker compose plugin..."
        apt install -y docker-compose-plugin
        docker compose version || (echo "❌ docker compose не установлен" && exit 1)
        
        # Настройка файрвола
        echo "🛡️ Настройка файрвола..."
        ufw allow 22/tcp
        ufw allow 80/tcp  
        ufw allow 443/tcp
        ufw --force enable
        
        # Создание swap файла для 4GB RAM сервера
        echo "💾 Создание swap файла..."
        if [ ! -f /swapfile ]; then
            fallocate -l 2G /swapfile
            chmod 600 /swapfile
            mkswap /swapfile
            swapon /swapfile
            echo '/swapfile none swap sw 0 0' >> /etc/fstab
        fi
        
        # Оптимизация Docker для 4GB RAM
        echo "⚙️ Оптимизация Docker..."
        cat > /etc/docker/daemon.json << 'DOCKER_EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
DOCKER_EOF
        systemctl restart docker
        
        echo "✅ Сервер настроен для ReplyX"
EOF
    
    print_status "Сервер успешно настроен"
}

# Настройка переменных окружения для Timeweb
configure_environment() {
    print_info "Настройка переменных окружения для Timeweb..."
    
    ssh $SERVER_USER@$SERVER_IP << EOF
        cd $DEPLOY_PATH/Deployed
        
        # Создаем бэкап оригинального .env.production
        cp .env.production .env.production.backup
        
        # Обновляем настройки для Timeweb IP
        sed -i 's|DOMAIN=replyx.ru|DOMAIN=$SERVER_IP|g' .env.production
        sed -i 's|FRONTEND_URL=https://replyx.ru|FRONTEND_URL=http://$SERVER_IP|g' .env.production
        sed -i 's|BACKEND_URL=https://replyx.ru|BACKEND_URL=http://$SERVER_IP|g' .env.production
        sed -i 's|PUBLIC_URL=https://replyx.ru|PUBLIC_URL=http://$SERVER_IP|g' .env.production
        sed -i 's|CORS_ORIGINS=https://replyx.ru,https://www.replyx.ru|CORS_ORIGINS=http://$SERVER_IP|g' .env.production
        sed -i 's|WEBHOOK_HOST=https://replyx.ru|WEBHOOK_HOST=http://$SERVER_IP|g' .env.production
        
        echo "✅ .env.production настроен для IP: $SERVER_IP"
EOF
    
    print_status "Переменные окружения настроены"
}

# Инициализация базы данных
initialize_database() {
    print_info "Инициализация базы данных..."
    
    if [ -z "${PGPASSWORD:-}" ]; then
        print_error "Не установлена переменная PGPASSWORD"
        read -s -p "Введите пароль администратора PostgreSQL: " pg_password
        echo
        export PGPASSWORD="$pg_password"
    fi
    
    ssh $SERVER_USER@$SERVER_IP << EOF
        cd $DEPLOY_PATH/Deployed
        export PGPASSWORD="$PGPASSWORD"
        
        # Инициализация БД неинтерактивно
        echo "🗄️ Инициализация базы данных..."
        ./init-db.sh -y
        
        # Проверка подключения
        echo "🔍 Проверка подключения к БД..."
        ./init-db.sh test
EOF
    
    print_status "База данных инициализирована"
}

# Развертывание Docker контейнеров
deploy_containers() {
    print_info "Развертывание Docker контейнеров на Timeweb..."
    
    ssh $SERVER_USER@$SERVER_IP << EOF
        cd $DEPLOY_PATH/Deployed
        
        echo "🐳 Сборка Docker образов..."
        docker compose build
        
        echo "🚀 Запуск контейнеров поэтапно..."
        
        # Redis
        echo "▶️ Запуск Redis..."
        docker compose up -d redis
        sleep 10
        
        # Backend
        echo "▶️ Запуск Backend..."
        docker compose up -d backend
        sleep 30
        
        # Workers  
        echo "▶️ Запуск Workers..."
        docker compose up -d workers
        sleep 15
        
        # WS Gateway
        echo "▶️ Запуск WS Gateway..."
        docker compose up -d ws-gateway
        sleep 10
        
        # Frontend
        echo "▶️ Запуск Frontend..."
        docker compose up -d frontend
        sleep 20
        
        # Nginx
        echo "▶️ Запуск Nginx..."
        docker compose up -d nginx
        
        echo "✅ Все контейнеры запущены"
EOF
    
    print_status "Docker контейнеры развернуты"
}

# Проверка развертывания
verify_deployment() {
    print_info "Проверка развертывания на Timeweb сервере..."
    
    ssh $SERVER_USER@$SERVER_IP << EOF
        cd $DEPLOY_PATH/Deployed
        
        echo "=== ПРОВЕРКА КОНТЕЙНЕРОВ ==="
        docker compose ps
        
        echo -e "\n=== HEALTH CHECKS ==="
        
        # Backend Health Check
        if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
            echo "✅ Backend: http://$SERVER_IP:8000/health"
        else
            echo "❌ Backend: FAILED"
        fi
        
        # Workers Health Check  
        if curl -sf http://localhost:8443/health >/dev/null 2>&1; then
            echo "✅ Workers: http://$SERVER_IP:8443/health"
        else
            echo "❌ Workers: FAILED"
        fi
        
        # WS Gateway Health Check
        if curl -sf http://localhost:8001/health >/dev/null 2>&1; then
            echo "✅ WS Gateway: http://$SERVER_IP:8001/health"
        else
            echo "❌ WS Gateway: FAILED"
        fi
        
        # Frontend Check
        if curl -sf http://localhost:3000 >/dev/null 2>&1; then
            echo "✅ Frontend: http://$SERVER_IP:3000"
        else
            echo "❌ Frontend: FAILED"
        fi
        
        # Nginx Check
        if curl -sf http://localhost/health >/dev/null 2>&1; then
            echo "✅ Nginx: http://$SERVER_IP/health"
        else
            echo "❌ Nginx: FAILED"
        fi
        
        echo -e "\n=== РЕСУРСЫ TIMEWEB СЕРВЕРА ==="
        echo "Memory:"
        free -h | grep "Mem:"
        echo "Disk:"
        df -h / | tail -1
        echo "Docker Stats:"
        timeout 5 docker stats --no-stream || echo "Контейнеры стартуют..."
EOF
    
    print_status "Проверка развертывания завершена"
}

# Создание скрипта мониторинга
create_monitoring() {
    print_info "Создание скрипта мониторинга..."
    
    ssh $SERVER_USER@$SERVER_IP << 'EOF'
        cat > /opt/replyx/monitor_timeweb.sh << 'MONITOR_EOF'
#!/bin/bash
echo "=== TIMEWEB SERVER MONITORING ==="
echo "Date: $(date)"
echo "IP: 5.129.246.24"
echo ""
echo "=== MEMORY (4GB) ==="
free -h
echo ""
echo "=== DISK (50GB) ==="
df -h /opt/replyx
echo ""
echo "=== DOCKER CONTAINERS ==="
cd /opt/replyx/Deployed
docker compose ps
echo ""
echo "=== DOCKER STATS ==="
timeout 5 docker stats --no-stream
echo ""
echo "=== TOP PROCESSES ==="
ps aux --sort=-%mem | head -10
echo ""
echo "=== ACCESS URLS ==="
echo "🌐 Frontend: http://5.129.246.24"
echo "🔧 API Docs: http://5.129.246.24/api/docs"
echo "📊 Status: http://5.129.246.24/api/system/status"
MONITOR_EOF

        chmod +x /opt/replyx/monitor_timeweb.sh
        echo "✅ Скрипт мониторинга создан: /opt/replyx/monitor_timeweb.sh"
EOF
    
    print_status "Скрипт мониторинга создан"
}

# Показ итоговой информации
show_final_info() {
    print_status "🎉 Развертывание ReplyX на Timeweb завершено!"
    
    echo ""
    echo "=== ДОСТУП К СИСТЕМЕ ==="
    echo "🌐 Frontend:    http://$SERVER_IP"
    echo "🔧 API Docs:    http://$SERVER_IP/api/docs"  
    echo "📊 System:      http://$SERVER_IP/api/system/status"
    echo "🗄️ Health:      http://$SERVER_IP/health"
    echo ""
    echo "=== SSH ДОСТУП ==="
    echo "ssh $SERVER_USER@$SERVER_IP"
    echo "cd $DEPLOY_PATH"
    echo ""
    echo "=== УПРАВЛЕНИЕ ==="
    echo "Мониторинг:     /opt/replyx/monitor_timeweb.sh"
    echo "Логи:           docker compose logs -f"
    echo "Перезапуск:     docker compose restart [service]"
    echo "Остановка:      docker compose down"
    echo ""
    print_warning "КРИТИЧНО: Получите Yandex OAuth ключи и замените CHANGEME в .env.production"
    print_warning "РЕКОМЕНДУЕТСЯ: Настройте домен и SSL сертификат"
}

# Основная функция
main() {
    print_info "🚀 Начинаем развертывание ReplyX на Timeweb"
    print_info "Сервер: $SERVER_IP (2x3.3GHz, 4GB RAM, 50GB NVMe)"
    echo ""
    
    print_warning "Убедитесь что:"
    echo "  1. SSH доступ к серверу настроен"
    echo "  2. Переменная PGPASSWORD установлена (пароль PostgreSQL админа)"
    echo "  3. Файлы проекта находятся в текущей директории"
    echo ""
    
    read -p "Продолжить развертывание? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Развертывание отменено"
        exit 0
    fi
    
    # Выполнение всех этапов
    check_server_connection
    copy_files_to_server
    setup_server
    configure_environment
    initialize_database
    deploy_containers
    verify_deployment
    create_monitoring
    show_final_info
    
    print_status "✅ Развертывание ReplyX на Timeweb успешно завершено!"
}

# Обработка аргументов
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "monitor")
        ssh $SERVER_USER@$SERVER_IP "/opt/replyx/monitor_timeweb.sh"
        ;;
    "logs")
        ssh $SERVER_USER@$SERVER_IP "cd $DEPLOY_PATH/Deployed && docker compose logs -f"
        ;;
    "status")
        ssh $SERVER_USER@$SERVER_IP "cd $DEPLOY_PATH/Deployed && docker compose ps"
        ;;
    *)
        echo "Использование: $0 [deploy|monitor|logs|status]"
        echo ""
        echo "  deploy   - Полное развертывание на Timeweb (по умолчанию)"
        echo "  monitor  - Мониторинг сервера"
        echo "  logs     - Просмотр логов контейнеров"
        echo "  status   - Статус контейнеров"
        exit 1
        ;;
esac