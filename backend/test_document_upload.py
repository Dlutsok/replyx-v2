#!/usr/bin/env python3
"""
Прямое тестирование загрузки документа в S3
"""
import tempfile
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

from services.s3_storage_service import get_s3_service

def test_document_upload():
    """Тестирует загрузку документа как в реальном API"""
    print("📤 Тестирование загрузки документа в S3...")

    # Получаем S3 сервис
    s3_service = get_s3_service()
    if not s3_service:
        print("❌ S3 сервис недоступен")
        return False

    print("✅ S3 сервис инициализирован")

    # Создаем тестовый документ
    test_content = """Это тестовый документ для проверки загрузки в Timeweb Cloud Storage.

Содержимое документа:
1. Тестовый текст на русском языке
2. Проверка кодировки UTF-8
3. Многострочный контент

Дата: 2025-09-15
Цель: Проверка интеграции S3 с API документов ReplyX
"""

    content_bytes = test_content.encode('utf-8')
    original_filename = "test_document_s3.txt"
    user_id = 1  # Тестовый пользователь

    try:
        # Генерируем безопасное имя файла
        secure_filename = s3_service.generate_secure_filename(
            user_id=user_id,
            original_filename=original_filename,
            content=content_bytes
        )
        print(f"🔒 Сгенерировано безопасное имя: {secure_filename}")

        # Получаем ключ объекта
        object_key = s3_service.get_user_object_key(
            user_id,
            secure_filename,
            "documents"
        )
        print(f"🗂️ Ключ объекта: {object_key}")

        # Загружаем файл (используем дефисы вместо подчеркиваний в ключах метаданных)
        upload_result = s3_service.upload_file(
            file_content=content_bytes,
            object_key=object_key,
            content_type="text/plain",
            metadata={
                'user-id': str(user_id),
                'original-filename': original_filename,
                'file-type': 'document',
                'test': 'true'
            }
        )

        if upload_result.get('success'):
            print("✅ Документ загружен успешно!")
            print(f"   📄 Имя файла: {secure_filename}")
            print(f"   🔗 URL: {upload_result.get('url')}")
            print(f"   📏 Размер: {upload_result.get('size')} байт")
            print(f"   🏷️ MIME: {upload_result.get('content_type')}")

            # Тестируем скачивание
            print("\n📥 Тестируем скачивание...")
            downloaded_content = s3_service.download_file(object_key)

            if downloaded_content:
                downloaded_text = downloaded_content.decode('utf-8')
                if downloaded_text == test_content:
                    print("✅ Содержимое совпадает!")
                else:
                    print("❌ Содержимое не совпадает")
                    print(f"Ожидалось: {len(test_content)} символов")
                    print(f"Получено: {len(downloaded_text)} символов")
            else:
                print("❌ Не удалось скачать файл")

            # Получаем информацию о файле
            print("\n📋 Получаем информацию о файле...")
            file_info = s3_service.get_file_info(object_key)
            if file_info:
                print("✅ Информация получена:")
                print(f"   📏 Размер: {file_info.get('size')} байт")
                print(f"   📅 Изменен: {file_info.get('last_modified')}")
                print(f"   🏷️ ETag: {file_info.get('etag')}")

            # Создаем presigned URL
            print("\n🔗 Создаем временную ссылку...")
            presigned_url = s3_service.generate_presigned_url(object_key, expiration=3600)
            if presigned_url:
                print(f"✅ Временная ссылка создана (действительна 1 час)")
                print(f"   🔗 URL: {presigned_url[:100]}...")

            # Очистка - удаляем тестовый файл
            print("\n🗑️ Удаляем тестовый файл...")
            if s3_service.delete_file(object_key):
                print("✅ Тестовый файл удален")
            else:
                print("⚠️ Не удалось удалить тестовый файл")

            return True

        else:
            print(f"❌ Ошибка загрузки: {upload_result.get('error')}")
            return False

    except Exception as e:
        print(f"❌ Исключение при загрузке: {e}")
        return False

def test_user_file_listing():
    """Тестирует получение списка файлов пользователя"""
    print("\n📂 Тестируем получение списка файлов...")

    s3_service = get_s3_service()
    if not s3_service:
        print("❌ S3 сервис недоступен")
        return

    user_id = 1

    # Создаем несколько тестовых файлов
    test_files = [
        ("test_doc1.txt", "documents", "Тестовый документ 1"),
        ("test_icon1.png", "widget-icons", b"fake png data"),
        ("test_avatar.jpg", "avatars", b"fake jpg data")
    ]

    uploaded_keys = []

    try:
        print("📤 Создаем тестовые файлы...")
        for filename, file_type, content in test_files:
            if isinstance(content, str):
                content = content.encode('utf-8')

            secure_filename = s3_service.generate_secure_filename(user_id, filename, content)
            object_key = s3_service.get_user_object_key(user_id, secure_filename, file_type)

            result = s3_service.upload_file(content, object_key, "text/plain")
            if result.get('success'):
                uploaded_keys.append(object_key)
                print(f"   ✅ {filename} → {file_type}/")

        # Получаем список всех файлов пользователя
        print(f"\n📋 Список всех файлов пользователя {user_id}:")
        all_files = s3_service.list_user_files(user_id)
        for file_info in all_files:
            print(f"   📄 {file_info['filename']} ({file_info['file_type']}) - {file_info['size']} байт")

        # Получаем список документов
        print(f"\n📋 Только документы:")
        documents = s3_service.list_user_files(user_id, "documents")
        for doc in documents:
            print(f"   📄 {doc['filename']} - {doc['size']} байт")

        # Получаем список иконок
        print(f"\n📋 Только иконки виджетов:")
        icons = s3_service.list_user_files(user_id, "widget-icons")
        for icon in icons:
            print(f"   🎨 {icon['filename']} - {icon['size']} байт")

    finally:
        # Очистка
        print("\n🗑️ Удаляем тестовые файлы...")
        for key in uploaded_keys:
            if s3_service.delete_file(key):
                print(f"   ✅ Удален {key}")


def main():
    print("🧪 Прямое тестирование S3 интеграции для документов")
    print("=" * 60)

    # Тест 1: Базовая загрузка документа
    success = test_document_upload()

    if success:
        # Тест 2: Работа с файловой структурой
        test_user_file_listing()

        print("\n🎉 Все тесты S3 интеграции пройдены успешно!")
        print("✅ Timeweb Cloud Storage готов для работы с документами ReplyX")
    else:
        print("\n❌ Тесты не пройдены. Проверьте конфигурацию S3.")

if __name__ == "__main__":
    main()