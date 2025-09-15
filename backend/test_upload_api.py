#!/usr/bin/env python3
"""
Тестирование API загрузки документов через S3
"""
import requests
import json
import tempfile
import os

# Настройки API
API_BASE = "http://localhost:8000"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpassword123"

def create_test_user():
    """Создает тестового пользователя"""
    print("👤 Создаем тестового пользователя...")

    user_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "full_name": "Test User S3"
    }

    response = requests.post(f"{API_BASE}/auth/register", json=user_data)

    if response.status_code == 200:
        print("✅ Пользователь создан")
        return True
    elif response.status_code == 400 and "already registered" in response.text:
        print("ℹ️ Пользователь уже существует")
        return True
    else:
        print(f"❌ Ошибка создания пользователя: {response.status_code}")
        print(response.text)
        return False

def login_user():
    """Авторизует пользователя и возвращает токен"""
    print("🔐 Авторизация...")

    login_data = {
        "username": TEST_EMAIL,  # FastAPI OAuth2 использует 'username'
        "password": TEST_PASSWORD
    }

    response = requests.post(f"{API_BASE}/auth/login", data=login_data)

    if response.status_code == 200:
        token_data = response.json()
        print("✅ Авторизация успешна")
        return token_data.get("access_token")
    else:
        print(f"❌ Ошибка авторизации: {response.status_code}")
        print(response.text)
        return None

def test_file_upload(token):
    """Тестирует загрузку файла через API"""
    print("📤 Тестируем загрузку файла через API...")

    # Создаем временный тестовый файл
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("Это тестовый документ для проверки S3 интеграции.\n")
        f.write("Содержимое должно быть сохранено в Timeweb Cloud Storage.\n")
        f.write("Дата создания: 2025-09-15\n")
        f.write("Тест API uploads через S3 сервис.")
        temp_file_path = f.name

    try:
        # Подготавливаем файл для загрузки
        with open(temp_file_path, 'rb') as f:
            files = {
                'file': ('test_s3_document.txt', f, 'text/plain')
            }

            headers = {
                'Authorization': f'Bearer {token}'
            }

            # Загружаем файл
            response = requests.post(
                f"{API_BASE}/documents/upload",
                files=files,
                headers=headers
            )

            print(f"📊 Статус: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                print("✅ Файл загружен успешно!")
                print(f"   📄 Имя файла: {result.get('filename')}")
                print(f"   🔗 URL: {result.get('s3_url', 'Локально')}")
                print(f"   📏 Размер: {result.get('size')} байт")
                print(f"   🗂️ Storage: {'S3' if result.get('stored_in_s3') else 'Local'}")
                return result
            else:
                print(f"❌ Ошибка загрузки файла: {response.status_code}")
                print(f"   Детали: {response.text}")
                return None

    finally:
        # Удаляем временный файл
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

def test_file_list(token):
    """Тестирует получение списка документов"""
    print("📋 Получаем список документов...")

    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = requests.get(f"{API_BASE}/documents/", headers=headers)

    if response.status_code == 200:
        documents = response.json()
        print(f"✅ Найдено документов: {len(documents)}")

        for doc in documents[-3:]:  # Показываем последние 3
            print(f"   📄 {doc.get('filename')} (ID: {doc.get('id')})")

        return documents
    else:
        print(f"❌ Ошибка получения списка: {response.status_code}")
        return []

def main():
    print("🧪 Тестирование S3 интеграции через API")
    print("=" * 50)

    # Шаг 1: Создаем/логинимся пользователем
    if not create_test_user():
        return

    token = login_user()
    if not token:
        return

    # Шаг 2: Тестируем загрузку файла
    upload_result = test_file_upload(token)
    if not upload_result:
        return

    # Шаг 3: Проверяем список документов
    documents = test_file_list(token)

    print("\n🎉 Тест S3 API завершен!")
    print(f"✅ Файлы сохраняются в: {'Timeweb Cloud Storage (S3)' if upload_result.get('stored_in_s3') else 'Локальное хранилище'}")

if __name__ == "__main__":
    main()