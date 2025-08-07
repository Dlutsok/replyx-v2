from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import jwt

class UserBase(BaseModel):
    email: str
    role: str = 'user'
    status: str = 'active'
    first_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    ai_token: Optional[str] = None
    telegram_token: Optional[str] = None

class UserRead(BaseModel):
    id: int
    email: str
    role: str
    status: str
    created_at: datetime
    first_name: Optional[str] = None
    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    first_name: Optional[str] = None

class TokenBase(BaseModel):
    name: str
    token: str

class TokenCreate(TokenBase):
    pass

class TokenRead(TokenBase):
    id: int
    created_at: str
    owner_id: int
    class Config:
        orm_mode = True

class TelegramTokenBase(BaseModel):
    token: str

class TelegramTokenCreate(TelegramTokenBase):
    pass

class TelegramTokenRead(TelegramTokenBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        orm_mode = True

class OpenAITokenBase(BaseModel):
    token: str

class OpenAITokenCreate(OpenAITokenBase):
    pass

class OpenAITokenRead(OpenAITokenBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        orm_mode = True

class DocumentBase(BaseModel):
    filename: str
    size: int

class DocumentCreate(DocumentBase):
    pass

class DocumentRead(DocumentBase):
    id: int
    user_id: int
    upload_date: datetime
    class Config:
        orm_mode = True

# Broadcast schemas removed - no longer needed

class ConfirmEmailRequest(BaseModel):
    email: str
    code: str

class ConfirmEmailResponse(BaseModel):
    message: str

class AssistantBase(BaseModel):
    name: str
    ai_model: str = 'gpt-4o-mini'
    system_prompt: str = 'Вы — корпоративный AI-ассистент. Предоставляю точную информацию по вопросам компании в деловом стиле. Отвечаю кратко, информативно, без использования смайликов и чрезмерной эмоциональности. ВАЖНО: Опираюсь ТОЛЬКО на данные из базы знаний компании. Если информации нет в предоставленных документах — сообщаю об этом прямо, не выдумываю и не использую общие знания.'
    is_active: bool = True

class AssistantCreate(AssistantBase):
    pass

class AssistantUpdate(BaseModel):
    name: Optional[str]
    ai_model: Optional[str]
    system_prompt: Optional[str]
    is_active: Optional[bool]

class AssistantRead(AssistantBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True





# Схемы для системы баланса

class UserBalanceRead(BaseModel):
    id: int
    user_id: int
    balance: float
    total_spent: float
    total_topped_up: float
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class BalanceTransactionRead(BaseModel):
    id: int
    user_id: int
    amount: float
    transaction_type: str
    description: Optional[str] = None
    balance_before: float
    balance_after: float
    related_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

class BalanceTransactionDetailRead(BaseModel):
    """Детализированная информация о транзакции баланса"""
    id: int
    user_id: int
    amount: float
    transaction_type: str
    description: Optional[str] = None
    balance_before: float
    balance_after: float
    related_id: Optional[int] = None
    created_at: datetime
    
    # Дополнительная информация о связанной сущности
    related_info: Optional[dict] = None  # Информация о диалоге, сообщении, документе и т.д.
    
    class Config:
        orm_mode = True

class TopUpBalanceRequest(BaseModel):
    amount: float

class ServicePriceRead(BaseModel):
    id: int
    service_type: str
    price: float
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class ServicePriceUpdate(BaseModel):
    price: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class BalanceStatsResponse(BaseModel):
    current_balance: float
    total_spent: float
    total_topped_up: float
    recent_transactions: List[BalanceTransactionRead]
    service_prices: List[ServicePriceRead]

# Схемы для промокодов
class PromoCodeRead(BaseModel):
    id: int
    code: str
    type: str
    value: float
    min_amount: float
    max_uses: Optional[int] = None
    used_count: int
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

class PromoCodeCreate(BaseModel):
    code: str
    type: str  # 'percentage' or 'fixed_amount'
    value: float
    min_amount: Optional[float] = 0.0
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None

class PromoCodeApply(BaseModel):
    promo_code: str

class PromoCodeUsageRead(BaseModel):
    id: int
    promo_code_id: int
    user_id: int
    amount_before: float
    discount_amount: float
    amount_after: float
    used_at: datetime
    
    class Config:
        orm_mode = True

# Схемы для реферальной системы
class ReferralCodeRead(BaseModel):
    id: int
    user_id: int
    code: str
    referrals_count: int
    total_earned: float
    created_at: datetime
    
    class Config:
        orm_mode = True

class ReferralCodeCreate(BaseModel):
    code: Optional[str] = None  # Если не указан, будет сгенерирован автоматически

class ReferralRead(BaseModel):
    id: int
    referrer_id: int
    referred_id: int
    bonus_amount: float
    referred_bonus: float
    status: str
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True