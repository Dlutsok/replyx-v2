# Billing Model & Balance System

**Last Updated:** 2025-08-23

Comprehensive guide to the billing system, balance management, and transaction processing in ChatAI platform.

## Overview

ChatAI implements a prepaid credit-based billing system where users maintain account balances that are charged for AI services, document processing, and bot operations. The system ensures transactional integrity, audit trails, and flexible pricing management.

## Database Schema

### Core Tables

#### UserBalance
```sql
CREATE TABLE user_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    balance FLOAT DEFAULT 0.0,              -- Current balance in rubles
    total_spent FLOAT DEFAULT 0.0,          -- Lifetime spending
    total_topped_up FLOAT DEFAULT 0.0,      -- Lifetime top-ups
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### BalanceTransaction
```sql
CREATE TABLE balance_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    amount FLOAT NOT NULL,                   -- Transaction amount (+/-)
    transaction_type VARCHAR NOT NULL,       -- 'topup', 'ai_message', etc.
    description VARCHAR,                     -- Human-readable description
    balance_before FLOAT NOT NULL,          -- Balance before transaction
    balance_after FLOAT NOT NULL,           -- Balance after transaction
    related_id INTEGER,                     -- Related entity ID
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### ServicePrice
```sql
CREATE TABLE service_prices (
    id SERIAL PRIMARY KEY,
    service_type VARCHAR UNIQUE NOT NULL,   -- Service identifier
    price FLOAT NOT NULL,                   -- Price in rubles
    description VARCHAR,                    -- Service description
    is_active BOOLEAN DEFAULT TRUE,        -- Active status
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Service Types & Pricing

### Current Service Catalog

| Service Type | Default Price (₽) | Description | Billing Unit |
|-------------|-------------------|-------------|--------------|
| `ai_message` | 0.001 | AI assistant message processing | Per message |
| `document_upload` | 0.10 | Document upload and text extraction | Per document |
| `bot_message` | 0.001 | Telegram bot message delivery | Per message |
| `embedding_generation` | 0.0001 | Vector embedding creation | Per embedding |

## Transaction Processing

### Core Transaction Methods

```python
class BalanceService:
    def charge_for_service(self, user_id: int, service_type: str, 
                          quantity: int = 1) -> BalanceTransaction:
        """Charge user for a service with atomic transaction guarantees"""
        with self.db.begin():  # Atomic transaction
            price_per_unit = ServicePriceManager.get_service_price(service_type)
            total_cost = price_per_unit * quantity
            
            user_balance = self._get_or_create_balance(user_id)
            
            if user_balance.balance < total_cost:
                raise InsufficientBalanceError("Insufficient balance")
            
            # Update balance and create transaction record
            balance_before = user_balance.balance
            balance_after = balance_before - total_cost
            
            user_balance.balance = balance_after
            user_balance.total_spent += total_cost
            
            transaction = BalanceTransaction(
                user_id=user_id,
                amount=-total_cost,
                transaction_type=service_type,
                balance_before=balance_before,
                balance_after=balance_after
            )
            
            self.db.add(transaction)
            return transaction
    
    def top_up_balance(self, user_id: int, amount: float) -> BalanceTransaction:
        """Add funds to user balance"""
        with self.db.begin():
            user_balance = self._get_or_create_balance(user_id)
            
            balance_before = user_balance.balance
            balance_after = balance_before + amount
            
            user_balance.balance = balance_after
            user_balance.total_topped_up += amount
            
            transaction = BalanceTransaction(
                user_id=user_id,
                amount=amount,
                transaction_type="topup",
                balance_before=balance_before,
                balance_after=balance_after
            )
            
            self.db.add(transaction)
            return transaction
```

## Business Rules & Invariants

### Data Integrity Constraints

1. **Balance Non-Negative**: `balance >= 0` (enforced in application layer)
2. **Transaction Consistency**: `balance_after = balance_before + amount`
3. **Immutable Transactions**: Transaction records are never modified after creation
4. **Audit Trail**: All balance changes are logged with full context

### Transaction Safety

```python
def _validate_transaction_consistency(self, transaction: BalanceTransaction) -> bool:
    """Validate transaction mathematical consistency"""
    expected_balance = transaction.balance_before + transaction.amount
    return abs(expected_balance - transaction.balance_after) < 0.01

def _check_balance_invariants(self, user_id: int) -> bool:
    """Check balance system invariants"""
    user_balance = self.get_balance(user_id)
    total_transactions = sum(all_transactions_for_user(user_id))
    return abs(user_balance - total_transactions) < 0.01
```

## API Contracts

### Balance Management

```bash
# Get current balance
GET /api/balance/current
Response: {
    "balance": 125.50,
    "total_spent": 89.30,
    "total_topped_up": 214.80,
    "currency": "RUB"
}

# Top up balance
POST /api/balance/topup
Request: {"amount": 100.00}
Response: {
    "transaction_id": 12345,
    "new_balance": 225.50,
    "amount_added": 100.00
}

# Transaction history
GET /api/balance/transactions?limit=50
Response: {
    "transactions": [...],
    "pagination": {
        "total": 1250,
        "has_more": true
    }
}
```

### Service Pricing

```bash
# Get service prices
GET /api/balance/prices
Response: {
    "services": {
        "ai_message": {"price": 0.001, "unit": "per message"},
        "document_upload": {"price": 0.10, "unit": "per document"}
    }
}
```

## Usage Examples

### Charging for AI Messages

```python
# Charge for AI message processing
transaction = balance_service.charge_for_service(
    user_id=123,
    service_type="ai_message",
    quantity=1,
    description="AI response (gpt-4o-mini)"
)
```

### Document Processing Billing

```python
# Charge for document upload
transaction = balance_service.charge_for_service(
    user_id=123,
    service_type="document_upload",
    quantity=1,
    description="PDF processing (2.3MB)"
)
```

## Monitoring & Analytics

### Revenue Tracking

```sql
-- Daily revenue breakdown
SELECT 
    DATE(created_at) as date,
    transaction_type,
    COUNT(*) as count,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as revenue
FROM balance_transactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), transaction_type
ORDER BY date DESC;
```

### User Balance Monitoring

```python
def monitor_low_balances():
    """Alert users with low balances"""
    low_balance_users = db.query(User).join(UserBalance).filter(
        UserBalance.balance < 1.0,
        UserBalance.balance > 0
    ).all()
    
    for user in low_balance_users:
        send_low_balance_notification(user)
```

This billing system provides secure, auditable, and scalable financial transaction management for the ChatAI platform.
