"""
WebSocket API endpoints
"""
from fastapi import APIRouter, WebSocket, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from services.websocket_manager import (
    dialog_websocket_endpoint,
    site_dialog_websocket_endpoint,
    widget_dialog_websocket_endpoint
)

router = APIRouter()

@router.websocket("/ws/dialogs")
async def user_dialogs_ws(websocket: WebSocket, token: str = Query(None), db: Session = Depends(get_db)):
    """WebSocket endpoint для получения обновлений всех диалогов пользователя"""
    from core.auth import get_user_from_token
    from datetime import datetime
    import json
    import asyncio
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Проверяем авторизацию
        if not token:
            await websocket.close(code=1008, reason="Token required")
            return
        
        user = get_user_from_token(token, db)
        if not user:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        await websocket.accept()
        logger.info(f"WebSocket подключение установлено для пользователя {user.id}")
        
        # Отправляем подтверждение подключения
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": "WebSocket подключение установлено",
            "user_id": user.id
        }))
        
        # Основной цикл обслуживания соединения
        try:
            while True:
                # Ждем сообщений от клиента или держим соединение открытым
                await asyncio.sleep(30)  # Ping каждые 30 секунд
                await websocket.send_text(json.dumps({
                    "type": "ping",
                    "timestamp": str(datetime.utcnow())
                }))
        except Exception as e:
            logger.error(f"Ошибка в WebSocket цикле: {e}")
            
    except Exception as e:
        logger.error(f"Ошибка WebSocket подключения: {e}")
        await websocket.close(code=1011, reason="Ошибка соединения")

@router.websocket("/ws/dialogs/{dialog_id}")
async def dialog_ws(websocket: WebSocket, dialog_id: int, token: str = None, db: Session = Depends(get_db)):
    """WebSocket endpoint для диалогов с авторизацией"""
    await dialog_websocket_endpoint(websocket, dialog_id, token, db)

@router.websocket("/ws/site/dialogs/{dialog_id}")
async def site_dialog_ws(websocket: WebSocket, dialog_id: int, site_token: str = Query(None), db: Session = Depends(get_db)):
    """WebSocket endpoint для site диалогов"""
    await site_dialog_websocket_endpoint(websocket, dialog_id, site_token, db)

@router.websocket("/ws/widget/dialogs/{dialog_id}")
async def widget_dialog_ws(websocket: WebSocket, dialog_id: int, assistant_id: int, db: Session = Depends(get_db)):
    """WebSocket endpoint для widget диалогов"""
    await widget_dialog_websocket_endpoint(websocket, dialog_id, assistant_id, db)