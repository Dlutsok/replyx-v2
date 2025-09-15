#!/usr/bin/env python3
"""
Отладка S3StorageService vs прямой boto3 клиент
"""
import tempfile
import os
from dotenv import load_dotenv
from services.s3_storage_service import get_s3_service
import boto3
from botocore.config import Config

# Загружаем переменные окружения
load_dotenv()

def test_direct_boto3():
    """Прямой тест с boto3 как в рабочем скрипте"""
    print("🧪 Тест с прямым boto3 клиентом")
    print("=" * 40)
    
    try:
        # Создаем клиент точно как в рабочем скрипте
        s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('S3_ENDPOINT_URL'),
            region_name=os.getenv('S3_REGION'),
            aws_access_key_id=os.getenv('S3_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('S3_SECRET_ACCESS_KEY'),
            config=Config(
                s3={'addressing_style': 'path', 'signature_version': 's3v4'},
                region_name=os.getenv('S3_REGION')
            )
        )
        
        # Создаем тестовый файл
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write("Test content for direct boto3")
            temp_file = f.name
        
        bucket_name = os.getenv('S3_BUCKET_NAME')
        test_key = "debug/direct_boto3_test.txt"
        
        print(f"📤 Загружаем файл с ключом: {test_key}")
        
        with open(temp_file, 'rb') as f:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=test_key,
                Body=f,
                ContentType='text/plain'
            )
        
        print("✅ Прямой boto3: УСПЕШНО!")
        
        # Удаляем тестовый файл
        s3_client.delete_object(Bucket=bucket_name, Key=test_key)
        os.unlink(temp_file)
        return True
        
    except Exception as e:
        print(f"❌ Прямой boto3: ОШИБКА - {e}")
        if 'temp_file' in locals():
            try:
                os.unlink(temp_file)
            except:
                pass
        return False

def test_s3_storage_service():
    """Тест через S3StorageService"""
    print("\n🧪 Тест через S3StorageService")
    print("=" * 40)
    
    try:
        # Получаем S3 сервис
        s3_service = get_s3_service()
        print("✅ S3 сервис инициализирован")
        
        # Создаем тестовое содержимое
        test_content = "Test content for S3StorageService"
        content_bytes = test_content.encode('utf-8')
        
        # Используем простой ключ без сложной генерации
        object_key = "debug/s3_storage_service_test.txt"
        print(f"📤 Загружаем файл с ключом: {object_key}")
        
        # Загружаем файл через наш сервис
        upload_result = s3_service.upload_file(
            file_content=content_bytes,
            object_key=object_key,
            content_type="text/plain",
            metadata={
                'test': 'true',
                'method': 'S3StorageService'
            }
        )
        
        if upload_result.get('success'):
            print("✅ S3StorageService: УСПЕШНО!")
            print(f"   📄 URL: {upload_result.get('url')}")
            print(f"   📏 Размер: {upload_result.get('size')} байт")
            
            # Удаляем тестовый файл
            s3_service.s3_client.delete_object(
                Bucket=s3_service.bucket_name, 
                Key=object_key
            )
            return True
        else:
            print(f"❌ S3StorageService: ОШИБКА - {upload_result.get('error')}")
            return False
        
    except Exception as e:
        print(f"❌ S3StorageService: ИСКЛЮЧЕНИЕ - {e}")
        return False

def test_s3_service_with_complex_key():
    """Тест через S3StorageService со сложным ключом как в основном коде"""
    print("\n🧪 Тест через S3StorageService со сложным ключом")
    print("=" * 50)
    
    try:
        # Получаем S3 сервис
        s3_service = get_s3_service()
        print("✅ S3 сервис инициализирован")
        
        # Создаем тестовое содержимое
        test_content = "Test content with complex key"
        content_bytes = test_content.encode('utf-8')
        
        # Используем сложный ключ как в основном коде
        user_id = 1
        secure_filename = "1_20250915_180521_46337eb1c07ab05d.txt"
        object_key = s3_service.get_user_object_key(
            user_id,
            secure_filename,
            "documents"
        )
        print(f"📤 Загружаем файл с ключом: {object_key}")
        
        # Загружаем файл через наш сервис
        upload_result = s3_service.upload_file(
            file_content=content_bytes,
            object_key=object_key,
            content_type="text/plain",
            metadata={
                'user_id': str(user_id),
                'original_filename': 'test.txt',
                'file_type': 'document',
                'test': 'true'
            }
        )
        
        if upload_result.get('success'):
            print("✅ S3StorageService со сложным ключом: УСПЕШНО!")
            print(f"   📄 URL: {upload_result.get('url')}")
            print(f"   📏 Размер: {upload_result.get('size')} байт")
            
            # Удаляем тестовый файл
            s3_service.s3_client.delete_object(
                Bucket=s3_service.bucket_name, 
                Key=object_key
            )
            return True
        else:
            print(f"❌ S3StorageService со сложным ключом: ОШИБКА - {upload_result.get('error')}")
            return False
        
    except Exception as e:
        print(f"❌ S3StorageService со сложным ключом: ИСКЛЮЧЕНИЕ - {e}")
        return False

def main():
    """Основная функция"""
    print("🔍 ОТЛАДКА S3 КОНФИГУРАЦИИ")
    print("=" * 50)
    
    results = []
    
    # Тест 1: Прямой boto3
    results.append(("Прямой boto3", test_direct_boto3()))
    
    # Тест 2: S3StorageService с простым ключом
    results.append(("S3StorageService (простой)", test_s3_storage_service()))
    
    # Тест 3: S3StorageService со сложным ключом
    results.append(("S3StorageService (сложный)", test_s3_service_with_complex_key()))
    
    # Итоги
    print("\n" + "=" * 50)
    print("📊 ИТОГИ:")
    print("=" * 50)
    
    for test_name, success in results:
        status = "✅ УСПЕШНО" if success else "❌ ОШИБКА"
        print(f"   {test_name}: {status}")

if __name__ == "__main__":
    main()
