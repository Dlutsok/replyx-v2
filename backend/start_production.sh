#!/bin/bash

# Production startup script for ChatAI Backend
echo "🚀 Starting ChatAI Backend in production mode..."

# Установка переменных окружения
export PYTHONPATH=/app
export ENVIRONMENT=production

# Запуск без reload для production
python3 -m uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info \
    --access-log \
    --no-reload 