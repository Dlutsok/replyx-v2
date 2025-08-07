from sqlalchemy.orm import Session
from sqlalchemy import desc
from database.models import ReferralCode, Referral, User, UserBalance, BalanceTransaction
from database.schemas import ReferralCodeCreate
from typing import List, Optional
from datetime import datetime
import logging
import secrets
import string

logger = logging.getLogger(__name__)

class ReferralService:
    """Сервис для работы с реферальной системой"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_referral_code(self, user_id: int, custom_code: Optional[str] = None) -> ReferralCode:
        """Создать реферальный код для пользователя"""
        # Проверяем, есть ли уже код у пользователя
        existing = self.db.query(ReferralCode).filter(ReferralCode.user_id == user_id).first()
        if existing:
            return existing
        
        # Генерируем код
        if custom_code:
            code = custom_code.upper()
            # Проверяем уникальность
            if self.db.query(ReferralCode).filter(ReferralCode.code == code).first():
                raise ValueError(f"Реферальный код '{code}' уже используется")
        else:
            code = self._generate_unique_code()
        
        referral_code = ReferralCode(
            user_id=user_id,
            code=code
        )
        
        self.db.add(referral_code)
        self.db.commit()
        self.db.refresh(referral_code)
        
        logger.info(f"Создан реферальный код {code} для пользователя {user_id}")
        return referral_code
    
    def get_referral_code(self, user_id: int) -> Optional[ReferralCode]:
        """Получить реферальный код пользователя"""
        return self.db.query(ReferralCode).filter(ReferralCode.user_id == user_id).first()
    
    def register_referral(self, referral_code: str, referred_user_id: int) -> bool:
        """Зарегистрировать нового реферала"""
        # Находим реферальный код
        ref_code = self.db.query(ReferralCode).filter(ReferralCode.code == referral_code.upper()).first()
        if not ref_code:
            logger.warning(f"Реферальный код {referral_code} не найден")
            return False
        
        # Проверяем, что пользователь не регистрируется по своему коду
        if ref_code.user_id == referred_user_id:
            logger.warning(f"Пользователь {referred_user_id} пытается использовать свой реферальный код")
            return False
        
        # Проверяем, не был ли пользователь уже рефералом
        existing = self.db.query(Referral).filter(Referral.referred_id == referred_user_id).first()
        if existing:
            logger.warning(f"Пользователь {referred_user_id} уже является рефералом")
            return False
        
        # Создаем запись о реферале
        referral = Referral(
            referrer_id=ref_code.user_id,
            referred_id=referred_user_id,
            referral_code_id=ref_code.id,
            bonus_amount=0.0,  # Бонус начисляется позже при подтверждении
            referred_bonus=50.0,  # Бонус для нового пользователя
            status='pending'
        )
        
        # Обновляем счетчик рефералов
        ref_code.referrals_count += 1
        
        self.db.add(referral)
        self.db.commit()
        self.db.refresh(referral)
        
        # Начисляем бонус новому пользователю
        self._add_referral_bonus(referred_user_id, 50.0, f"Бонус за регистрацию по реферальному коду {referral_code}")
        
        logger.info(f"Зарегистрирован реферал: {referred_user_id} -> {ref_code.user_id} (код: {referral_code})")
        return True
    
    def confirm_referral(self, referred_user_id: int, referrer_bonus: float = 100.0) -> bool:
        """Подтвердить реферала и начислить бонус реферу"""
        referral = self.db.query(Referral).filter(
            Referral.referred_id == referred_user_id,
            Referral.status == 'pending'
        ).first()
        
        if not referral:
            return False
        
        # Обновляем статус
        referral.status = 'confirmed'
        referral.bonus_amount = referrer_bonus
        referral.confirmed_at = datetime.utcnow()
        
        # Начисляем бонус рефереру
        self._add_referral_bonus(
            referral.referrer_id, 
            referrer_bonus, 
            f"Бонус за подтвержденного реферала (пользователь #{referred_user_id})"
        )
        
        # Обновляем общую сумму заработанного
        ref_code = self.db.query(ReferralCode).filter(ReferralCode.id == referral.referral_code_id).first()
        if ref_code:
            ref_code.total_earned += referrer_bonus
        
        self.db.commit()
        
        logger.info(f"Подтвержден реферал {referred_user_id}, начислен бонус {referrer_bonus} руб. рефереру {referral.referrer_id}")
        return True
    
    def get_user_referrals(self, user_id: int) -> List[Referral]:
        """Получить список рефералов пользователя"""
        return self.db.query(Referral).filter(Referral.referrer_id == user_id).order_by(desc(Referral.created_at)).all()
    
    def get_referral_stats(self, user_id: int) -> dict:
        """Получить статистику по рефералам"""
        ref_code = self.get_referral_code(user_id)
        if not ref_code:
            return {
                "referral_code": None,
                "total_referrals": 0,
                "confirmed_referrals": 0,
                "pending_referrals": 0,
                "total_earned": 0.0
            }
        
        referrals = self.get_user_referrals(user_id)
        confirmed = [r for r in referrals if r.status == 'confirmed']
        pending = [r for r in referrals if r.status == 'pending']
        
        return {
            "referral_code": ref_code.code,
            "total_referrals": len(referrals),
            "confirmed_referrals": len(confirmed),
            "pending_referrals": len(pending),
            "total_earned": ref_code.total_earned,
            "referrals": referrals
        }
    
    def _generate_unique_code(self, length: int = 8) -> str:
        """Генерация уникального реферального кода"""
        while True:
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))
            # Проверяем уникальность
            if not self.db.query(ReferralCode).filter(ReferralCode.code == code).first():
                return code
    
    def _add_referral_bonus(self, user_id: int, amount: float, description: str):
        """Начислить реферальный бонус на баланс пользователя"""
        from services.balance_service import BalanceService
        
        balance_service = BalanceService(self.db)
        balance_service.top_up_balance(user_id, amount, description)
        
        logger.info(f"Начислен реферальный бонус {amount} руб. пользователю {user_id}")

def auto_create_referral_codes(db: Session):
    """Автоматическое создание реферальных кодов для всех пользователей"""
    users_without_codes = db.query(User).outerjoin(ReferralCode).filter(ReferralCode.id.is_(None)).all()
    
    referral_service = ReferralService(db)
    
    created_count = 0
    for user in users_without_codes:
        try:
            referral_service.create_referral_code(user.id)
            created_count += 1
        except Exception as e:
            logger.error(f"Ошибка создания реферального кода для пользователя {user.id}: {e}")
    
    logger.info(f"Создано {created_count} реферальных кодов") 