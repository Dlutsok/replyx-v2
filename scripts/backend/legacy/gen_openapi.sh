#!/usr/bin/env bash
set -e

echo "🔄 Генерация OpenAPI спецификации для ChatAI..."

# Переходим в директорию backend
cd "$(dirname "$0")/.."

# Проверяем, что мы в правильной директории
if [ ! -f "main.py" ]; then
    echo "❌ Ошибка: файл main.py не найден. Убедитесь, что скрипт запускается из backend/"
    exit 1
fi

# Создаем временный скрипт Python для генерации OpenAPI
python3 - <<'PYTHON_SCRIPT'
import json
import sys
import os

# Добавляем текущую директорию в path
sys.path.insert(0, os.getcwd())

try:
    from fastapi.openapi.utils import get_openapi
    from main import app
    
    print("🚀 Загружаем FastAPI приложение...")
    
    # Генерируем OpenAPI спецификацию
    spec = get_openapi(
        title="ChatAI API",
        version="1.0.0",
        description="""
ChatAI - Comprehensive AI Assistant Platform API

## Features
- 🤖 AI Assistant Management
- 💬 Real-time Dialog System  
- 📄 Document Processing & Knowledge Base
- 🤖 Telegram Bot Integration
- 💰 Balance & Billing System
- 👥 User Management & Authentication
- 📊 Analytics & Monitoring
- 🛡️ Security & Rate Limiting

## Authentication
All endpoints (except public ones) require JWT authentication:
- Include `Authorization: Bearer <token>` header
- Include `X-CSRF-Token` header for state-changing operations

## Base URLs
- Production: `https://api.chatai.com`
- Development: `http://localhost:8000`
        """,
        routes=app.routes,
        servers=[
            {"url": "https://api.chatai.com", "description": "Production server"},
            {"url": "http://localhost:8000", "description": "Development server"}
        ]
    )
    
    # Проверяем, что docs директория существует
    docs_dir = "../docs/api"
    os.makedirs(docs_dir, exist_ok=True)
    
    # Записываем спецификацию
    openapi_path = f"{docs_dir}/openapi.json"
    with open(openapi_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2, ensure_ascii=False)
    
    print(f"✅ OpenAPI спецификация сохранена: {openapi_path}")
    print(f"📊 Endpoints: {len([path for path in spec.get('paths', {}).keys()])}")
    print(f"📋 Schemas: {len(spec.get('components', {}).get('schemas', {}))}")
    
except ImportError as e:
    print(f"❌ Ошибка импорта: {e}")
    print("💡 Убедитесь, что установлены все зависимости: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"❌ Ошибка генерации OpenAPI: {e}")
    sys.exit(1)

PYTHON_SCRIPT

echo "🎉 Генерация OpenAPI завершена успешно!"
echo ""
echo "📍 Файлы созданы:"
echo "   - docs/api/openapi.json - OpenAPI 3.0 спецификация"
echo ""
echo "🔍 Просмотр документации:"
echo "   - Swagger UI: http://localhost:8000/docs"
echo "   - ReDoc: http://localhost:8000/redoc"
echo ""