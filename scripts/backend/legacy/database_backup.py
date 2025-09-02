"""
🗄️ СИСТЕМА БЭКАПОВ БАЗЫ ДАННЫХ ChatAI
Автоматические и ручные бэкапы с ротацией и сжатием
"""

import os
import subprocess
import gzip
import shutil
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional
import json
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class DatabaseBackup:
    """Система бэкапов PostgreSQL с поддержкой локального и облачного хранения"""
    
    def __init__(self):
        # Конфигурация из переменных окружения
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = os.getenv('DB_PORT', '5432')
        self.db_name = os.getenv('DB_NAME', 'chat_ai')
        self.db_user = os.getenv('DB_USER', 'dan')
        self.db_password = os.getenv('DB_PASSWORD', '')
        
        # Настройки бэкапов
        self.backup_dir = Path(os.getenv('BACKUP_DIR', './data/backups'))
        self.max_local_backups = int(os.getenv('MAX_LOCAL_BACKUPS', '7'))  # 7 дней
        self.max_weekly_backups = int(os.getenv('MAX_WEEKLY_BACKUPS', '4'))  # 4 недели
        self.max_monthly_backups = int(os.getenv('MAX_MONTHLY_BACKUPS', '12'))  # 12 месяцев
        
        # S3 конфигурация (опционально)
        self.s3_enabled = os.getenv('S3_BACKUP_ENABLED', 'false').lower() == 'true'
        self.s3_bucket = os.getenv('S3_BACKUP_BUCKET')
        self.s3_region = os.getenv('S3_BACKUP_REGION', 'us-east-1')
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        
        # Создаем директории
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        (self.backup_dir / 'daily').mkdir(exist_ok=True)
        (self.backup_dir / 'weekly').mkdir(exist_ok=True)
        (self.backup_dir / 'monthly').mkdir(exist_ok=True)
        
        # S3 клиент
        self.s3_client = None
        if self.s3_enabled and self.s3_bucket:
            try:
                self.s3_client = boto3.client(
                    's3',
                    region_name=self.s3_region,
                    aws_access_key_id=self.aws_access_key,
                    aws_secret_access_key=self.aws_secret_key
                )
                logger.info(f"S3 бэкапы включены: {self.s3_bucket}")
            except Exception as e:
                logger.error(f"Ошибка инициализации S3: {e}")
                self.s3_enabled = False
    
    def create_backup(self, backup_type: str = 'daily') -> Optional[Dict]:
        """Создание бэкапа БД"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_filename = f"chatai_backup_{backup_type}_{timestamp}.sql"
            backup_path = self.backup_dir / backup_type / backup_filename
            
            logger.info(f"Создание {backup_type} бэкапа: {backup_filename}")
            
            # Формируем команду pg_dump
            cmd = [
                'pg_dump',
                '--host', self.db_host,
                '--port', self.db_port,
                '--username', self.db_user,
                '--dbname', self.db_name,
                '--no-password',  # Используем .pgpass или переменные окружения
                '--verbose',
                '--clean',        # Добавляем DROP команды
                '--if-exists',    # IF EXISTS для DROP
                '--create',       # Создание БД
                '--format=plain', # SQL формат
                '--file', str(backup_path)
            ]
            
            # Устанавливаем переменную окружения для пароля
            env = os.environ.copy()
            if self.db_password:
                env['PGPASSWORD'] = self.db_password
            
            # Выполняем бэкап
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=3600  # 1 час максимум
            )
            
            if result.returncode != 0:
                logger.error(f"Ошибка создания бэкапа: {result.stderr}")
                return None
            
            # Получаем размер файла
            backup_size = backup_path.stat().st_size
            
            # Сжимаем бэкап
            compressed_path = backup_path.with_suffix('.sql.gz')
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Удаляем несжатый файл
            backup_path.unlink()
            
            compressed_size = compressed_path.stat().st_size
            compression_ratio = (1 - compressed_size / backup_size) * 100
            
            backup_info = {
                'timestamp': timestamp,
                'type': backup_type,
                'filename': compressed_path.name,
                'path': str(compressed_path),
                'size_original': backup_size,
                'size_compressed': compressed_size,
                'compression_ratio': round(compression_ratio, 2),
                'created_at': datetime.now().isoformat()
            }
            
            logger.info(f"Бэкап создан: {compressed_path.name} "
                       f"({self._format_size(compressed_size)}, "
                       f"сжатие {compression_ratio:.1f}%)")
            
            # Загружаем в S3 если включено
            if self.s3_enabled:
                self._upload_to_s3(compressed_path, backup_type)
            
            # Сохраняем метаданные
            self._save_backup_metadata(backup_info)
            
            # Очищаем старые бэкапы
            self._cleanup_old_backups(backup_type)
            
            return backup_info
            
        except subprocess.TimeoutExpired:
            logger.error("Таймаут создания бэкапа (> 1 часа)")
            return None
        except Exception as e:
            logger.error(f"Ошибка создания бэкапа: {e}")
            return None
    
    def restore_backup(self, backup_path: str) -> bool:
        """Восстановление из бэкапа"""
        try:
            backup_file = Path(backup_path)
            if not backup_file.exists():
                logger.error(f"Файл бэкапа не найден: {backup_path}")
                return False
            
            logger.warning(f"ВОССТАНОВЛЕНИЕ БД из {backup_file.name}")
            logger.warning("Это действие УДАЛИТ все текущие данные!")
            
            # Временный файл для распаковки
            if backup_file.suffix == '.gz':
                temp_sql = backup_file.with_suffix('')
                with gzip.open(backup_file, 'rb') as f_in:
                    with open(temp_sql, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
                sql_file = temp_sql
            else:
                sql_file = backup_file
            
            # Команда восстановления
            cmd = [
                'psql',
                '--host', self.db_host,
                '--port', self.db_port,
                '--username', self.db_user,
                '--dbname', 'postgres',  # Подключаемся к postgres для создания БД
                '--file', str(sql_file)
            ]
            
            env = os.environ.copy()
            if self.db_password:
                env['PGPASSWORD'] = self.db_password
            
            result = subprocess.run(
                cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=3600
            )
            
            # Удаляем временный файл
            if backup_file.suffix == '.gz' and temp_sql.exists():
                temp_sql.unlink()
            
            if result.returncode != 0:
                logger.error(f"Ошибка восстановления: {result.stderr}")
                return False
            
            logger.info(f"БД успешно восстановлена из {backup_file.name}")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка восстановления БД: {e}")
            return False
    
    def _upload_to_s3(self, backup_path: Path, backup_type: str):
        """Загрузка бэкапа в S3"""
        try:
            if not self.s3_client:
                return
            
            s3_key = f"chatai-backups/{backup_type}/{backup_path.name}"
            
            self.s3_client.upload_file(
                str(backup_path),
                self.s3_bucket,
                s3_key,
                ExtraArgs={
                    'StorageClass': 'STANDARD_IA',  # Дешевое хранение
                    'ServerSideEncryption': 'AES256'
                }
            )
            
            logger.info(f"Бэкап загружен в S3: s3://{self.s3_bucket}/{s3_key}")
            
        except Exception as e:
            logger.error(f"Ошибка загрузки в S3: {e}")
    
    def _save_backup_metadata(self, backup_info: Dict):
        """Сохранение метаданных бэкапа"""
        try:
            metadata_file = self.backup_dir / 'backup_metadata.json'
            
            # Загружаем существующие метаданные
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
            else:
                metadata = {'backups': []}
            
            # Добавляем новый бэкап
            metadata['backups'].append(backup_info)
            
            # Ограничиваем количество записей (последние 100)
            metadata['backups'] = metadata['backups'][-100:]
            
            # Сохраняем
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
                
        except Exception as e:
            logger.error(f"Ошибка сохранения метаданных: {e}")
    
    def _cleanup_old_backups(self, backup_type: str):
        """Очистка старых бэкапов"""
        try:
            backup_folder = self.backup_dir / backup_type
            
            # Получаем список файлов бэкапов
            backup_files = list(backup_folder.glob('*.sql.gz'))
            backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            
            # Определяем лимит
            if backup_type == 'daily':
                limit = self.max_local_backups
            elif backup_type == 'weekly':
                limit = self.max_weekly_backups
            elif backup_type == 'monthly':
                limit = self.max_monthly_backups
            else:
                limit = 10
            
            # Удаляем старые файлы
            for old_backup in backup_files[limit:]:
                logger.info(f"Удаление старого {backup_type} бэкапа: {old_backup.name}")
                old_backup.unlink()
                
        except Exception as e:
            logger.error(f"Ошибка очистки старых бэкапов: {e}")
    
    def get_backup_list(self) -> List[Dict]:
        """Получение списка доступных бэкапов"""
        try:
            metadata_file = self.backup_dir / 'backup_metadata.json'
            
            if not metadata_file.exists():
                return []
            
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            
            # Проверяем существование файлов
            valid_backups = []
            for backup in metadata.get('backups', []):
                backup_path = Path(backup['path'])
                if backup_path.exists():
                    backup['exists'] = True
                    backup['size_formatted'] = self._format_size(backup['size_compressed'])
                    valid_backups.append(backup)
                else:
                    backup['exists'] = False
            
            return sorted(valid_backups, key=lambda x: x['created_at'], reverse=True)
            
        except Exception as e:
            logger.error(f"Ошибка получения списка бэкапов: {e}")
            return []
    
    def _format_size(self, size_bytes: int) -> str:
        """Форматирование размера файла"""
        if size_bytes == 0:
            return "0 B"
        
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        
        return f"{size_bytes:.1f} TB"
    
    def create_scheduled_backups(self):
        """Создание запланированных бэкапов (вызывается по cron)"""
        now = datetime.now()
        
        # Ежедневный бэкап
        daily_backup = self.create_backup('daily')
        if not daily_backup:
            logger.error("Ошибка создания ежедневного бэкапа")
            return False
        
        # Еженедельный бэкап (воскресенье)
        if now.weekday() == 6:  # Воскресенье
            weekly_backup = self.create_backup('weekly')
            if not weekly_backup:
                logger.error("Ошибка создания еженедельного бэкапа")
        
        # Ежемесячный бэкап (первое число месяца)
        if now.day == 1:
            monthly_backup = self.create_backup('monthly')
            if not monthly_backup:
                logger.error("Ошибка создания ежемесячного бэкапа")
        
        return True

# Глобальный экземпляр
db_backup = DatabaseBackup()