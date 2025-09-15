#!/usr/bin/env python3
"""
🔧 ТЕСТ СОВМЕСТИМОСТИ С TIMEWEB CLOUD STORAGE
=============================================

Специфические тесты для Timeweb Cloud:
- Проверка метаданных с дефисами
- Тест различных конфигураций S3
- Проверка подписей запросов
- Валидация структуры бакета
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

import tempfile
from datetime import datetime
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv(dotenv_path="../.env")

class TimwebCompatibilityTester:
    def __init__(self):
        self.test_results = []
        
    def log_result(self, test_name, success, details=None, error=None):
        """Логирует результат теста"""
        result = {
            'test': test_name,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'details': details,
            'error': str(error) if error else None
        }
        self.test_results.append(result)
        
        status = "✅ УСПЕШНО" if success else "❌ ОШИБКА"
        print(f"{status}: {test_name}")
        if details:
            print(f"   📋 {details}")
        if error:
            print(f"   🚨 {error}")
        print()
    
    def test_s3_service_initialization(self):
        """Тестирует инициализацию S3 сервиса"""
        print("🔧 ТЕСТ ИНИЦИАЛИЗАЦИИ S3 СЕРВИСА")
        print("=" * 50)
        
        try:
            from services.s3_storage_service import get_s3_service
            
            s3_service = get_s3_service()
            if s3_service:
                self.log_result(
                    "Инициализация S3 сервиса", 
                    True, 
                    f"Бакет: {s3_service.bucket_name}, Endpoint: {s3_service.endpoint_url}"
                )
                return s3_service
            else:
                self.log_result("Инициализация S3 сервиса", False, "Сервис не инициализирован")
                return None
                
        except Exception as e:
            self.log_result("Инициализация S3 сервиса", False, error=e)
            return None
    
    def test_metadata_with_dashes(self, s3_service):
        """Тестирует метаданные с дефисами (исправление для Timeweb)"""
        print("🏷️ ТЕСТ МЕТАДАННЫХ С ДЕФИСАМИ")
        print("=" * 50)
        
        if not s3_service:
            self.log_result("Метаданные с дефисами", False, "S3 сервис недоступен")
            return
        
        try:
            # Создаем тестовый файл
            test_content = b"Test metadata with dashes"
            object_key = "test/metadata_test.txt"
            
            # Метаданные с дефисами (рабочий вариант)
            good_metadata = {
                'user-id': '123',
                'file-type': 'test',
                'original-filename': 'test.txt'
            }
            
            # Загружаем с правильными метаданными
            upload_result = s3_service.upload_file(
                file_content=test_content,
                object_key=object_key,
                content_type='text/plain',
                metadata=good_metadata
            )
            
            if upload_result.get('success'):
                self.log_result(
                    "Загрузка с метаданными (дефисы)", 
                    True, 
                    f"Файл загружен: {object_key}"
                )
                
                # Удаляем тестовый файл
                try:
                    s3_service.s3_client.delete_object(
                        Bucket=s3_service.bucket_name,
                        Key=object_key
                    )
                    self.log_result("Очистка тестового файла", True)
                except:
                    pass
                    
            else:
                self.log_result(
                    "Загрузка с метаданными (дефисы)", 
                    False, 
                    upload_result.get('error')
                )
            
            # Теперь тестируем проблемные метаданные с подчеркиваниями
            bad_metadata = {
                'user_id': '123',  # Это должно вызвать ошибку
                'file_type': 'test',
                'original_filename': 'test.txt'
            }
            
            object_key_bad = "test/metadata_bad_test.txt"
            
            upload_result_bad = s3_service.upload_file(
                file_content=test_content,
                object_key=object_key_bad,
                content_type='text/plain',
                metadata=bad_metadata
            )
            
            if upload_result_bad.get('success'):
                self.log_result(
                    "Загрузка с метаданными (подчеркивания)", 
                    False, 
                    "Неожиданно успешно - подчеркивания должны вызывать ошибку"
                )
                # Удаляем если случайно загрузилось
                try:
                    s3_service.s3_client.delete_object(
                        Bucket=s3_service.bucket_name,
                        Key=object_key_bad
                    )
                except:
                    pass
            else:
                self.log_result(
                    "Загрузка с метаданными (подчеркивания)", 
                    True, 
                    f"Правильно заблокировано: {upload_result_bad.get('error')}"
                )
                
        except Exception as e:
            self.log_result("Тест метаданных", False, error=e)
    
    def test_file_naming_conventions(self, s3_service):
        """Тестирует конвенции именования файлов"""
        print("📝 ТЕСТ КОНВЕНЦИЙ ИМЕНОВАНИЯ ФАЙЛОВ")
        print("=" * 50)
        
        if not s3_service:
            self.log_result("Конвенции именования", False, "S3 сервис недоступен")
            return
        
        try:
            # Тестируем генерацию безопасных имен файлов
            test_content = b"Test file naming"
            user_id = 999
            
            # Тест для документа
            doc_filename = s3_service.generate_secure_filename(
                user_id=user_id,
                original_filename="тест файл.txt",
                content=test_content
            )
            
            self.log_result(
                "Генерация имени документа", 
                True, 
                f"Результат: {doc_filename}"
            )
            
            # Тест для иконки виджета
            icon_filename = s3_service.generate_widget_icon_filename(
                user_id=user_id,
                original_filename="icon with spaces.png",
                content=test_content
            )
            
            self.log_result(
                "Генерация имени иконки", 
                True, 
                f"Результат: {icon_filename}"
            )
            
            # Тест структуры ключей объектов
            doc_key = s3_service.get_user_object_key(user_id, doc_filename, "documents")
            avatar_key = s3_service.get_user_object_key(user_id, "avatar.jpg", "avatars")
            icon_key = s3_service.get_user_object_key(user_id, icon_filename, "widget-icons")
            
            expected_patterns = [
                f"users/{user_id}/documents/",
                f"users/{user_id}/avatars/",
                f"users/{user_id}/widget-icons/"
            ]
            
            keys = [doc_key, avatar_key, icon_key]
            names = ["документа", "аватара", "иконки"]
            
            for i, (key, pattern, name) in enumerate(zip(keys, expected_patterns, names)):
                if key.startswith(pattern):
                    self.log_result(
                        f"Структура ключа {name}", 
                        True, 
                        f"Ключ: {key}"
                    )
                else:
                    self.log_result(
                        f"Структура ключа {name}", 
                        False, 
                        f"Ожидался префикс {pattern}, получен {key}"
                    )
                    
        except Exception as e:
            self.log_result("Тест именования файлов", False, error=e)
    
    def test_connection_configurations(self):
        """Тестирует различные конфигурации подключения"""
        print("⚙️ ТЕСТ КОНФИГУРАЦИЙ ПОДКЛЮЧЕНИЯ")
        print("=" * 50)
        
        try:
            import boto3
            from botocore.config import Config
            
            # Получаем настройки из переменных окружения
            access_key = os.getenv('S3_ACCESS_KEY_ID')
            secret_key = os.getenv('S3_SECRET_ACCESS_KEY')
            endpoint_url = os.getenv('S3_ENDPOINT_URL')
            region = os.getenv('S3_REGION')
            bucket_name = os.getenv('S3_BUCKET_NAME')
            
            if not all([access_key, secret_key, endpoint_url, region, bucket_name]):
                self.log_result("Проверка переменных окружения", False, "Не все переменные S3 настроены")
                return
            
            self.log_result(
                "Проверка переменных окружения", 
                True, 
                f"Endpoint: {endpoint_url}, Region: {region}"
            )
            
            # Тестируем конфигурацию, которая работает с Timeweb
            try:
                s3_client = boto3.client(
                    's3',
                    endpoint_url=endpoint_url,
                    region_name=region,
                    aws_access_key_id=access_key,
                    aws_secret_access_key=secret_key,
                    config=Config(
                        s3={
                            'addressing_style': 'path',
                            'signature_version': 's3v4'
                        },
                        region_name=region
                    )
                )
                
                # Простой тест - получение списка объектов
                response = s3_client.list_objects_v2(
                    Bucket=bucket_name,
                    MaxKeys=1
                )
                
                self.log_result(
                    "Тест конфигурации Timeweb", 
                    True, 
                    f"Подключение успешно, найдено объектов: {response.get('KeyCount', 0)}"
                )
                
            except Exception as e:
                self.log_result("Тест конфигурации Timeweb", False, error=e)
                
        except Exception as e:
            self.log_result("Тест конфигураций", False, error=e)
    
    def test_bucket_permissions(self, s3_service):
        """Тестирует права доступа к бакету"""
        print("🔒 ТЕСТ ПРАВ ДОСТУПА К БАКЕТУ")
        print("=" * 50)
        
        if not s3_service:
            self.log_result("Права доступа", False, "S3 сервис недоступен")
            return
        
        try:
            # Тест чтения
            try:
                response = s3_service.s3_client.list_objects_v2(
                    Bucket=s3_service.bucket_name,
                    MaxKeys=1
                )
                self.log_result("Права на чтение", True, "Список объектов получен")
            except Exception as e:
                self.log_result("Права на чтение", False, error=e)
            
            # Тест записи (создание тестового файла)
            try:
                test_key = "test/permissions_test.txt"
                s3_service.s3_client.put_object(
                    Bucket=s3_service.bucket_name,
                    Key=test_key,
                    Body=b"Permission test",
                    ContentType="text/plain"
                )
                self.log_result("Права на запись", True, "Тестовый файл создан")
                
                # Тест удаления
                s3_service.s3_client.delete_object(
                    Bucket=s3_service.bucket_name,
                    Key=test_key
                )
                self.log_result("Права на удаление", True, "Тестовый файл удален")
                
            except Exception as e:
                self.log_result("Права на запись/удаление", False, error=e)
                
        except Exception as e:
            self.log_result("Тест прав доступа", False, error=e)
    
    def generate_report(self):
        """Генерирует отчет о совместимости"""
        print("\n" + "=" * 70)
        print("📊 ОТЧЕТ О СОВМЕСТИМОСТИ С TIMEWEB CLOUD")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - successful_tests
        
        print(f"📈 Всего тестов: {total_tests}")
        print(f"✅ Успешных: {successful_tests}")
        print(f"❌ Неудачных: {failed_tests}")
        print(f"📊 Совместимость: {(successful_tests/total_tests*100):.1f}%")
        
        # Анализ результатов
        if failed_tests == 0:
            print("\n🎉 ПОЛНАЯ СОВМЕСТИМОСТЬ С TIMEWEB CLOUD!")
        elif failed_tests <= 2:
            print("\n⚠️ Хорошая совместимость с незначительными проблемами")
        else:
            print("\n🚨 Обнаружены серьезные проблемы совместимости")
        
        if failed_tests > 0:
            print(f"\n❌ ПРОБЛЕМЫ:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['error']}")
        
        return failed_tests == 0
    
    def run_all_tests(self):
        """Запускает все тесты совместимости"""
        print("🔧 ТЕСТИРОВАНИЕ СОВМЕСТИМОСТИ С TIMEWEB CLOUD")
        print("=" * 70)
        print(f"🕒 Время начала: {datetime.now()}")
        print()
        
        # Инициализация
        s3_service = self.test_s3_service_initialization()
        
        # Основные тесты
        self.test_connection_configurations()
        self.test_metadata_with_dashes(s3_service)
        self.test_file_naming_conventions(s3_service)
        self.test_bucket_permissions(s3_service)
        
        # Генерируем отчет
        return self.generate_report()

def main():
    """Основная функция"""
    print("🔧 TIMEWEB CLOUD COMPATIBILITY TESTER")
    print("=" * 70)
    print("Тестирует совместимость с Timeweb Cloud Storage")
    print()
    
    tester = TimwebCompatibilityTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ПОЛНАЯ СОВМЕСТИМОСТЬ ПОДТВЕРЖДЕНА!")
        exit(0)
    else:
        print("\n💥 ОБНАРУЖЕНЫ ПРОБЛЕМЫ СОВМЕСТИМОСТИ!")
        exit(1)

if __name__ == "__main__":
    main()
