"""
S3-совместимое хранилище для файлов
Поддерживает различных провайдеров: AWS S3, Yandex Object Storage, VK Cloud, etc.
"""

import boto3
import logging
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config
from typing import Optional, BinaryIO, Dict, Any
from pathlib import Path
import os
import mimetypes
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)


class S3StorageService:
    """Сервис для работы с S3-совместимым объектным хранилищем"""

    def __init__(
        self,
        access_key_id: str,
        secret_access_key: str,
        bucket_name: str,
        endpoint_url: Optional[str] = None,
        region_name: str = "us-east-1"
    ):
        """
        Инициализация S3 клиента

        Args:
            access_key_id: Ключ доступа
            secret_access_key: Секретный ключ
            bucket_name: Имя бакета
            endpoint_url: URL для S3-совместимых сервисов (например, для VK Cloud)
            region_name: Регион (по умолчанию us-east-1)
        """
        self.bucket_name = bucket_name
        self.endpoint_url = endpoint_url

        try:
            # Создаем клиент S3 для Timeweb Cloud Storage с настройками для совместимости
            if endpoint_url:
                # Для Timeweb Cloud используем специальные настройки
                if 'twcstorage.ru' in endpoint_url:
                    # Настройки специально для Timeweb Cloud Storage
                    self.s3_client = boto3.client(
                        's3',
                        endpoint_url=endpoint_url,
                        region_name=region_name,  # Используем регион из env (ru-1)
                        aws_access_key_id=access_key_id,
                        aws_secret_access_key=secret_access_key,
                        config=Config(
                            s3={
                                'addressing_style': 'path',  # Timeweb использует path-style
                                'signature_version': 's3v4'
                            },
                            region_name=region_name
                        )
                    )
                else:
                    # Для других S3-совместимых сервисов
                    self.s3_client = boto3.client(
                        's3',
                        endpoint_url=endpoint_url,
                        region_name=region_name,
                        aws_access_key_id=access_key_id,
                        aws_secret_access_key=secret_access_key,
                        config=Config(
                            s3={
                                'addressing_style': 'virtual',
                                'signature_version': 's3v4'
                            },
                            region_name=region_name
                        )
                    )
            else:
                # Для стандартного AWS S3
                session = boto3.Session(
                    aws_access_key_id=access_key_id,
                    aws_secret_access_key=secret_access_key,
                    region_name=region_name
                )
                self.s3_client = session.client('s3')

            # Проверяем подключение (отключено для Timeweb - бакет уже существует)
            # self._verify_connection()
            logger.info(f"S3 Storage Service initialized successfully. Bucket: {bucket_name}")

        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise ValueError("S3 credentials not configured")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            raise

    def _verify_connection(self) -> bool:
        """Проверяет подключение к S3 и существование бакета"""
        try:
            # Проверяем существование бакета
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == '404':
                logger.error(f"Bucket {self.bucket_name} not found")
                raise ValueError(f"Bucket {self.bucket_name} does not exist")
            elif error_code == '403':
                logger.error(f"Access denied to bucket {self.bucket_name}")
                raise ValueError(f"Access denied to bucket {self.bucket_name}")
            else:
                logger.error(f"Error accessing bucket {self.bucket_name}: {e}")
                raise

    def upload_file(
        self,
        file_content: bytes,
        object_key: str,
        content_type: Optional[str] = None,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Загружает файл в S3

        Args:
            file_content: Содержимое файла в байтах
            object_key: Ключ объекта в S3 (путь к файлу)
            content_type: MIME тип файла
            metadata: Дополнительные метаданные

        Returns:
            Dict с информацией о загруженном файле
        """
        try:
            # Определяем MIME тип если не указан
            if not content_type:
                content_type, _ = mimetypes.guess_type(object_key)
                if not content_type:
                    content_type = 'application/octet-stream'

            # Формируем аргументы для put_object
            put_args = {
                'Bucket': self.bucket_name,
                'Key': object_key,
                'Body': file_content,
                'ContentType': content_type
            }

            # Добавляем метаданные если есть
            if metadata:
                put_args['Metadata'] = metadata

            # Загружаем файл через put_object как в примере Timeweb
            self.s3_client.put_object(**put_args)

            # Получаем URL файла
            file_url = self._get_object_url(object_key)

            logger.info(f"File uploaded successfully: {object_key}")

            return {
                'success': True,
                'object_key': object_key,
                'url': file_url,
                'size': len(file_content),
                'content_type': content_type,
                'bucket': self.bucket_name
            }

        except ClientError as e:
            logger.error(f"Failed to upload file {object_key}: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def download_file(self, object_key: str) -> Optional[bytes]:
        """
        Скачивает файл из S3

        Args:
            object_key: Ключ объекта в S3

        Returns:
            Содержимое файла в байтах или None если файл не найден
        """
        try:
            from io import BytesIO

            buffer = BytesIO()
            self.s3_client.download_fileobj(self.bucket_name, object_key, buffer)
            buffer.seek(0)

            content = buffer.getvalue()
            logger.info(f"File downloaded successfully: {object_key}")
            return content

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == 'NoSuchKey':
                logger.warning(f"File not found: {object_key}")
            else:
                logger.error(f"Failed to download file {object_key}: {e}")
            return None

    def delete_file(self, object_key: str) -> bool:
        """
        Удаляет файл из S3

        Args:
            object_key: Ключ объекта в S3

        Returns:
            True если файл удален успешно
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=object_key)
            logger.info(f"File deleted successfully: {object_key}")
            return True

        except ClientError as e:
            logger.error(f"Failed to delete file {object_key}: {e}")
            return False

    def file_exists(self, object_key: str) -> bool:
        """
        Проверяет существование файла в S3

        Args:
            object_key: Ключ объекта в S3

        Returns:
            True если файл существует
        """
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=object_key)
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == '404':
                return False
            else:
                logger.error(f"Error checking file existence {object_key}: {e}")
                return False

    def get_file_info(self, object_key: str) -> Optional[Dict[str, Any]]:
        """
        Получает информацию о файле в S3

        Args:
            object_key: Ключ объекта в S3

        Returns:
            Словарь с информацией о файле или None если файл не найден
        """
        try:
            response = self.s3_client.head_object(Bucket=self.bucket_name, Key=object_key)

            return {
                'object_key': object_key,
                'size': response.get('ContentLength', 0),
                'content_type': response.get('ContentType', 'unknown'),
                'last_modified': response.get('LastModified'),
                'etag': response.get('ETag', '').strip('"'),
                'metadata': response.get('Metadata', {}),
                'url': self._get_object_url(object_key)
            }

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == '404':
                logger.warning(f"File not found: {object_key}")
            else:
                logger.error(f"Failed to get file info {object_key}: {e}")
            return None

    def _get_object_url(self, object_key: str) -> str:
        """
        Генерирует URL для доступа к файлу

        Args:
            object_key: Ключ объекта в S3

        Returns:
            URL файла
        """
        if self.endpoint_url:
            # Для S3-совместимых сервисов
            return f"{self.endpoint_url.rstrip('/')}/{self.bucket_name}/{object_key}"
        else:
            # Для AWS S3
            return f"https://{self.bucket_name}.s3.amazonaws.com/{object_key}"

    def generate_presigned_url(
        self,
        object_key: str,
        expiration: int = 3600,
        method: str = 'get_object'
    ) -> Optional[str]:
        """
        Генерирует предподписанный URL для доступа к файлу

        Args:
            object_key: Ключ объекта в S3
            expiration: Время жизни URL в секундах (по умолчанию 1 час)
            method: HTTP метод ('get_object' для скачивания)

        Returns:
            Предподписанный URL или None в случае ошибки
        """
        try:
            url = self.s3_client.generate_presigned_url(
                method,
                Params={'Bucket': self.bucket_name, 'Key': object_key},
                ExpiresIn=expiration
            )
            logger.debug(f"Presigned URL generated for {object_key}")
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL for {object_key}: {e}")
            return None

    def generate_secure_filename(
        self,
        user_id: int,
        original_filename: str,
        content: bytes
    ) -> str:
        """
        Генерирует безопасное уникальное имя файла для хранения в S3

        Args:
            user_id: ID пользователя
            original_filename: Оригинальное имя файла
            content: Содержимое файла для хэширования

        Returns:
            Безопасное имя файла
        """
        # Получаем расширение
        extension = Path(original_filename).suffix.lower()

        # Генерируем хэш содержимого
        content_hash = hashlib.sha256(content).hexdigest()[:16]

        # Генерируем временную метку
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Создаем уникальное имя файла
        filename = f"{user_id}_{timestamp}_{content_hash}{extension}"

        return filename

    def generate_widget_icon_filename(
        self,
        user_id: int,
        original_filename: str,
        content: bytes
    ) -> str:
        """
        Генерирует безопасное имя файла для иконки виджета

        Args:
            user_id: ID пользователя
            original_filename: Оригинальное имя файла
            content: Содержимое файла

        Returns:
            Имя файла для иконки виджета
        """
        # Получаем расширение
        extension = Path(original_filename).suffix.lower()

        # Генерируем хэш содержимого
        content_hash = hashlib.sha256(content).hexdigest()[:12]

        # Генерируем временную метку
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Создаем уникальное имя файла для иконки
        filename = f"{user_id}_widget_icon_{timestamp}_{content_hash}{extension}"

        return filename

    def get_user_object_key(self, user_id: int, filename: str, file_type: str = "documents") -> str:
        """
        Генерирует ключ объекта с структурой папок по пользователям и типам файлов

        Args:
            user_id: ID пользователя
            filename: Имя файла
            file_type: Тип файла (documents, widget-icons, avatars, etc.)

        Returns:
            Ключ объекта в формате users/{user_id}/{file_type}/{filename}
        """
        return f"users/{user_id}/{file_type}/{filename}"

    def list_user_files(self, user_id: int, file_type: str = None) -> list:
        """
        Получает список файлов пользователя

        Args:
            user_id: ID пользователя
            file_type: Тип файлов для фильтрации (documents, widget-icons, etc.)
                      Если None - возвращает все файлы пользователя

        Returns:
            Список файлов пользователя
        """
        try:
            if file_type:
                prefix = f"users/{user_id}/{file_type}/"
            else:
                prefix = f"users/{user_id}/"

            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )

            files = []
            for obj in response.get('Contents', []):
                key = obj['Key']
                # Убираем префикс чтобы получить только имя файла
                relative_path = key.replace(f"users/{user_id}/", '', 1)

                # Определяем тип файла из пути
                path_parts = relative_path.split('/')
                detected_type = path_parts[0] if len(path_parts) > 1 else 'unknown'
                filename = path_parts[-1]

                files.append({
                    'filename': filename,
                    'object_key': key,
                    'file_type': detected_type,
                    'relative_path': relative_path,
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'],
                    'url': self._get_object_url(key)
                })

            return files

        except ClientError as e:
            logger.error(f"Failed to list files for user {user_id}: {e}")
            return []


def get_s3_service() -> Optional[S3StorageService]:
    """
    Создает и возвращает экземпляр S3StorageService на основе настроек окружения

    Returns:
        Экземпляр S3StorageService или None если настройки не заданы
    """
    try:
        # Читаем настройки из переменных окружения
        access_key = os.getenv('S3_ACCESS_KEY_ID')
        secret_key = os.getenv('S3_SECRET_ACCESS_KEY')
        bucket_name = os.getenv('S3_BUCKET_NAME')
        endpoint_url = os.getenv('S3_ENDPOINT_URL')  # Для VK Cloud, Yandex и др.
        region = os.getenv('S3_REGION', 'us-east-1')

        # Проверяем обязательные параметры
        if not all([access_key, secret_key, bucket_name]):
            logger.warning("S3 credentials not configured in environment variables")
            return None

        return S3StorageService(
            access_key_id=access_key,
            secret_access_key=secret_key,
            bucket_name=bucket_name,
            endpoint_url=endpoint_url,
            region_name=region
        )

    except Exception as e:
        logger.error(f"Failed to initialize S3 service: {e}")
        return None


# Глобальный экземпляр сервиса
s3_service: Optional[S3StorageService] = None

def init_s3_service():
    """Инициализирует глобальный экземпляр S3 сервиса"""
    global s3_service
    s3_service = get_s3_service()
    if s3_service:
        logger.info("S3 Storage Service initialized globally")
    else:
        logger.info("S3 Storage Service not available (using local file storage)")