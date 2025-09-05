#!/bin/bash
# Скрипт для проверки и исправления состояния Alembic в продакшене

echo "🔍 Проверка состояния Alembic..."

# Проверяем текущую миграцию
echo "📍 Текущая миграция:"
cd /opt/replyx/backend
alembic current

echo ""
echo "📜 История миграций:"
alembic history | head -10

echo ""
echo "🎯 Последняя миграция в коде:"
ls -t alembic/versions/*.py | head -1 | xargs basename

echo ""
echo "⚠️  Если current не совпадает с последней миграцией в коде, выполните:"
echo "   alembic stamp head"
echo "   systemctl restart replyx-backend"

echo ""
echo "🔄 Для принудительного выравнивания (ТОЛЬКО если схема БД совпадает с кодом):"
echo "   # Сначала сделайте бэкап!"
echo "   pg_dump replyx_prod > /opt/replyx/backups/before_alembic_fix_\$(date +%Y%m%d_%H%M%S).sql"
echo "   alembic stamp head"
echo "   systemctl restart replyx-backend"