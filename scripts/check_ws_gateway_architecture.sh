#!/bin/bash
# 
# WebSocket Gateway Architecture Verification Script
# Проверяет корректность настройки разделения ws-gateway от основного backend
#

set -e

echo "🔍 WebSocket Gateway Architecture Check"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "OK")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Check if running from correct directory
if [ ! -f "docker-compose.yml" ]; then
    print_status "ERROR" "Must run from Deployed directory containing docker-compose.yml"
    exit 1
fi

print_status "INFO" "Checking docker-compose.yml configuration..."

# Check 1: ws-gateway service exists
if grep -q "ws-gateway:" docker-compose.yml; then
    print_status "OK" "ws-gateway service found in docker-compose.yml"
else
    print_status "ERROR" "ws-gateway service not found in docker-compose.yml"
    exit 1
fi

# Check 2: ws-gateway uses correct port
if grep -A 20 "ws-gateway:" docker-compose.yml | grep -q "8001:8001"; then
    print_status "OK" "ws-gateway configured on port 8001"
else
    print_status "WARN" "ws-gateway port configuration may be incorrect"
fi

# Check 3: ws-gateway has single worker configuration
if grep -A 20 "ws-gateway:" docker-compose.yml | grep -q "UVICORN_WORKERS=1"; then
    print_status "OK" "ws-gateway configured with single worker"
else
    print_status "WARN" "ws-gateway worker configuration may be incorrect"
fi

# Check 4: backend has multi-worker configuration
if grep -A 20 "backend:" docker-compose.yml | grep -q "UVICORN_WORKERS=4"; then
    print_status "OK" "backend configured with 4 workers"
else
    print_status "WARN" "backend worker configuration may be incorrect"
fi

# Check 5: nginx configuration
print_status "INFO" "Checking nginx configuration..."

if [ -f "nginx/nginx.conf" ]; then
    # Check upstream ws-gateway
    if grep -q "upstream ws-gateway" nginx/nginx.conf; then
        print_status "OK" "ws-gateway upstream found in nginx.conf"
    else
        print_status "ERROR" "ws-gateway upstream not found in nginx.conf"
    fi
    
    # Check WebSocket routing
    if grep -A 10 "location /ws/" nginx/nginx.conf | grep -q "proxy_pass http://ws-gateway"; then
        print_status "OK" "/ws/ location routed to ws-gateway"
    else
        print_status "ERROR" "/ws/ routing to ws-gateway not configured correctly"
    fi
    
    # Check WebSocket headers
    if grep -A 10 "location /ws/" nginx/nginx.conf | grep -q "proxy_set_header Upgrade"; then
        print_status "OK" "WebSocket upgrade headers configured"
    else
        print_status "WARN" "WebSocket upgrade headers may be missing"
    fi
else
    print_status "ERROR" "nginx/nginx.conf not found"
fi

# Check 6: WebSocket entrypoint file exists
print_status "INFO" "Checking WebSocket entrypoint..."

if [ -f "../backend/ws_main.py" ]; then
    print_status "OK" "ws_main.py entrypoint found"
    
    # Check for cleanup function
    if grep -q "cleanup_all_connections" ../backend/ws_main.py; then
        print_status "OK" "cleanup_all_connections function referenced"
    else
        print_status "WARN" "cleanup_all_connections function not found"
    fi
else
    print_status "ERROR" "ws_main.py entrypoint not found in backend/"
fi

# Check 7: WebSocket manager has cleanup function
if [ -f "../backend/services/websocket_manager.py" ]; then
    if grep -q "async def cleanup_all_connections" ../backend/services/websocket_manager.py; then
        print_status "OK" "cleanup_all_connections function implemented"
    else
        print_status "ERROR" "cleanup_all_connections function not implemented"
    fi
else
    print_status "ERROR" "websocket_manager.py not found"
fi

# Check 8: Test if services can start (dry run)
print_status "INFO" "Testing docker-compose configuration..."

if docker-compose config > /dev/null 2>&1; then
    print_status "OK" "docker-compose.yml syntax is valid"
else
    print_status "ERROR" "docker-compose.yml has syntax errors"
    docker-compose config
fi

# Check 9: Dependencies
if grep -A 5 "nginx:" docker-compose.yml | grep -q "ws-gateway"; then
    print_status "OK" "nginx depends on ws-gateway"
else
    print_status "WARN" "nginx dependency on ws-gateway may be missing"
fi

echo ""
echo "🎯 Architecture Summary:"
echo "========================"
print_status "INFO" "backend: HTTP API on port 8000 with 4 workers"
print_status "INFO" "ws-gateway: WebSocket on port 8001 with 1 worker"  
print_status "INFO" "nginx: Routes /ws/* → ws-gateway, /api/* → backend"

echo ""
echo "🧪 Manual Testing Steps:"
echo "========================"
echo "1. Start services: docker-compose up -d"
echo "2. Check health:"
echo "   - curl http://localhost:8000/health  (backend)"
echo "   - curl http://localhost:8001/health  (ws-gateway)"
echo "3. Test WebSocket routing:"
echo "   - Admin: wss://yoursite.com/ws/dialogs/123?token=..."
echo "   - Widget: wss://yoursite.com/ws/widget/dialogs/123?assistant_id=..."
echo "4. Monitor logs:"
echo "   - docker logs replyx-backend"
echo "   - docker logs replyx-ws-gateway"

echo ""
print_status "INFO" "Architecture check completed!"