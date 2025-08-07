from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database.schemas import (
    PromoCodeCreate, PromoCodeRead, PromoCodeApply, PromoCodeUsageRead
)
from services.promo_service import PromoService
from core.auth import get_current_user
from database.models import User
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/promo", tags=["promo"])

@router.post("/apply")
async def apply_promo_code(
    promo_request: PromoCodeApply,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Применить промокод"""
    try:
        promo_service = PromoService(db)
        
        # Для применения промокода нужна сумма пополнения
        # Пока используем минимальную сумму 100 руб для валидации
        amount = 100.0
        
        # Сначала валидируем промокод
        validation = promo_service.validate_promo_code(
            promo_request.promo_code, 
            amount, 
            current_user.id
        )
        
        if not validation["valid"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=validation["message"]
            )
        
        return {
            "message": "Промокод действителен",
            "promo_code": promo_request.promo_code,
            "discount_amount": validation["discount_amount"],
            "final_amount": validation["final_amount"],
            "valid": True
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Ошибка применения промокода: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка применения промокода"
        )

@router.post("/validate")
async def validate_promo_code(
    promo_request: PromoCodeApply,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Проверить промокод без применения"""
    try:
        promo_service = PromoService(db)
        
        # Получаем сумму из параметров запроса (по умолчанию 100)
        amount = 100.0
        
        validation = promo_service.validate_promo_code(
            promo_request.promo_code,
            amount,
            current_user.id
        )
        
        return validation
        
    except Exception as e:
        logger.error(f"Ошибка валидации промокода: {e}")
        return {"valid": False, "message": "Ошибка при проверке промокода"}

@router.get("/usage", response_model=List[PromoCodeUsageRead])
async def get_promo_usage_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить историю использования промокодов"""
    try:
        promo_service = PromoService(db)
        usage_history = promo_service.get_user_promo_usage(current_user.id)
        
        return [PromoCodeUsageRead.from_orm(usage) for usage in usage_history]
        
    except Exception as e:
        logger.error(f"Ошибка получения истории промокодов: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения истории промокодов"
        )

# Административные эндпоинты
@router.post("/admin/create", response_model=PromoCodeRead)
async def create_promo_code(
    promo_data: PromoCodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создать промокод (только для администраторов)"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа"
        )
    
    try:
        promo_service = PromoService(db)
        promo_code = promo_service.create_promo_code(promo_data, current_user.id)
        
        return PromoCodeRead.from_orm(promo_code)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Ошибка создания промокода: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка создания промокода"
        )

@router.get("/admin/list", response_model=List[PromoCodeRead])
async def get_all_promo_codes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить все промокоды (только для администраторов)"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа"
        )
    
    try:
        promo_service = PromoService(db)
        promo_codes = promo_service.get_all_promo_codes()
        
        return [PromoCodeRead.from_orm(promo) for promo in promo_codes]
        
    except Exception as e:
        logger.error(f"Ошибка получения промокодов: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения промокодов"
        )

@router.delete("/admin/{promo_id}")
async def deactivate_promo_code(
    promo_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Деактивировать промокод (только для администраторов)"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа"
        )
    
    try:
        promo_service = PromoService(db)
        success = promo_service.deactivate_promo_code(promo_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Промокод не найден"
            )
        
        return {"message": "Промокод успешно деактивирован"}
        
    except Exception as e:
        logger.error(f"Ошибка деактивации промокода: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка деактивации промокода"
        ) 