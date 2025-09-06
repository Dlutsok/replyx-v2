#!/bin/bash
set -e

echo "🚀 Скрипт развертывания ReplyX в продакшене"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[ИНФО]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[ВНИМАНИЕ]${NC} $1"
}

print_error() {
    echo -e "${RED}[ОШИБКА]${NC} $1"
}

# Check if docker and docker-compose are installed
check_dependencies() {
    print_status "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker не установлен. Пожалуйста, сначала установите Docker."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose не установлен. Пожалуйста, сначала установите Docker Compose."
        exit 1
    fi
    
    print_status "Проверка зависимостей пройдена!"
}

# Check environment file
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found!"
        print_error "Please create .env.production with all required variables."
        exit 1
    fi
    
    # Check for placeholder values
    if grep -q "CHANGEME" .env.production; then
        print_error "Found CHANGEME placeholders in .env.production!"
        print_error "Please replace all CHANGEME values with real configuration."
        grep "CHANGEME" .env.production
        exit 1
    fi
    
    print_status "Environment configuration looks good!"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p nginx/ssl
    mkdir -p data/backups
    mkdir -p data/logs
    mkdir -p uploads
    
    print_status "Directories created successfully!"
}

# Generate SSL certificates if they don't exist
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    if [ ! -f "nginx/ssl/fullchain.pem" ]; then
        print_warning "SSL certificates not found. Generating self-signed certificates..."
        print_warning "For production, replace with real certificates from Let's Encrypt!"
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/privkey.pem \
            -out nginx/ssl/fullchain.pem \
            -subj "/CN=replyx.ru/O=ReplyX/C=RU"
        
        print_status "Self-signed certificates generated!"
    else
        print_status "SSL certificates found!"
    fi
}

# Phase 1: Infrastructure services
deploy_infrastructure() {
    print_status "Phase 1: Deploying infrastructure services..."
    
    docker-compose up -d redis
    
    print_status "Waiting for Redis to be ready..."
    sleep 10
    
    print_status "Infrastructure services deployed!"
}

# Phase 2: Backend services
deploy_backend() {
    print_status "Phase 2: Building and deploying backend..."
    
    docker-compose build backend
    docker-compose up -d backend
    
    print_status "Waiting for backend to be ready..."
    sleep 30
    
    # Check backend health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_status "Backend is healthy!"
    else
        print_warning "Backend health check failed, but continuing..."
    fi
}

# Phase 3: Workers
deploy_workers() {
    print_status "Phase 3: Building and deploying workers..."
    
    docker-compose build workers
    docker-compose up -d workers
    
    print_status "Waiting for workers to be ready..."
    sleep 20
    
    print_status "Workers deployed!"
}

# Phase 4: Frontend
deploy_frontend() {
    print_status "Phase 4: Building and deploying frontend..."
    
    docker-compose build frontend
    docker-compose up -d frontend
    
    print_status "Waiting for frontend to be ready..."
    sleep 20
    
    # Check frontend health
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend is healthy!"
    else
        print_warning "Frontend health check failed, but continuing..."
    fi
}

# Phase 5: Nginx reverse proxy
deploy_nginx() {
    print_status "Phase 5: Deploying Nginx reverse proxy..."
    
    docker-compose up -d nginx
    
    print_status "Waiting for Nginx to be ready..."
    sleep 10
    
    # Check nginx health
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_status "Nginx is healthy!"
    else
        print_warning "Nginx health check failed!"
    fi
}

# Show deployment status
show_status() {
    print_status "Deployment Status:"
    echo "=================="
    docker-compose ps
    echo ""
    
    print_status "Service URLs:"
    echo "Frontend: https://replyx.ru"
    echo "Backend API: https://replyx.ru/api"
    echo "Health Check: https://replyx.ru/health"
    echo ""
    
    print_status "To view logs:"
    echo "docker-compose logs -f [service_name]"
    echo ""
    
    print_status "To stop all services:"
    echo "docker-compose down"
}

# Phase 0: Database initialization
deploy_database() {
    print_status "Phase 0: Initializing production database..."
    
    if [ ! -f "init-db.sh" ]; then
        print_error "Database initialization script (init-db.sh) not found!"
        print_error "This script is required to set up the PostgreSQL database."
        exit 1
    fi
    
    print_warning "Database initialization is CRITICAL for application startup."
    print_warning "This will create the database, user, and install pgvector extension."
    echo ""
    
    chmod +x init-db.sh
    
    if ./init-db.sh; then
        print_status "Database initialized successfully!"
    else
        print_error "Database initialization failed!"
        print_error "Cannot proceed with deployment without a properly configured database."
        exit 1
    fi
}

# Main deployment process
main() {
    print_status "Starting ReplyX production deployment..."
    
    check_dependencies
    check_environment
    create_directories
    setup_ssl
    
    print_status "Beginning phased deployment..."
    
    deploy_database
    deploy_infrastructure
    deploy_backend
    deploy_workers
    deploy_frontend
    deploy_nginx
    
    show_status
    
    print_status "🎉 Deployment completed successfully!"
    print_warning "Don't forget to:"
    echo "  1. Replace self-signed SSL certificates with real ones"
    echo "  2. Set up domain DNS to point to this server"
    echo "  3. Test all functionality"
}

# Parse command line arguments
case "${1:-deploy}" in
    "database")
        deploy_database
        ;;
    "infrastructure")
        check_dependencies
        deploy_infrastructure
        ;;
    "backend")
        deploy_backend
        ;;
    "workers")
        deploy_workers
        ;;
    "frontend")
        deploy_frontend
        ;;
    "nginx")
        setup_ssl
        deploy_nginx
        ;;
    "status")
        show_status
        ;;
    "deploy"|"")
        main
        ;;
    *)
        echo "Usage: $0 [database|infrastructure|backend|workers|frontend|nginx|status|deploy]"
        exit 1
        ;;
esac