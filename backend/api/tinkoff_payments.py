from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Payment
from core.auth import get_current_user
from datetime import datetime
from pydantic import BaseModel
import uuid
import os
import logging
import hashlib
import hmac
import requests
import json


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])

# Конфигурация Т-Банк
TINKOFF_TERMINAL_KEY = os.getenv('TINKOFF_TERMINAL_KEY', 'your_terminal_key_here')
TINKOFF_SECRET_KEY = os.getenv('TINKOFF_SECRET_KEY', 'your_secret_key_here')
TINKOFF_SANDBOX_MODE = os.getenv('TINKOFF_SANDBOX_MODE', 'true').lower() == 'true'
TINKOFF_MOCK_MODE = os.getenv('TINKOFF_MOCK_MODE', 'true').lower() == 'true'  # Mock режим для разработки
TINKOFF_API_URL = "https://rest-api-test.tinkoff.ru/v2/" if TINKOFF_SANDBOX_MODE else "https://securepay.tinkoff.ru/v2/"

def generate_order_id():
    """Генерация уникального номера заказа"""
    return f"replyx_{int(datetime.utcnow().timestamp())}_{str(uuid.uuid4())[:8]}"

def calculate_signature(data: dict) -> str:
    """Вычисление подписи для запроса к Т-Банк согласно документации"""
    # Исключаем поле подписи, пустые значения и None
    filtered_data = {k: v for k, v in data.items() 
                    if k not in ['token', 'Token'] and v is not None and str(v).strip() != ''}
    
    # Добавляем секретный ключ как Password (согласно документации)
    filtered_data['Password'] = TINKOFF_SECRET_KEY
    
    # Сортируем по ключам и создаем строку конкатенации
    sorted_keys = sorted(filtered_data.keys())
    concatenated_values = [str(filtered_data[key]) for key in sorted_keys]
    concatenated_string = ''.join(concatenated_values)
    
    logger.error(f"Значения для подписи (по порядку): {concatenated_values}")
    logger.error(f"Строка для хеширования: {concatenated_string}")
    
    # Вычисляем SHA256 хэш
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

async def init_payment_tinkoff(order_id: str, amount: int, description: str, customer_key: str, success_url: str, fail_url: str):
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
        'Currency': 'RUB',
        'Description': description,
        'CustomerKey': customer_key,
        'SuccessURL': success_url,
        'FailURL': fail_url,
        'Language': 'ru',
        'PayType': 'O'
    }
    
    # Добавляем NotificationURL только если он задан и доступен из интернета
    notification_url = os.getenv('TINKOFF_NOTIFICATION_URL', '').strip()
    if notification_url and not notification_url.startswith('http://localhost'):
        data['NotificationURL'] = notification_url
    
    # Добавляем токен (подпись)
    token = calculate_signature(data)
    data['Token'] = token
    
    logger.error(f"Данные для подписи: {[k for k in sorted(data.keys()) if k != 'Token']}")
    logger.error(f"Рассчитанный токен: {token}")
    logger.error(f"URL запроса: {TINKOFF_API_URL}Init")
    
    try:
        response = requests.post(
            f"{TINKOFF_API_URL}Init",
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        logger.error(f"Запрос к Тинькофф Init: {data}")
        logger.error(f"Ответ от Тинькофф: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('Success') and result.get('PaymentURL'):
                return result['PaymentURL']
            else:
                logger.error(f"Ошибка в ответе Тинькофф: {result}")
                raise Exception(f"Ошибка Тинькофф: {result.get('Message', 'Неизвестная ошибка')}")
        else:
            logger.error(f"HTTP ошибка: {response.status_code}, {response.text}")
            raise Exception(f"HTTP ошибка: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка запроса к Тинькофф: {e}")
        raise Exception("Ошибка соединения с платежной системой")

@router.post("/create-payment")
async def create_payment(
    amount: float = Form(..., ge=1, le=50000),
    description: str = Form(default="Пополнение баланса ReplyX"),
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
        
        # Создаем запись о платеже в БД
        payment = Payment(
            user_id=current_user.id,
            order_id=order_id,
            amount=amount,
            status='pending',
            description=description,
            success_url=success_url,
            fail_url=fail_url
        )
        
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        # Инициируем платеж через API Тинькофф
        amount_kopecks = int(amount * 100)  # Т-Банк принимает сумму в копейках
        
        logger.info(f"Создан платеж {order_id} для пользователя {current_user.id} на сумму {amount} руб.")
        logger.error(f"Используется терминал: {TINKOFF_TERMINAL_KEY}")
        logger.error(f"Sandbox режим: {TINKOFF_SANDBOX_MODE}")
        logger.error(f"API URL: {TINKOFF_API_URL}")
        
        # Получаем URL для оплаты от Тинькофф
        payment_url = await init_payment_tinkoff(
            order_id=order_id,
            amount=amount_kopecks,
            description=description,
            customer_key=str(current_user.id),
            success_url=success_url,
            fail_url=fail_url
        )
        
        logger.info(f"Получен PaymentURL от Тинькофф: {payment_url}")
        
        # Возвращаем JSON с URL для перенаправления
        return JSONResponse(content={
            "success": True,
            "redirect_url": payment_url,
            "order_id": order_id
        })
        
    except Exception as e:
        logger.error(f"Ошибка создания платежа: {e}")
        logger.error(f"Тип ошибки: {type(e)}")
        import traceback
        logger.error(f"Полный трейс: {traceback.format_exc()}")
        
        # Если платеж уже создан, откатываем
        if 'payment' in locals():
            try:
                db.delete(payment)
                db.commit()
            except Exception as rollback_error:
                logger.error(f"Ошибка отката транзакции: {rollback_error}")
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка создания платежа: {str(e)}"
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
            balance_service.add_balance(
                user_id=payment.user_id,
                amount=payment.amount,
                transaction_type='payment_topup',
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