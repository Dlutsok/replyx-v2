# ChatAI MVP Backend Utilities Makefile
# Удобные команды для разработки и мониторинга

.PHONY: help test snapshot db-status db-cleanup db-monitor install-deps

# Показать помощь
help:
	@echo "🔧 ChatAI MVP Backend Utilities"
	@echo "=================================="
	@echo ""
	@echo "📊 МОНИТОРИНГ И ТЕСТИРОВАНИЕ:"
	@echo "  make test           - Запустить все unit-тесты"
	@echo "  make test-db        - Тесты только базы данных"
	@echo "  make test-api       - Тесты API endpoints"
	@echo "  make test-utils     - Тесты утилит и бизнес-логики"
	@echo "  make test-verbose   - Подробные тесты с выводом"
	@echo "  make snapshot       - Создать полный snapshot системы"
	@echo "  make db-status      - Проверить состояние БД"
	@echo ""
	@echo "🗄️ БАЗА ДАННЫХ:"
	@echo "  make db-cleanup     - Очистить и оптимизировать БД"
	@echo "  make db-monitor     - Запустить мониторинговые запросы"
	@echo "  make db-vacuum      - Выполнить VACUUM и ANALYZE"
	@echo ""
	@echo "🛠️ РАЗРАБОТКА:"
	@echo "  make install-deps   - Установить зависимости для тестов"
	@echo "  make clean          - Очистить временные файлы"
	@echo "  make format         - Форматировать код"

# Установить зависимости для тестирования
install-deps:
	@echo "📦 Установка зависимостей для тестирования..."
	pip install pytest psutil
	@echo "✅ Зависимости установлены"

# Запуск всех тестов
test: install-deps
	@echo "🧪 Запуск всех unit-тестов..."
	python3 -m pytest testing/tests/ -v

# Тесты только базы данных
test-db: install-deps
	@echo "🗄️ Запуск тестов базы данных..."
	python3 -m pytest testing/tests/test_database_integrity.py -v

# Тесты API endpoints
test-api: install-deps
	@echo "🌐 Запуск тестов API..."
	python3 -m pytest testing/tests/test_api_endpoints.py -v

# Тесты утилит и бизнес-логики
test-utils: install-deps
	@echo "🛠️ Запуск тестов утилит..."
	python3 -m pytest testing/tests/test_utilities.py -v

# Подробные тесты с выводом всей информации
test-verbose: install-deps
	@echo "🔍 Запуск подробных тестов..."
	python3 -m pytest testing/tests/ -v -s --tb=long

# Создание полного snapshot системы
snapshot:
	@echo "📸 Создание системного snapshot..."
	python3 testing/create_system_snapshot.py
	@echo "✅ Snapshot создан"

# Быстрая проверка состояния БД
db-status:
	@echo "📊 Проверка состояния базы данных..."
	@psql -U dan -d chat_ai -c "\
		SELECT \
			schemaname, \
			relname as table_name, \
			n_live_tup as live_rows, \
			n_dead_tup as dead_rows \
		FROM pg_stat_user_tables \
		WHERE n_live_tup > 0 \
		ORDER BY n_live_tup DESC;"

# Очистка и оптимизация БД
db-cleanup:
	@echo "🧹 Запуск очистки и оптимизации БД..."
	python3 testing/cleanup_database.py

# Мониторинговые запросы
db-monitor:
	@echo "📈 Запуск мониторинговых запросов..."
	@echo "=== ПОЛЬЗОВАТЕЛИ ==="
	@psql -U dan -d chat_ai -c "\
		SELECT \
			COUNT(*) as total_users, \
			COUNT(CASE WHEN last_activity > NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30d \
		FROM users;"
	@echo ""
	@echo "=== AI ТОКЕНЫ ==="
	@psql -U dan -d chat_ai -c "\
		SELECT \
			name, \
			current_daily_usage, \
			daily_limit, \
			ROUND((current_daily_usage * 100.0 / daily_limit), 2) as usage_percent \
		FROM ai_token_pool;"
	@echo ""
	@echo "=== АКТИВНОСТЬ ЗА 7 ДНЕЙ ==="
	@psql -U dan -d chat_ai -c "\
		SELECT \
			DATE(started_at) as date, \
			COUNT(*) as dialogs, \
			COUNT(DISTINCT user_id) as unique_users \
		FROM dialogs \
		WHERE started_at > NOW() - INTERVAL '7 days' \
		GROUP BY DATE(started_at) \
		ORDER BY date DESC;"

# Оптимизация БД
db-vacuum:
	@echo "🔧 Выполнение VACUUM и ANALYZE..."
	@echo "VACUUM; ANALYZE;" | psql -U dan -d chat_ai
	@echo "✅ VACUUM и ANALYZE завершены"

# Очистка временных файлов
clean:
	@echo "🧹 Очистка временных файлов..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.log" -delete 2>/dev/null || true
	find . -type f -name "database_snapshot_*.json" -delete 2>/dev/null || true
	find . -type f -name "system_snapshot_*.json" -delete 2>/dev/null || true
	find . -type f -name "system_summary_*.json" -delete 2>/dev/null || true
	@echo "✅ Временные файлы удалены"

# Форматирование кода (требует black)
format:
	@echo "🎨 Форматирование кода..."
	@if command -v black >/dev/null 2>&1; then \
		black *.py tests/ --line-length 100; \
		echo "✅ Код отформатирован"; \
	else \
		echo "⚠️ Black не установлен. Установите: pip install black"; \
	fi

# Быстрая диагностика системы
diagnostic: db-status
	@echo ""
	@echo "🔍 БЫСТРАЯ ДИАГНОСТИКА СИСТЕМЫ"
	@echo "==============================="
	@echo ""
	@echo "📊 СВОДКА:"
	@echo -n "База данных: "
	@if psql -U dan -d chat_ai -c "SELECT 1;" >/dev/null 2>&1; then echo "✅ Доступна"; else echo "❌ Недоступна"; fi
	@echo -n "Python: "; python --version
	@echo -n "Pytest: "; python -c "import pytest; print(f'✅ {pytest.__version__}')" 2>/dev/null || echo "❌ Не установлен"
	@echo -n "Git статус: "; git status --porcelain | wc -l | awk '{if($$1==0) print "✅ Чистый"; else print "⚠️ " $$1 " измененных файлов"}'
	@echo ""

# Создание отчета для анализа
report: test-verbose snapshot db-monitor
	@echo ""
	@echo "📋 ПОЛНЫЙ ОТЧЕТ СОЗДАН!"
	@echo "======================="
	@echo "✅ Unit-тесты выполнены"
	@echo "✅ Системный snapshot создан"
	@echo "✅ Мониторинговые данные получены"
	@echo ""
	@echo "📁 Проверьте созданные файлы:"
	@ls -la system_snapshot_*.json system_summary_*.json 2>/dev/null || echo "Нет snapshot файлов"

# По умолчанию показываем помощь
.DEFAULT_GOAL := help