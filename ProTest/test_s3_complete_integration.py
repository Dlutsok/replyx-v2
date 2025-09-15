#!/usr/bin/env python3
"""
🧪 ПОЛНЫЙ ИНТЕГРАЦИОННЫЙ ТЕСТ S3 СИСТЕМЫ
==========================================

Тестирует всю реализацию S3:
- Загрузку документов
- Загрузку аватаров
- Загрузку иконок виджетов
- Proxy endpoints
- Структуру папок
- Метаданные
- CORS и доступность файлов
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

import requests
import tempfile
import json
from datetime import datetime
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv(dotenv_path="../.env")

class S3IntegrationTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
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
            print(f"   📋 Детали: {details}")
        if error:
            print(f"   🚨 Ошибка: {error}")
        print()
    
    def authenticate(self):
        """Аутентификация в системе"""
        print("🔐 АУТЕНТИФИКАЦИЯ")
        print("=" * 50)
        
        try:
            # Пробуем войти (замените на реальные данные)
            login_data = {
                "username": "test@example.com",  # Замените на реальный email
                "password": "your_password"      # Замените на реальный пароль
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                data=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get('access_token')
                if token:
                    self.session.headers.update({'Authorization': f'Bearer {token}'})
                    self.log_result("Аутентификация", True, f"Токен получен: {token[:20]}...")
                    return True
            
            self.log_result("Аутентификация", False, f"Статус: {response.status_code}")
            return False
            
        except Exception as e:
            self.log_result("Аутентификация", False, error=e)
            return False
    
    def test_document_upload(self):
        """Тестирует загрузку документов"""
        print("📄 ТЕСТ ЗАГРУЗКИ ДОКУМЕНТОВ")
        print("=" * 50)
        
        try:
            # Создаем тестовый документ
            test_content = f"Тестовый документ для S3\nВремя создания: {datetime.now()}\nТест интеграции S3"
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write(test_content)
                temp_path = f.name
            
            try:
                with open(temp_path, 'rb') as f:
                    files = {'file': ('test_document.txt', f, 'text/plain')}
                    
                    response = self.session.post(
                        f"{self.base_url}/api/documents",
                        files=files
                    )
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_result(
                        "Загрузка документа", 
                        True, 
                        f"ID: {data.get('id')}, Размер: {data.get('size')} байт"
                    )
                    return data
                else:
                    self.log_result(
                        "Загрузка документа", 
                        False, 
                        f"HTTP {response.status_code}: {response.text}"
                    )
                    
            finally:
                os.unlink(temp_path)
                
        except Exception as e:
            self.log_result("Загрузка документа", False, error=e)
        
        return None
    
    def test_avatar_upload(self):
        """Тестирует загрузку аватаров"""
        print("🖼️ ТЕСТ ЗАГРУЗКИ АВАТАРОВ")
        print("=" * 50)
        
        try:
            # Создаем простое изображение (1x1 PNG)
            png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
            
            files = {'file': ('test_avatar.png', png_data, 'image/png')}
            
            response = self.session.post(
                f"{self.base_url}/api/upload/avatar",
                files=files
            )
            
            if response.status_code == 200:
                data = response.json()
                avatar_url = data.get('url')
                s3_url = data.get('s3_url')
                
                self.log_result(
                    "Загрузка аватара", 
                    True, 
                    f"URL: {avatar_url}, S3: {s3_url}"
                )
                
                # Тестируем доступность через proxy
                if avatar_url:
                    self.test_avatar_accessibility(avatar_url)
                
                return data
            else:
                self.log_result(
                    "Загрузка аватара", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result("Загрузка аватара", False, error=e)
        
        return None
    
    def test_avatar_accessibility(self, avatar_url):
        """Тестирует доступность аватара через proxy"""
        try:
            full_url = f"{self.base_url}{avatar_url}"
            response = requests.get(full_url, timeout=10)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                
                self.log_result(
                    "Доступность аватара через proxy", 
                    True, 
                    f"Тип: {content_type}, Размер: {content_length} байт"
                )
            else:
                self.log_result(
                    "Доступность аватара через proxy", 
                    False, 
                    f"HTTP {response.status_code}"
                )
                
        except Exception as e:
            self.log_result("Доступность аватара через proxy", False, error=e)
    
    def test_widget_icon_upload(self):
        """Тестирует загрузку иконок виджетов"""
        print("🎨 ТЕСТ ЗАГРУЗКИ ИКОНОК ВИДЖЕТОВ")
        print("=" * 50)
        
        try:
            # Создаем простое изображение (1x1 PNG)
            png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
            
            files = {'file': ('test_widget_icon.png', png_data, 'image/png')}
            
            response = self.session.post(
                f"{self.base_url}/api/widget-icons/upload",
                files=files
            )
            
            if response.status_code == 200:
                data = response.json()
                icon_url = data.get('url')
                s3_url = data.get('s3_url')
                
                self.log_result(
                    "Загрузка иконки виджета", 
                    True, 
                    f"URL: {icon_url}, S3: {s3_url}"
                )
                
                # Тестируем доступность через proxy
                if icon_url:
                    self.test_widget_icon_accessibility(icon_url)
                
                return data
            else:
                self.log_result(
                    "Загрузка иконки виджета", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                
        except Exception as e:
            self.log_result("Загрузка иконки виджета", False, error=e)
        
        return None
    
    def test_widget_icon_accessibility(self, icon_url):
        """Тестирует доступность иконки виджета через proxy"""
        try:
            full_url = f"{self.base_url}{icon_url}"
            response = requests.get(full_url, timeout=10)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                
                self.log_result(
                    "Доступность иконки через proxy", 
                    True, 
                    f"Тип: {content_type}, Размер: {content_length} байт"
                )
            else:
                self.log_result(
                    "Доступность иконки через proxy", 
                    False, 
                    f"HTTP {response.status_code}"
                )
                
        except Exception as e:
            self.log_result("Доступность иконки через proxy", False, error=e)
    
    def test_s3_structure(self):
        """Тестирует структуру папок в S3"""
        print("📁 ТЕСТ СТРУКТУРЫ ПАПОК S3")
        print("=" * 50)
        
        try:
            # Импортируем S3 сервис напрямую для проверки структуры
            sys.path.append('../backend')
            from services.s3_storage_service import get_s3_service
            
            s3_service = get_s3_service()
            if not s3_service:
                self.log_result("Инициализация S3 сервиса", False, "S3 сервис недоступен")
                return
            
            self.log_result("Инициализация S3 сервиса", True, f"Бакет: {s3_service.bucket_name}")
            
            # Проверяем структуру папок для пользователя
            user_id = 6  # Замените на реальный ID пользователя
            
            # Проверяем папки documents, avatars, widget-icons
            folders = ['documents', 'avatars', 'widget-icons']
            
            for folder in folders:
                try:
                    files = s3_service.list_user_files(user_id, folder)
                    self.log_result(
                        f"Папка {folder}", 
                        True, 
                        f"Найдено файлов: {len(files)}"
                    )
                    
                    # Показываем первые несколько файлов
                    if files:
                        for i, file_info in enumerate(files[:3]):
                            print(f"     📄 {file_info.get('filename')} ({file_info.get('size')} байт)")
                        if len(files) > 3:
                            print(f"     ... и еще {len(files) - 3} файлов")
                    
                except Exception as e:
                    self.log_result(f"Папка {folder}", False, error=e)
            
        except Exception as e:
            self.log_result("Тест структуры S3", False, error=e)
    
    def test_cors_headers(self):
        """Тестирует CORS заголовки"""
        print("🌐 ТЕСТ CORS ЗАГОЛОВКОВ")
        print("=" * 50)
        
        try:
            # Тестируем CORS для файлового endpoint
            response = requests.options(
                f"{self.base_url}/api/files/avatars/1/test.png",
                headers={
                    'Origin': 'http://localhost:3000',
                    'Access-Control-Request-Method': 'GET'
                }
            )
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            }
            
            self.log_result(
                "CORS заголовки", 
                True, 
                f"Заголовки: {cors_headers}"
            )
            
        except Exception as e:
            self.log_result("CORS заголовки", False, error=e)
    
    def generate_report(self):
        """Генерирует финальный отчет"""
        print("\n" + "=" * 70)
        print("📊 ФИНАЛЬНЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ S3")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r['success']])
        failed_tests = total_tests - successful_tests
        
        print(f"📈 Всего тестов: {total_tests}")
        print(f"✅ Успешных: {successful_tests}")
        print(f"❌ Неудачных: {failed_tests}")
        print(f"📊 Успешность: {(successful_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ НЕУДАЧНЫЕ ТЕСТЫ:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['error']}")
        
        # Сохраняем детальный отчет
        report_file = f"s3_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2)
        
        print(f"\n📄 Детальный отчет сохранен: {report_file}")
        
        return successful_tests == total_tests
    
    def run_all_tests(self):
        """Запускает все тесты"""
        print("🚀 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ S3 ИНТЕГРАЦИИ")
        print("=" * 70)
        print(f"🕒 Время начала: {datetime.now()}")
        print(f"🌐 Базовый URL: {self.base_url}")
        print()
        
        # Аутентификация (опционально)
        # auth_success = self.authenticate()
        # if not auth_success:
        #     print("⚠️ Продолжаем без аутентификации (некоторые тесты могут не сработать)")
        
        # Основные тесты
        self.test_s3_structure()
        self.test_document_upload()
        self.test_avatar_upload()
        self.test_widget_icon_upload()
        self.test_cors_headers()
        
        # Генерируем отчет
        return self.generate_report()

def main():
    """Основная функция"""
    print("🧪 S3 INTEGRATION TESTER")
    print("=" * 70)
    print("Тестирует полную интеграцию S3 в системе ReplyX")
    print()
    
    tester = S3IntegrationTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
        exit(0)
    else:
        print("\n💥 НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОШЛИ!")
        exit(1)

if __name__ == "__main__":
    main()
