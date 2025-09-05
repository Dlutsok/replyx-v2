from sqlalchemy.orm import Session
from sqlalchemy import desc
from database.models import UserBalance, BalanceTransaction, ServicePrice, User
from database.schemas import BalanceTransactionRead, ServicePriceRead
from typing import List, Optional
from datetime import datetime
import logging
from integrations.email_service import email_service

logger = logging.getLogger(__name__)

class BalanceService:
    """Сервис для работы с балансом пользователей"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_or_create_balance(self, user_id: int) -> UserBalance:
        """Получить или создать баланс пользователя"""
        balance = self.db.query(UserBalance).filter(UserBalance.user_id == user_id).first()
        if not balance:
            balance = UserBalance(user_id=user_id, balance=0.0)
            self.db.add(balance)
            self.db.commit()
            self.db.refresh(balance)
        return balance
    
    def get_balance(self, user_id: int) -> float:
        """Получить текущий баланс пользователя"""
        balance = self.get_or_create_balance(user_id)
        return balance.balance
    
    def top_up_balance(self, user_id: int, amount: float, description: str = "Пополнение баланса") -> BalanceTransaction:
        """Пополнить баланс пользователя"""
        if amount <= 0:
            raise ValueError("Сумма пополнения должна быть положительной")
        
        balance = self.get_or_create_balance(user_id)
        balance_before = balance.balance
        balance_after = balance_before + amount
        
        # Создаем транзакцию
        transaction = BalanceTransaction(
            user_id=user_id,
            amount=amount,
            transaction_type="topup",
            description=description,
            balance_before=balance_before,
            balance_after=balance_after
        )
        
        # Обновляем баланс
        balance.balance = balance_after
        balance.total_topped_up += amount
        balance.updated_at = datetime.utcnow()
        
        # Добавляем измененные объекты в сессию
        self.db.add(balance)
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        self.db.refresh(balance)
        
        logger.info(f"Пополнен баланс пользователя {user_id} на {amount} руб. Новый баланс: {balance_after}")
        return transaction
    
    def charge_for_service(self, user_id: int, service_type: str, description: Optional[str] = None, related_id: Optional[int] = None) -> BalanceTransaction:
        """Списать средства за услугу"""
        # Получаем цену услуги
        service_price = self.db.query(ServicePrice).filter(
            ServicePrice.service_type == service_type,
            ServicePrice.is_active == True
        ).first()
        
        if not service_price:
            logger.error(f"Цена для услуги {service_type} не найдена")
            raise ValueError(f"Цена для услуги {service_type} не найдена")
        
        amount = service_price.price
        balance = self.get_or_create_balance(user_id)
        
        # Проверяем достаточность средств
        if balance.balance < amount:
            logger.warning(f"Недостаточно средств у пользователя {user_id}. Баланс: {balance.balance}, требуется: {amount}")
            raise ValueError(f"Недостаточно средств. Баланс: {balance.balance} руб., требуется: {amount} руб.")
        
        balance_before = balance.balance
        balance_after = balance_before - amount
        
        # Создаем транзакцию
        transaction = BalanceTransaction(
            user_id=user_id,
            amount=-amount,  # Отрицательная сумма для списания
            transaction_type=service_type,
            description=description or service_price.description or f"Оплата за {service_type}",
            balance_before=balance_before,
            balance_after=balance_after,
            related_id=related_id
        )
        
        # Обновляем баланс
        balance.balance = balance_after
        balance.total_spent += amount
        balance.updated_at = datetime.utcnow()
        
        # Добавляем измененные объекты в сессию
        self.db.add(balance)
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        self.db.refresh(balance)
        
        logger.info(f"Списано {amount} руб. с баланса пользователя {user_id} за {service_type}. Новый баланс: {balance_after}")
        
        # Проверяем нужно ли отправить уведомление о низком балансе
        self._check_and_send_balance_warnings(user_id, balance_after)
        
        return transaction
    
    def get_transactions(self, user_id: int, limit: int = 50) -> List[BalanceTransaction]:
        """Получить историю транзакций пользователя"""
        return self.db.query(BalanceTransaction).filter(
            BalanceTransaction.user_id == user_id
        ).order_by(desc(BalanceTransaction.created_at)).limit(limit).all()
    
    def get_service_prices(self) -> List[ServicePrice]:
        """Получить все активные цены на услуги"""
        return self.db.query(ServicePrice).filter(ServicePrice.is_active == True).all()
    
    def update_service_price(self, service_type: str, price: float, description: str = None) -> ServicePrice:
        """Обновить цену услуги"""
        service_price = self.db.query(ServicePrice).filter(
            ServicePrice.service_type == service_type
        ).first()
        
        if not service_price:
            service_price = ServicePrice(
                service_type=service_type,
                price=price,
                description=description
            )
            self.db.add(service_price)
        else:
            service_price.price = price
            if description:
                service_price.description = description
            service_price.updated_at = datetime.utcnow()
            self.db.add(service_price)  # Добавляем измененный объект в сессию
        
        self.db.commit()
        self.db.refresh(service_price)
        return service_price
    
    def check_sufficient_balance(self, user_id: int, service_type: str) -> bool:
        """Проверить достаточность средств для услуги"""
        service_price = self.db.query(ServicePrice).filter(
            ServicePrice.service_type == service_type,
            ServicePrice.is_active == True
        ).first()
        
        if not service_price:
            return False
        
        balance = self.get_balance(user_id)
        return balance >= service_price.price
    
    def give_welcome_bonus(self, user_id: int, amount: float = 100.0) -> Optional[BalanceTransaction]:
        """Начислить приветственный бонус новому пользователю"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"Пользователь {user_id} не найден")
            return None
        
        # Проверяем, что бонус еще не начислялся
        if user.welcome_bonus_received:
            logger.warning(f"Приветственный бонус для пользователя {user_id} уже был начислен")
            return None
        
        try:
            # Начисляем бонус
            transaction = self.top_up_balance(
                user_id=user_id,
                amount=amount,
                description=f"🎉 Приветственный бонус - {amount} руб!"
            )
            
            # Отмечаем, что бонус получен
            user.welcome_bonus_received = True
            self.db.commit()
            
            logger.info(f"Начислен приветственный бонус {amount} руб. пользователю {user_id}")
            return transaction
            
        except Exception as e:
            logger.error(f"Ошибка при начислении приветственного бонуса пользователю {user_id}: {e}")
            self.db.rollback()
            return None
    
    def _check_and_send_balance_warnings(self, user_id: int, current_balance: float):
        """Проверяет баланс и отправляет предупреждения при необходимости"""
        try:
            # Получаем пользователя для отправки email
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or not user.email:
                return
            
            # Получаем цену одного сообщения для правильного расчета
            service_price = self.db.query(ServicePrice).filter(
                ServicePrice.service_type == "ai_message",
                ServicePrice.is_active == True
            ).first()
            
            if not service_price:
                logger.warning(f"Service price for ai_message not found, using default 5.0")
                price_per_message = 5.0
            else:
                price_per_message = service_price.price
            
            # Конвертируем баланс в количество сообщений (баланс / цена_за_сообщение)
            messages_remaining = int(current_balance / price_per_message)
            
            # Отправляем только 2 важных уведомления БЕЗ ДУБЛИРОВАНИЯ
            if messages_remaining == 0:
                # Баланс закончился - критический алерт (отправляем только один раз)
                email_service.send_balance_depleted_email(user.email)
                logger.info(f"Balance depleted email sent to {user.email}")
            elif messages_remaining == 50:
                # Осталось ровно 50 сообщений - предупреждающий алерт (отправляем только один раз)
                email_service.send_low_balance_warning_email(user.email, messages_remaining)
                logger.info(f"Low balance warning email sent to {user.email} (remaining: {messages_remaining})")
                
        except Exception as e:
            logger.error(f"Failed to send balance warning email for user {user_id}: {e}")
            # Не прерываем основной процесс если email не отправился

def init_default_prices(db: Session):
    """Инициализация цен по умолчанию"""
    default_prices = [
        {"service_type": "ai_message", "price": 5.0, "description": "AI сообщение"},
        {"service_type": "widget_message", "price": 5.0, "description": "AI сообщение виджета"},
        {"service_type": "document_upload", "price": 5.0, "description": "Загрузка документа"},
        {"service_type": "bot_message", "price": 5.0, "description": "Сообщение бота"},
    ]
    
    for price_data in default_prices:
        existing = db.query(ServicePrice).filter(
            ServicePrice.service_type == price_data["service_type"]
        ).first()
        
        if not existing:
            service_price = ServicePrice(**price_data)
            db.add(service_price)
        else:
            # Обновляем существующую цену на актуальную
            existing.price = price_data["price"]
            existing.description = price_data["description"]
            existing.updated_at = datetime.utcnow()
            db.add(existing)
    
    db.commit()
    logger.info("Инициализированы и обновлены цены по умолчанию на 5.0 руб")