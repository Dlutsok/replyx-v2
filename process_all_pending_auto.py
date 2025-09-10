#!/usr/bin/env python3
"""
Автоматический скрипт для обработки всех неоплаченных платежей
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

def process_pending_payment(order_id: str):
    """Обработать конкретный платеж"""
    db = SessionLocal()
    try:
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        
        if not payment:
            logger.error(f"Платеж {order_id} не найден")
            return False, 0
        
        if payment.status == 'success':
            logger.info(f"✅ Платеж {order_id} уже обработан")
            return True, 0
        
        # Инициализируем сервис баланса
        balance_service = BalanceService(db)
        
        logger.info(f"💰 Обрабатываем платеж {payment.order_id}: {payment.amount} руб (пользователь {payment.user_id})")
        
        transaction = balance_service.top_up_balance(
            user_id=payment.user_id,
            amount=float(payment.amount),
            description=f"Пополнение через Т-Банк (заказ {payment.order_id}) - автообработка неоплаченных"
        )
        
        # Обновляем статус платежа
        payment.status = 'success'
        db.commit()
        
        logger.info(f"✅ Платеж {order_id} успешно обработан! Транзакция #{transaction.id}")
        
        return True, float(payment.amount)
        
    except Exception as e:
        logger.error(f"❌ Ошибка обработки платежа {order_id}: {e}")
        db.rollback()
        return False, 0
    finally:
        db.close()

def main():
    logger.info("🔍 Автоматическая обработка неоплаченных платежей...")
    
    db = SessionLocal()
    try:
        payments = db.query(Payment).filter(Payment.status == 'pending').order_by(Payment.created_at).all()
        
        if not payments:
            logger.info("✅ Все платежи уже обработаны!")
            return
        
        logger.info(f"📋 Найдено {len(payments)} платежей со статусом 'pending'")
        
        # Подсчитываем общую сумму
        total_amount = sum(float(p.amount) for p in payments)
        logger.info(f"💰 Общая сумма к пополнению: {total_amount:,.2f} руб")
        
        logger.info("🚀 Начинаем автоматическую обработку...")
        
        success_count = 0
        total_processed = 0.0
        
        for i, payment in enumerate(payments, 1):
            logger.info(f"\n[{i}/{len(payments)}] Обрабатываем {payment.order_id}...")
            success, amount = process_pending_payment(payment.order_id)
            if success:
                success_count += 1
                total_processed += amount
        
        logger.info(f"\n🎉 РЕЗУЛЬТАТ:")
        logger.info(f"   Обработано: {success_count} из {len(payments)} платежей")
        logger.info(f"   Пополнено на общую сумму: {total_processed:,.2f} руб")
        logger.info(f"   Неудачных обработок: {len(payments) - success_count}")
        
    finally:
        db.close()

if __name__ == "__main__":
    main()