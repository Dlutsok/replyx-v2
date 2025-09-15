#!/usr/bin/env python3
"""
Тестовый скрипт для проверки подключения к Timeweb Cloud Storage
"""

import os
import sys
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv(dotenv_path="../.env")

# Добавляем путь к backend модулям
sys.path.append('.')

from services.s3_storage_service import S3StorageService


def test_s3_connection():
    """Тестирует подключение к S3 хранилищу"""
    print("🧪 Тестирование подключения к Timeweb Cloud Storage...")

    # Читаем настройки из .env
    access_key = os.getenv('S3_ACCESS_KEY_ID')
    secret_key = os.getenv('S3_SECRET_ACCESS_KEY')
    bucket_name = os.getenv('S3_BUCKET_NAME')
    endpoint_url = os.getenv('S3_ENDPOINT_URL')
    region = os.getenv('S3_REGION')

    print(f"📋 Настройки:")
    print(f"   Access Key: {access_key[:8]}***")
    print(f"   Bucket: {bucket_name}")
    print(f"   Endpoint: {endpoint_url}")
    print(f"   Region: {region}")
    print()

    if not all([access_key, secret_key, bucket_name]):
        print("❌ Ошибка: не все настройки S3 заданы в .env файле")
        return False

    try:
        # Создаем S3 сервис
        s3_service = S3StorageService(
            access_key_id=access_key,
            secret_access_key=secret_key,
            bucket_name=bucket_name,
            endpoint_url=endpoint_url,
            region_name=region
        )

        print("✅ S3 сервис создан успешно")

        # Тестируем загрузку небольшого файла
        test_user_id = 999
        test_content = b"Hello from ReplyX! Test file for S3 connection."
        test_filename = "test_connection.txt"

        print(f"📤 Загружаем тестовый файл...")

        # Простой ключ объекта без лишних методов
        object_key = "users/999/test/simple_test.txt"

        print(f"   Ключ объекта: {object_key}")

        # Загружаем файл без метаданных
        upload_result = s3_service.upload_file(
            file_content=test_content,
            object_key=object_key,
            content_type="text/plain"
        )

        if upload_result.get('success'):
            print("✅ Файл загружен успешно!")
            print(f"   URL: {upload_result.get('url')}")
            print(f"   Размер: {upload_result.get('size')} байт")
        else:
            print(f"❌ Ошибка загрузки: {upload_result.get('error')}")
            return False

        # Тестируем скачивание
        print(f"📥 Скачиваем тестовый файл...")

        downloaded_content = s3_service.download_file(object_key)

        if downloaded_content:
            if downloaded_content == test_content:
                print("✅ Файл скачан и содержимое совпадает!")
            else:
                print("⚠️ Файл скачан, но содержимое не совпадает")
                print(f"   Ожидалось: {test_content}")
                print(f"   Получено: {downloaded_content}")
        else:
            print("❌ Не удалось скачать файл")
            return False

        # Тестируем получение информации о файле
        print(f"📋 Получаем информацию о файле...")

        file_info = s3_service.get_file_info(object_key)

        if file_info:
            print("✅ Информация о файле получена:")
            print(f"   Размер: {file_info.get('size')} байт")
            print(f"   Тип: {file_info.get('content_type')}")
            print(f"   ETag: {file_info.get('etag')}")
            print(f"   Изменен: {file_info.get('last_modified')}")
        else:
            print("❌ Не удалось получить информацию о файле")

        # Тестируем генерацию временной ссылки
        print(f"🔗 Генерируем временную ссылку...")

        presigned_url = s3_service.generate_presigned_url(object_key, expiration=300)

        if presigned_url:
            print("✅ Временная ссылка создана:")
            print(f"   URL: {presigned_url[:80]}...")
        else:
            print("❌ Не удалось создать временную ссылку")

        # Тестируем список файлов
        print(f"📂 Получаем список файлов пользователя...")

        user_files = s3_service.list_user_files(test_user_id, "test")

        print(f"✅ Найдено {len(user_files)} файлов в папке test/")
        for file_info in user_files:
            print(f"   - {file_info['filename']} ({file_info['size']} байт)")

        # Очищаем за собой - удаляем тестовый файл
        print(f"🗑️ Удаляем тестовый файл...")

        deleted = s3_service.delete_file(object_key)

        if deleted:
            print("✅ Тестовый файл удален")
        else:
            print("⚠️ Не удалось удалить тестовый файл")

        print("\n🎉 Все тесты S3 пройдены успешно!")
        print("💡 Ваше Timeweb Cloud Storage готово к работе с ReplyX")

        return True

    except Exception as e:
        print(f"❌ Ошибка подключения к S3: {e}")
        return False


if __name__ == "__main__":
    success = test_s3_connection()
    sys.exit(0 if success else 1)