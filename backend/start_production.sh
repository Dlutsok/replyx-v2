#!/bin/bash

# Production startup script for ChatAI Backend
echo "🚀 Starting ChatAI Backend in production mode..."

# Установка переменных окружения
export PYTHONPATH=/app
export ENVIRONMENT=production

# Установка зависимостей
echo "📦 Installing Python dependencies..."
if [ "$SKIP_PIP_INSTALL" = "1" ] || [ "$SKIP_PIP_INSTALL" = "true" ]; then
  echo "⏭️  SKIP_PIP_INSTALL is set, skipping pip install"
else
export PIP_DISABLE_PIP_VERSION_CHECK=1
unset HTTP_PROXY HTTPS_PROXY NO_PROXY AI_PROXY_URL

PIP_OPTS="--no-cache-dir --default-timeout=120 --progress-bar off --retries 7"
echo "⬆️  Upgrading pip/setuptools/wheel first..."
python3 -m pip install $PIP_OPTS --upgrade pip setuptools wheel || true
install_ok=false
for attempt in 1 2 3; do
  echo "📦 pip install attempt $attempt..."
  if pip install $PIP_OPTS -r requirements.txt; then
    install_ok=true; break
  fi
  echo "⚠️ Pip failed (attempt $attempt), retrying in 5s..."; sleep 5
done

  if [ "$install_ok" != true ]; then
    echo "❌ Failed to install Python dependencies. Exiting." >&2
    exit 1
  fi
fi

# Ожидание доступности PostgreSQL
echo "⏳ Waiting for PostgreSQL to be ready..."
PYWAIT="\
import os, time
import psycopg2
host=os.getenv('DB_HOST','db')
port=int(os.getenv('DB_PORT','5432'))
name=os.getenv('DB_NAME','chatai_production')
user=os.getenv('DB_USER','chatai')
password=os.getenv('DB_PASSWORD','')
for i in range(60):
  try:
    psycopg2.connect(host=host, port=port, dbname=name, user=user, password=password).close()
    print('✅ PostgreSQL is ready')
    break
  except Exception as e:
    print(f'⏳ Waiting PostgreSQL... ({i+1}/60) {e}')
    time.sleep(2)
"
python3 -c "$PYWAIT"

# Миграции Alembic
echo "📦 Running Alembic migrations..."
# Формируем DATABASE_URL для Alembic из переменных окружения
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-chatai_production}
DB_USER=${DB_USER:-chatai}
DB_PASSWORD=${DB_PASSWORD:-}
DB_SSL_MODE=${DB_SSL_MODE:-disable}

if [ -n "$DB_PASSWORD" ]; then
  export DATABASE_URL="postgresql+psycopg2://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=$DB_SSL_MODE"
else
  export DATABASE_URL="postgresql+psycopg2://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=$DB_SSL_MODE"
fi

alembic upgrade head || {
  echo "⚠️ Alembic failed, retrying in 5s..."; sleep 5; alembic upgrade head;
}

# Запуск без reload для production
exec python3 -m uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --log-level info \
  --access-log