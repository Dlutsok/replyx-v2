#!/usr/bin/env python3
"""
Скрипт для обновления импортов в проекте после реорганизации структуры.
"""

import os
import re
import glob

def update_imports_in_file(file_path, replacements):
    """Обновляет импорты в указанном файле"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        for old_import, new_import in replacements.items():
            content = content.replace(old_import, new_import)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Обновлен файл: {file_path}")
            return True
        return False
    except Exception as e:
        print(f"❌ Ошибка при обработке {file_path}: {e}")
        return False

def main():
    # Словарь замен импортов
    replacements = {
        'from telegram_integration import': 'from integrations.telegram_integration import',
        'from email_integration import': 'from integrations.email_integration import',
        'from whatsapp_integration import': 'from integrations.whatsapp_integration import',
        'from ai_assistant import': 'from ai.ai_assistant import',
        'from ai_models import': 'from ai.ai_models import',
        'from ai_utils import': 'from ai.ai_utils import',
    }
    
    # Получаем корневую директорию проекта
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Паттерны файлов для обработки
    file_patterns = [
        '**/*.py',
        '**/*.js',
        '**/*.ts',
        '**/*.jsx',
        '**/*.tsx'
    ]
    
    updated_files = 0
    
    for pattern in file_patterns:
        files = glob.glob(os.path.join(project_root, pattern), recursive=True)
        
        for file_path in files:
            # Пропускаем файлы в директориях node_modules, .git, __pycache__
            if any(skip_dir in file_path for skip_dir in ['node_modules', '.git', '__pycache__', '.next']):
                continue
                
            if update_imports_in_file(file_path, replacements):
                updated_files += 1
    
    print(f"\n🎉 Обновление завершено! Обработано файлов: {updated_files}")

if __name__ == "__main__":
    main()