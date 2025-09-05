from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Payment
from core.auth import get_current_user
from datetime import datetime
import uuid
import os
import logging
import hashlib
import hmac

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/payments", tags=["payments"])

# Конфигурация Т-Банк
TINKOFF_TERMINAL_KEY = os.getenv('TINKOFF_TERMINAL_KEY', 'your_terminal_key_here')
TINKOFF_SECRET_KEY = os.getenv('TINKOFF_SECRET_KEY', 'your_secret_key_here')
TINKOFF_SANDBOX_MODE = os.getenv('TINKOFF_SANDBOX_MODE', 'true').lower() == 'true'
TINKOFF_API_URL = "https://rest-api-test.tinkoff.ru/v2/" if TINKOFF_SANDBOX_MODE else "https://securepay.tinkoff.ru/v2/"
TINKOFF_PAYMENT_URL = "https://securepay.tinkoff.ru/html/payForm/"

def generate_order_id():
    """Генерация уникального номера заказа"""
    return f"replyx_{int(datetime.utcnow().timestamp())}_{str(uuid.uuid4())[:8]}"

def calculate_signature(data: dict) -> str:
    """Вычисление подписи для запроса к Т-Банк"""
    # Исключаем поле подписи и добавляем секретный ключ
    filtered_data = {k: v for k, v in data.items() if k != 'token' and v is not None}
    filtered_data['password'] = TINKOFF_SECRET_KEY
    
    # Сортируем по ключам и создаем строку
    sorted_keys = sorted(filtered_data.keys())
    concatenated_string = ''.join(str(filtered_data[key]) for key in sorted_keys)
    
    # Вычисляем SHA256 хэш
    return hashlib.sha256(concatenated_string.encode('utf-8')).hexdigest()

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
        
        # URLs для обратного вызова
        base_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        success_url = f"{base_url}/payment-success"
        fail_url = f"{base_url}/payment-error"
        
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
        
        # Подготавливаем данные для Т-Банк
        amount_kopecks = int(amount * 100)  # Т-Банк принимает сумму в копейках
        
        form_data = {
            'terminalkey': TINKOFF_TERMINAL_KEY,
            'order': order_id,
            'amount': amount_kopecks,
            'currency': 'RUB',
            'language': 'ru',
            'description': description,
            'customerKey': str(current_user.id),
            'email': current_user.email,
            'successURL': success_url,
            'failURL': fail_url
        }
        
        logger.info(f"Создан платеж {order_id} для пользователя {current_user.id} на сумму {amount} руб.")
        
        # Формируем HTML форму для автоматической отправки
        html_form = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Перенаправление на оплату...</title>
            <style>
                body {{ 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                    background: #f5f5f5; 
                }}
                .loading {{ 
                    text-align: center; 
                    padding: 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }}
                .spinner {{ 
                    border: 3px solid #f3f3f3; 
                    border-top: 3px solid #7c3aed; 
                    border-radius: 50%; 
                    width: 40px; 
                    height: 40px; 
                    animation: spin 1s linear infinite; 
                    margin: 0 auto 20px; 
                }}
                @keyframes spin {{ 0% {{ transform: rotate(0deg); }} 100% {{ transform: rotate(360deg); }} }}
            </style>
        </head>
        <body>
            <div class="loading">
                <div class="spinner"></div>
                <h3>Перенаправление на оплату...</h3>
                <p>Пожалуйста, подождите...</p>
            </div>
            
            <form id="paymentForm" method="POST" action="{TINKOFF_PAYMENT_URL}" style="display: none;">
                <input type="hidden" name="terminalkey" value="{form_data['terminalkey']}">
                <input type="hidden" name="order" value="{form_data['order']}">
                <input type="hidden" name="amount" value="{form_data['amount']}">
                <input type="hidden" name="currency" value="{form_data['currency']}">
                <input type="hidden" name="language" value="{form_data['language']}">
                <input type="hidden" name="description" value="{form_data['description']}">
                <input type="hidden" name="customerKey" value="{form_data['customerKey']}">
                <input type="hidden" name="email" value="{form_data['email']}">
                <input type="hidden" name="successURL" value="{form_data['successURL']}">
                <input type="hidden" name="failURL" value="{form_data['failURL']}">
            </form>
            
            <script>
                setTimeout(function() {{
                    document.getElementById('paymentForm').submit();
                }}, 1500);
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_form)
        
    except Exception as e:
        logger.error(f"Ошибка создания платежа: {e}")
        
        # Если платеж уже создан, откатываем
        if 'payment' in locals():
            db.delete(payment)
            db.commit()
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка создания платежа"
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