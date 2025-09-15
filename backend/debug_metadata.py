#!/usr/bin/env python3
"""
Отладка проблемы с метаданными
"""
import os
from dotenv import load_dotenv
from services.s3_storage_service import get_s3_service

# Загружаем переменные окружения
load_dotenv()

def test_metadata_variations():
    """Тестируем различные комбинации метаданных"""
    print("🧪 Тестирование различных метаданных")
    print("=" * 50)
    
    s3_service = get_s3_service()
    test_content = "Test metadata variations"
    content_bytes = test_content.encode('utf-8')
    
    metadata_tests = [
        ("Без метаданных", None),
        ("Только test", {'test': 'true'}),
        ("Только user_id", {'user_id': '1'}),
        ("Только original_filename", {'original_filename': 'test.txt'}),
        ("Только file_type", {'file_type': 'document'}),
        ("user_id + test", {'user_id': '1', 'test': 'true'}),
        ("original_filename + test", {'original_filename': 'test.txt', 'test': 'true'}),
        ("file_type + test", {'file_type': 'document', 'test': 'true'}),
        ("user_id + original_filename", {'user_id': '1', 'original_filename': 'test.txt'}),
        ("user_id + file_type", {'user_id': '1', 'file_type': 'document'}),
        ("original_filename + file_type", {'original_filename': 'test.txt', 'file_type': 'document'}),
        ("Три поля", {'user_id': '1', 'original_filename': 'test.txt', 'file_type': 'document'}),
        ("Все четыре поля", {
            'user_id': '1',
            'original_filename': 'test.txt',
            'file_type': 'document',
            'test': 'true'
        }),
        ("С русскими символами", {'описание': 'тестовый файл', 'пользователь': '1'}),
        ("С пробелами в значениях", {'description': 'test file with spaces', 'user': 'test user'}),
        ("С специальными символами", {'info': 'test@example.com', 'path': '/users/test'}),
    ]
    
    results = []
    
    for test_name, metadata in metadata_tests:
        print(f"\n📝 Тестируем: {test_name}")
        if metadata:
            print(f"   📋 Метаданные: {metadata}")
        
        try:
            # Генерируем уникальный ключ для каждого теста
            object_key = f"debug_metadata/{test_name.replace(' ', '_').lower()}_test.txt"
            
            # Пытаемся загрузить
            upload_result = s3_service.upload_file(
                file_content=content_bytes,
                object_key=object_key,
                content_type="text/plain",
                metadata=metadata
            )
            
            if upload_result.get('success'):
                print(f"   ✅ {test_name}: УСПЕШНО!")
                # Удаляем тестовый файл
                s3_service.s3_client.delete_object(
                    Bucket=s3_service.bucket_name, 
                    Key=object_key
                )
                results.append((test_name, True, None))
            else:
                error = upload_result.get('error', 'Неизвестная ошибка')
                print(f"   ❌ {test_name}: ОШИБКА - {error}")
                results.append((test_name, False, error))
                
        except Exception as e:
            print(f"   ❌ {test_name}: ИСКЛЮЧЕНИЕ - {e}")
            results.append((test_name, False, str(e)))
    
    # Итоги
    print("\n" + "=" * 50)
    print("📊 ИТОГИ ТЕСТИРОВАНИЯ МЕТАДАННЫХ:")
    print("=" * 50)
    
    successful = [r for r in results if r[1]]
    failed = [r for r in results if not r[1]]
    
    if successful:
        print(f"✅ Успешные ({len(successful)}):")
        for test_name, _, _ in successful:
            print(f"   - {test_name}")
    
    if failed:
        print(f"\n❌ Неудачные ({len(failed)}):")
        for test_name, _, error in failed:
            print(f"   - {test_name}: {error}")
    
    return results

def test_metadata_encoding():
    """Тестируем кодировку метаданных"""
    print("\n\n🧪 Тестирование кодировки метаданных")
    print("=" * 50)
    
    s3_service = get_s3_service()
    test_content = "Test metadata encoding"
    content_bytes = test_content.encode('utf-8')
    
    # Тестируем разные способы кодирования
    encoding_tests = [
        ("ASCII только", {'key': 'value', 'number': '123'}),
        ("UTF-8 строка", {'key': 'значение'}),
        ("URL-encoded", {'key': 'value%20with%20spaces'}),
        ("Base64", {'key': 'dGVzdCB2YWx1ZQ=='}),  # "test value" в base64
        ("Экранированные кавычки", {'key': 'value "with quotes"'}),
        ("JSON-like", {'key': '{"nested": "value"}'}),
    ]
    
    results = []
    
    for test_name, metadata in encoding_tests:
        print(f"\n📝 Тестируем кодировку: {test_name}")
        print(f"   📋 Метаданные: {metadata}")
        
        try:
            object_key = f"debug_encoding/{test_name.replace(' ', '_').lower()}_test.txt"
            
            upload_result = s3_service.upload_file(
                file_content=content_bytes,
                object_key=object_key,
                content_type="text/plain",
                metadata=metadata
            )
            
            if upload_result.get('success'):
                print(f"   ✅ {test_name}: УСПЕШНО!")
                s3_service.s3_client.delete_object(
                    Bucket=s3_service.bucket_name, 
                    Key=object_key
                )
                results.append((test_name, True, None))
            else:
                error = upload_result.get('error', 'Неизвестная ошибка')
                print(f"   ❌ {test_name}: ОШИБКА - {error}")
                results.append((test_name, False, error))
                
        except Exception as e:
            print(f"   ❌ {test_name}: ИСКЛЮЧЕНИЕ - {e}")
            results.append((test_name, False, str(e)))
    
    return results

def main():
    """Основная функция"""
    print("🔍 ОТЛАДКА МЕТАДАННЫХ S3")
    print("=" * 60)
    
    # Тестируем различные метаданные
    metadata_results = test_metadata_variations()
    
    # Тестируем кодировку
    encoding_results = test_metadata_encoding()
    
    print("\n" + "=" * 60)
    print("🎯 ОБЩИЕ ВЫВОДЫ:")
    print("=" * 60)
    
    all_failed = [r for r in metadata_results + encoding_results if not r[1]]
    
    if all_failed:
        print("❌ Проблемные метаданные:")
        for test_name, _, error in all_failed:
            print(f"   - {test_name}: {error}")
    else:
        print("✅ Все тесты метаданных прошли успешно!")
    
    # Ищем паттерн в неудачных тестах
    if all_failed:
        print("\n🔍 Анализ ошибок:")
        signature_errors = [r for r in all_failed if 'SignatureDoesNotMatch' in str(r[2])]
        if signature_errors:
            print(f"   📊 Ошибок подписи: {len(signature_errors)} из {len(all_failed)}")
            print("   💡 Возможная причина: некоторые метаданные нарушают подпись запроса")

if __name__ == "__main__":
    main()
