#!/usr/bin/env python3
"""
Тест валидации доменов виджета
Проверяем, что токены становятся недействительными при изменении доменов
"""

import requests
import json
import time
from urllib.parse import urlparse, parse_qs

# Конфигурация для тестирования
API_BASE = "http://localhost:8000"
TEST_EMAIL = "admin@example.com" 
TEST_PASSWORD = "admin123"  # Попробуем стандартный пароль

def login():
    """Авторизация для получения токена"""
    response = requests.post(f"{API_BASE}/api/login", data={
        "username": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Ошибка авторизации: {response.status_code}")
        print(response.text)
        return None

def get_assistants(token):
    """Получаем список ассистентов"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/api/assistants", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []

def update_assistant_domains(token, assistant_id, domains):
    """Обновляем домены ассистента"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {"allowed_domains": domains}
    response = requests.patch(f"{API_BASE}/api/assistants/{assistant_id}", 
                            headers=headers, json=data)
    return response.status_code == 200

def get_embed_code(token, assistant_id):
    """Получаем embed код"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{API_BASE}/api/assistants/{assistant_id}/embed-code", 
                          headers=headers)
    if response.status_code == 200:
        return response.json()
    return None

def validate_widget_token(widget_token, domain):
    """Валидируем токен виджета"""
    response = requests.post(f"{API_BASE}/api/validate-widget-token", json={
        "token": widget_token,
        "domain": domain
    })
    return response.json()

def extract_token_from_embed(embed_code):
    """Извлекаем токен из embed кода"""
    # Ищем токен в src параметре
    if "token=" in embed_code:
        start = embed_code.find("token=") + 6
        end = embed_code.find("&", start)
        if end == -1:
            end = embed_code.find('"', start)
        return embed_code[start:end]
    return None

def main():
    print("🧪 Тестирование валидации доменов виджета")
    print("=" * 50)
    
    # Шаг 1: Авторизация
    print("1. Авторизуемся...")
    auth_token = login()
    if not auth_token:
        print("❌ Не удалось авторизоваться")
        return
    print("✅ Авторизация прошла успешно")
    
    # Шаг 2: Получаем первого ассистента
    print("\n2. Получаем список ассистентов...")
    assistants = get_assistants(auth_token)
    if not assistants:
        print("❌ Ассистенты не найдены")
        return
    
    assistant = assistants[0]
    assistant_id = assistant["id"]
    print(f"✅ Используем ассистента: {assistant['name']} (ID: {assistant_id})")
    
    # Шаг 3: Устанавливаем тестовый домен
    test_domain = "example.com"
    print(f"\n3. Устанавливаем домен: {test_domain}")
    if update_assistant_domains(auth_token, assistant_id, test_domain):
        print("✅ Домен установлен")
    else:
        print("❌ Не удалось установить домен")
        return
    
    # Шаг 4: Получаем embed код с токеном
    print("\n4. Получаем embed код...")
    embed_data = get_embed_code(auth_token, assistant_id)
    if not embed_data:
        print("❌ Не удалось получить embed код")
        return
    
    widget_token = embed_data["token"]
    print("✅ Токен получен")
    print(f"Токен: {widget_token[:50]}...")
    
    # Шаг 5: Тестируем валидацию с правильным доменом
    print(f"\n5. Тестируем валидацию с доменом: {test_domain}")
    validation1 = validate_widget_token(widget_token, test_domain)
    print(f"Результат: {validation1}")
    if validation1.get("valid"):
        print("✅ Валидация прошла успешно")
    else:
        print("❌ Валидация не прошла")
    
    # Шаг 6: Тестируем валидацию с неправильным доменом
    wrong_domain = "wrongdomain.com"
    print(f"\n6. Тестируем валидацию с неправильным доменом: {wrong_domain}")
    validation2 = validate_widget_token(widget_token, wrong_domain)
    print(f"Результат: {validation2}")
    if not validation2.get("valid"):
        print("✅ Валидация правильно заблокирована")
    else:
        print("❌ Валидация не должна была пройти")
    
    # Шаг 7: КЛЮЧЕВОЙ ТЕСТ - меняем домены и проверяем старый токен
    print(f"\n7. 🎯 КЛЮЧЕВОЙ ТЕСТ: Меняем домены и проверяем старый токен")
    new_domain = "newdomain.com"
    print(f"Меняем домен на: {new_domain}")
    
    if update_assistant_domains(auth_token, assistant_id, new_domain):
        print("✅ Домен изменен")
    else:
        print("❌ Не удалось изменить домен")
        return
    
    # Небольшая задержка для обновления
    time.sleep(1)
    
    # Тестируем старый токен со старым доменом
    print(f"Тестируем СТАРЫЙ токен со СТАРЫМ доменом: {test_domain}")
    validation3 = validate_widget_token(widget_token, test_domain)
    print(f"Результат: {validation3}")
    
    if not validation3.get("valid") and "Domains changed" in validation3.get("reason", ""):
        print("🎉 ✅ ОТЛИЧНО! Старый токен правильно заблокирован из-за изменения доменов")
    else:
        print("🚨 ❌ ПРОБЛЕМА! Старый токен все еще работает")
    
    # Тестируем старый токен с новым доменом
    print(f"Тестируем СТАРЫЙ токен с НОВЫМ доменом: {new_domain}")
    validation4 = validate_widget_token(widget_token, new_domain)
    print(f"Результат: {validation4}")
    
    if not validation4.get("valid") and "Domains changed" in validation4.get("reason", ""):
        print("✅ Старый токен правильно заблокирован с новым доменом")
    else:
        print("❌ Старый токен не должен работать с новым доменом")
    
    # Шаг 8: Получаем новый токен и проверяем его
    print(f"\n8. Получаем НОВЫЙ токен после изменения доменов")
    new_embed_data = get_embed_code(auth_token, assistant_id)
    if new_embed_data:
        new_widget_token = new_embed_data["token"]
        print("✅ Новый токен получен")
        
        # Тестируем новый токен с новым доменом
        validation5 = validate_widget_token(new_widget_token, new_domain)
        print(f"Новый токен + новый домен: {validation5}")
        
        if validation5.get("valid"):
            print("✅ Новый токен работает с новым доменом")
        else:
            print("❌ Новый токен должен работать с новым доменом")
    
    # Шаг 9: Тестируем удаление всех доменов
    print(f"\n9. Тестируем удаление всех доменов")
    if update_assistant_domains(auth_token, assistant_id, ""):
        print("✅ Домены удалены (пустая строка)")
        
        time.sleep(1)
        
        # Проверяем, что токен не работает без доменов
        validation6 = validate_widget_token(new_widget_token, new_domain)
        print(f"Токен после удаления доменов: {validation6}")
        
        if not validation6.get("valid"):
            print("✅ Токен правильно заблокирован после удаления доменов")
        else:
            print("❌ Токен не должен работать без доменов")
    
    print("\n" + "=" * 50)
    print("🏁 Тестирование завершено")

if __name__ == "__main__":
    main()