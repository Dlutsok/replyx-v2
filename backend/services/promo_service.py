from sqlalchemy.orm import Session
from sqlalchemy import desc
from database.models import PromoCode, PromoCodeUsage, User
from database.schemas import PromoCodeCreate, PromoCodeApply
from typing import List, Optional
from datetime import datetime
import logging
import secrets
import string

logger = logging.getLogger(__name__)

class PromoService:
    """Сервис для работы с промокодами"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_promo_code(self, promo_data: PromoCodeCreate, created_by: Optional[int] = None) -> PromoCode:
        """Создать промокод"""
        # Проверяем уникальность кода
        existing = self.db.query(PromoCode).filter(PromoCode.code == promo_data.code).first()
        if existing:
            raise ValueError(f"Промокод '{promo_data.code}' уже существует")
        
        # Валидация данных
        if promo_data.type not in ['percentage', 'fixed_amount']:
            raise ValueError("Тип промокода должен быть 'percentage' или 'fixed_amount'")
        
        if promo_data.type == 'percentage' and (promo_data.value <= 0 or promo_data.value > 100):
            raise ValueError("Процентная скидка должна быть от 1 до 100")
        
        if promo_data.type == 'fixed_amount' and promo_data.value <= 0:
            raise ValueError("Фиксированная скидка должна быть положительной")
        
        promo_code = PromoCode(
            code=promo_data.code.upper(),
            type=promo_data.type,
            value=promo_data.value,
            min_amount=promo_data.min_amount or 0.0,
            max_uses=promo_data.max_uses,
            expires_at=promo_data.expires_at,
            created_by=created_by
        )
        
        self.db.add(promo_code)
        self.db.commit()
        self.db.refresh(promo_code)
        
        logger.info(f"Создан промокод: {promo_code.code}")
        return promo_code
    
    def apply_promo_code(self, user_id: int, promo_code: str, amount: float) -> dict:
        """Применить промокод"""
        # Находим промокод
        promo = self.db.query(PromoCode).filter(
            PromoCode.code == promo_code.upper(),
            PromoCode.is_active == True
        ).first()
        
        if not promo:
            raise ValueError("Промокод не найден или не активен")
        
        # Проверяем срок действия
        if promo.expires_at and promo.expires_at < datetime.utcnow():
            raise ValueError("Срок действия промокода истек")
        
        # Проверяем лимит использований
        if promo.max_uses and promo.used_count >= promo.max_uses:
            raise ValueError("Промокод исчерпал лимит использований")
        
        # Проверяем минимальную сумму
        if amount < promo.min_amount:
            raise ValueError(f"Минимальная сумма для применения промокода: {promo.min_amount} руб.")
        
        # Проверяем, использовал ли пользователь этот промокод ранее
        existing_usage = self.db.query(PromoCodeUsage).filter(
            PromoCodeUsage.promo_code_id == promo.id,
            PromoCodeUsage.user_id == user_id
        ).first()
        
        if existing_usage:
            raise ValueError("Промокод уже был использован")
        
        # Рассчитываем скидку
        if promo.type == 'percentage':
            discount = amount * (promo.value / 100)
        else:  # fixed_amount
            discount = min(promo.value, amount)  # Не больше суммы заказа
        
        final_amount = amount - discount
        
        # Создаем запись об использовании
        usage = PromoCodeUsage(
            promo_code_id=promo.id,
            user_id=user_id,
            amount_before=amount,
            discount_amount=discount,
            amount_after=final_amount
        )
        
        # Увеличиваем счетчик использований
        promo.used_count += 1
        
        self.db.add(usage)
        self.db.commit()
        self.db.refresh(usage)
        
        logger.info(f"Применен промокод {promo_code} для пользователя {user_id}. Скидка: {discount} руб.")
        
        return {
            "discount_amount": discount,
            "final_amount": final_amount,
            "promo_code_id": promo.id,
            "usage_id": usage.id
        }
    
    def validate_promo_code(self, promo_code: str, amount: float, user_id: int) -> dict:
        """Проверить промокод без применения"""
        try:
            promo = self.db.query(PromoCode).filter(
                PromoCode.code == promo_code.upper(),
                PromoCode.is_active == True
            ).first()
            
            if not promo:
                return {"valid": False, "message": "Промокод не найден или не активен"}
            
            if promo.expires_at and promo.expires_at < datetime.utcnow():
                return {"valid": False, "message": "Срок действия промокода истек"}
            
            if promo.max_uses and promo.used_count >= promo.max_uses:
                return {"valid": False, "message": "Промокод исчерпал лимит использований"}
            
            if amount < promo.min_amount:
                return {"valid": False, "message": f"Минимальная сумма: {promo.min_amount} руб."}
            
            existing_usage = self.db.query(PromoCodeUsage).filter(
                PromoCodeUsage.promo_code_id == promo.id,
                PromoCodeUsage.user_id == user_id
            ).first()
            
            if existing_usage:
                return {"valid": False, "message": "Промокод уже был использован"}
            
            # Рассчитываем скидку
            if promo.type == 'percentage':
                discount = amount * (promo.value / 100)
            else:
                discount = min(promo.value, amount)
            
            return {
                "valid": True,
                "discount_amount": discount,
                "final_amount": amount - discount,
                "promo_type": promo.type,
                "promo_value": promo.value,
                "message": f"Скидка: {discount} руб."
            }
            
        except Exception as e:
            logger.error(f"Ошибка валидации промокода: {e}")
            return {"valid": False, "message": "Ошибка при проверке промокода"}
    
    def get_user_promo_usage(self, user_id: int) -> List[PromoCodeUsage]:
        """Получить историю использования промокодов пользователем"""
        return self.db.query(PromoCodeUsage).filter(
            PromoCodeUsage.user_id == user_id
        ).order_by(desc(PromoCodeUsage.used_at)).all()
    
    def get_all_promo_codes(self) -> List[PromoCode]:
        """Получить все промокоды"""
        return self.db.query(PromoCode).order_by(desc(PromoCode.created_at)).all()
    
    def deactivate_promo_code(self, promo_id: int) -> bool:
        """Деактивировать промокод"""
        promo = self.db.query(PromoCode).filter(PromoCode.id == promo_id).first()
        if promo:
            promo.is_active = False
            self.db.commit()
            logger.info(f"Деактивирован промокод: {promo.code}")
            return True
        return False

def generate_promo_code(length: int = 8) -> str:
    """Генерация случайного промокода"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

def init_default_promo_codes(db: Session):
    """Инициализация промокодов по умолчанию"""
    default_promos = [
        {
            "code": "WELCOME10",
            "type": "percentage",
            "value": 10.0,
            "min_amount": 100.0,
            "max_uses": 1000,
            "expires_at": None
        },
        {
            "code": "FIRST50",
            "type": "fixed_amount", 
            "value": 50.0,
            "min_amount": 100.0,
            "max_uses": 500,
            "expires_at": None
        }
    ]
    
    for promo_data in default_promos:
        existing = db.query(PromoCode).filter(PromoCode.code == promo_data["code"]).first()
        if not existing:
            promo = PromoCode(**promo_data)
            db.add(promo)
    
    db.commit()
    logger.info("Инициализированы промокоды по умолчанию") 