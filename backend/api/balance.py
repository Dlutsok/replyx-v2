from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database.schemas import (
    BalanceStatsResponse, 
    TopUpBalanceRequest, 
    BalanceTransactionRead,
    BalanceTransactionDetailRead,
    ServicePriceRead,
    ServicePriceUpdate
)
from services.balance_service import BalanceService
from core.auth import get_current_user
from database.models import User
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/balance", tags=["balance"])

@router.get("/welcome-bonus-status")
async def get_welcome_bonus_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Проверить статус приветственного бонуса"""
    return {
        "welcome_bonus_received": current_user.welcome_bonus_received,
        "bonus_amount": 100.0
    }

@router.post("/claim-welcome-bonus")
async def claim_welcome_bonus(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить приветственный бонус (если еще не получен)"""
    try:
        balance_service = BalanceService(db)
        transaction = balance_service.give_welcome_bonus(current_user.id)
        
        if transaction:
            return {
                "success": True,
                "message": "Приветственный бонус 100 рублей начислен!",
                "transaction_id": transaction.id,
                "new_balance": transaction.balance_after
            }
        else:
            return {
                "success": False,
                "message": "Приветственный бонус уже был получен ранее"
            }
    except Exception as e:
        logger.error(f"Ошибка начисления приветственного бонуса пользователю {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка начисления приветственного бонуса"
        )

@router.get("/stats", response_model=BalanceStatsResponse)
async def get_balance_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить статистику баланса пользователя"""
    try:
        balance_service = BalanceService(db)
        
        # Получаем баланс
        balance = balance_service.get_or_create_balance(current_user.id)
        
        # Получаем последние транзакции
        transactions = balance_service.get_transactions(current_user.id, limit=20)
        
        # Получаем цены на услуги
        service_prices = balance_service.get_service_prices()
        
        return BalanceStatsResponse(
            current_balance=balance.balance,
            total_spent=balance.total_spent,
            total_topped_up=balance.total_topped_up,
            recent_transactions=[BalanceTransactionRead.from_orm(t) for t in transactions],
            service_prices=[ServicePriceRead.from_orm(p) for p in service_prices]
        )
    except Exception as e:
        logger.error(f"Ошибка получения статистики баланса для пользователя {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения статистики баланса"
        )

@router.get("/current")
async def get_current_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить текущий баланс пользователя"""
    try:
        balance_service = BalanceService(db)
        balance = balance_service.get_balance(current_user.id)
        return {"balance": balance}
    except Exception as e:
        logger.error(f"Ошибка получения баланса для пользователя {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения баланса"
        )

@router.post("/topup")
async def top_up_balance(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Пополнить баланс пользователя"""
    try:
        # Безопасно извлекаем и конвертируем amount
        amount_raw = request.get("amount", 0)
        try:
            amount = float(amount_raw) if amount_raw is not None else 0
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный формат суммы пополнения"
            )
        
        # Безопасно извлекаем promo_code
        promo_code_raw = request.get("promo_code")
        if promo_code_raw is None or promo_code_raw == "":
            promo_code = ""
        else:
            promo_code = str(promo_code_raw).strip()
        
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Сумма пополнения должна быть положительной"
            )
        
        if amount > 100000:  # Максимум 100,000 рублей за раз
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Максимальная сумма пополнения: 100,000 рублей"
            )
        
        balance_service = BalanceService(db)
        final_amount = amount
        discount_amount = 0
        
        # Применяем промокод если указан
        if promo_code:
            from services.promo_service import PromoService
            promo_service = PromoService(db)
            
            try:
                promo_result = promo_service.apply_promo_code(
                    current_user.id,
                    promo_code,
                    amount
                )
                final_amount = promo_result["final_amount"]
                discount_amount = promo_result["discount_amount"]
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ошибка применения промокода: {str(e)}"
                )
        
        # Пополняем баланс
        description = f"Пополнение баланса на {amount} руб."
        if discount_amount > 0:
            description += f" (применен промокод {promo_code}, скидка {discount_amount} руб.)"
        
        transaction = balance_service.top_up_balance(
            current_user.id, 
            final_amount,
            description
        )
        
        return {
            "message": f"Баланс успешно пополнен на {final_amount} руб.",
            "original_amount": amount,
            "discount_amount": discount_amount,
            "final_amount": final_amount,
            "new_balance": transaction.balance_after,
            "transaction_id": transaction.id,
            "promo_code_applied": promo_code if discount_amount > 0 else None
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Ошибка пополнения баланса для пользователя {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка пополнения баланса"
        )

@router.get("/transactions", response_model=List[BalanceTransactionRead])
async def get_transactions(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить историю транзакций пользователя"""
    try:
        if limit > 100:
            limit = 100  # Максимум 100 транзакций за раз
        
        balance_service = BalanceService(db)
        transactions = balance_service.get_transactions(current_user.id, limit)
        
        return [BalanceTransactionRead.from_orm(t) for t in transactions]
    except Exception as e:
        logger.error(f"Ошибка получения транзакций для пользователя {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения истории транзакций"
        )

@router.get("/transactions/detailed", response_model=List[BalanceTransactionDetailRead])
async def get_detailed_transactions(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить детализированную историю транзакций пользователя с информацией о связанных сущностях"""
    try:
        if limit > 100:
            limit = 100  # Максимум 100 транзакций за раз
        
        balance_service = BalanceService(db)
        transactions = balance_service.get_transactions(current_user.id, limit)
        
        detailed_transactions = []
        for transaction in transactions:
            # Базовые данные транзакции
            transaction_data = {
                'id': transaction.id,
                'user_id': transaction.user_id,
                'amount': transaction.amount,
                'transaction_type': transaction.transaction_type,
                'description': transaction.description,
                'balance_before': transaction.balance_before,
                'balance_after': transaction.balance_after,
                'related_id': transaction.related_id,
                'created_at': transaction.created_at,
                'related_info': None
            }
            
            # Получаем дополнительную информацию о связанной сущности
            if transaction.related_id and transaction.transaction_type in ['ai_message', 'bot_message']:
                # Получаем информацию о сообщении
                from database.models import DialogMessage, Dialog
                message = db.query(DialogMessage).filter(DialogMessage.id == transaction.related_id).first()
                if message:
                    dialog = db.query(Dialog).filter(Dialog.id == message.dialog_id).first()
                    transaction_data['related_info'] = {
                        'type': 'message',
                        'message_id': message.id,
                        'dialog_id': message.dialog_id,
                        'message_text': message.text[:100] + ('...' if len(message.text) > 100 else ''),
                        'sender': message.sender,
                        'timestamp': message.timestamp.isoformat() if message.timestamp else None,
                        'dialog_info': {
                            'user_email': current_user.email,
                            'telegram_username': dialog.telegram_username if dialog else None,
                            'telegram_chat_id': dialog.telegram_chat_id if dialog else None,
                        } if dialog else None
                    }
            
            elif transaction.related_id and transaction.transaction_type == 'document_upload':
                # Получаем информацию о документе
                from database.models import Document
                document = db.query(Document).filter(Document.id == transaction.related_id).first()
                if document:
                    transaction_data['related_info'] = {
                        'type': 'document',
                        'document_id': document.id,
                        'filename': document.filename,
                        'upload_timestamp': document.upload_time.isoformat() if document.upload_time else None
                    }
            
            detailed_transactions.append(BalanceTransactionDetailRead(**transaction_data))
        
        return detailed_transactions
        
    except Exception as e:
        logger.error(f"Ошибка получения детализированных транзакций для пользователя {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения детализированной истории транзакций"
        )

@router.get("/prices", response_model=List[ServicePriceRead])
async def get_service_prices(db: Session = Depends(get_db)):
    """Получить цены на услуги"""
    try:
        balance_service = BalanceService(db)
        prices = balance_service.get_service_prices()
        return [ServicePriceRead.from_orm(p) for p in prices]
    except Exception as e:
        logger.error(f"Ошибка получения цен на услуги: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения цен на услуги"
        )

@router.get("/check/{service_type}")
async def check_balance_for_service(
    service_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Проверить достаточность средств для услуги"""
    try:
        balance_service = BalanceService(db)
        sufficient = balance_service.check_sufficient_balance(current_user.id, service_type)
        current_balance = balance_service.get_balance(current_user.id)
        
        return {
            "sufficient": sufficient,
            "current_balance": current_balance,
            "service_type": service_type
        }
    except Exception as e:
        logger.error(f"Ошибка проверки баланса для услуги {service_type}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка проверки баланса"
        )

# Административные эндпоинты
@router.put("/admin/prices/{service_type}", response_model=ServicePriceRead)
async def update_service_price(
    service_type: str,
    price_update: ServicePriceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновить цену услуги (только для администраторов)"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа"
        )
    
    try:
        balance_service = BalanceService(db)
        
        if price_update.price is not None:
            if price_update.price < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Цена не может быть отрицательной"
                )
        
        service_price = balance_service.update_service_price(
            service_type,
            price_update.price if price_update.price is not None else 3.0,
            price_update.description
        )
        
        return ServicePriceRead.from_orm(service_price)
    except Exception as e:
        logger.error(f"Ошибка обновления цены услуги {service_type}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка обновления цены услуги"
        )