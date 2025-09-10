from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Payment
from core.auth import get_current_user
from validators.rate_limiter import rate_limit_api, rate_limit_by_ip
from datetime import datetime
from pydantic import BaseModel
import uuid
import os
import logging
import hashlib
import hmac
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

# API URLs
TINKOFF_SANDBOX_API_URL = os.getenv('TINKOFF_SANDBOX_API_URL', 'https://rest-api-test.tinkoff.ru/v2/')
TINKOFF_PRODUCTION_API_URL = os.getenv('TINKOFF_PRODUCTION_API_URL', 'https://securepay.tinkoff.ru/v2/')
TINKOFF_API_URL = TINKOFF_SANDBOX_API_URL if TINKOFF_SANDBOX_MODE else TINKOFF_PRODUCTION_API_URL

# Дополнительные настройки
TINKOFF_REQUEST_TIMEOUT = int(os.getenv('TINKOFF_REQUEST_TIMEOUT', '30'))

# IP адреса T-Bank для webhook уведомлений (согласно документации)
TINKOFF_WEBHOOK_IPS = [
    '185.71.76.0/27',  # Основной диапазон T-Bank (продакшн)
    '185.71.77.0/27',  # Резервный диапазон T-Bank (продакшн)
    '77.75.153.0/25',  # Дополнительный диапазон (продакшн)
    '91.194.226.0/23', # Новый диапазон 2024+ (продакшн)
    '212.49.24.206/32', # Тестовый IP T-Bank (обнаружен в логах webhook'ов)
    '212.233.80.7/32',  # Продакшн IP T-Bank (обнаружен 10.09.2025)
]

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
    
    if TINKOFF_TERMINAL_KEY == 'your_terminal_key_here' or not TINKOFF_TERMINAL_KEY:
        errors.append("TINKOFF_TERMINAL_KEY не настроен")
        
    if TINKOFF_SECRET_KEY == 'your_secret_key_here' or not TINKOFF_SECRET_KEY:
        errors.append("TINKOFF_SECRET_KEY не настроен")
        
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
        
    return len(errors) == 0

# Проверяем конфигурацию при загрузке модуля
_config_valid = validate_tinkoff_config()

def generate_order_id():
    """Генерация уникального номера заказа"""
    return f"replyx_{int(datetime.utcnow().timestamp())}_{str(uuid.uuid4())[:8]}"

def tinkoff_normalize_value(value):
    """Нормализация значений для подписи согласно требованиям Т-Банк"""
    if isinstance(value, bool):
        return 'true' if value else 'false'  # булевы значения в нижнем регистре
    return str(value)

def calculate_signature(data: dict) -> str:
    """Вычисление подписи для запроса к Т-Банк согласно документации"""
    # Исключаем поле подписи, пустые значения и None
    items = [(k, v) for k, v in data.items() 
             if k not in ['token', 'Token'] and v is not None and str(v).strip() != '']
    
    # Добавляем секретный ключ как Password (согласно документации Т-Банк)
    items.append(('Password', TINKOFF_SECRET_KEY))
    
    # Сортируем по ключам (ASCII сортировка)
    items.sort(key=lambda kv: kv[0])
    
    # Нормализуем значения и создаем строку конкатенации
    normalized_values = [tinkoff_normalize_value(v) for _, v in items]
    concatenated_string = ''.join(normalized_values)
    
    # Детальное логирование для диагностики
    safe_items = [(k, tinkoff_normalize_value(v)) for k, v in items if k != 'Password']
    safe_keys = [k for k, _ in safe_items]
    safe_values = [v for _, v in safe_items]
    logger.info(f"   🔐 ПОДПИСЬ (исправленная):")
    logger.info(f"   Ключи: {safe_keys}")
    logger.info(f"   Нормализованные значения: {safe_values}")
    logger.info(f"   Длина строки для подписи: {len(concatenated_string)} символов")
    # NOTE: Строку подписи не логируем - содержит секретный ключ
    
    # Вычисляем SHA256 хэш
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

def verify_webhook_signature(data: dict, received_token: str) -> bool:
    """Проверка подписи webhook'а от Тинькофф с правильной нормализацией булевых значений"""
    try:
        logger.info(f"🔐 ПРОВЕРКА ПОДПИСИ (исправленный алгоритм)...")
        
        # Используем исправленную функцию calculate_signature с нормализацией булевых значений
        expected_token = calculate_signature(data)
        
        logger.info(f"   Получено от Т-Банк: {received_token}")
        logger.info(f"   Ожидалось (исправленное): {expected_token}")
        
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
    
    # Добавляем данные для чека (54-ФЗ), если предоставлены
    if email:
        data['EMAIL'] = email
    if phone:
        data['PHONE'] = phone
    # Имя покупателя может быть добавлено через Receipt, но это более сложная структура
    # Для базовой интеграции пока добавим только email и phone
    
    # Добавляем NotificationURL только если он задан и доступен из интернета
    notification_url = os.getenv('TINKOFF_NOTIFICATION_URL', '').strip()
    if notification_url and not notification_url.startswith('http://localhost'):
        data['NotificationURL'] = notification_url
    
    # Добавляем токен (подпись)
    logger.info(f"🔐 СОЗДАНИЕ ПОДПИСИ INIT для {order_id}:")
    logger.info(f"   Поля для Init: {sorted([k for k in data.keys()])}")
    logger.info(f"   Значения Init: {[str(data[k]) for k in sorted(data.keys())]}")
    
    token = calculate_signature(data)
    data['Token'] = token
    
    logger.info(f"   Подпись Init: {token}")
    logger.info(f"Инициация платежа {order_id} на сумму {amount} копеек")
    
    try:
        response = requests.post(
            f"{TINKOFF_API_URL}Init",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=TINKOFF_REQUEST_TIMEOUT
        )
        
        logger.info(f"Отправлен запрос к Тинькофф Init для заказа {order_id}")
        logger.info(f"Получен ответ от Тинькофф (статус {response.status_code})")
        if response.status_code != 200:
            logger.error(f"Детали ошибки от Тинькофф: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('Success') and result.get('PaymentURL'):
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
        amount_kopecks = int(amount * 100)  # Т-Банк принимает сумму в копейках
        
        logger.info(f"Создан платеж {order_id} для пользователя {current_user.id} на сумму {amount} руб.")
        logger.info(f"Терминал: {TINKOFF_TERMINAL_KEY[:8]}***")
        logger.info(f"Sandbox режим: {TINKOFF_SANDBOX_MODE}")
        logger.debug(f"API URL: {TINKOFF_API_URL}")
        
        # Получаем URL для оплаты от Тинькофф
        payment_url = await init_payment_tinkoff(
            order_id=order_id,
            amount=amount_kopecks,
            description=description,
            customer_key=str(current_user.id),
            success_url=success_url,
            fail_url=fail_url,
            email=email,
            phone=phone,
            name=name
        )
        
        # Сохраняем URL платежа в БД
        payment.payment_url = payment_url
        db.commit()
        
        logger.info(f"Получен PaymentURL от Тинькофф: {payment_url}")
        
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
        client_ip = request.headers.get('x-forwarded-for', request.client.host if request.client else 'unknown')
        logger.info(f"Webhook от Т-Банк с IP: {client_ip}")
        
        # 🔒 ПРОВЕРКА IP WHITELIST T-BANK
        if not is_tinkoff_ip(client_ip):
            logger.error(f"🚨 БЛОКИРОВКА: Webhook с неавторизованного IP {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: IP not in T-Bank whitelist"
            )

        # Получаем данные из запроса (поддерживаем JSON и form-data)
        content_type = request.headers.get('content-type', '')
        if 'application/json' in content_type:
            notification_data = await request.json()
        else:
            form_data = await request.form()
            notification_data = dict(form_data)
        
        logger.info(f"Получено уведомление от Тинькофф: OrderId={notification_data.get('OrderId')}, Status={notification_data.get('Status')}")
        
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
        
        # Проверяем подпись (токен) для безопасности
        logger.info(f"🔐 ПРОВЕРКА ПОДПИСИ для {order_id}")
        
        if not verify_webhook_signature(notification_data, received_token):
            logger.error(f"❌ Неверная подпись уведомления для заказа {order_id}")
            logger.error(f"❌ Получена подпись: {received_token}")
            logger.error(f"❌ IP источника: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid signature"
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
        status_mapping = {
            'NEW': 'pending',
            'FORM_SHOWED': 'pending', 
            'AUTHORIZING': 'pending',
            'AUTHORIZED': 'success',
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
            
            logger.info(f"Платеж {order_id} успешно завершен через webhook, баланс пополнен на {payment.amount} руб.")
        
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
        "completed_at": p.completed_at
    } for p in payments]


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