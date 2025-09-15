#!/usr/bin/env python3
"""
Точное воспроизведение проблемного кода
"""
import os
from dotenv import load_dotenv
from services.s3_storage_service import get_s3_service

# Загружаем переменные окружения
load_dotenv()

def test_exact_reproduction():
    """Точно воспроизводим код из test_document_upload.py"""
    print("🧪 Точное воспроизведение проблемного кода")
    print("=" * 50)
    
    try:
        # Получаем S3 сервис точно так же
        s3_service = get_s3_service()
        print("✅ S3 сервис инициализирован")
        
        # Создаем тестовые данные точно так же
        user_id = 1
        original_filename = "test_document.txt"
        test_content = "Это тестовый документ для проверки S3 интеграции.\nВторая строка.\nТретья строка."
        content_bytes = test_content.encode('utf-8')
        
        # Генерируем безопасное имя файла точно так же
        secure_filename = s3_service.generate_secure_filename(
            user_id=user_id,
            original_filename=original_filename,
            content=content_bytes
        )
        print(f"🔒 Сгенерировано безопасное имя: {secure_filename}")
        
        # Получаем ключ объекта точно так же
        object_key = s3_service.get_user_object_key(
            user_id,
            secure_filename,
            "documents"
        )
        print(f"🗂️ Ключ объекта: {object_key}")
        
        # Загружаем файл точно так же
        upload_result = s3_service.upload_file(
            file_content=content_bytes,
            object_key=object_key,
            content_type="text/plain",
            metadata={
                'user_id': str(user_id),
                'original_filename': original_filename,
                'file_type': 'document',
                'test': 'true'
            }
        )
        
        if upload_result.get('success'):
            print("✅ Точное воспроизведение: УСПЕШНО!")
            print(f"   📄 Имя файла: {secure_filename}")
            print(f"   🔗 URL: {upload_result.get('url')}")
            print(f"   📏 Размер: {upload_result.get('size')} байт")
            
            # Удаляем тестовый файл
            s3_service.s3_client.delete_object(
                Bucket=s3_service.bucket_name, 
                Key=object_key
            )
            return True
        else:
            print(f"❌ Точное воспроизведение: ОШИБКА - {upload_result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Точное воспроизведение: ИСКЛЮЧЕНИЕ - {e}")
        import traceback
        traceback.print_exc()
        return False

def test_without_metadata():
    """Тест без метаданных"""
    print("\n🧪 Тест без метаданных")
    print("=" * 30)
    
    try:
        s3_service = get_s3_service()
        user_id = 1
        original_filename = "test_document.txt"
        test_content = "Test without metadata"
        content_bytes = test_content.encode('utf-8')
        
        secure_filename = s3_service.generate_secure_filename(
            user_id=user_id,
            original_filename=original_filename,
            content=content_bytes
        )
        object_key = s3_service.get_user_object_key(user_id, secure_filename, "documents")
        
        print(f"🗂️ Ключ объекта: {object_key}")
        
        # Загружаем БЕЗ метаданных
        upload_result = s3_service.upload_file(
            file_content=content_bytes,
            object_key=object_key,
            content_type="text/plain"
            # metadata=None - не передаем вообще
        )
        
        if upload_result.get('success'):
            print("✅ Без метаданных: УСПЕШНО!")
            s3_service.s3_client.delete_object(Bucket=s3_service.bucket_name, Key=object_key)
            return True
        else:
            print(f"❌ Без метаданных: ОШИБКА - {upload_result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Без метаданных: ИСКЛЮЧЕНИЕ - {e}")
        return False

def test_with_minimal_metadata():
    """Тест с минимальными метаданными"""
    print("\n🧪 Тест с минимальными метаданными")
    print("=" * 40)
    
    try:
        s3_service = get_s3_service()
        user_id = 1
        original_filename = "test_document.txt"
        test_content = "Test with minimal metadata"
        content_bytes = test_content.encode('utf-8')
        
        secure_filename = s3_service.generate_secure_filename(
            user_id=user_id,
            original_filename=original_filename,
            content=content_bytes
        )
        object_key = s3_service.get_user_object_key(user_id, secure_filename, "documents")
        
        print(f"🗂️ Ключ объекта: {object_key}")
        
        # Загружаем с минимальными метаданными
        upload_result = s3_service.upload_file(
            file_content=content_bytes,
            object_key=object_key,
            content_type="text/plain",
            metadata={'test': 'minimal'}
        )
        
        if upload_result.get('success'):
            print("✅ С минимальными метаданными: УСПЕШНО!")
            s3_service.s3_client.delete_object(Bucket=s3_service.bucket_name, Key=object_key)
            return True
        else:
            print(f"❌ С минимальными метаданными: ОШИБКА - {upload_result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ С минимальными метаданными: ИСКЛЮЧЕНИЕ - {e}")
        return False

def main():
    """Основная функция"""
    print("🔍 ТОЧНАЯ ОТЛАДКА ПРОБЛЕМЫ")
    print("=" * 40)
    
    results = []
    
    # Точное воспроизведение
    results.append(("Точное воспроизведение", test_exact_reproduction()))
    
    # Без метаданных
    results.append(("Без метаданных", test_without_metadata()))
    
    # С минимальными метаданными
    results.append(("Минимальные метаданные", test_with_minimal_metadata()))
    
    # Итоги
    print("\n" + "=" * 40)
    print("📊 ИТОГИ:")
    print("=" * 40)
    
    for test_name, success in results:
        status = "✅ УСПЕШНО" if success else "❌ ОШИБКА"
        print(f"   {test_name}: {status}")

if __name__ == "__main__":
    main()
