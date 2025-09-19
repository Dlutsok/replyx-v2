from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, text, case, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from database.connection import get_db
from database import models
from core import auth
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# === Response Models ===

class UserChatOverview(BaseModel):
    user_id: int
    email: str
    full_name: Optional[str] = None
    role: Optional[str] = None
    created_at: datetime
    last_activity: Optional[datetime] = None
    total_dialogs: int
    total_messages: int
    website_dialogs: int
    telegram_dialogs: int
    avg_dialog_length: float
    last_dialog_at: Optional[datetime] = None

class UserChatStats(BaseModel):
    users: List[UserChatOverview]
    total_users: int
    total_dialogs: int
    total_messages: int
    pagination: Dict[str, Any]

class DialogOverview(BaseModel):
    dialog_id: int
    channel: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: str
    message_count: int
    assistant_name: Optional[str] = None
    first_message_preview: Optional[str] = None
    duration_minutes: Optional[float] = None

class UserDialogsDetail(BaseModel):
    user_info: UserChatOverview
    dialogs: List[DialogOverview]
    total_dialogs: int
    pagination: Dict[str, Any]

class DialogMessageDetail(BaseModel):
    id: int
    sender: str
    text: str
    timestamp: datetime
    message_kind: Optional[str] = None

class DialogMessagesDetail(BaseModel):
    dialog_id: int
    messages: List[DialogMessageDetail]
    dialog_info: DialogOverview

class ChatAnalyticsOverview(BaseModel):
    total_dialogs: int
    total_messages: int
    total_users_with_chats: int
    active_users_today: int
    active_users_week: int
    avg_messages_per_dialog: float
    messages_last_hour: int
    last_message_time: Optional[datetime]
    top_channels: List[Dict[str, Any]]
    daily_stats: List[Dict[str, Any]]

# === API Endpoints ===

@router.get("/admin/chats/overview", response_model=ChatAnalyticsOverview)
async def get_chats_analytics_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Общая аналитика по всем чатам"""

    # Основные метрики
    total_dialogs = db.query(func.count(models.Dialog.id)).scalar()
    total_messages = db.query(func.count(models.DialogMessage.id)).scalar()
    total_users_with_chats = db.query(func.count(func.distinct(models.Dialog.user_id))).scalar()

    # Активные пользователи
    today = datetime.utcnow().date()
    week_ago = today - timedelta(days=7)

    active_users_today = db.query(func.count(func.distinct(models.Dialog.user_id))).filter(
        func.date(models.Dialog.started_at) == today
    ).scalar()

    active_users_week = db.query(func.count(func.distinct(models.Dialog.user_id))).filter(
        func.date(models.Dialog.started_at) >= week_ago
    ).scalar()

    # Среднее количество сообщений на диалог
    total_messages_count = db.query(func.count(models.DialogMessage.id)).scalar()
    total_dialogs_count = db.query(func.count(models.Dialog.id)).scalar()
    avg_messages = total_messages_count / total_dialogs_count if total_dialogs_count > 0 else 0

    # Топ каналов (определяем по наличию telegram_chat_id)
    channels_stats = db.query(
        case(
            (models.Dialog.telegram_chat_id.isnot(None), 'telegram'),
            else_='website'
        ).label('channel'),
        func.count(models.Dialog.id).label('count')
    ).group_by(
        case(
            (models.Dialog.telegram_chat_id.isnot(None), 'telegram'),
            else_='website'
        )
    ).all()

    top_channels = [
        {"channel": channel, "count": count}
        for channel, count in channels_stats
    ]

    # Сообщения за последний час
    hour_ago = datetime.utcnow() - timedelta(hours=1)
    messages_last_hour = db.query(func.count(models.DialogMessage.id)).filter(
        models.DialogMessage.timestamp >= hour_ago
    ).scalar()

    # Время последнего сообщения
    last_message = db.query(models.DialogMessage.timestamp)\
        .order_by(desc(models.DialogMessage.timestamp))\
        .first()

    # Корректируем время для московского часового пояса (UTC+3)
    if last_message:
        last_message_time = last_message[0] + timedelta(hours=3)
    else:
        last_message_time = None

    # Статистика по дням (последние 7 дней)
    daily_stats = []
    for i in range(7):
        date = today - timedelta(days=i)
        daily_dialogs = db.query(func.count(models.Dialog.id)).filter(
            func.date(models.Dialog.started_at) == date
        ).scalar()
        daily_stats.append({
            "date": date.strftime("%Y-%m-%d"),
            "dialogs": daily_dialogs
        })

    return ChatAnalyticsOverview(
        total_dialogs=total_dialogs,
        total_messages=total_messages,
        total_users_with_chats=total_users_with_chats,
        active_users_today=active_users_today,
        active_users_week=active_users_week,
        avg_messages_per_dialog=round(avg_messages, 1),
        messages_last_hour=messages_last_hour,
        last_message_time=last_message_time,
        top_channels=top_channels,
        daily_stats=list(reversed(daily_stats))
    )

@router.get("/admin/chats/users", response_model=UserChatStats)
async def get_users_chat_stats(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    sort_by: str = Query('last_activity', enum=['email', 'created_at', 'last_activity', 'total_dialogs', 'total_messages']),
    order: str = Query('desc', enum=['asc', 'desc']),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить список пользователей с их статистикой чатов"""

    # Подзапрос для статистики диалогов
    dialog_stats = db.query(
        models.Dialog.user_id,
        func.count(models.Dialog.id).label('total_dialogs'),
        func.max(models.Dialog.started_at).label('last_dialog_at'),
        func.sum(case((models.Dialog.telegram_chat_id.is_(None), 1), else_=0)).label('website_dialogs'),
        func.sum(case((models.Dialog.telegram_chat_id.isnot(None), 1), else_=0)).label('telegram_dialogs')
    ).group_by(models.Dialog.user_id).subquery()

    # Подзапрос для статистики сообщений
    message_stats = db.query(
        models.Dialog.user_id,
        func.count(models.DialogMessage.id).label('total_messages'),
        func.count(func.distinct(models.Dialog.id)).label('dialog_count')
    ).join(models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id)\
     .group_by(models.Dialog.user_id).subquery()

    # Основной запрос
    query = db.query(
        models.User,
        dialog_stats.c.total_dialogs,
        dialog_stats.c.last_dialog_at,
        dialog_stats.c.website_dialogs,
        dialog_stats.c.telegram_dialogs,
        message_stats.c.total_messages,
        message_stats.c.dialog_count
    ).outerjoin(dialog_stats, models.User.id == dialog_stats.c.user_id)\
     .outerjoin(message_stats, models.User.id == message_stats.c.user_id)\
     .filter(dialog_stats.c.total_dialogs.isnot(None))  # Только пользователи с диалогами

    # Поиск
    if search:
        search_filter = f"%{search}%"
        query = query.filter(or_(
            models.User.email.ilike(search_filter),
            models.User.first_name.ilike(search_filter)
        ))

    # Сортировка
    sort_column = {
        'email': models.User.email,
        'created_at': models.User.created_at,
        'last_activity': dialog_stats.c.last_dialog_at,
        'total_dialogs': dialog_stats.c.total_dialogs,
        'total_messages': message_stats.c.total_messages
    }.get(sort_by, dialog_stats.c.last_dialog_at)

    if order == 'desc':
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(sort_column)

    # Подсчет общего количества
    total_count = query.count()

    # Пагинация
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()

    # Подсчет общих метрик
    total_dialogs = db.query(func.count(models.Dialog.id)).scalar()
    total_messages = db.query(func.count(models.DialogMessage.id)).scalar()

    # Формирование результата
    users = []
    for row in results:
        user = row[0]
        users.append(UserChatOverview(
            user_id=user.id,
            email=user.email,
            full_name=user.first_name,  # используем first_name вместо full_name
            role=user.role,
            created_at=user.created_at,
            last_activity=row[2],  # last_dialog_at
            total_dialogs=row[1] or 0,  # total_dialogs
            total_messages=row[5] or 0,  # total_messages
            website_dialogs=row[3] or 0,  # website_dialogs
            telegram_dialogs=row[4] or 0,  # telegram_dialogs
            avg_dialog_length=float((row[5] or 0) / (row[6] or 1)),  # total_messages / dialog_count
            last_dialog_at=row[2]  # last_dialog_at
        ))

    return UserChatStats(
        users=users,
        total_users=total_count,
        total_dialogs=total_dialogs,
        total_messages=total_messages,
        pagination={
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    )

@router.get("/admin/chats/user/{user_id}/dialogs", response_model=UserDialogsDetail)
async def get_user_dialogs_detail(
    user_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить детальную информацию о диалогах конкретного пользователя"""

    # Проверяем существование пользователя
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Получаем статистику пользователя
    user_stats = db.query(
        func.count(models.Dialog.id).label('total_dialogs'),
        func.count(models.DialogMessage.id).label('total_messages'),
        func.max(models.Dialog.started_at).label('last_dialog_at'),
        func.sum(case((models.Dialog.telegram_chat_id.is_(None), 1), else_=0)).label('website_dialogs'),
        func.sum(case((models.Dialog.telegram_chat_id.isnot(None), 1), else_=0)).label('telegram_dialogs')
    ).select_from(models.Dialog)\
     .outerjoin(models.DialogMessage, models.Dialog.id == models.DialogMessage.dialog_id)\
     .filter(models.Dialog.user_id == user_id).first()

    # Получаем диалоги с пагинацией
    dialogs_query = db.query(models.Dialog)\
        .options(joinedload(models.Dialog.assistant))\
        .filter(models.Dialog.user_id == user_id)\
        .order_by(desc(models.Dialog.started_at))

    total_dialogs = dialogs_query.count()
    offset = (page - 1) * limit
    dialogs = dialogs_query.offset(offset).limit(limit).all()

    # Формируем список диалогов
    dialog_list = []
    for dialog in dialogs:
        # Получаем количество сообщений в диалоге
        message_count = db.query(func.count(models.DialogMessage.id))\
            .filter(models.DialogMessage.dialog_id == dialog.id).scalar()

        # Получаем первое сообщение для preview
        first_message = db.query(models.DialogMessage.text)\
            .filter(models.DialogMessage.dialog_id == dialog.id)\
            .order_by(models.DialogMessage.timestamp)\
            .first()

        # Вычисляем длительность диалога
        duration_minutes = None
        if dialog.ended_at and dialog.started_at:
            duration = dialog.ended_at - dialog.started_at
            duration_minutes = duration.total_seconds() / 60

        # Определяем канал по наличию telegram_chat_id
        channel = "telegram" if dialog.telegram_chat_id else "website"

        dialog_list.append(DialogOverview(
            dialog_id=dialog.id,
            channel=channel,
            started_at=dialog.started_at,
            ended_at=dialog.ended_at,
            status=getattr(dialog, 'status', 'active'),
            message_count=message_count,
            assistant_name=dialog.assistant.name if dialog.assistant else None,
            first_message_preview=first_message[0][:100] + "..." if first_message and len(first_message[0]) > 100 else (first_message[0] if first_message else None),
            duration_minutes=round(duration_minutes, 1) if duration_minutes else None
        ))

    # Формируем информацию о пользователе
    user_info = UserChatOverview(
        user_id=user.id,
        email=user.email,
        full_name=user.first_name,  # используем first_name вместо full_name
        role=user.role,
        created_at=user.created_at,
        last_activity=user_stats.last_dialog_at,
        total_dialogs=user_stats.total_dialogs or 0,
        total_messages=user_stats.total_messages or 0,
        website_dialogs=user_stats.website_dialogs or 0,
        telegram_dialogs=user_stats.telegram_dialogs or 0,
        avg_dialog_length=0,  # Можно вычислить отдельно если нужно
        last_dialog_at=user_stats.last_dialog_at
    )

    return UserDialogsDetail(
        user_info=user_info,
        dialogs=dialog_list,
        total_dialogs=total_dialogs,
        pagination={
            "page": page,
            "limit": limit,
            "total": total_dialogs,
            "pages": (total_dialogs + limit - 1) // limit
        }
    )

@router.get("/admin/chats/dialog/{dialog_id}/messages", response_model=DialogMessagesDetail)
async def get_dialog_messages(
    dialog_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """Получить все сообщения конкретного диалога"""

    # Проверяем существование диалога
    dialog = db.query(models.Dialog)\
        .options(joinedload(models.Dialog.assistant))\
        .filter(models.Dialog.id == dialog_id).first()

    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")

    # Получаем все сообщения диалога
    messages = db.query(models.DialogMessage)\
        .filter(models.DialogMessage.dialog_id == dialog_id)\
        .order_by(models.DialogMessage.timestamp).all()

    # Формируем список сообщений
    message_list = []
    for message in messages:
        message_list.append(DialogMessageDetail(
            id=message.id,
            sender=message.sender,
            text=message.text,
            timestamp=message.timestamp,
            message_kind=getattr(message, 'message_kind', None)
        ))

    # Формируем информацию о диалоге
    channel = "telegram" if dialog.telegram_chat_id else "website"
    duration_minutes = None
    if dialog.ended_at and dialog.started_at:
        duration = dialog.ended_at - dialog.started_at
        duration_minutes = duration.total_seconds() / 60

    dialog_info = DialogOverview(
        dialog_id=dialog.id,
        channel=channel,
        started_at=dialog.started_at,
        ended_at=dialog.ended_at,
        status=getattr(dialog, 'status', 'active'),
        message_count=len(messages),
        assistant_name=dialog.assistant.name if dialog.assistant else None,
        first_message_preview=messages[0].text[:100] + "..." if messages and len(messages[0].text) > 100 else (messages[0].text if messages else None),
        duration_minutes=round(duration_minutes, 1) if duration_minutes else None
    )

    return DialogMessagesDetail(
        dialog_id=dialog_id,
        messages=message_list,
        dialog_info=dialog_info
    )