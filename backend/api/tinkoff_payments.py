from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Payment
from core.auth import get_current_user
from validators.rate_limiter import rate_limit_api, rate_limit_by_ip
from datetime import datetime, timedelta
import uuid
import os
import logging
import hashlib
import requests
import json
import ipaddress
from typing import List


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])

# Конфигурация Т-Банк с валидацией
TINKOFF_TERMINAL_KEY = os.getenv('TINKOFF_TERMINAL_KEY', 'your_terminal_key_here')
TINKOFF_SECRET_KEY = os.getenv('TINKOFF_SECRET_KEY', 'your_secret_key_here')
TINKOFF_SANDBOX_MODE = os.getenv('TINKOFF_SANDBOX_MODE', 'true').lower() == 'true'
TINKOFF_MOCK_MODE = os.getenv('TINKOFF_MOCK_MODE', 'false').lower() == 'true'  # Mock режим отключен

# Email отправителя чеков (обязательно для PROD фискализации)
TINKOFF_EMAIL_COMPANY = os.getenv('TINKOFF_EMAIL_COMPANY', '').strip()

# API URLs - ПРАВИЛЬНАЯ ЛОГИКА согласно документации Tinkoff
TINKOFF_TEST_API_URL = os.getenv('TINKOFF_TEST_API_URL', 'https://rest-api-test.tinkoff.ru/v2/')
TINKOFF_PRODUCTION_API_URL = os.getenv('TINKOFF_PRODUCTION_API_URL', 'https://securepay.tinkoff.ru/v2/')

def _choose_api_base(terminal_key: str, sandbox_flag: bool) -> str:
    """
    Железобетонный выбор базового URL:
    - если ключ заканчивается на DEMO — всегда тестовый контур
    - иначе — продакшн
    флаг sandbox используется как дополнительная «подстраховка»
    """
    if (terminal_key or "").endswith("DEMO") or sandbox_flag:
        return TINKOFF_TEST_API_URL.rstrip('/') + '/'
    return TINKOFF_PRODUCTION_API_URL.rstrip('/') + '/'

TINKOFF_API_URL = _choose_api_base(TINKOFF_TERMINAL_KEY, TINKOFF_SANDBOX_MODE)

# Дополнительные настройки
TINKOFF_REQUEST_TIMEOUT = int(os.getenv('TINKOFF_REQUEST_TIMEOUT', '30'))

def mask_terminal_key(terminal_key: str) -> str:
    """Маскирует TerminalKey для безопасного логирования"""
    if not terminal_key or len(terminal_key) <= 8:
        return terminal_key
    return f"{terminal_key[:8]}***"

def _mask_signature(signature: str) -> str:
    """Маскирует подпись для безопасного логирования"""
    return f"{signature[:8]}...{signature[-6:]}" if isinstance(signature, str) and len(signature) > 14 else "***СКРЫТА***"

# IP адреса T-Bank для webhook уведомлений (согласно документации)
TINKOFF_WEBHOOK_IPS = [
    '185.71.76.0/27',  # Основной диапазон T-Bank (продакшн)
    '185.71.77.0/27',  # Резервный диапазон T-Bank (продакшн)
    '77.75.153.0/25',  # Дополнительный диапазон (продакшн)
    '91.194.226.0/23', # Новый диапазон 2024+ (продакшн)
    '91.218.132.0/24', # Новый диапазон T-Bank (обнаружен 11.09.2025 в продакшне)
    '212.49.24.206/32', # Тестовый IP T-Bank (обнаружен в логах webhook'ов)
    '212.233.80.7/32',  # Продакшн IP T-Bank (обнаружен 10.09.2025)
]

def extract_client_ip(forwarded_for_header: str, fallback_ip: str) -> str:
    """
    Извлекает настоящий IP клиента из X-Forwarded-For заголовка
    X-Forwarded-For может содержать цепочку: "client, proxy1, proxy2"
    Нам нужен первый IP в цепочке
    """
    if not forwarded_for_header:
        return fallback_ip
    
    # Берем первый IP из списка (до первой запятой)
    first_ip = forwarded_for_header.split(',')[0].strip()
    
    # Проверяем что это валидный IP
    try:
        ipaddress.ip_address(first_ip)
        return first_ip
    except ValueError:
        logger.warning(f"⚠️ Некорректный IP в X-Forwarded-For: '{first_ip}', используем fallback: '{fallback_ip}'")
        return fallback_ip

def is_tinkoff_ip(client_ip: str) -> bool:
    """Проверка принадлежности IP к T-Bank whitelist"""
    if not client_ip or client_ip in ['unknown', 'localhost', '127.0.0.1']:
        # В development режиме разрешаем локальные IP
        if os.getenv('ENVIRONMENT', 'development') == 'development':
            logger.warning(f"🚧 DEV mode: разрешаю IP {client_ip} для webhook")
            return True
        return False
    
    try:
        client_addr = ipaddress.ip_address(client_ip)
        for cidr in TINKOFF_WEBHOOK_IPS:
            if client_addr in ipaddress.ip_network(cidr):
                logger.info(f"✅ IP {client_ip} принадлежит T-Bank")
                return True
        
        logger.warning(f"❌ IP {client_ip} НЕ принадлежит T-Bank whitelist")
        return False
        
    except ValueError:
        logger.error(f"❌ Некорректный IP адрес: {client_ip}")
        return False
TINKOFF_DEBUG_LOGGING = os.getenv('TINKOFF_DEBUG_LOGGING', 'false').lower() == 'true'

# Валидация критически важных настроек
def validate_tinkoff_config():
    """Проверка корректности конфигурации Тинькофф"""
    errors = []
    warnings = []
    
    if TINKOFF_TERMINAL_KEY == 'your_terminal_key_here' or not TINKOFF_TERMINAL_KEY:
        errors.append("TINKOFF_TERMINAL_KEY не настроен")
        
    if TINKOFF_SECRET_KEY == 'your_secret_key_here' or not TINKOFF_SECRET_KEY:
        errors.append("TINKOFF_SECRET_KEY не настроен")
        
    # EmailCompany больше не требуется - используем стандартный режим T-Bank
        
    # Проверяем согласованность ключа и URL
    is_demo_key = (TINKOFF_TERMINAL_KEY or "").endswith("DEMO")
    is_test_url = TINKOFF_API_URL.startswith("https://rest-api-test.")
    
    if is_demo_key and not is_test_url:
        warnings.append("DEMO терминал используется с продакшн URL - может не работать")
    elif not is_demo_key and is_test_url:
        warnings.append("Боевой терминал используется с тестовым URL - может не работать")
        
    if not TINKOFF_SANDBOX_MODE and not TINKOFF_MOCK_MODE:
        # В продакшене требуются реальные URLs
        success_url = os.getenv('TINKOFF_SUCCESS_URL', '')
        fail_url = os.getenv('TINKOFF_FAIL_URL', '')
        
        if not success_url or success_url.startswith('http://localhost'):
            errors.append("TINKOFF_SUCCESS_URL должен быть доступен из интернета в продакшене")
            
        if not fail_url or fail_url.startswith('http://localhost'):
            errors.append("TINKOFF_FAIL_URL должен быть доступен из интернета в продакшене")
    
    if errors and not TINKOFF_MOCK_MODE:
        logger.error("Ошибки конфигурации Тинькофф:")
        for error in errors:
            logger.error(f"  - {error}")
        logger.error("Проверьте файл .env и документацию .env.tinkoff.example")
    
    if warnings:
        for warning in warnings:
            logger.warning(f"⚠️ {warning}")
        
    return len(errors) == 0

# Проверяем конфигурацию при загрузке модуля
_config_valid = validate_tinkoff_config()

# Логируем текущую конфигурацию для понимания режима работы
if TINKOFF_API_URL.startswith("https://rest-api-test."):
    logger.info("🧪 Режим: SANDBOX (DEMO терминал, тестовый контур)")
else:
    logger.info("🚀 Режим: PROD (боевой терминал, боевой контур)")
logger.info(f"   Terminal: {mask_terminal_key(TINKOFF_TERMINAL_KEY)}")
logger.info(f"   API URL: {TINKOFF_API_URL}")

def generate_order_id():
    """Генерация уникального номера заказа"""
    return f"replyx_{int(datetime.utcnow().timestamp())}_{str(uuid.uuid4())[:8]}"

def normalize_phone(phone: str) -> str:
    """
    Нормализация телефона к формату E.164 (+7XXXXXXXXXX)
    для корректной обработки кассой
    """
    if not phone:
        return phone
    
    # Убираем все лишние символы
    digits_only = ''.join(filter(str.isdigit, phone))
    
    # Приводим к формату +7XXXXXXXXXX
    if digits_only.startswith('8') and len(digits_only) == 11:
        return f"+7{digits_only[1:]}"
    elif digits_only.startswith('7') and len(digits_only) == 11:
        return f"+{digits_only}"
    elif len(digits_only) == 10:
        return f"+7{digits_only}"
    
    # Возвращаем как есть, если не удалось нормализовать
    return phone

def tinkoff_normalize_value(value):
    """Нормализация значений для подписи согласно требованиям Т-Банк"""
    if isinstance(value, bool):
        return 'true' if value else 'false'  # булевы значения в нижнем регистре
    return str(value)

def calculate_signature(data: dict, exclude_customer_fields: bool = True) -> str:
    """Вычисление подписи для запроса к Т-Банк согласно документации
    
    Args:
        data: Данные для подписи
        exclude_customer_fields: Исключать ли Email/Phone/Name из подписи 
                               (True для Init, False для Customer методов)
    """
    # Базовые исключения для всех методов
    signature_excluded_fields = ['token', 'Token', 'Receipt', 'DATA']
    
    # Для Init исключаем Email/Phone/Name (они не участвуют в подписи)
    # Для Customer методов включаем их в подпись
    if exclude_customer_fields:
        signature_excluded_fields.extend(['Email', 'Phone', 'Name'])
    
    items = [(k, v) for k, v in data.items() 
             if k not in signature_excluded_fields and v is not None and str(v).strip() != '']
    
    # Добавляем секретный ключ как Password (согласно документации Т-Банк)
    items.append(('Password', TINKOFF_SECRET_KEY))
    
    # Сортируем по ключам (ASCII сортировка)
    items.sort(key=lambda kv: kv[0])
    
    # Нормализуем значения и создаем строку конкатенации
    normalized_values = [tinkoff_normalize_value(v) for _, v in items]
    concatenated_string = ''.join(normalized_values)
    
    # Детальное логирование для диагностики (только в debug режиме)
    if TINKOFF_DEBUG_LOGGING:
        safe_items = [(k, tinkoff_normalize_value(v)) for k, v in items if k != 'Password']
        safe_keys = [k for k, _ in safe_items]
        safe_values = [v for _, v in safe_items]
        logger.info(f"   🔐 ПОДПИСЬ (DEBUG):")
        logger.info(f"   Поля В подписи: {safe_keys}")
        logger.info(f"   Поля ИСКЛЮЧЕНЫ: {signature_excluded_fields}")
        logger.info(f"   Исключаем Email/Phone/Name: {exclude_customer_fields} (true=Init/false=Customer)")
        logger.info(f"   Нормализованные значения: {safe_values}")
        logger.info(f"   Длина строки для подписи: {len(concatenated_string)} символов")
    else:
        logger.debug(f"   🔐 Подпись рассчитана, поля в подписи: {len(items)-1}, длина: {len(concatenated_string)} символов")
    # NOTE: Строку подписи не логируем - содержит секретный ключ
    
    # Вычисляем SHA256 хэш
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

def _tinkoff_call(method: str, payload: dict) -> requests.Response:
    """
    Универсальный вызов к T-Bank API с подписью
    """
    body = {**payload, "TerminalKey": TINKOFF_TERMINAL_KEY}
    
    # Для Customer методов включаем Email/Phone/Name в подпись
    is_customer_method = method in {"AddCustomer", "UpdateCustomer", "GetCustomer"}
    body["Token"] = calculate_signature(body, exclude_customer_fields=not is_customer_method)
    
    logger.debug(f"🌐 T-Bank API вызов: {method}")
    
    # Безопасное логирование payload без Token и с маскированным TerminalKey
    safe_payload = {k: v for k, v in body.items() if k != 'Token'}
    if "TerminalKey" in safe_payload:
        safe_payload["TerminalKey"] = mask_terminal_key(str(safe_payload["TerminalKey"]))
    logger.debug(f"   Payload: {json.dumps(safe_payload, ensure_ascii=False)}")
    logger.debug(f"   Customer fields in signature: {is_customer_method}")
    
    return requests.post(
        f"{TINKOFF_API_URL}{method}", 
        json=body, 
        timeout=TINKOFF_REQUEST_TIMEOUT,
        headers={
            'Content-Type': 'application/json',
            'X-Request-ID': f"cust-{payload.get('CustomerKey', 'unknown')}"  # Трассировка customer вызовов
        }
    )

def sync_customer_to_tinkoff(user_id: int, email: str = None, phone: str = None):
    """
    Best-effort синхронизация покупателя с T-Bank для привязки контактов к CustomerKey.
    Это поможет отображать email в ЛК мерчанта для всех заказов этого покупателя.
    """
    try:
        payload = {"CustomerKey": str(user_id)}
        
        # ВАЖНО: передаем верхнеуровневые поля (участвуют в подписи для Customer методов)
        if email:
            payload["Email"] = email  # основное поле для T-Bank
            payload["CustomerEmail"] = email  # дополнительно для совместимости
            
        if phone:
            normalized_phone = normalize_phone(phone)
            payload["Phone"] = normalized_phone  # основное поле для T-Bank
            payload["CustomerPhone"] = normalized_phone  # дополнительно для совместимости
            
        # Проверяем существование покупателя
        method = "AddCustomer"  # по умолчанию создаем
        try:
            response = _tinkoff_call("GetCustomer", {"CustomerKey": str(user_id)})
            if response.status_code == 200:
                result = response.json()
                if result.get("Success"):
                    method = "UpdateCustomer"
                    logger.info(f"🔄 Покупатель {user_id} существует, обновляем профиль")
                else:
                    logger.info(f"➕ Покупатель {user_id} не найден, создаем новый профиль")
            else:
                logger.info(f"➕ Ошибка GetCustomer {response.status_code}, создаем покупателя {user_id}")
        except Exception as e:
            logger.info(f"➕ Исключение GetCustomer ({e}), создаем покупателя {user_id}")
            
        # Выполняем Add/UpdateCustomer
        response = _tinkoff_call(method, payload)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("Success"):
                logger.info(f"✅ Профиль покупателя {user_id} синхронизирован с T-Bank ({method})")
                return True
            else:
                # Детальное логирование ошибки от T-Bank
                code = result.get("ErrorCode")
                msg = result.get("Message")
                logger.warning(f"⚠️ T-Bank отклонил {method} для покупателя {user_id}:")
                logger.warning(f"   ErrorCode={code} Message={msg}")
                logger.warning(f"   Полный ответ: {json.dumps(result, ensure_ascii=False)}")
                
                # Fallback: если UpdateCustomer не прошел, пробуем AddCustomer
                if method == "UpdateCustomer":
                    logger.info(f"🔄 Пробуем AddCustomer как fallback для покупателя {user_id}")
                    response = _tinkoff_call("AddCustomer", payload)
                    if response.status_code == 200:
                        result = response.json()
                        if result.get("Success"):
                            logger.info(f"✅ Профиль покупателя {user_id} создан через fallback AddCustomer")
                            return True
                        else:
                            fallback_code = result.get("ErrorCode")
                            fallback_msg = result.get("Message")
                            logger.warning(f"⚠️ Fallback AddCustomer тоже отклонен:")
                            logger.warning(f"   ErrorCode={fallback_code} Message={fallback_msg}")
        else:
            logger.warning(f"⚠️ HTTP ошибка {method}: {response.status_code} - {response.text}")
            
    except Exception as e:
        logger.info(f"ℹ️ Customer sync best-effort exception: {e}")
        
    return False

def verify_webhook_signature(data: dict, received_token: str) -> bool:
    """Проверка подписи webhook'а от Тинькофф с правильной нормализацией булевых значений"""
    try:
        logger.info(f"🔐 ПРОВЕРКА ПОДПИСИ (исправленный алгоритм)...")
        
        # Используем исправленную функцию calculate_signature с нормализацией булевых значений
        expected_token = calculate_signature(data)
        
        logger.info(f"   Получено от Т-Банк: {_mask_signature(received_token)}")
        logger.info(f"   Ожидалось (исправленное): {_mask_signature(expected_token)}")
        
        if str(received_token).lower() == str(expected_token).lower():
            logger.info("✅ Подпись webhook'а совпала!")
            return True
        else:
            logger.error(f"❌ Подпись не совпала!")
            return False
            
    except Exception as e:
        logger.error(f"❌ Ошибка при проверке подписи webhook'а: {e}")
        return False

async def init_payment_tinkoff(order_id: str, amount: int, description: str, customer_key: str, success_url: str, fail_url: str, email: str = None, phone: str = None, name: str = None):
    """Инициация платежа через API Тинькофф"""
    
    # ВРЕМЕННЫЙ MOCK РЕЖИМ - пока IP не добавлен в whitelist Тинькофф
    if TINKOFF_MOCK_MODE:
        logger.info(f"🎭 MOCK режим: эмуляция успешного создания платежа {order_id}")
        mock_payment_url = f"https://securepay.tinkoff.ru/new/mock_{order_id[:8]}"
        return mock_payment_url
    
    data = {
        'TerminalKey': TINKOFF_TERMINAL_KEY,
        'OrderId': order_id,
        'Amount': amount,
        'Description': description,
        'CustomerKey': customer_key,
        'SuccessURL': success_url,
        'FailURL': fail_url,
        'Language': 'ru',
        'PayType': 'O'
    }
    
    # 👤 ИНФОРМАЦИЯ О ПОКУПАТЕЛЕ ДЛЯ ЛК TINKOFF MERCHANT
    # Добавляем верхнеуровневые поля + объект DATA для максимальной совместимости
    customer_data = {}
    
    if email:
        # Верхнеуровневое поле Email - отображается заметно в карточке заказа
        data['Email'] = email
        # Также добавляем в DATA для полной совместимости 
        customer_data['Email'] = email
        # Семантический ключ для некоторых витрин ЛК T-Bank
        customer_data['CustomerEmail'] = email
        logger.info(f"👤 Email покупателя добавлен (верхний уровень + DATA.Email + DATA.CustomerEmail): '{email}'")
    
    if phone:
        normalized_phone = normalize_phone(phone)
        data['Phone'] = normalized_phone
        customer_data['Phone'] = normalized_phone
        if normalized_phone != phone:
            logger.info(f"📞 Телефон нормализован: '{phone}' → '{normalized_phone}'")
        logger.info(f"📞 Телефон покупателя добавлен (верхний уровень + DATA): '{normalized_phone}'")
        
    if name:
        data['Name'] = name
        customer_data['Name'] = name
        logger.info(f"👤 Имя покупателя добавлено (верхний уровень + DATA): '{name}'")
    
    # Добавляем OperationInitiatorType для корректной CIT/MIT классификации карточных платежей
    customer_data['OperationInitiatorType'] = '0'  # CIT CNC - разовая оплата без сохранения реквизитов
    
    # Добавляем объект DATA (всегда, так как теперь содержит OperationInitiatorType)
    data['DATA'] = customer_data
    logger.info(f"📋 Объект DATA создан: {customer_data}")
    logger.info(f"💳 OperationInitiatorType: 0 (CIT CNC - для карточных платежей, игнорируется для T-Pay/СБП)")
    
    # Добавляем объект Receipt для онлайн-кассы (54-ФЗ)
    receipt_contact = None
    receipt_contact_type = None
    
    if email:
        receipt_contact = email
        receipt_contact_type = "Email"
    elif phone:
        receipt_contact = normalize_phone(phone)  
        receipt_contact_type = "Phone"
    
    if receipt_contact:  # Если есть контакт для отправки чека
        receipt = {
            'FfdVersion': '1.2',  # ФФД 1.2 для T-Pay/СБП совместимости
            'Email': email,  # Гарантируем ровно один контакт - Email
            'Taxation': 'usn_income',  # УСН доходы (подходит для большинства ИП/ООО)
            'Items': [{
                'Name': description,
                'Price': amount,  # Цена в копейках
                'Quantity': 1,
                'Amount': amount,  # Общая сумма = цена * количество
                'Tax': 'none',  # Без НДС (подходит для услуг на УСН)
                'PaymentMethod': 'full_payment',  # Полный расчет (для всех способов оплаты)
                'PaymentObject': 'service',  # Услуга
                'MeasurementUnit': 'pc'  # 🔴 ОБЯЗАТЕЛЬНО для ФФД 1.2: единица измерения (штуки)
            }],
            'Payments': {
                'Electronic': amount  # 🔴 КРИТИЧНО: сумма безналичного платежа = Amount из Init
            }
        }
        
        # 📧 ОТПРАВКА ЧЕКОВ: используем стандартный режим T-Bank
        # EmailCompany НЕ добавляем - пусть чеки отправляет сам Tinkoff
        # Это надежнее и не требует настройки SPF/DKIM на нашем домене
        logger.info(f"📧 Чеки будут отправляться с серверов T-Bank (стандартный режим)")
        
        data['Receipt'] = receipt
        logger.info(f"📄 ✅ СОЗДАН RECEIPT ДЛЯ КАССОВОГО ЧЕКА (ФФД 1.2):")
        logger.info(f"   📧 Email в Receipt: '{email}' (гарантированно Email)")
        logger.info(f"   💰 Сумма: {amount} копеек")
        logger.info(f"   📝 Описание: '{description}'")
        logger.info(f"   🏪 Налогообложение: usn_income")
        logger.info(f"   💳 Payments.Electronic: {amount} копеек (= Amount)")
        logger.info(f"   💰 PaymentMethod: full_payment (полный расчет)")
        logger.info(f"   📦 PaymentObject: service (услуга)")
        logger.info(f"   📏 MeasurementUnit: pc (штуки)")
        logger.info(f"   📄 FfdVersion: 1.2 (современная версия)")
        logger.info(f"   📧 Отправитель: T-Bank (стандартный режим)")
    else:
        logger.warning(f"⚠️ ❌ НЕТ КОНТАКТОВ ДЛЯ RECEIPT - КАССОВЫЙ ЧЕК НЕ БУДЕТ СФОРМИРОВАН!")
        logger.warning(f"   📧 Email: '{email}' | 📞 Phone: '{phone}'")
    
    # Добавляем NotificationURL только если он задан и доступен из интернета
    notification_url = os.getenv('TINKOFF_NOTIFICATION_URL', '').strip()
    if notification_url and not notification_url.startswith('http://localhost'):
        data['NotificationURL'] = notification_url
    
    # 📧 ДИАГНОСТИКА ПОЛНОГО ОБЪЕКТА ДАННЫХ ДЛЯ TINKOFF
    logger.info(f"📤 ПОЛНЫЙ ОБЪЕКТ ДАННЫХ ДЛЯ ОТПРАВКИ В TINKOFF:")
    logger.info(f"   ℹ️ Контакты передаются в трех местах для максимальной совместимости:")
    logger.info(f"      1. Верхний уровень (Email/Phone/Name) - заметное отображение в карточке")
    logger.info(f"      2. 'DATA.Email/CustomerEmail' - информация о покупателе для ЛК мерчанта") 
    logger.info(f"      3. 'Receipt' - контакт для отправки кассового чека")
    logger.info(f"   🔄 После успешного платежа: синхронизация CustomerKey с профилем покупателя")
    logger.info(f"   ⚠️ Email в ЛК может не отобразиться для текущего заказа (особенно T-Wallet),")
    logger.info(f"      но будет доступен в чеке и появится при следующих платежах")
    logger.info(f"   🌐 API URL: {TINKOFF_API_URL}")
    for key, value in data.items():
        if key == 'Receipt':
            logger.info(f"   📄 {key}: {value}")
        elif key == 'DATA':
            logger.info(f"   👤 {key}: {value}")
        elif key in ['Email', 'Phone', 'Name']:
            logger.info(f"   👤 {key}: {value}")
        elif key == 'TerminalKey':
            logger.info(f"   🔑 {key}: {mask_terminal_key(str(value))}")
        elif key == 'Token':
            logger.info(f"   🔐 {key}: ***СКРЫТ***")
        else:
            logger.info(f"   🔑 {key}: {value}")
    
    # Добавляем токен (подпись)
    logger.info(f"🔐 СОЗДАНИЕ ПОДПИСИ INIT для {order_id}:")
    logger.info(f"   Все поля для Init: {sorted([k for k in data.keys()])}")
    
    # Показываем какие поля участвуют в подписи (для Init исключаем Email/Phone/Name)
    signature_excluded_fields_local = ['Receipt', 'DATA', 'Email', 'Phone', 'Name', 'Token']
    signature_fields = [k for k in data.keys() if k not in signature_excluded_fields_local]
    excluded_fields_present = [k for k in data.keys() if k in signature_excluded_fields_local]
    logger.info(f"   Поля ВКЛЮЧЕНЫ в подпись Init: {sorted(signature_fields)}")
    logger.info(f"   Поля ИСКЛЮЧЕНЫ из подписи Init: {excluded_fields_present}")
    logger.info(f"   ℹ️ Для Customer методов Email/Phone/Name включаются в подпись")
    
    token = calculate_signature(data)
    data['Token'] = token
    
    logger.info(f"   Подпись Init: ***СКРЫТА***")
    logger.info(f"Инициация платежа {order_id} на сумму {amount} копеек")
    
    try:
        # 📤 ЛОГИРУЕМ ПОЛНЫЙ JSON ЗАПРОС К TINKOFF (БЕЗОПАСНО)
        logger.info(f"🌐 ОТПРАВЛЯЕМ HTTP ЗАПРОС К TINKOFF:")
        logger.info(f"   URL: {TINKOFF_API_URL}Init")
        
        # Безопасный дамп без Token и с маскированным TerminalKey
        safe_data = {**data}
        safe_data.pop("Token", None)
        if "TerminalKey" in safe_data:
            safe_data["TerminalKey"] = mask_terminal_key(str(safe_data["TerminalKey"]))
        logger.info(f"   JSON данные: {json.dumps(safe_data, ensure_ascii=False, indent=2)}")
        
        response = requests.post(
            f"{TINKOFF_API_URL}Init",
            json=data,
            headers={
                'Content-Type': 'application/json',
                'X-Request-ID': order_id  # Трассировка запросов
            },
            timeout=TINKOFF_REQUEST_TIMEOUT
        )
        
        logger.info(f"Отправлен запрос к Тинькофф Init для заказа {order_id}")
        logger.info(f"Получен ответ от Тинькофф (статус {response.status_code})")
        
        # 📥 ЛОГИРУЕМ ПОЛНЫЙ ОТВЕТ ОТ TINKOFF
        try:
            response_json = response.json()
            logger.info(f"🌐 ОТВЕТ ОТ TINKOFF:")
            logger.info(f"   JSON ответ: {json.dumps(response_json, ensure_ascii=False, indent=2)}")
        except:
            logger.info(f"🌐 ОТВЕТ ОТ TINKOFF (не JSON): {response.text}")
        
        if response.status_code != 200:
            logger.error(f"Детали ошибки от Тинькофф: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('Success') and result.get('PaymentURL'):
                logger.info(f"Получен PaymentURL от Тинькофф: {result['PaymentURL']}")
                return result['PaymentURL']
            else:
                error_code = result.get('ErrorCode', 'UNKNOWN_ERROR')
                error_message = result.get('Message', 'Неизвестная ошибка')
                
                # Детальное логирование ошибок Тинькофф
                logger.error(f"Ошибка Тинькофф при создании платежа {order_id}:")
                logger.error(f"  Код ошибки: {error_code}")
                logger.error(f"  Сообщение: {error_message}")
                logger.error(f"  Полный ответ: {result}")
                
                # Понятные сообщения для пользователя
                user_messages = {
                    'INCORRECT_PAYMENT_OPERATION': 'Некорректные параметры платежа',
                    'OPERATION_DENIED': 'Операция отклонена банком',
                    'TERMINAL_NOT_FOUND': 'Терминал не найден',
                    'TERMINAL_BLOCKED': 'Терминал заблокирован',
                    'OPERATION_NOT_SUPPORTED': 'Операция не поддерживается',
                    'AMOUNT_TOO_LOW': 'Сумма платежа слишком мала',
                    'AMOUNT_TOO_HIGH': 'Сумма платежа слишком велика',
                    'INCORRECT_MERCHANT': 'Некорректные настройки мерчанта'
                }
                
                user_message = user_messages.get(error_code, error_message)
                raise Exception(f"Ошибка платежной системы: {user_message} (код: {error_code})")
        else:
            logger.error(f"HTTP ошибка при обращении к Тинькофф API:")
            logger.error(f"  Статус: {response.status_code}")
            logger.error(f"  Ответ: {response.text}")
            logger.error(f"  URL: {TINKOFF_API_URL}Init")
            
            if response.status_code == 401:
                raise Exception("Ошибка авторизации в платежной системе")
            elif response.status_code == 403:
                raise Exception("Доступ запрещен платежной системой")
            elif response.status_code >= 500:
                raise Exception("Временные проблемы с платежной системой, попробуйте позже")
            else:
                raise Exception(f"Ошибка соединения с платежной системой (код {response.status_code})")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка запроса к Тинькофф: {e}")
        raise Exception("Ошибка соединения с платежной системой")

@router.post("/create-payment")
@rate_limit_api(limit=10, window=300)  # 🔒 Максимум 10 платежей за 5 минут на пользователя
async def create_payment(
    amount: float = Form(..., ge=1, le=50000),
    description: str = Form(default="Пополнение баланса ReplyX"),
    email: str = Form(None),  # Email для чека
    phone: str = Form(None),  # Телефон для чека
    name: str = Form(None),   # Имя покупателя
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Создание платежа и формирование формы для перенаправления на Т-Банк
    """
    try:
        # 📧 ДИАГНОСТИКА EMAIL ДЛЯ ЧЕКА
        logger.info(f"🔍 СОЗДАНИЕ ПЛАТЕЖА - ДИАГНОСТИКА EMAIL:")
        logger.info(f"   📧 Email из формы: '{email}' (тип: {type(email)})")
        logger.info(f"   👤 Email пользователя из БД: '{current_user.email}' (тип: {type(current_user.email)})")
        logger.info(f"   📞 Телефон из формы: '{phone}' (тип: {type(phone)})")
        logger.info(f"   👤 Имя из формы: '{name}' (тип: {type(name)})")
        
        # Генерируем уникальный номер заказа
        order_id = generate_order_id()
        
        # URLs для обратного вызова из переменных окружения
        # В sandbox режиме используем тестовые URL, доступные из интернета
        if TINKOFF_SANDBOX_MODE:
            success_url = os.getenv('TINKOFF_SUCCESS_URL', 'https://httpbin.org/status/200')
            fail_url = os.getenv('TINKOFF_FAIL_URL', 'https://httpbin.org/status/400')
        else:
            success_url = os.getenv('TINKOFF_SUCCESS_URL', 'http://localhost:3000/payment/success')
            fail_url = os.getenv('TINKOFF_FAIL_URL', 'http://localhost:3000/payment/error')

        # Важно: добавляем order_id в SuccessURL/FailURL, чтобы на фронте был идентификатор заказа
        try:
            from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
            def append_order_param(url: str, order: str) -> str:
                parsed = urlparse(url)
                qs = dict(parse_qsl(parsed.query))
                qs['order'] = order
                new_query = urlencode(qs)
                return urlunparse(parsed._replace(query=new_query))
            success_url = append_order_param(success_url, order_id)
            fail_url = append_order_param(fail_url, order_id)
        except Exception as e:
            logger.warning(f"Не удалось добавить order параметр к URL: {e}")
        
        # Создаем запись о платеже в БД
        payment = Payment(
            user_id=current_user.id,
            order_id=order_id,
            amount=amount,
            status='pending',
            description=description,
            success_url=success_url,
            fail_url=fail_url,
            customer_email=email,
            customer_phone=phone,
            customer_name=name
        )
        
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        # Инициируем платеж через API Тинькофф
        amount_kopecks = int(round(amount * 100))  # Т-Банк принимает сумму в копейках (округляем, не усекаем)
        
        logger.info(f"Создан платеж {order_id} для пользователя {current_user.id} на сумму {amount} руб.")
        logger.info(f"Терминал: {mask_terminal_key(TINKOFF_TERMINAL_KEY)}")
        logger.info(f"Sandbox режим: {TINKOFF_SANDBOX_MODE}")
        logger.info(f"API URL: {TINKOFF_API_URL}")
        
        # Получаем URL для оплаты от Тинькофф
        # Используем email пользователя из аккаунта, если не передан явно
        user_email = email or current_user.email
        
        # 🔄 СОХРАНЯЕМ РЕАЛЬНЫЙ EMAIL, КОТОРЫЙ УЙДЕТ В INIT
        # Чтобы в webhook/complete_payment мы видели тот же email для синхронизации
        payment.customer_email = user_email
        db.commit()
        
        # 📧 ФИНАЛЬНАЯ ДИАГНОСТИКА EMAIL
        logger.info(f"📧 ИТОГОВЫЙ EMAIL ДЛЯ ЧЕКА: '{user_email}' (тип: {type(user_email)})")
        if user_email:
            logger.info(f"✅ Email найден! Будет создан Receipt для Tinkoff")
        else:
            logger.warning(f"❌ Email НЕ НАЙДЕН! Чек НЕ будет сформирован!")
        
        payment_url = await init_payment_tinkoff(
            order_id=order_id,
            amount=amount_kopecks,
            description=description,
            customer_key=str(current_user.id),
            success_url=success_url,
            fail_url=fail_url,
            email=user_email,  # Передаем email пользователя для Receipt
            phone=phone,
            name=name
        )
        
        # Сохраняем URL платежа в БД
        payment.payment_url = payment_url
        db.commit()
        
        
        # Возвращаем JSON с URL для перенаправления
        return JSONResponse(content={
            "success": True,
            "redirect_url": payment_url,
            "order_id": order_id
        })
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout при создании платежа {order_id}")
        if 'payment' in locals():
            payment.status = 'failed'
            payment.error_message = 'Timeout при создании платежа'
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Платежная система недоступна. Попробуйте позже."
        )
    except requests.exceptions.ConnectionError:
        logger.error(f"Connection error при создании платежа {order_id}")
        if 'payment' in locals():
            payment.status = 'failed'
            payment.error_message = 'Ошибка подключения к платежной системе'
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Платежная система недоступна. Попробуйте позже."
        )
    except Exception as e:
        logger.error(f"Ошибка создания платежа {order_id}: {e}")
        logger.error(f"Тип ошибки: {type(e)}")
        import traceback
        logger.error(f"Полный трейс: {traceback.format_exc()}")
        
        # Если платеж уже создан в БД, обновляем его статус вместо удаления
        if 'payment' in locals():
            try:
                payment.status = 'failed'
                payment.error_message = str(e)
                payment.completed_at = datetime.utcnow()
                db.commit()
                logger.info(f"Платеж {payment.order_id} помечен как failed с ошибкой: {str(e)}")
            except Exception as update_error:
                logger.error(f"Ошибка обновления статуса платежа: {update_error}")
                # Откатываем только если не удалось обновить статус
                try:
                    db.delete(payment)
                    db.commit()
                except Exception as rollback_error:
                    logger.error(f"Ошибка отката транзакции: {rollback_error}")
        
        # Определяем статус ошибки для HTTP ответа
        error_message = str(e)
        if "авторизации" in error_message.lower():
            status_code = status.HTTP_401_UNAUTHORIZED
        elif "доступ запрещен" in error_message.lower():
            status_code = status.HTTP_403_FORBIDDEN  
        elif "соединения" in error_message.lower() or "временные проблемы" in error_message.lower():
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        else:
            status_code = status.HTTP_400_BAD_REQUEST
            
        raise HTTPException(
            status_code=status_code,
            detail=f"Ошибка создания платежа: {error_message}"
        )


@router.get("/status/{order_id}")
async def get_payment_status(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение статуса платежа"""
    payment = db.query(Payment).filter(
        Payment.order_id == order_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Платеж не найден"
        )
    
    return {
        "order_id": payment.order_id,
        "amount": payment.amount,
        "status": payment.status,
        "created_at": payment.created_at,
        "completed_at": payment.completed_at
    }

@router.post("/complete-payment")
async def complete_payment(
    order_id: str = Form(...),
    success: bool = Form(...),
    payment_id: str = Form(None),
    error_message: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    Обработка результата платежа (вызывается из frontend после возврата с Т-Банк)
    """
    try:
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Платеж не найден"
            )
        
        # Обновляем статус платежа
        if success:
            # 🔒 ЗАЩИТА ОТ ДВОЙНОГО ТОПАПА: проверяем что платеж еще не успешный
            if payment.status == 'success':
                logger.warning(f"⚠️ Платеж {order_id} уже был помечен как успешный, пропускаем дублированный топап")
                return {
                    "success": True,
                    "message": "Платеж уже был обработан",
                    "payment_status": payment.status
                }
            
            payment.status = 'success'
            payment.completed_at = datetime.utcnow()
            if payment_id:
                payment.tinkoff_payment_id = payment_id
            
            # Пополняем баланс пользователя
            from services.balance_service import BalanceService
            balance_service = BalanceService(db)
            balance_service.top_up_balance(
                user_id=payment.user_id,
                amount=float(payment.amount),
                description=f"Пополнение через Т-Банк (заказ {order_id})"
            )
            
            # 🎯 РЕЗЕРВНАЯ СИНХРОНИЗАЦИЯ ПРОФИЛЯ ПОКУПАТЕЛЯ (на случай если webhook не дошел)
            # Если ngrok упал или webhook не дошел, контакт всё равно "прилипнет" к CustomerKey
            # Дублируем вызов как fallback для frontend-пути оплаты
            sync_customer_to_tinkoff(
                user_id=payment.user_id,
                email=payment.customer_email,
                phone=payment.customer_phone
            )
            
            logger.info(f"Платеж {order_id} успешно завершен, баланс пополнен на {payment.amount} руб.")
        else:
            payment.status = 'failed'
            payment.completed_at = datetime.utcnow()
            logger.warning(f"Платеж {order_id} завершился ошибкой: {error_message}")
        
        db.commit()
        
        return {
            "success": True,
            "message": "Статус платежа обновлен",
            "payment_status": payment.status
        }
        
    except Exception as e:
        logger.error(f"Ошибка обработки результата платежа {order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка обработки платежа"
        )

@router.post("/tinkoff-notification")
@rate_limit_by_ip(limit=100, window=3600)  # 🔒 Максимум 100 webhook в час с одного IP
async def tinkoff_notification(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint для обработки уведомлений от Тинькофф о статусе платежа
    Вызывается автоматически при изменении статуса платежа
    """
    try:
        # Логируем источник и проверяем IP 
        forwarded_for = request.headers.get('x-forwarded-for', '')
        fallback_ip = request.client.host if request.client else 'unknown'
        client_ip = extract_client_ip(forwarded_for, fallback_ip)
        logger.info(f"Webhook от Т-Банк с IP: {client_ip}")
        if forwarded_for:
            logger.info(f"X-Forwarded-For: {forwarded_for} → выбран: {client_ip}")
        
        # 🔒 МЯГКАЯ ПРОВЕРКА IP T-BANK (только предупреждение)
        if not is_tinkoff_ip(client_ip):
            logger.warning(f"⚠️ ВНИМАНИЕ: Webhook с IP {client_ip} не из известного whitelist T-Bank")
            logger.warning(f"🔐 Полагаемся на проверку подписи для безопасности")
        else:
            logger.info(f"✅ Webhook с проверенного IP T-Bank: {client_ip}")

        # Получаем данные из запроса (поддерживаем JSON и form-data)
        content_type = request.headers.get('content-type', '')
        if 'application/json' in content_type:
            notification_data = await request.json()
        else:
            form_data = await request.form()
            notification_data = dict(form_data)
        
        logger.info(f"📨 ПОЛУЧЕН WEBHOOK ОТ T-BANK:")
        logger.info(f"   OrderId: {notification_data.get('OrderId')}")
        logger.info(f"   Status: {notification_data.get('Status')}")
        logger.info(f"   PaymentId: {notification_data.get('PaymentId')}")
        logger.info(f"   IP: {client_ip}")
        logger.info(f"   Content-Type: {content_type}")
        
        # Детальное логирование для анализа подписи
        logger.info(f"🔍 WEBHOOK АНАЛИЗ от IP {client_ip}:")
        logger.info(f"   Content-Type: {content_type}")
        safe_data = {k: v for k, v in notification_data.items() if k not in ['Token', 'Password']}
        logger.info(f"   Все поля webhook'а: {safe_data}")
        logger.info(f"   Список ключей: {sorted(list(notification_data.keys()))}")
        logger.info(f"   Получен Token: {'***СКРЫТ***' if notification_data.get('Token') else 'ОТСУТСТВУЕТ'}")
        
        # Проверяем обязательные поля
        required_fields = ['OrderId', 'Status', 'PaymentId', 'Token']
        for field in required_fields:
            if field not in notification_data:
                logger.error(f"Отсутствует обязательное поле {field} в уведомлении")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing required field: {field}"
                )
        
        order_id = notification_data['OrderId']
        payment_status = notification_data['Status']
        payment_id = notification_data['PaymentId']
        received_token = notification_data['Token']
        
        # 🔐 КРИТИЧЕСКАЯ ПРОВЕРКА ПОДПИСИ (основная защита)
        logger.info(f"🔐 ПРОВЕРКА ПОДПИСИ для {order_id}")
        logger.info(f"🔐 Получена подпись от T-Bank: {_mask_signature(received_token)}")
        
        if not verify_webhook_signature(notification_data, received_token):
            logger.error(f"🚨 КРИТИЧЕСКАЯ ОШИБКА: Неверная подпись webhook для {order_id}")
            logger.error(f"❌ Получена подпись: {_mask_signature(received_token)}")
            logger.error(f"❌ IP источника: {client_ip}")
            logger.error(f"❌ Все данные webhook: {notification_data}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature - security violation"
            )
        
        logger.info(f"✅ Подпись webhook'а проверена успешно")
        
        # Ищем платеж в БД
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        if not payment:
            logger.warning(f"Платеж {order_id} не найден в БД")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        # 🔒 ЗАЩИТА ОТ ПОВТОРНОЙ ОБРАБОТКИ WEBHOOK
        if payment.webhook_processed_at:
            logger.info(f"⚠️ Webhook для {order_id} уже обработан {payment.webhook_processed_at}")
            return {"Status": "OK"}  # Возвращаем успех для T-Bank
        
        # Маппинг статусов Тинькофф на наши статусы
        # NOTE: для PayType='O' (одностадийный) AUTHORIZED = успешная оплата
        # Для двухстадийных платежей AUTHORIZED = 'pending' (ожидает подтверждения)
        status_mapping = {
            'NEW': 'pending',
            'FORM_SHOWED': 'pending', 
            'AUTHORIZING': 'pending',
            'AUTHORIZED': 'success',  # одностадийный платеж завершен
            'CONFIRMED': 'success',
            'PARTIAL_REFUNDED': 'partial_refund',
            'REFUNDED': 'refunded',
            'REJECTED': 'failed',
            'CANCELED': 'canceled',
            'DEADLINE_EXPIRED': 'expired',
            'FAILED': 'failed',
            'REVERSED': 'reversed',
            'PARTIAL_REVERSED': 'partial_reversed',
            '3DS_CHECKING': 'pending',
            '3DS_CHECKED': 'pending',
            'ATTEMPTS_EXPIRED': 'expired'
        }
        
        # Обновляем статус платежа
        old_status = payment.status
        new_status = status_mapping.get(payment_status, 'unknown')
        
        payment.status = new_status
        payment.tinkoff_status = payment_status  # Сохраняем оригинальный статус от Тинькофф
        payment.tinkoff_payment_id = payment_id
        
        # Сохраняем дополнительную информацию, если есть
        if 'ErrorCode' in notification_data:
            payment.error_code = notification_data['ErrorCode']
        if 'Message' in notification_data:
            payment.error_message = notification_data['Message']
        if 'Pan' in notification_data:
            payment.card_mask = notification_data['Pan']
        
        # Если платеж успешно завершен - пополняем баланс
        if new_status == 'success' and old_status != 'success':
            payment.completed_at = datetime.utcnow()
            
            # Пополняем баланс пользователя
            from services.balance_service import BalanceService
            balance_service = BalanceService(db)
            balance_service.top_up_balance(
                user_id=payment.user_id,
                amount=float(payment.amount),
                description=f"Пополнение через Т-Банк (заказ {order_id})"
            )
            
            logger.info(f"🎉 ПЛАТЕЖ УСПЕШНО ЗАВЕРШЕН:")
            logger.info(f"   OrderId: {order_id}")
            logger.info(f"   Сумма: {payment.amount} руб.")
            logger.info(f"   Пользователь: {payment.user_id}")
            logger.info(f"   PaymentId: {payment_id}")
            logger.info(f"   🏦 Баланс пополнен на {payment.amount} руб.")
            
            # 🎯 СИНХРОНИЗИРУЕМ ПРОФИЛЬ ПОКУПАТЕЛЯ В T-BANK (best-effort)
            # Это поможет отображать email в ЛК для будущих заказов этого CustomerKey
            # ⚠️ ВАЖНО: для уже проведенного платежа email может не отобразиться задним числом
            # в карточке заказа (особенно для T-Wallet), но будет доступен в чеке и 
            # появится в ЛК при следующих платежах с тем же CustomerKey
            sync_customer_to_tinkoff(
                user_id=payment.user_id,
                email=payment.customer_email,
                phone=payment.customer_phone
            )
        
        # Если платеж отклонен/отменен - отмечаем время завершения
        elif new_status in ['failed', 'canceled', 'expired'] and old_status not in ['failed', 'canceled', 'expired']:
            payment.completed_at = datetime.utcnow()
            logger.warning(f"Платеж {order_id} завершен с ошибкой: {payment_status}")
        
        # 🔒 ОТМЕЧАЕМ WEBHOOK КАК ОБРАБОТАННЫЙ
        payment.webhook_processed_at = datetime.utcnow()
        
        db.commit()
        
        logger.info(f"Статус платежа {order_id} обновлен: {old_status} → {new_status}")
        logger.info(f"🔒 Webhook обработан и заблокирован от повторов")
        
        # Возвращаем OK для Тинькофф
        return {"Status": "OK"}
        
    except HTTPException:
        # Перепроброс HTTPException без изменений
        raise
    except Exception as e:
        logger.error(f"Ошибка обработки уведомления Тинькофф: {e}")
        import traceback
        logger.error(f"Полный трейс: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/history")
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """История платежей пользователя"""
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).limit(50).all()
    
    return [{
        "order_id": p.order_id,
        "amount": p.amount,
        "status": p.status,
        "description": p.description,
        "created_at": p.created_at,
        "completed_at": p.completed_at,
        "payment_id": p.tinkoff_payment_id
    } for p in payments]

@router.post("/cancel/{order_id}")
async def cancel_payment(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Отмена/возврат платежа через Tinkoff Cancel API"""
    try:
        # Ищем платеж в БД
        payment = db.query(Payment).filter(
            Payment.order_id == order_id,
            Payment.user_id == current_user.id
        ).first()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Платеж не найден"
            )
        
        if not payment.tinkoff_payment_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="У платежа нет PaymentId от Tinkoff"
            )
        
        # Данные для Cancel запроса
        cancel_data = {
            'TerminalKey': TINKOFF_TERMINAL_KEY,
            'PaymentId': payment.tinkoff_payment_id
        }
        
        # Добавляем подпись
        token = calculate_signature(cancel_data)
        cancel_data['Token'] = token
        
        logger.info(f"🔄 ОТМЕНА ПЛАТЕЖА {order_id} (PaymentId: {payment.tinkoff_payment_id})")
        
        # Отправляем запрос Cancel к Tinkoff
        response = requests.post(
            f"{TINKOFF_API_URL}Cancel",
            json=cancel_data,
            headers={'Content-Type': 'application/json'},
            timeout=TINKOFF_REQUEST_TIMEOUT
        )
        
        logger.info(f"Отправлен Cancel запрос для {order_id} (статус {response.status_code})")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('Success'):
                # Обновляем статус в БД
                payment.status = 'canceled'
                payment.completed_at = datetime.utcnow()
                db.commit()
                
                logger.info(f"✅ Платеж {order_id} успешно отменен")
                
                return {
                    "success": True,
                    "message": "Платеж успешно отменен",
                    "order_id": order_id,
                    "payment_id": payment.tinkoff_payment_id,
                    "status": "canceled"
                }
            else:
                error_code = result.get('ErrorCode', 'UNKNOWN')
                error_message = result.get('Message', 'Неизвестная ошибка')
                logger.error(f"❌ Ошибка отмены платежа {order_id}: {error_code} - {error_message}")
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ошибка отмены: {error_message}"
                )
        else:
            logger.error(f"❌ HTTP ошибка при отмене платежа {order_id}: {response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Ошибка соединения с платежной системой"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Исключение при отмене платежа {order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера"
        )


# ==========================================
# PRODUCTION MONITORING & HEALTH CHECKS
# ==========================================

@router.get("/health")
async def payment_system_health(db: Session = Depends(get_db)):
    """Health check для системы платежей"""
    try:
        # Проверка подключения к БД
        recent_payments = db.query(Payment).filter(
            Payment.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
        
        # Проверка процента успешных платежей за последние 24 часа
        successful_payments = db.query(Payment).filter(
            Payment.created_at >= datetime.utcnow() - timedelta(hours=24),
            Payment.status == 'success'
        ).count()
        
        success_rate = (successful_payments / recent_payments * 100) if recent_payments > 0 else 100
        
        health_status = {
            "status": "healthy" if success_rate >= 80 else "degraded",
            "tinkoff_api": "connected",
            "database": "connected", 
            "payments_24h": recent_payments,
            "success_rate": round(success_rate, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@router.get("/metrics")
async def payment_metrics(db: Session = Depends(get_db)):
    """Метрики системы платежей для мониторинга"""
    try:
        now = datetime.utcnow()
        day_ago = now - timedelta(hours=24)
        
        # Общая статистика за 24 часа
        total_payments = db.query(Payment).filter(Payment.created_at >= day_ago).count()
        successful_payments = db.query(Payment).filter(
            Payment.created_at >= day_ago, 
            Payment.status == 'success'
        ).count()
        failed_payments = db.query(Payment).filter(
            Payment.created_at >= day_ago,
            Payment.status == 'failed'
        ).count()
        pending_payments = db.query(Payment).filter(
            Payment.created_at >= day_ago,
            Payment.status == 'pending'
        ).count()
        
        # Средняя сумма платежа
        from sqlalchemy import func
        avg_amount = db.query(func.avg(Payment.amount)).filter(
            Payment.created_at >= day_ago,
            Payment.status == 'success'
        ).scalar() or 0
        
        return {
            "payments_24h": {
                "total": total_payments,
                "successful": successful_payments,
                "failed": failed_payments, 
                "pending": pending_payments,
                "success_rate": round((successful_payments / total_payments * 100) if total_payments > 0 else 0, 2)
            },
            "average_amount": round(float(avg_amount), 2),
            "timestamp": now.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Metrics error: {e}")
        return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}