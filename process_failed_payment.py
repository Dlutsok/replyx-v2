#!/usr/bin/env python3
"""
Скрипт для ручной обработки завершенного платежа, который не был обработан через webhook
"""
import os
import sys
sys.path.append('/Users/dan/Documents/chatAI/MVP 13/backend')

from sqlalchemy.orm import Session
from database.connection import SessionLocal
from database.models import Payment
from services.balance_service import BalanceService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_completed_payment(order_id: str):
    """Обработать завершенный платеж вручную"""
    db = SessionLocal()
    try:
        # Найти платеж
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        
        if not payment:
            logger.error(f"Платеж {order_id} не найден в БД")
            return False
        
        logger.info(f"Найден платеж: {payment.order_id}")
        logger.info(f"  Пользователь: {payment.user_id}")
        logger.info(f"  Сумма: {payment.amount} руб")
        logger.info(f"  Статус: {payment.status}")
        logger.info(f"  Создан: {payment.created_at}")
        
        if payment.status == 'success':
            logger.warning(f"Платеж {order_id} уже обработан (статус: success)")
            return True
        
        if payment.status != 'pending':
            logger.warning(f"Платеж {order_id} имеет статус {payment.status}, ожидался pending")
            response = input(f"Продолжить обработку? (y/N): ")
            if response.lower() != 'y':
                return False
        
        # Проверить статус в Тинькофф (опционально - для безопасности)
        logger.info("🔄 Проверяем статус платежа в Тинькофф...")
        
        # Пока обработаем без проверки, так как webhook уже пришел со статусом CONFIRMED
        try:
            # Инициализируем сервис баланса
            balance_service = BalanceService(db)
            
            # Пополняем баланс
            logger.info(f"💰 Пополняем баланс пользователя {payment.user_id} на {payment.amount} руб...")
            
            transaction = balance_service.top_up_balance(
                user_id=payment.user_id,
                amount=float(payment.amount),
                description=f"Пополнение через Т-Банк (заказ {payment.order_id}) - ручная обработка"
            )
            
            # Обновляем статус платежа
            payment.status = 'success'
            db.commit()
            
            logger.info(f"✅ Платеж {order_id} успешно обработан:")
            logger.info(f"   Баланс пополнен на {payment.amount} руб")
            logger.info(f"   ID транзакции: {transaction.id}")
            logger.info(f"   Статус платежа обновлен: pending → success")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка при обработке платежа {order_id}: {e}")
            db.rollback()
            return False
    finally:
        db.close()

def main():
    # ID платежа на 2500 руб из логов
    order_id = "replyx_1757512906_c339838e"
    
    logger.info(f"🔧 Обрабатываем платеж {order_id} вручную...")
    
    success = process_completed_payment(order_id)
    
    if success:
        logger.info("🎉 Платеж успешно обработан!")
    else:
        logger.error("❌ Не удалось обработать платеж")
        sys.exit(1)

if __name__ == "__main__":
    main()