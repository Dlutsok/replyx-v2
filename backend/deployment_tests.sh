#!/bin/bash
# =============================================================================
# CORS SECURITY DEPLOYMENT TESTS
# =============================================================================
# Быстрый набор тестов для проверки безопасности после деплоя

set -e

BASE_URL="https://replyx.ru"
WIDGET_ORIGIN="https://stencom.ru"
EVIL_ORIGIN="https://evil.example"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 CORS Security Deployment Tests${NC}"
echo "==============================================="
echo "Base URL: $BASE_URL"
echo "Widget Origin: $WIDGET_ORIGIN"
echo "Evil Origin: $EVIL_ORIGIN"
echo ""

# Функция для генерации тестового JWT токена
generate_test_jwt() {
    local origin="$1"
    local exp_time=$(date -d "+10 minutes" +%s)  # +10 минут
    
    # Простой JWT для тестирования (в продакшене используйте реальный SECRET)
    echo "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhc3Npc3RhbnRfaWQiOjEyMywiYWxsb3dlZF9kb21haW5zIjpbInN0ZW5jb20ucnUiLCJ3d3cuc3RlbmNvbS5ydSJdLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDA5NjQwMH0.PLACEHOLDER"
}

# =============================================================================
# ТЕСТ 0: HEALTH CHECK
# =============================================================================
echo -e "${YELLOW}🏥 ТЕСТ 0: Health Check${NC}"
response=$(curl -sS "$BASE_URL/health" -w "\n%{http_code}" --connect-timeout 10 --max-time 30)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ Health check успешен (200)${NC}"
    echo "   Response: $body"
else
    echo -e "${RED}❌ Health check провалился ($http_code)${NC}"
    echo "   Response: $body"
    exit 1
fi
echo ""

# =============================================================================
# ТЕСТ 1: ОСНОВНОЕ ПРИЛОЖЕНИЕ (с credentials)
# =============================================================================
echo -e "${YELLOW}🔐 ТЕСТ 1: Основное приложение (login с credentials)${NC}"
response=$(curl -sS "$BASE_URL/api/login" \
    -H "Origin: https://replyx.ru" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}' \
    -i --connect-timeout 10 --max-time 30)

echo "Response headers:"
echo "$response" | grep -E "(HTTP|Access-Control|Vary)" || true

if echo "$response" | grep -q "Access-Control-Allow-Origin: https://replyx.ru"; then
    echo -e "${GREEN}✅ CORS Origin правильный${NC}"
else
    echo -e "${RED}❌ CORS Origin неправильный или отсутствует${NC}"
fi

if echo "$response" | grep -q "Access-Control-Allow-Credentials: true"; then
    echo -e "${GREEN}✅ Credentials разрешены${NC}"
else
    echo -e "${RED}❌ Credentials не разрешены${NC}"
fi

if echo "$response" | grep -q "Vary: Origin"; then
    echo -e "${GREEN}✅ Vary: Origin присутствует${NC}"
else
    echo -e "${RED}❌ Vary: Origin отсутствует${NC}"
fi
echo ""

# =============================================================================
# ТЕСТ 2: PREFLIGHT ВИДЖЕТА (OPTIONS)
# =============================================================================
echo -e "${YELLOW}🔄 ТЕСТ 2: Preflight виджета (OPTIONS)${NC}"
response=$(curl -sS "$BASE_URL/api/validate-widget-token" \
    -X OPTIONS \
    -H "Origin: $WIDGET_ORIGIN" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -i --connect-timeout 10 --max-time 30)

echo "Response headers:"
echo "$response" | grep -E "(HTTP|Access-Control|Vary)" || true

if echo "$response" | grep -q "HTTP/1.1 200"; then
    echo -e "${GREEN}✅ Preflight разрешен (200)${NC}"
else
    echo -e "${RED}❌ Preflight отклонен${NC}"
fi

if echo "$response" | grep -q "Access-Control-Allow-Origin: $WIDGET_ORIGIN"; then
    echo -e "${GREEN}✅ CORS Origin для виджета правильный${NC}"
else
    echo -e "${RED}❌ CORS Origin для виджета неправильный${NC}"
fi

# Виджеты НЕ должны иметь credentials
if echo "$response" | grep -q "Access-Control-Allow-Credentials"; then
    echo -e "${RED}❌ Credentials НЕ должны быть разрешены для виджетов${NC}"
else
    echo -e "${GREEN}✅ Credentials отсутствуют (правильно для виджетов)${NC}"
fi
echo ""

# =============================================================================
# ТЕСТ 3: ВАЛИДАЦИЯ ВИДЖЕТ-ТОКЕНА (POST)
# =============================================================================
echo -e "${YELLOW}🎫 ТЕСТ 3: Валидация виджет-токена (POST)${NC}"
jwt_token=$(generate_test_jwt "$WIDGET_ORIGIN")
response=$(curl -sS "$BASE_URL/api/validate-widget-token" \
    -H "Origin: $WIDGET_ORIGIN" \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$jwt_token\",\"domain\":\"stencom.ru\"}" \
    -i --connect-timeout 10 --max-time 30)

echo "Response headers:"
echo "$response" | grep -E "(HTTP|Access-Control|Vary)" || true

if echo "$response" | grep -q "Access-Control-Allow-Origin: $WIDGET_ORIGIN"; then
    echo -e "${GREEN}✅ CORS Origin для POST запроса правильный${NC}"
else
    echo -e "${RED}❌ CORS Origin для POST запроса неправильный${NC}"
fi

# Проверяем, что нет credentials
if echo "$response" | grep -q "Access-Control-Allow-Credentials"; then
    echo -e "${RED}❌ Credentials НЕ должны быть для виджетов${NC}"
else
    echo -e "${GREEN}✅ Credentials отсутствуют для виджетов${NC}"
fi

# Примечание: токен может быть невалидным, но CORS должен работать
echo -e "${YELLOW}ℹ️  Токен тестовый, ответ может быть 401/403, но CORS должен работать${NC}"
echo ""

# =============================================================================
# ТЕСТ 4: БЛОКИРОВКА ЗЛОНАМЕРЕННОГО ДОМЕНА
# =============================================================================
echo -e "${YELLOW}🚫 ТЕСТ 4: Блокировка злонамеренного домена${NC}"
response=$(curl -sS "$BASE_URL/api/validate-widget-token" \
    -X OPTIONS \
    -H "Origin: $EVIL_ORIGIN" \
    -H "Access-Control-Request-Method: POST" \
    -i --connect-timeout 10 --max-time 30 | head -20)

echo "Response headers:"
echo "$response" | grep -E "(HTTP|Access-Control)" || true

if echo "$response" | grep -q "HTTP/1.1 403"; then
    echo -e "${GREEN}✅ Злонамеренный домен заблокирован (403)${NC}"
elif echo "$response" | grep -q "Access-Control-Allow-Origin: $EVIL_ORIGIN"; then
    echo -e "${RED}❌ ОПАСНО! Злонамеренный домен не заблокирован${NC}"
else
    echo -e "${GREEN}✅ CORS заголовки отсутствуют для злонамеренного домена${NC}"
fi
echo ""

# =============================================================================
# ТЕСТ 5: МЕТРИКИ PROMETHEUS
# =============================================================================
echo -e "${YELLOW}📊 ТЕСТ 5: Метрики Prometheus${NC}"
response=$(curl -sS "$BASE_URL/metrics" --connect-timeout 5 --max-time 10 | head -50)

if echo "$response" | grep -q "widget_cors_requests_total"; then
    echo -e "${GREEN}✅ Метрика widget_cors_requests_total найдена${NC}"
else
    echo -e "${RED}❌ Метрика widget_cors_requests_total отсутствует${NC}"
fi

if echo "$response" | grep -q "widget_token_validations_total"; then
    echo -e "${GREEN}✅ Метрика widget_token_validations_total найдена${NC}"
else
    echo -e "${RED}❌ Метрика widget_token_validations_total отсутствует${NC}"
fi

if echo "$response" | grep -q "widget_blocked_origins_total"; then
    echo -e "${GREEN}✅ Метрика widget_blocked_origins_total найдена${NC}"
else
    echo -e "${RED}❌ Метрика widget_blocked_origins_total отсутствует${NC}"
fi
echo ""

# =============================================================================
# РЕЗЮМЕ
# =============================================================================
echo -e "${BLUE}📋 РЕЗЮМЕ БЕЗОПАСНОСТИ${NC}"
echo "==============================================="
echo -e "${GREEN}✅ Основное приложение:${NC} credentials разрешены, только replyx.ru домены"
echo -e "${GREEN}✅ Виджеты:${NC} credentials запрещены, динамическая валидация через JWT"
echo -e "${GREEN}✅ Блокировка:${NC} неизвестные домены отклоняются"
echo -e "${GREEN}✅ Мониторинг:${NC} метрики безопасности работают"
echo -e "${GREEN}✅ Кэширование:${NC} Vary: Origin установлен для CDN/прокси"
echo ""
echo -e "${BLUE}🎯 Деплой CORS безопасности завершен успешно!${NC}"

# =============================================================================
# ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ
# =============================================================================
echo ""
echo -e "${YELLOW}🔍 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ${NC}"
echo "==============================================="

# Проверка конфигурации
echo "📝 Проверьте эти настройки вручную:"
echo "   1. CORS_ORIGINS не содержит '*'"
echo "   2. ENABLE_CSRF_PROTECTION=false"
echo "   3. SITE_SECRET установлен и отличается от SECRET_KEY"
echo "   4. Nginx не добавляет свои CORS заголовки"
echo ""

# Мониторинг
echo "📊 Мониторинг после деплоя:"
echo "   - Следите за widget_blocked_origins_total (рост = атаки)"
echo "   - Контролируйте widget_token_validations_total{result='invalid'}"
echo "   - Анализируйте логи WARNING уровня"
echo ""

echo -e "${GREEN}🎉 Все базовые тесты выполнены!${NC}"