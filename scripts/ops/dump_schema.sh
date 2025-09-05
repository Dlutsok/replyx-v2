#!/usr/bin/env bash
set -e

echo "🔧 Генерация схемы базы данных для ReplyX MVP 13..."

# Переходим в директорию backend
pushd "$(dirname "$0")/../../backend" >/dev/null

# Проверяем наличие .env файла
if [ ! -f "../.env" ]; then
    echo "❌ Файл .env не найден. Создайте его с настройками БД."
    exit 1
fi

# Загружаем переменные окружения
export $(cat "../.env" | grep -v '^#' | xargs)

# Проверяем наличие DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Переменная DATABASE_URL не установлена в .env"
    exit 1
fi

echo "📊 Подключение к базе данных: ${DATABASE_URL%/*}/[HIDDEN]"

# Генерируем схему через SQLAlchemy
python - <<'EOF'
import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.automap import automap_base

def generate_schema_documentation():
    try:
        # Подключаемся к базе данных
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL не установлена")
        
        engine = create_engine(database_url)
        inspector = inspect(engine)
        
        output_path = "../docs/db/schema.sql"
        md_output_path = "../docs/db/schema_current.md"
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(f"-- ReplyX MVP 13 Database Schema\n")
            f.write(f"-- Generated at: {datetime.now().isoformat()}\n")
            f.write(f"-- PostgreSQL with pgvector extension\n\n")
            
            # Получаем все таблицы
            tables = inspector.get_table_names()
            print(f"📊 Найдено таблиц: {len(tables)}")
            
            for table_name in sorted(tables):
                f.write(f"\n-- ===== TABLE: {table_name} =====\n")
                
                # Получаем колонки
                columns = inspector.get_columns(table_name)
                f.write(f"CREATE TABLE {table_name} (\n")
                
                col_definitions = []
                for col in columns:
                    col_type = str(col['type'])
                    nullable = "NULL" if col['nullable'] else "NOT NULL"
                    default = f" DEFAULT {col['default']}" if col['default'] else ""
                    col_def = f"    {col['name']} {col_type} {nullable}{default}"
                    col_definitions.append(col_def)
                
                f.write(',\n'.join(col_definitions))
                
                # Получаем primary key
                pk = inspector.get_pk_constraint(table_name)
                if pk and pk['constrained_columns']:
                    f.write(f",\n    PRIMARY KEY ({', '.join(pk['constrained_columns'])})")
                
                # Получаем foreign keys
                fks = inspector.get_foreign_keys(table_name)
                for fk in fks:
                    f.write(f",\n    FOREIGN KEY ({', '.join(fk['constrained_columns'])}) ")
                    f.write(f"REFERENCES {fk['referred_table']}({', '.join(fk['referred_columns'])})")
                
                f.write("\n);\n")
                
                # Получаем индексы
                indexes = inspector.get_indexes(table_name)
                for idx in indexes:
                    if not idx['unique']:
                        f.write(f"CREATE INDEX {idx['name']} ON {table_name} ({', '.join(idx['column_names'])});\n")
                    else:
                        f.write(f"CREATE UNIQUE INDEX {idx['name']} ON {table_name} ({', '.join(idx['column_names'])});\n")
        
        # Генерируем Markdown документацию
        with open(md_output_path, 'w', encoding='utf-8') as f:
            f.write(f"# Current Database Schema\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Tables:** {len(tables)}\n\n")
            
            for table_name in sorted(tables):
                f.write(f"## {table_name}\n\n")
                
                columns = inspector.get_columns(table_name)
                f.write("| Column | Type | Nullable | Default |\n")
                f.write("|--------|------|----------|----------|\n")
                
                for col in columns:
                    nullable = "Yes" if col['nullable'] else "No"
                    default = str(col['default']) if col['default'] else "-"
                    f.write(f"| {col['name']} | {col['type']} | {nullable} | {default} |\n")
                
                f.write("\n")
        
        print(f"✅ SQL схема сохранена в {output_path}")
        print(f"✅ Markdown документация сохранена в {md_output_path}")
        
        # Выводим статистику
        with engine.connect() as conn:
            total_size_result = conn.execute(text("""
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
            """))
            db_size = total_size_result.fetchone()[0]
            
            table_sizes_result = conn.execute(text("""
                SELECT schemaname, tablename, 
                       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                       pg_total_relation_size(schemaname||'.'||tablename) as bytes
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                LIMIT 10
            """))
            
            print(f"\n📊 Статистика базы данных:")
            print(f"   - Общий размер: {db_size}")
            print(f"   - Количество таблиц: {len(tables)}")
            print(f"\n📊 Топ-10 таблиц по размеру:")
            
            for row in table_sizes_result:
                print(f"   - {row[1]}: {row[2]}")
    
    except Exception as e:
        print(f"❌ Ошибка генерации схемы: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    generate_schema_documentation()
EOF

popd >/dev/null

echo "🎉 Генерация схемы БД завершена успешно!"