from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database.schemas import ReferralCodeRead, ReferralRead
from services.referral_service import ReferralService
from core.auth import get_current_user
from database.models import User
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/referral", tags=["referral"])

@router.get("/my-code", response_model=ReferralCodeRead)
async def get_my_referral_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить свой реферальный код"""
    try:
        referral_service = ReferralService(db)
        
        # Получаем или создаем реферальный код
        referral_code = referral_service.create_referral_code(current_user.id)
        
        return ReferralCodeRead.from_orm(referral_code)
        
    except Exception as e:
        logger.error(f"Ошибка получения реферального кода: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения реферального кода"
        )

@router.get("/stats")
async def get_referral_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить статистику по рефералам"""
    try:
        referral_service = ReferralService(db)
        stats = referral_service.get_referral_stats(current_user.id)
        
        return stats
        
    except Exception as e:
        logger.error(f"Ошибка получения статистики рефералов: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения статистики рефералов"
        )

@router.get("/my-referrals", response_model=List[ReferralRead])
async def get_my_referrals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить список своих рефералов"""
    try:
        referral_service = ReferralService(db)
        referrals = referral_service.get_user_referrals(current_user.id)
        
        return [ReferralRead.from_orm(referral) for referral in referrals]
        
    except Exception as e:
        logger.error(f"Ошибка получения списка рефералов: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения списка рефералов"
        )

@router.post("/register")
async def register_by_referral_code(
    referral_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Зарегистрироваться по реферальному коду"""
    try:
        referral_service = ReferralService(db)
        
        success = referral_service.register_referral(referral_code, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не удалось зарегистрироваться по реферальному коду"
            )
        
        return {
            "message": "Успешно зарегистрированы по реферальному коду",
            "referral_code": referral_code,
            "bonus_amount": 50.0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка регистрации по реферальному коду: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка регистрации по реферальному коду"
        )

@router.get("/link")
async def get_referral_link(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получить реферальную ссылку"""
    try:
        referral_service = ReferralService(db)
        referral_code = referral_service.create_referral_code(current_user.id)
        
        # Формируем ссылку для регистрации с реферальным кодом
        base_url = "https://yourapp.com"  # Замените на ваш домен
        referral_link = f"{base_url}/register?ref={referral_code.code}"
        
        return {
            "referral_code": referral_code.code,
            "referral_link": referral_link,
            "qr_code_url": f"{base_url}/api/referral/qr/{referral_code.code}"
        }
        
    except Exception as e:
        logger.error(f"Ошибка получения реферальной ссылки: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка получения реферальной ссылки"
        )

# Административные эндпоинты
@router.post("/admin/confirm/{user_id}")
async def confirm_referral(
    user_id: int,
    bonus_amount: Optional[float] = 100.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Подтвердить реферала и начислить бонус (только для администраторов)"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа"
        )
    
    try:
        referral_service = ReferralService(db)
        
        success = referral_service.confirm_referral(user_id, bonus_amount)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Реферал не найден или уже подтвержден"
            )
        
        return {
            "message": f"Реферал {user_id} подтвержден, начислен бонус {bonus_amount} руб."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка подтверждения реферала: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка подтверждения реферала"
        ) 