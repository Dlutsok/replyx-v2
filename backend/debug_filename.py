#!/usr/bin/env python3
"""
Отладка проблемы с именами файлов в S3 ключах
"""
import os
from dotenv import load_dotenv
from services.s3_storage_service import get_s3_service

# Загружаем переменные окружения
load_dotenv()

def test_filename_variations():
    """Тестируем разные варианты имен файлов"""
    print("🧪 Тестирование различных имен файлов")
    print("=" * 50)
    
    s3_service = get_s3_service()
    test_content = "Test content"
    content_bytes = test_content.encode('utf-8')
    
    # Варианты имен файлов для тестирования
    filenames = [
        "simple.txt",  # Простое имя
        "test_file.txt",  # С подчеркиванием
        "test-file.txt",  # С дефисом
        "1_20250915_180521_46337eb1c07ab05d.txt",  # Оригинальное сложное имя
        "user_document.txt",  # Еще один вариант
        "файл.txt",  # С русскими символами
        "file with spaces.txt",  # С пробелами
        "file%20encoded.txt",  # С URL-кодированием
    ]
    
    results = []
    
    for filename in filenames:
        print(f"\n📝 Тестируем файл: {filename}")
        
        try:
            # Создаем ключ объекта
            object_key = s3_service.get_user_object_key(1, filename, "documents")
            print(f"   🗂️ Ключ: {object_key}")
            
            # Пытаемся загрузить
            upload_result = s3_service.upload_file(
                file_content=content_bytes,
                object_key=object_key,
                content_type="text/plain",
                metadata={'test': 'filename_debug'}
            )
            
            if upload_result.get('success'):
                print(f"   ✅ {filename}: УСПЕШНО!")
                # Удаляем тестовый файл
                s3_service.s3_client.delete_object(
                    Bucket=s3_service.bucket_name, 
                    Key=object_key
                )
                results.append((filename, True, None))
            else:
                error = upload_result.get('error', 'Неизвестная ошибка')
                print(f"   ❌ {filename}: ОШИБКА - {error}")
                results.append((filename, False, error))
                
        except Exception as e:
            print(f"   ❌ {filename}: ИСКЛЮЧЕНИЕ - {e}")
            results.append((filename, False, str(e)))
    
    # Итоги
    print("\n" + "=" * 50)
    print("📊 ИТОГИ ТЕСТИРОВАНИЯ ИМЕН ФАЙЛОВ:")
    print("=" * 50)
    
    successful = [r for r in results if r[1]]
    failed = [r for r in results if not r[1]]
    
    if successful:
        print(f"✅ Успешные ({len(successful)}):")
        for filename, _, _ in successful:
            print(f"   - {filename}")
    
    if failed:
        print(f"\n❌ Неудачные ({len(failed)}):")
        for filename, _, error in failed:
            print(f"   - {filename}: {error}")
    
    return results

def test_path_variations():
    """Тестируем разные варианты путей"""
    print("\n\n🧪 Тестирование различных путей")
    print("=" * 50)
    
    s3_service = get_s3_service()
    test_content = "Test content"
    content_bytes = test_content.encode('utf-8')
    filename = "test.txt"  # Простое имя файла
    
    # Варианты путей
    paths = [
        "test.txt",  # Без папок
        "folder/test.txt",  # Одна папка
        "users/1/test.txt",  # Как в нашем коде, но короче
        "users/1/documents/test.txt",  # Полный путь как в коде
        "users/1/documents/subdir/test.txt",  # Еще глубже
        "папка/test.txt",  # С русскими символами
        "folder with spaces/test.txt",  # С пробелами в пути
    ]
    
    results = []
    
    for path in paths:
        print(f"\n📁 Тестируем путь: {path}")
        
        try:
            # Пытаемся загрузить напрямую с этим путем
            upload_result = s3_service.upload_file(
                file_content=content_bytes,
                object_key=path,
                content_type="text/plain",
                metadata={'test': 'path_debug'}
            )
            
            if upload_result.get('success'):
                print(f"   ✅ {path}: УСПЕШНО!")
                # Удаляем тестовый файл
                s3_service.s3_client.delete_object(
                    Bucket=s3_service.bucket_name, 
                    Key=path
                )
                results.append((path, True, None))
            else:
                error = upload_result.get('error', 'Неизвестная ошибка')
                print(f"   ❌ {path}: ОШИБКА - {error}")
                results.append((path, False, error))
                
        except Exception as e:
            print(f"   ❌ {path}: ИСКЛЮЧЕНИЕ - {e}")
            results.append((path, False, str(e)))
    
    # Итоги
    print("\n" + "=" * 50)
    print("📊 ИТОГИ ТЕСТИРОВАНИЯ ПУТЕЙ:")
    print("=" * 50)
    
    successful = [r for r in results if r[1]]
    failed = [r for r in results if not r[1]]
    
    if successful:
        print(f"✅ Успешные ({len(successful)}):")
        for path, _, _ in successful:
            print(f"   - {path}")
    
    if failed:
        print(f"\n❌ Неудачные ({len(failed)}):")
        for path, _, error in failed:
            print(f"   - {path}: {error}")
    
    return results

def main():
    """Основная функция"""
    print("🔍 ОТЛАДКА ИМЕН ФАЙЛОВ И ПУТЕЙ")
    print("=" * 60)
    
    # Тестируем имена файлов
    filename_results = test_filename_variations()
    
    # Тестируем пути
    path_results = test_path_variations()
    
    print("\n" + "=" * 60)
    print("🎯 ОБЩИЕ ВЫВОДЫ:")
    print("=" * 60)
    
    # Анализируем результаты
    all_successful_filenames = [r[0] for r in filename_results if r[1]]
    all_failed_filenames = [r[0] for r in filename_results if not r[1]]
    
    all_successful_paths = [r[0] for r in path_results if r[1]]
    all_failed_paths = [r[0] for r in path_results if not r[1]]
    
    if all_failed_filenames:
        print("❌ Проблемные имена файлов:")
        for name in all_failed_filenames:
            print(f"   - {name}")
    
    if all_failed_paths:
        print("❌ Проблемные пути:")
        for path in all_failed_paths:
            print(f"   - {path}")
    
    if not all_failed_filenames and not all_failed_paths:
        print("✅ Все тесты прошли успешно!")
    else:
        print("⚠️ Найдены проблемы - см. детали выше")

if __name__ == "__main__":
    main()
