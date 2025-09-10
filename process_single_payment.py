#!/usr/bin/env python3
import sys
sys.path.append('/Users/dan/Documents/chatAI/MVP 13/backend')

from database.connection import SessionLocal
from database.models import Payment
from services.balance_service import BalanceService
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Обрабатываем конкретный платеж
order_id = "replyx_1757513300_fecbd086"  # 4444 руб

db = SessionLocal()
try:
    payment = db.query(Payment).filter(Payment.order_id == order_id).first()
    
    if not payment:
        print(f"❌ Платеж {order_id} не найден в БД")
        exit(1)
    
    print(f"💰 Найден платеж {order_id}:")
    print(f"   Пользователь: {payment.user_id}")
    print(f"   Сумма: {payment.amount} руб")
    print(f"   Статус: {payment.status}")
    
    if payment.status == 'success':
        print(f"✅ Платеж уже обработан!")
        exit(0)
    
    # Обрабатываем
    balance_service = BalanceService(db)
    
    transaction = balance_service.top_up_balance(
        user_id=payment.user_id,
        amount=float(payment.amount),
        description=f"🚀 Срочное пополнение через Т-Банк (заказ {payment.order_id})"
    )
    
    payment.status = 'success'
    db.commit()
    
    print(f"🎉 ПЛАТЕЖ ОБРАБОТАН!")
    print(f"   Баланс пополнен на {payment.amount} руб")
    print(f"   ID транзакции: {transaction.id}")
    
finally:
    db.close()