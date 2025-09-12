from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Payment, UserBalance, BalanceTransaction
from database import models
from core.auth import get_current_user
from validators.rate_limiter import rate_limit_api, rate_limit_by_ip
from datetime import datetime, timedelta
import uuid
import os
import logging
import hashlib
import requests
import json
import base64
from typing import List, Optional


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])

# Конфигурация ЮKassa
YOOKASSA_SHOP_ID = os.getenv('YOOKASSA_SHOP_ID', 'your_shop_id_here')
YOOKASSA_SECRET_KEY = os.getenv('YOOKASSA_SECRET_KEY', 'your_secret_key_here')
YOOKASSA_TEST_MODE = os.getenv('YOOKASSA_TEST_MODE', 'true').lower() == 'true'

# API URLs
YOOKASSA_API_URL = 'https://api.yookassa.ru/v3/'

# URLs для перенаправления
YOOKASSA_SUCCESS_URL = os.getenv('YOOKASSA_SUCCESS_URL', 'https://replyx.ru/payment/success')
YOOKASSA_FAIL_URL = os.getenv('YOOKASSA_FAIL_URL', 'https://replyx.ru/payment/error')

def mask_shop_id(shop_id: str) -> str:
    """Маскирует Shop ID для безопасного логирования"""
    if not shop_id or len(shop_id) <= 6:
        return shop_id
    return f"{shop_id[:3]}***{shop_id[-3:]}"

def generate_idempotence_key() -> str:
    """Генерирует уникальный ключ идемпотентности для ЮKassa"""
    return str(uuid.uuid4())

def get_basic_auth_header() -> str:
    """Создает заголовок Basic Auth для ЮKassa API"""
    credentials = f"{YOOKASSA_SHOP_ID}:{YOOKASSA_SECRET_KEY}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded_credentials}"

def log_yookassa_mode():
    """Логирует текущий режим работы ЮKassa"""
    mode = "TEST" if YOOKASSA_TEST_MODE else "PROD"
    logger.info(f"🚀 Режим ЮKassa: {mode}")
    logger.info(f"   Shop ID: {mask_shop_id(YOOKASSA_SHOP_ID)}")
    logger.info(f"   API URL: {YOOKASSA_API_URL}")

# Логируем режим при импорте модуля
log_yookassa_mode()

@router.post("/create-payment")
@rate_limit_api(limit=10, window=60)  # 10 запросов в минуту
async def create_payment(
    request: Request,
    amount: float = Form(..., gt=0, description="Сумма платежа в рублях"),
    email: str = Form(None, description="Email покупателя для чека"),
    phone: str = Form(None, description="Телефон покупателя"),
    name: str = Form(None, description="Имя покупателя"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Создание платежа через ЮKassa API
    
    Args:
        amount: Сумма в рублях (например, 100.50)
        email: Email покупателя (опционально)
        phone: Телефон покупателя (опционально) 
        name: Имя покупателя (опционально)
        
    Returns:
        JSON с данными платежа и URL для оплаты
    """
    try:
        logger.info(f"🔍 СОЗДАНИЕ ПЛАТЕЖА ЮKASSA - ДИАГНОСТИКА:")
        logger.info(f"   📧 Email из формы: '{email}' (тип: {type(email)})")
        logger.info(f"   📞 Телефон из формы: '{phone}' (тип: {type(phone)})")
        logger.info(f"   👤 Имя из формы: '{name}' (тип: {type(name)})")
        
        user = current_user  # current_user уже является объектом User
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
            
        logger.info(f"   👤 Email пользователя из БД: '{user.email}' (тип: {type(user.email)})")
        
        # Используем email из формы, если указан, иначе из профиля пользователя
        final_email = email or user.email
        
        # Генерируем уникальный order_id
        order_id = f"replyx_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}"
        
        # Создаем запись платежа в БД
        payment = Payment(
            user_id=user.id,
            order_id=order_id,
            amount=amount,
            currency="RUB",
            status="pending",
            payment_method="yookassa",
            description=f"Пополнение баланса ReplyX на {amount} руб.",
            # Данные клиента
            customer_email=final_email,
            customer_phone=phone,
            customer_name=name,
            created_at=datetime.utcnow()
        )
        
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        logger.info(f"Создан платеж {order_id} для пользователя {user.id} на сумму {amount} руб.")
        log_yookassa_mode()
        
        # Подготовка данных для ЮKassa API
        idempotence_key = generate_idempotence_key()
        
        # Формируем URL для возврата
        success_url = f"{YOOKASSA_SUCCESS_URL}?order={order_id}"
        
        yookassa_data = {
            "amount": {
                "value": f"{amount:.2f}",
                "currency": "RUB"
            },
            "capture": True,  # Одностадийная оплата
            "confirmation": {
                "type": "redirect",
                "return_url": success_url
            },
            "description": f"Пополнение баланса ReplyX на {amount} руб.",
            "metadata": {
                "order_id": order_id,
                "user_id": str(user.id)
            }
        }
        
        # Добавляем информацию о покупателе, если есть
        if final_email or phone or name:
            customer_data = {}
            if final_email:
                customer_data["email"] = final_email
            if phone:
                customer_data["phone"] = phone
            if name:
                customer_data["full_name"] = name
                
            if customer_data:
                yookassa_data["customer"] = customer_data
        
        # Добавляем чек, если есть email
        if final_email:
            yookassa_data["receipt"] = {
                "customer": {
                    "email": final_email
                },
                "items": [
                    {
                        "description": f"Пополнение баланса ReplyX на {amount} руб.",
                        "amount": {
                            "value": f"{amount:.2f}",
                            "currency": "RUB"
                        },
                        "quantity": "1",
                        "vat_code": 1,  # НДС не облагается
                        "payment_subject": "service",  # Обязательное поле для YooKassa
                        "payment_mode": "full_payment"  # Полная предоплата
                    }
                ]
            }
            logger.info(f"📄 ✅ Добавлен чек для email: {final_email}")
        
        logger.info("📤 ОТПРАВЛЯЕМ HTTP ЗАПРОС К ЮKASSA:")
        logger.info(f"   URL: {YOOKASSA_API_URL}payments")
        logger.info(f"   Idempotence-Key: {idempotence_key}")
        logger.info(f"   JSON данные: {json.dumps(yookassa_data, indent=2, ensure_ascii=False)}")
        
        # Отправляем запрос к ЮKassa
        headers = {
            'Authorization': get_basic_auth_header(),
            'Idempotence-Key': idempotence_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{YOOKASSA_API_URL}payments",
            json=yookassa_data,
            headers=headers,
            timeout=30
        )
        
        logger.info(f"Отправлен запрос к ЮKassa для заказа {order_id}")
        logger.info(f"Получен ответ от ЮKassa (статус {response.status_code})")
        
        if response.status_code == 200:
            response_data = response.json()
            logger.info("🌐 ОТВЕТ ОТ ЮKASSA:")
            logger.info(f"   JSON ответ: {json.dumps(response_data, indent=2, ensure_ascii=False)}")
            
            # Обновляем платеж данными от ЮKassa
            payment.yookassa_payment_id = response_data.get('id')
            payment.yookassa_status = response_data.get('status')
            db.commit()
            
            payment_url = response_data.get('confirmation', {}).get('confirmation_url')
            if payment_url:
                logger.info(f"Получен PaymentURL от ЮKassa: {payment_url}")
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": True,
                        "redirect_url": payment_url,  # Фронтенд ожидает redirect_url
                        "payment_url": payment_url,   # Дублируем для обратной совместимости
                        "order_id": order_id,
                        "payment_id": response_data.get('id'),
                        "amount": amount,
                        "currency": "RUB"
                    }
                )
            else:
                logger.error("ЮKassa не вернула confirmation_url")
                raise HTTPException(status_code=500, detail="Не удалось получить ссылку для оплаты")
        else:
            error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            logger.error(f"Ошибка ЮKassa API: {response.status_code} - {error_data}")
            
            # Обновляем статус платежа
            payment.status = "failed"
            payment.yookassa_status = "failed"
            db.commit()
            
            raise HTTPException(
                status_code=500, 
                detail=f"Ошибка создания платежа: {error_data}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Неожиданная ошибка при создании платежа: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")


@router.post("/yookassa-webhook")
@rate_limit_by_ip(limit=100, window=3600)  # 100 webhook в час с одного IP
async def yookassa_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Обработка webhook уведомлений от ЮKassa
    
    ЮKassa отправляет уведомления о смене статуса платежа
    """
    try:
        # Получаем IP клиента  
        client_ip = request.client.host
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            client_ip = forwarded_for.split(',')[0].strip()
            
        logger.info(f"📨 ПОЛУЧЕН WEBHOOK ОТ ЮKASSA с IP: {client_ip}")
        
        # Читаем JSON данные
        webhook_data = await request.json()
        
        logger.info(f"🔍 WEBHOOK ДАННЫЕ от ЮKassa:")
        logger.info(f"   Тип события: {webhook_data.get('event')}")
        logger.info(f"   Все поля: {list(webhook_data.keys())}")
        
        # Извлекаем данные платежа
        payment_data = webhook_data.get('object', {})
        yookassa_payment_id = payment_data.get('id')
        payment_status = payment_data.get('status')
        paid = payment_data.get('paid', False)
        
        logger.info(f"   Payment ID: {yookassa_payment_id}")
        logger.info(f"   Status: {payment_status}")
        logger.info(f"   Paid: {paid}")
        
        if not yookassa_payment_id:
            logger.error("Отсутствует ID платежа в webhook")
            return JSONResponse(status_code=400, content={"error": "Missing payment ID"})
        
        # Ищем платеж в БД
        payment = db.query(Payment).filter(
            Payment.yookassa_payment_id == yookassa_payment_id
        ).first()
        
        if not payment:
            logger.error(f"Платеж с ЮKassa ID {yookassa_payment_id} не найден в БД")
            return JSONResponse(status_code=404, content={"error": "Payment not found"})
            
        logger.info(f"✅ Найден платеж: {payment.order_id} (сумма: {payment.amount} руб.)")
        
        # Обновляем статус платежа
        old_status = payment.status
        payment.yookassa_status = payment_status
        
        # Маппинг статусов ЮKassa в наши статусы
        status_mapping = {
            'pending': 'pending',
            'waiting_for_capture': 'processing', 
            'succeeded': 'completed',
            'canceled': 'cancelled'
        }
        
        new_status = status_mapping.get(payment_status, payment_status)
        payment.status = new_status
        
        # Если платеж успешен - пополняем баланс
        if payment_status == 'succeeded' and paid and old_status != 'completed':
            user = db.query(User).filter(User.id == payment.user_id).first()
            if user:
                # Получаем или создаем запись баланса
                user_balance = db.query(UserBalance).filter(UserBalance.user_id == user.id).first()
                if not user_balance:
                    user_balance = UserBalance(user_id=user.id, balance=0.00)
                    db.add(user_balance)
                    db.flush()
                
                old_balance = float(user_balance.balance or 0)
                new_balance = old_balance + float(payment.amount)
                
                # Обновляем баланс
                user_balance.balance = new_balance
                user_balance.total_topped_up = float(user_balance.total_topped_up or 0) + float(payment.amount)
                user_balance.updated_at = datetime.utcnow()
                
                # Создаем транзакцию
                transaction = BalanceTransaction(
                    user_id=user.id,
                    amount=float(payment.amount),
                    transaction_type='topup',
                    description=f"Пополнение через ЮKassa: {payment.order_id}",
                    balance_before=old_balance,
                    balance_after=new_balance,
                    related_id=payment.id,
                    created_at=datetime.utcnow()
                )
                db.add(transaction)
                
                logger.info(f"💰 Пополнен баланс пользователя {user.id}: {old_balance} + {payment.amount} = {new_balance} руб.")
            else:
                logger.error(f"Пользователь {payment.user_id} не найден для пополнения баланса")
        
        payment.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"✅ Платеж {payment.order_id} обновлен: {old_status} → {new_status}")
        
        return JSONResponse(
            status_code=200, 
            content={"status": "ok", "message": "Webhook processed successfully"}
        )
        
    except Exception as e:
        logger.error(f"Ошибка обработки ЮKassa webhook: {str(e)}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Internal server error"})


@router.get("/payment-status/{order_id}")
@rate_limit_api(limit=30, window=60)
async def get_payment_status(
    order_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение статуса платежа по order_id"""
    try:
        payment = db.query(Payment).filter(
            Payment.order_id == order_id,
            Payment.user_id == current_user.id
        ).first()
        
        if not payment:
            raise HTTPException(status_code=404, detail="Платеж не найден")
            
        return JSONResponse(
            status_code=200,
            content={
                "order_id": payment.order_id,
                "status": payment.status,
                "yookassa_status": payment.yookassa_status,
                "amount": float(payment.amount),
                "currency": payment.currency,
                "created_at": payment.created_at.isoformat(),
                "description": payment.description
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка получения статуса платежа {order_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка сервера")