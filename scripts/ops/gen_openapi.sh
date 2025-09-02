#!/usr/bin/env bash
set -e

echo "🔧 Генерация OpenAPI спецификации для ChatAI..."

# Переходим в директорию backend
pushd "$(dirname "$0")/../backend" >/dev/null

# Генерируем OpenAPI JSON из FastAPI приложения
python - <<'EOF'
import json
import sys
import os
import logging

# Настройка логирования для подавления излишних предупреждений
logging.getLogger("multipart").setLevel(logging.ERROR)

try:
    from fastapi.openapi.utils import get_openapi
    from main import app
    
    print("📝 Извлекаем OpenAPI схему из FastAPI приложения...")
    
    # Получаем OpenAPI схему
    spec = get_openapi(
        title="ChatAI MVP 9 API",
        version="1.0.0",
        description="Comprehensive API for ChatAI platform with AI assistants, document management, and real-time analytics",
        routes=app.routes,
        servers=[
            {"url": "https://api.chatai.com", "description": "Production server"},
            {"url": "http://localhost:8000", "description": "Development server"}
        ]
    )
    
    # Добавляем дополнительную информацию
    spec["info"]["contact"] = {
        "name": "ChatAI Support", 
        "email": "support@chatai.com"
    }
    
    spec["info"]["license"] = {
        "name": "Proprietary",
        "url": "https://chatai.com/license"
    }
    
    # Сохраняем в файл
    output_path = "../docs/api/openapi.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2, ensure_ascii=False)
    
    print(f"✅ OpenAPI спецификация сохранена в {output_path}")
    
    # Выводим статистику
    endpoints_count = len([path for path in spec.get("paths", {}).values() 
                          for method in path.keys() if method in ["get", "post", "put", "patch", "delete"]])
    schemas_count = len(spec.get("components", {}).get("schemas", {}))
    
    print(f"📊 Статистика:")
    print(f"   - Эндпоинтов: {endpoints_count}")  
    print(f"   - Схем данных: {schemas_count}")
    print(f"   - Размер файла: {os.path.getsize(output_path)} байт")
    
except ImportError as e:
    print(f"❌ Ошибка импорта: {e}")
    print("Убедитесь, что все зависимости установлены и PYTHONPATH настроен правильно")
    sys.exit(1)
except Exception as e:
    print(f"❌ Ошибка генерации OpenAPI: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
EOF

popd >/dev/null

echo "🎉 Генерация OpenAPI завершена успешно!"