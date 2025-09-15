#!/usr/bin/env python3
"""
Отладка проблемы с подчеркиваниями в ключах метаданных
"""
import os
from dotenv import load_dotenv
from services.s3_storage_service import get_s3_service

# Загружаем переменные окружения
load_dotenv()

def test_underscore_hypothesis():
    """Тестируем гипотезу с подчеркиваниями"""
    print("🧪 Тестирование гипотезы с подчеркиваниями")
    print("=" * 50)
    
    s3_service = get_s3_service()
    test_content = "Test underscore hypothesis"
    content_bytes = test_content.encode('utf-8')
    
    # Тестируем различные варианты ключей
    test_cases = [
        # Проблемные ключи из предыдущего теста
        ("user_id (подчеркивание)", {'user_id': '1'}),
        ("original_filename (подчеркивание)", {'original_filename': 'test.txt'}),
        ("file_type (подчеркивание)", {'file_type': 'document'}),
        
        # Те же ключи без подчеркиваний
        ("userid (без подчеркивания)", {'userid': '1'}),
        ("originalfilename (без подчеркивания)", {'originalfilename': 'test.txt'}),
        ("filetype (без подчеркивания)", {'filetype': 'document'}),
        
        # Те же ключи с дефисами
        ("user-id (дефис)", {'user-id': '1'}),
        ("original-filename (дефис)", {'original-filename': 'test.txt'}),
        ("file-type (дефис)", {'file-type': 'document'}),
        
        # Те же ключи с camelCase
        ("userId (camelCase)", {'userId': '1'}),
        ("originalFilename (camelCase)", {'originalFilename': 'test.txt'}),
        ("fileType (camelCase)", {'fileType': 'document'}),
        
        # Другие ключи с подчеркиваниями для проверки
        ("test_key (подчеркивание)", {'test_key': 'value'}),
        ("some_data (подчеркивание)", {'some_data': 'data'}),
        ("my_field (подчеркивание)", {'my_field': 'field'}),
        
        # Комбинация рабочих ключей без подчеркиваний
        ("Все без подчеркиваний", {
            'userid': '1',
            'originalfilename': 'test.txt',
            'filetype': 'document',
            'test': 'true'
        }),
        
        # Комбинация с дефисами
        ("Все с дефисами", {
            'user-id': '1',
            'original-filename': 'test.txt',
            'file-type': 'document',
            'test': 'true'
        }),
    ]
    
    results = []
    
    for test_name, metadata in test_cases:
        print(f"\n📝 Тестируем: {test_name}")
        print(f"   📋 Метаданные: {metadata}")
        
        try:
            object_key = f"debug_underscore/{test_name.replace(' ', '_').replace('(', '').replace(')', '').lower()}_test.txt"
            
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
    
    # Анализ результатов
    print("\n" + "=" * 50)
    print("📊 АНАЛИЗ РЕЗУЛЬТАТОВ:")
    print("=" * 50)
    
    successful = [r for r in results if r[1]]
    failed = [r for r in results if not r[1]]
    
    print(f"✅ Успешные ({len(successful)}):")
    for test_name, _, _ in successful:
        print(f"   - {test_name}")
    
    if failed:
        print(f"\n❌ Неудачные ({len(failed)}):")
        for test_name, _, error in failed:
            print(f"   - {test_name}")
    
    # Проверяем гипотезу
    underscore_failed = [r for r in failed if '_' in str(r[0]) and 'подчеркивание' in str(r[0])]
    underscore_successful = [r for r in successful if '_' in str(r[0]) and 'подчеркивание' in str(r[0])]
    
    print(f"\n🔍 ПРОВЕРКА ГИПОТЕЗЫ О ПОДЧЕРКИВАНИЯХ:")
    print(f"   📊 Тесты с подчеркиваниями - неудачные: {len(underscore_failed)}")
    print(f"   📊 Тесты с подчеркиваниями - успешные: {len(underscore_successful)}")
    
    if len(underscore_failed) > len(underscore_successful):
        print("   💡 ПОДТВЕРЖДЕНО: Подчеркивания в ключах метаданных вызывают проблемы!")
    else:
        print("   ❓ Гипотеза не подтверждена, нужно искать другую причину")
    
    return results

def main():
    """Основная функция"""
    print("🔍 ОТЛАДКА ПОДЧЕРКИВАНИЙ В МЕТАДАННЫХ")
    print("=" * 60)
    
    results = test_underscore_hypothesis()
    
    print("\n" + "=" * 60)
    print("🎯 РЕКОМЕНДАЦИИ:")
    print("=" * 60)
    
    failed = [r for r in results if not r[1]]
    if any('подчеркивание' in r[0] for r in failed):
        print("💡 Используйте ключи метаданных БЕЗ подчеркиваний:")
        print("   - user_id → userid или user-id")
        print("   - original_filename → originalfilename или original-filename")
        print("   - file_type → filetype или file-type")

if __name__ == "__main__":
    main()
