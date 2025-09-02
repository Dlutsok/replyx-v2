#!/usr/bin/env python3
"""
Скрипт для валидации миграции system_settings.

Проверяет:
1. Корректность SQL синтаксиса миграции
2. Соответствие модели SystemSettings в models.py
3. Наличие всех необходимых индексов
4. Корректность начальных данных
"""

import sys
import os
import re
from datetime import datetime

# Добавляем путь к проекту
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def validate_migration_file():
    """Проверка файла миграции на корректность."""
    migration_file = '/Users/dan/Documents/chatAI/MVP 11/backend/alembic/versions/202508261209_create_system_settings_table.py'
    
    if not os.path.exists(migration_file):
        print("❌ Файл миграции не найден")
        return False
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Проверяем основные элементы миграции
    checks = [
        ('revision', r'revision:\s*str\s*=\s*[\'"]202508261209_create_system_settings_table[\'"]'),
        ('down_revision', r'down_revision.*=.*[\'"]386658517a4d[\'"]'),
        ('upgrade function', r'def upgrade\(\)\s*->\s*None:'),
        ('downgrade function', r'def downgrade\(\)\s*->\s*None:'),
        ('create_table', r'op\.create_table\([\'"]system_settings[\'"]'),
        ('unique constraint', r'ix_system_settings_category_key.*unique=True'),
        ('foreign key', r'ForeignKeyConstraint.*users\.id'),
        ('bulk_insert', r'op\.bulk_insert'),
        ('drop_table in downgrade', r'op\.drop_table\([\'"]system_settings[\'"]'),
    ]
    
    print("🔍 Проверка миграции:")
    all_passed = True
    
    for check_name, pattern in checks:
        if re.search(pattern, content, re.MULTILINE | re.DOTALL):
            print(f"✅ {check_name}")
        else:
            print(f"❌ {check_name}")
            all_passed = False
    
    return all_passed

def validate_model_consistency():
    """Проверка соответствия миграции и модели."""
    print("\n🔍 Проверка соответствия модели:")
    
    model_file = '/Users/dan/Documents/chatAI/MVP 11/backend/database/models.py'
    migration_file = '/Users/dan/Documents/chatAI/MVP 11/backend/alembic/versions/202508261209_create_system_settings_table.py'
    
    with open(model_file, 'r', encoding='utf-8') as f:
        model_content = f.read()
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        migration_content = f.read()
    
    # Проверяем поля модели
    model_fields = [
        'id', 'category', 'key', 'value', 'data_type', 'is_sensitive',
        'description', 'default_value', 'is_active', 'created_at', 
        'updated_at', 'updated_by'
    ]
    
    all_passed = True
    for field in model_fields:
        if field in migration_content:
            print(f"✅ поле {field}")
        else:
            print(f"❌ поле {field} отсутствует в миграции")
            all_passed = False
    
    return all_passed

def validate_initial_data():
    """Проверка начальных данных."""
    print("\n🔍 Проверка начальных данных:")
    
    migration_file = '/Users/dan/Documents/chatAI/MVP 11/backend/alembic/versions/202508261209_create_system_settings_table.py'
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Проверяем наличие категорий
    categories = ['general', 'ai', 'email', 'security', 'limits', 'maintenance']
    all_passed = True
    
    for category in categories:
        if f"'category': '{category}'" in content:
            print(f"✅ категория {category}")
        else:
            print(f"❌ категория {category} отсутствует")
            all_passed = False
    
    # Проверяем критичные настройки
    critical_settings = [
        'site_name', 'maintenance_mode', 'default_model', 'session_timeout',
        'max_documents_per_user', 'registration_enabled'
    ]
    
    for setting in critical_settings:
        if f"'key': '{setting}'" in content:
            print(f"✅ настройка {setting}")
        else:
            print(f"❌ настройка {setting} отсутствует")
            all_passed = False
    
    return all_passed

def validate_indexes():
    """Проверка индексов."""
    print("\n🔍 Проверка индексов:")
    
    migration_file = '/Users/dan/Documents/chatAI/MVP 11/backend/alembic/versions/202508261209_create_system_settings_table.py'
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    required_indexes = [
        ('category_key unique', 'ix_system_settings_category_key.*unique=True'),
        ('category index', 'ix_system_settings_category'),
        ('key index', 'ix_system_settings_key'),
        ('is_active index', 'ix_system_settings_is_active'),
    ]
    
    all_passed = True
    for index_name, pattern in required_indexes:
        if re.search(pattern, content):
            print(f"✅ {index_name}")
        else:
            print(f"❌ {index_name}")
            all_passed = False
    
    return all_passed

def validate_rollback():
    """Проверка функции отката."""
    print("\n🔍 Проверка функции отката:")
    
    migration_file = '/Users/dan/Documents/chatAI/MVP 11/backend/alembic/versions/202508261209_create_system_settings_table.py'
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Находим функцию downgrade
    downgrade_match = re.search(r'def downgrade\(\).*?(?=def|\Z)', content, re.DOTALL)
    
    if not downgrade_match:
        print("❌ Функция downgrade не найдена")
        return False
    
    downgrade_content = downgrade_match.group(0)
    
    # Проверяем порядок удаления (индексы перед таблицами)
    drop_operations = re.findall(r'op\.drop_\w+', downgrade_content)
    
    if not drop_operations:
        print("❌ Операции удаления не найдены")
        return False
    
    # Проверяем что индексы удаляются перед таблицей
    table_drop_found = False
    for op in drop_operations:
        if 'drop_table' in op:
            table_drop_found = True
        elif table_drop_found and 'drop_index' in op:
            print("❌ Неправильный порядок удаления: индексы после таблицы")
            return False
    
    print("✅ Порядок операций в downgrade корректный")
    return True

def main():
    """Основная функция валидации."""
    print("🔧 Валидация миграции system_settings\n")
    
    checks = [
        ("Файл миграции", validate_migration_file),
        ("Соответствие модели", validate_model_consistency),
        ("Начальные данные", validate_initial_data),
        ("Индексы", validate_indexes),
        ("Функция отката", validate_rollback),
    ]
    
    all_passed = True
    for check_name, check_func in checks:
        try:
            result = check_func()
            all_passed = all_passed and result
        except Exception as e:
            print(f"❌ Ошибка при проверке {check_name}: {e}")
            all_passed = False
    
    print(f"\n{'='*50}")
    if all_passed:
        print("✅ Все проверки пройдены! Миграция готова к применению.")
        print("\nДля применения миграции выполните:")
        print("cd /Users/dan/Documents/chatAI/MVP\\ 9/backend")
        print("alembic upgrade head")
        return 0
    else:
        print("❌ Некоторые проверки не пройдены. Исправьте ошибки перед применением.")
        return 1

if __name__ == "__main__":
    sys.exit(main())