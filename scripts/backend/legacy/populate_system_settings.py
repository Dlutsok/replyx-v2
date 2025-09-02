#!/usr/bin/env python3
"""
Script to populate the system_settings table with initial data from the migration.
This fixes the issue where the migration failed to insert data.
"""

import os
import sys
sys.path.append('.')

from database.connection import engine
from sqlalchemy import text
from datetime import datetime

# Initial system settings data from migration 202508261209_create_system_settings_table.py
INITIAL_SETTINGS = [
    # General settings
    {
        'category': 'general',
        'key': 'site_name',
        'value': 'ReplyX',
        'data_type': 'string',
        'is_sensitive': False,
        'description': 'Название сайта/приложения',
        'default_value': 'ReplyX',
        'is_active': True
    },
    {
        'category': 'general',
        'key': 'maintenance_mode',
        'value': 'false',
        'data_type': 'boolean',
        'is_sensitive': False,
        'description': 'Режим технического обслуживания',
        'default_value': 'false',
        'is_active': True
    },
    {
        'category': 'general',
        'key': 'registration_enabled',
        'value': 'true',
        'data_type': 'boolean',
        'is_sensitive': False,
        'description': 'Разрешена ли регистрация новых пользователей',
        'default_value': 'true',
        'is_active': True
    },
    
    # AI settings
    {
        'category': 'ai',
        'key': 'default_model',
        'value': 'gpt-4o-mini',
        'data_type': 'string',
        'is_sensitive': False,
        'description': 'Модель AI по умолчанию для новых ассистентов',
        'default_value': 'gpt-4o-mini',
        'is_active': True
    },
    {
        'category': 'ai',
        'key': 'max_tokens_per_request',
        'value': '4096',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Максимальное количество токенов на запрос',
        'default_value': '4096',
        'is_active': True
    },
    {
        'category': 'ai',
        'key': 'temperature',
        'value': '0.7',
        'data_type': 'float',
        'is_sensitive': False,
        'description': 'Температура для AI моделей (креативность)',
        'default_value': '0.7',
        'is_active': True
    },
    
    # Email settings
    {
        'category': 'email',
        'key': 'smtp_enabled',
        'value': 'false',
        'data_type': 'boolean',
        'is_sensitive': False,
        'description': 'Включена ли отправка email',
        'default_value': 'false',
        'is_active': True
    },
    {
        'category': 'email',
        'key': 'smtp_host',
        'value': '',
        'data_type': 'string',
        'is_sensitive': False,
        'description': 'SMTP сервер',
        'default_value': '',
        'is_active': True
    },
    {
        'category': 'email',
        'key': 'smtp_port',
        'value': '587',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Порт SMTP сервера',
        'default_value': '587',
        'is_active': True
    },
    {
        'category': 'email',
        'key': 'smtp_username',
        'value': '',
        'data_type': 'string',
        'is_sensitive': True,
        'description': 'Имя пользователя SMTP',
        'default_value': '',
        'is_active': True
    },
    {
        'category': 'email',
        'key': 'smtp_password',
        'value': '',
        'data_type': 'string',
        'is_sensitive': True,
        'description': 'Пароль SMTP',
        'default_value': '',
        'is_active': True
    },
    
    # Security settings
    {
        'category': 'security',
        'key': 'session_timeout',
        'value': '86400',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Время жизни сессии в секундах (24 часа)',
        'default_value': '86400',
        'is_active': True
    },
    {
        'category': 'security',
        'key': 'max_login_attempts',
        'value': '5',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Максимальное количество попыток входа',
        'default_value': '5',
        'is_active': True
    },
    {
        'category': 'security',
        'key': 'password_min_length',
        'value': '8',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Минимальная длина пароля',
        'default_value': '8',
        'is_active': True
    },
    
    # Limits settings
    {
        'category': 'limits',
        'key': 'max_documents_per_user',
        'value': '100',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Максимальное количество документов на пользователя',
        'default_value': '100',
        'is_active': True
    },
    {
        'category': 'limits',
        'key': 'max_file_size_mb',
        'value': '10',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Максимальный размер загружаемого файла в МБ',
        'default_value': '10',
        'is_active': True
    },
    {
        'category': 'limits',
        'key': 'max_assistants_per_user',
        'value': '10',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Максимальное количество ассистентов на пользователя',
        'default_value': '10',
        'is_active': True
    },
    {
        'category': 'limits',
        'key': 'rate_limit_requests_per_minute',
        'value': '60',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Ограничение запросов в минуту на пользователя',
        'default_value': '60',
        'is_active': True
    },
    
    # Maintenance settings
    {
        'category': 'maintenance',
        'key': 'backup_enabled',
        'value': 'true',
        'data_type': 'boolean',
        'is_sensitive': False,
        'description': 'Включено ли автоматическое резервное копирование',
        'default_value': 'true',
        'is_active': True
    },
    {
        'category': 'maintenance',
        'key': 'cleanup_old_dialogs_days',
        'value': '90',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Через сколько дней удалять старые диалоги',
        'default_value': '90',
        'is_active': True
    },
    {
        'category': 'maintenance',
        'key': 'cleanup_old_embeddings_days',
        'value': '30',
        'data_type': 'integer',
        'is_sensitive': False,
        'description': 'Через сколько дней очищать неиспользуемые эмбеддинги',
        'default_value': '30',
        'is_active': True
    }
]

def populate_system_settings():
    """Populate system_settings table with initial data."""
    
    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            # Check if data already exists
            result = conn.execute(text("SELECT COUNT(*) FROM system_settings"))
            existing_count = result.scalar()
            
            if existing_count > 0:
                print(f"Table already has {existing_count} records. Skipping population.")
                trans.rollback()
                return
            
            # Insert settings
            current_time = datetime.utcnow()
            
            for setting in INITIAL_SETTINGS:
                insert_sql = text("""
                    INSERT INTO system_settings 
                    (category, key, value, data_type, is_sensitive, description, default_value, is_active, created_at, updated_at)
                    VALUES (:category, :key, :value, :data_type, :is_sensitive, :description, :default_value, :is_active, :created_at, :updated_at)
                """)
                
                conn.execute(insert_sql, {
                    'category': setting['category'],
                    'key': setting['key'],
                    'value': setting['value'],
                    'data_type': setting['data_type'],
                    'is_sensitive': setting['is_sensitive'],
                    'description': setting['description'],
                    'default_value': setting['default_value'],
                    'is_active': setting['is_active'],
                    'created_at': current_time,
                    'updated_at': current_time
                })
            
            # Commit transaction
            trans.commit()
            print(f"Successfully inserted {len(INITIAL_SETTINGS)} system settings.")
            
            # Verify insertion
            result = conn.execute(text("SELECT category, COUNT(*) FROM system_settings GROUP BY category ORDER BY category"))
            categories = result.fetchall()
            print("Settings by category:")
            for cat in categories:
                print(f"  {cat[0]}: {cat[1]} records")
                
    except Exception as e:
        print(f"Error populating system settings: {e}")
        if 'trans' in locals():
            trans.rollback()
        raise

if __name__ == "__main__":
    print("Populating system_settings table with initial data...")
    populate_system_settings()
    print("Done!")