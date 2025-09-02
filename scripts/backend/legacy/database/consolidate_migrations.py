#!/usr/bin/env python3
"""
Консолидация миграций Alembic для ReplyX
Создает чистую схему и новые миграции без технического долга
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import argparse

# Добавляем путь к backend для импорта моделей
sys.path.append(str(Path(__file__).parent.parent.parent))

class MigrationConsolidator:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.backend_dir = project_root
        self.alembic_dir = self.backend_dir / "alembic"
        self.versions_dir = self.alembic_dir / "versions"
        self.backup_dir = self.backend_dir / "backups" / f"migrations_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
    def create_database_backup(self, db_url: str = None) -> bool:
        """Создает полный бэкап базы данных"""
        print("🔄 Создание бэкапа базы данных...")
        
        try:
            # Создаем папку для бэкапов
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Определяем параметры подключения к БД
            if not db_url:
                # Пытаемся получить из переменных окружения или конфига
                try:
                    from core.app_config import DATABASE_URL
                    db_url = DATABASE_URL
                except ImportError:
                    db_url = os.environ.get('DATABASE_URL', 'postgresql://user:pass@localhost/chatai_db')
            
            # Создаем полный дамп схемы и данных
            backup_file = self.backup_dir / "full_database_backup.sql"
            
            cmd = [
                'pg_dump',
                db_url,
                '--verbose',
                '--no-password',
                '--format=plain',
                '--file', str(backup_file)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"❌ Ошибка создания бэкапа: {result.stderr}")
                return False
            
            # Создаем также дамп только схемы
            schema_file = self.backup_dir / "schema_only_backup.sql"
            cmd_schema = [
                'pg_dump',
                db_url,
                '--schema-only',
                '--verbose',
                '--no-password',
                '--format=plain',
                '--file', str(schema_file)
            ]
            
            subprocess.run(cmd_schema, capture_output=True, text=True)
            
            print(f"✅ Бэкап создан: {backup_file}")
            print(f"✅ Схема сохранена: {schema_file}")
            return True
            
        except Exception as e:
            print(f"❌ Ошибка создания бэкапа: {e}")
            return False
    
    def backup_current_migrations(self) -> bool:
        """Создает резервную копию текущих миграций"""
        print("🔄 Создание бэкапа миграций...")
        
        try:
            migrations_backup = self.backup_dir / "alembic_versions"
            
            if self.versions_dir.exists():
                shutil.copytree(self.versions_dir, migrations_backup)
                
                # Копируем также alembic.ini и env.py
                shutil.copy2(self.backend_dir / "alembic.ini", self.backup_dir)
                shutil.copy2(self.alembic_dir / "env.py", self.backup_dir)
                
                print(f"✅ Миграции скопированы в: {migrations_backup}")
                return True
            else:
                print("❌ Папка с миграциями не найдена")
                return False
                
        except Exception as e:
            print(f"❌ Ошибка бэкапа миграций: {e}")
            return False
    
    def analyze_current_schema(self) -> Dict[str, Any]:
        """Анализирует текущую схему БД"""
        print("🔄 Анализ текущей схемы...")
        
        try:
            from database import models
            from database.connection import Base, engine
            
            # Получаем все таблицы из моделей
            tables = []
            for name, obj in models.__dict__.items():
                if hasattr(obj, '__tablename__') and hasattr(obj, '__table__'):
                    table_info = {
                        'name': obj.__tablename__,
                        'model_class': name,
                        'columns': [],
                        'indexes': [],
                        'constraints': []
                    }
                    
                    # Анализируем колонки
                    for column in obj.__table__.columns:
                        table_info['columns'].append({
                            'name': column.name,
                            'type': str(column.type),
                            'nullable': column.nullable,
                            'primary_key': column.primary_key,
                            'foreign_keys': [str(fk) for fk in column.foreign_keys],
                            'default': str(column.default) if column.default else None
                        })
                    
                    # Анализируем индексы
                    for index in obj.__table__.indexes:
                        table_info['indexes'].append({
                            'name': index.name,
                            'columns': [col.name for col in index.columns],
                            'unique': index.unique
                        })
                    
                    tables.append(table_info)
            
            schema_info = {
                'total_tables': len(tables),
                'tables': tables,
                'analysis_date': datetime.now().isoformat()
            }
            
            # Сохраняем анализ схемы
            import json
            schema_file = self.backup_dir / "current_schema_analysis.json"
            with open(schema_file, 'w', encoding='utf-8') as f:
                json.dump(schema_info, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Схема проанализирована: {len(tables)} таблиц")
            return schema_info
            
        except Exception as e:
            print(f"❌ Ошибка анализа схемы: {e}")
            return {}
    
    def generate_consolidated_migration(self, description: str = "Consolidated base schema") -> str:
        """Генерирует консолидированную миграцию"""
        print("🔄 Генерация консолидированной миграции...")
        
        try:
            # Переходим в папку backend
            original_cwd = os.getcwd()
            os.chdir(self.backend_dir)
            
            # Генерируем новую миграцию на основе текущих моделей
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            cmd = [
                'alembic', 'revision', 
                '--autogenerate',
                '-m', f"{timestamp}_{description.replace(' ', '_').lower()}"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"❌ Ошибка генерации миграции: {result.stderr}")
                return ""
            
            # Ищем созданный файл миграции
            migration_files = list(self.versions_dir.glob(f"*{timestamp}*.py"))
            
            if migration_files:
                new_migration = migration_files[0]
                print(f"✅ Создана консолидированная миграция: {new_migration.name}")
                return str(new_migration)
            else:
                print("❌ Файл миграции не найден")
                return ""
                
        except Exception as e:
            print(f"❌ Ошибка генерации миграции: {e}")
            return ""
        finally:
            os.chdir(original_cwd)
    
    def create_clean_migration_structure(self) -> bool:
        """Создает чистую структуру миграций"""
        print("🔄 Создание чистой структуры миграций...")
        
        try:
            # Создаем новую папку для чистых миграций
            clean_versions_dir = self.alembic_dir / "versions_clean"
            clean_versions_dir.mkdir(exist_ok=True)
            
            # Создаем базовую миграцию
            base_migration_content = '''"""Base schema for ReplyX

Revision ID: {revision_id}
Revises: 
Create Date: {create_date}

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '{revision_id}'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Эта миграция должна быть пустой, так как схема уже существует
    # Используйте --sql для генерации реального SQL если нужно
    pass

def downgrade() -> None:
    # Откат к пустой схеме
    pass
'''
            
            # Генерируем ID для базовой миграции
            import secrets
            revision_id = secrets.token_hex(6)
            create_date = datetime.now()
            
            base_migration = base_migration_content.format(
                revision_id=revision_id,
                create_date=create_date.strftime('%Y-%m-%d %H:%M:%S.%f')
            )
            
            # Сохраняем базовую миграцию
            base_file = clean_versions_dir / f"{revision_id}_base_schema.py"
            with open(base_file, 'w', encoding='utf-8') as f:
                f.write(base_migration)
            
            print(f"✅ Создана базовая миграция: {base_file.name}")
            
            # Создаем инструкцию по миграции на новую структуру
            migration_plan = f"""
# ПЛАН МИГРАЦИИ НА НОВУЮ СТРУКТУРУ

## Шаг 1: Подготовка
1. Остановить все приложения
2. Создать полный бэкап БД (уже выполнено)
3. Убедиться в наличии отката

## Шаг 2: Обновление истории миграций
```bash
# В папке backend
alembic stamp {revision_id}
```

## Шаг 3: Замена миграций
```bash
# Переименовать старые миграции
mv alembic/versions alembic/versions_old

# Переименовать новые миграции
mv alembic/versions_clean alembic/versions
```

## Шаг 4: Проверка
```bash
# Проверить текущую версию
alembic current

# Проверить что нет изменений 
alembic check
```

## Шаг 5: Тестирование
1. Запустить приложение
2. Проверить основные функции
3. Создать тестовую миграцию для проверки

## Откат (если что-то пошло не так)
```bash
# Вернуть старые миграции
rm -rf alembic/versions
mv alembic/versions_old alembic/versions

# Восстановить БД из бэкапа
psql -d chatai_db -f {self.backup_dir}/full_database_backup.sql
```
"""
            
            with open(self.backup_dir / "migration_plan.md", 'w', encoding='utf-8') as f:
                f.write(migration_plan)
            
            print(f"✅ План миграции создан: {self.backup_dir}/migration_plan.md")
            return True
            
        except Exception as e:
            print(f"❌ Ошибка создания чистой структуры: {e}")
            return False
    
    def validate_consolidation(self) -> bool:
        """Валидирует результат консолидации"""
        print("🔄 Валидация консолидации...")
        
        try:
            # Проверяем что новые миграции работают
            original_cwd = os.getcwd()
            os.chdir(self.backend_dir)
            
            # Проверяем синтаксис алембика
            cmd = ['alembic', 'check']
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ Синтаксис миграций корректен")
            else:
                print(f"❌ Проблемы с синтаксисом: {result.stderr}")
                return False
            
            # Проверяем что можно генерировать новые миграции  
            cmd = ['alembic', 'revision', '--autogenerate', '-m', 'test_migration', '--sql']
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if "No changes" in result.stdout or result.returncode == 0:
                print("✅ Генерация новых миграций работает")
            else:
                print(f"❌ Проблемы с генерацией: {result.stderr}")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Ошибка валидации: {e}")
            return False
        finally:
            os.chdir(original_cwd)
    
    def create_monitoring_queries(self):
        """Создает SQL запросы для мониторинга после консолидации"""
        
        monitoring_sql = '''-- Мониторинг после консолидации миграций ReplyX

-- 1. Проверка целостности данных
SELECT 
    table_name,
    n_tup_ins as inserts,
    n_tup_upd as updates, 
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 2. Состояние индексов после консолидации
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0  -- Неиспользуемые индексы
ORDER BY pg_relation_size(indexrelid) DESC;

-- 3. Проверка внешних ключей
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4. Размеры таблиц после консолидации
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 5. История миграций Alembic
SELECT version_num, is_head FROM alembic_version;

-- 6. Проверка уникальных ограничений
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- 7. Проверка NOT NULL ограничений
SELECT 
    table_name,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND is_nullable = 'NO'
    AND column_default IS NULL
ORDER BY table_name, column_name;

-- 8. Производительность после консолидации (выполнить несколько раз)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time,
    rows
FROM pg_stat_statements
WHERE query LIKE '%SELECT%'
    AND calls > 10
ORDER BY mean_time DESC
LIMIT 20;
'''
        
        monitoring_file = self.backup_dir / "post_consolidation_monitoring.sql"
        with open(monitoring_file, 'w', encoding='utf-8') as f:
            f.write(monitoring_sql)
        
        print(f"✅ Мониторинг создан: {monitoring_file}")
    
    def run_consolidation(self, db_url: str = None, skip_backup: bool = False) -> bool:
        """Запускает полную консолидацию миграций"""
        print("🚀 ЗАПУСК КОНСОЛИДАЦИИ МИГРАЦИЙ REPLYX")
        print("=" * 60)
        
        success = True
        
        # Шаг 1: Бэкапы
        if not skip_backup:
            if not self.create_database_backup(db_url):
                return False
            
            if not self.backup_current_migrations():
                return False
        else:
            print("⚠️ Пропуск создания бэкапов (--skip-backup)")
        
        # Шаг 2: Анализ схемы
        schema_info = self.analyze_current_schema()
        if not schema_info:
            print("⚠️ Не удалось проанализировать схему, продолжаем...")
        
        # Шаг 3: Создание чистой структуры
        if not self.create_clean_migration_structure():
            success = False
        
        # Шаг 4: Создание мониторинга
        self.create_monitoring_queries()
        
        # Шаг 5: Валидация (опционально)
        # if not self.validate_consolidation():
        #     print("⚠️ Валидация не прошла, но консолидация завершена")
        
        if success:
            print("\n✅ КОНСОЛИДАЦИЯ УСПЕШНО ЗАВЕРШЕНА!")
            print(f"📁 Все бэкапы и инструкции в: {self.backup_dir}")
            print("📋 Следующие шаги:")
            print("   1. Прочитайте migration_plan.md")
            print("   2. Остановите приложения")  
            print("   3. Выполните alembic stamp <revision_id>")
            print("   4. Замените папку versions")
            print("   5. Запустите мониторинг")
        else:
            print("\n❌ Консолидация завершилась с ошибками")
            print(f"📁 Логи и бэкапы в: {self.backup_dir}")
        
        return success

def main():
    parser = argparse.ArgumentParser(description='Консолидация миграций ReplyX')
    parser.add_argument('--db-url', help='URL базы данных для бэкапа')
    parser.add_argument('--skip-backup', action='store_true', 
                       help='Пропустить создание бэкапов (ОПАСНО!)')
    parser.add_argument('--backend-dir', 
                       default=Path(__file__).parent.parent.parent,
                       help='Путь к папке backend')
    
    args = parser.parse_args()
    
    backend_dir = Path(args.backend_dir).resolve()
    
    if not backend_dir.exists():
        print(f"❌ Папка backend не найдена: {backend_dir}")
        return 1
    
    print(f"🔧 Работаем с проектом: {backend_dir}")
    
    consolidator = MigrationConsolidator(backend_dir)
    
    if not args.skip_backup:
        print("⚠️  ВНИМАНИЕ: Эта операция изменяет структуру миграций!")
        print("⚠️  Убедитесь что у вас есть бэкапы БД и кода!")
        
        confirm = input("Продолжить? (y/N): ")
        if confirm.lower() != 'y':
            print("❌ Операция отменена")
            return 0
    
    success = consolidator.run_consolidation(
        db_url=args.db_url,
        skip_backup=args.skip_backup
    )
    
    return 0 if success else 1

if __name__ == '__main__':
    exit(main())