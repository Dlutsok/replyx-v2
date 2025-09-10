#!/usr/bin/env python3
"""
Скрипт для обработки всех неоплаченных платежей со статусом pending
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

def find_pending_payments():
    """Найти все платежи со статусом pending"""
    db = SessionLocal()
    try:
        payments = db.query(Payment).filter(Payment.status == 'pending').order_by(Payment.created_at).all()
        return payments
    finally:
        db.close()

def process_pending_payment(order_id: str):
    """Обработать конкретный платеж"""
    db = SessionLocal()
    try:
        payment = db.query(Payment).filter(Payment.order_id == order_id).first()
        
        if not payment:
            logger.error(f"Платеж {order_id} не найден")
            return False
        
        if payment.status == 'success':
            logger.info(f"Платеж {order_id} уже обработан")
            return True
        
        # Инициализируем сервис баланса
        balance_service = BalanceService(db)
        
        # Пополняем баланс
        logger.info(f"💰 Обрабатываем платеж {payment.order_id}:")
        logger.info(f"   Пользователь: {payment.user_id}")
        logger.info(f"   Сумма: {payment.amount} руб")
        logger.info(f"   Создан: {payment.created_at}")
        
        transaction = balance_service.top_up_balance(
            user_id=payment.user_id,
            amount=float(payment.amount),
            description=f"Пополнение через Т-Банк (заказ {payment.order_id}) - ручная обработка"
        )
        
        # Обновляем статус платежа
        payment.status = 'success'
        db.commit()
        
        logger.info(f"✅ Платеж {order_id} успешно обработан!")
        logger.info(f"   Баланс пополнен на {payment.amount} руб")
        logger.info(f"   ID транзакции: {transaction.id}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка обработки платежа {order_id}: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    logger.info("🔍 Поиск неоплаченных платежей...")
    
    # Найти все pending платежи
    pending_payments = find_pending_payments()
    
    if not pending_payments:
        logger.info("✅ Все платежи обработаны!")
        return
    
    logger.info(f"📋 Найдено {len(pending_payments)} платежей со статусом 'pending':")
    
    for payment in pending_payments:
        logger.info(f"  - {payment.order_id}: {payment.amount} руб (создан {payment.created_at})")
    
    print("\n" + "="*60)
    response = input(f"Обработать все {len(pending_payments)} платежей? (y/N): ")
    
    if response.lower() != 'y':
        logger.info("Отменено пользователем")
        return
    
    logger.info("🚀 Начинаем обработку...")
    
    success_count = 0
    for payment in pending_payments:
        if process_pending_payment(payment.order_id):
            success_count += 1
        print()  # Разделитель между платежами
    
    logger.info(f"🎉 Обработано {success_count} из {len(pending_payments)} платежей!")

if __name__ == "__main__":
    main()