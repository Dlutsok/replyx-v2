"""
SSE (Server-Sent Events) API endpoints для ReplyX
Обеспечивает real-time доставку событий через HTTP/2 streams
Интеграция с существующей системой авторизации и WebSocket infrastructure
"""
import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, Set

from fastapi import APIRouter, HTTPException, Depends, Query, Request, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import models, get_db
from core.site_auth import get_current_site_user, get_current_site_user_simple
from core.app_config import is_development
from services.sse_manager import sse_manager, validate_sse_auth, get_sse_stats
from database.models import Dialog, Assistant

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["SSE"])

@router.get("/dialogs/{dialog_id}/events")
async def dialog_events_stream(
    dialog_id: int,
    request: Request,
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    token: Optional[str] = Query(None),
    site_token: Optional[str] = Query(None),
    assistant_id: Optional[int] = Query(None),
    guest_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    SSE stream для событий диалога
    Поддерживает три режима авторизации:
    - token: JWT токен для admin панели
    - site_token: Site token для виджетов с авторизацией
    - assistant_id + guest_id: Гостевой режим для виджетов
    
    Интеграция с существующей WebSocket архитектурой
    """
    
    # Получаем информацию о клиенте
    client_ip = request.client.host
    origin = request.headers.get("origin")
    user_agent = request.headers.get("user-agent", "")
    
    logger.info(f"🔌 [SSE API] Connection attempt for dialog {dialog_id}")
    logger.debug(f"🔌 [SSE API] Client: {client_ip}, Origin: {origin}, Last-Event-ID: {last_event_id}")
    
    # Проверяем существование диалога
    dialog = db.query(Dialog).filter(Dialog.id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    # Валидация авторизации через новый SSE manager
    is_valid, auth_type = await validate_sse_auth(
        dialog_id=dialog_id,
        token=token,
        site_token=site_token,
        assistant_id=assistant_id,
        origin=origin
    )
    
    if not is_valid:
        logger.warning(f"⛔ [SSE API] Authorization failed for dialog {dialog_id}: {auth_type}")
        raise HTTPException(status_code=403, detail=f"Authorization failed: {auth_type}")
    
    # Дополнительная проверка для widget режима
    if auth_type == "widget" and assistant_id:
        assistant = db.query(Assistant).filter(Assistant.id == assistant_id).first()
        if not assistant or not assistant.is_active:
            raise HTTPException(status_code=403, detail="Assistant not found or inactive")
        
        # Проверяем, что диалог связан с этим ассистентом
        if dialog.assistant_id != assistant_id:
            raise HTTPException(status_code=403, detail="Dialog does not belong to this assistant")
    
    # Совместимость с существующими проверками
    elif auth_type == "site" and site_token:
        try:
            current_user = get_current_site_user_simple(site_token, db)
            if not current_user:
                raise HTTPException(status_code=401, detail="Invalid site token")
            
            # Проверяем права на диалог
            if dialog.user_id != current_user.id:
                raise HTTPException(status_code=403, detail="Dialog access denied")
        except Exception as e:
            logger.error(f"Site auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Генерируем уникальный ID клиента
    client_id = f"{auth_type}_{dialog_id}_{uuid.uuid4().hex[:8]}"
    
    logger.info(f"✅ [SSE API] Authorization successful for dialog {dialog_id} ({auth_type})")
    logger.info(f"🔌 [SSE API] Creating SSE stream for client {client_id}")
    
    async def event_stream():
        """
        Генерирует SSE события для клиента через новый SSE Manager
        """
        try:
            # SSE headers в начале потока
            yield f"retry: 5000\n\n"  # Retry через 5 секунд при разрыве
            
            # Создаем SSE stream через менеджер
            async for sse_event in sse_manager.create_sse_stream(
                dialog_id=dialog_id,
                client_id=client_id,
                last_event_id=last_event_id,
                origin=origin,
                user_agent=user_agent,
                auth_type=auth_type
            ):
                yield sse_event
                await asyncio.sleep(0.01)  # Небольшая задержка для стабильности
                
        except asyncio.CancelledError:
            logger.info(f"🔌 [SSE API] Client {client_id} disconnected")
        except Exception as e:
            logger.error(f"❌ [SSE API] Error in event stream for {client_id}: {e}")
            # Отправляем error событие перед закрытием
            yield f"event: error\ndata: {{\"error\": \"Stream error\"}}\n\n"
    
    # Возвращаем StreamingResponse с правильными SSE заголовками
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Для Nginx
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Headers": "Last-Event-ID, Cache-Control",
            "Access-Control-Expose-Headers": "Content-Type",
        }
    )


# Дополнительные специализированные endpoints для совместимости

@router.get("/site/dialogs/{dialog_id}/events")
async def site_dialog_events_stream(
    dialog_id: int,
    request: Request,
    site_token: str = Query(...),
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    db: Session = Depends(get_db)
):
    """
    SSE stream для site виджетов (с site_token)
    Упрощенная версия основного endpoint'а
    """
    return await dialog_events_stream(
        dialog_id=dialog_id,
        request=request,
        last_event_id=last_event_id,
        token=None,
        site_token=site_token,
        assistant_id=None,
        guest_id=None,
        db=db
    )

@router.get("/widget/dialogs/{dialog_id}/events")
async def widget_dialog_events_stream(
    dialog_id: int,
    request: Request,
    assistant_id: int = Query(...),
    guest_id: str = Query(...),
    last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    db: Session = Depends(get_db)
):
    """
    SSE stream для widget режима (с assistant_id + guest_id)
    Упрощенная версия основного endpoint'а
    """
    return await dialog_events_stream(
        dialog_id=dialog_id,
        request=request,
        last_event_id=last_event_id,
        token=None,
        site_token=None,
        assistant_id=assistant_id,
        guest_id=guest_id,
        db=db
    )

@router.get("/sse/health")
async def sse_health_check():
    """
    Health check для SSE сервиса
    Возвращает статистику активных соединений
    """
    try:
        stats = get_sse_stats()
        
        # Проверяем Redis подключение
        await sse_manager.redis.ping()
        redis_status = "healthy"
        
    except Exception as e:
        logger.error(f"❌ [SSE Health] Redis check failed: {e}")
        redis_status = f"error: {str(e)}"
    
    return {
        "service": "SSE Events",
        "status": "healthy" if redis_status == "healthy" else "degraded",
        "redis_status": redis_status,
        "timestamp": time.time(),
        **stats
    }

@router.get("/sse/stats")
async def sse_detailed_stats():
    """
    Детальная статистика SSE сервиса
    Только для development режима или admin авторизации
    """
    if not is_development:
        raise HTTPException(status_code=403, detail="Available only in development mode")
    
    stats = get_sse_stats()
    
    # Добавляем дополнительную информацию
    from services.sse_manager import sse_clients, sse_connections
    
    client_details = []
    for client_id, client in sse_clients.items():
        client_details.append({
            "client_id": client_id,
            "dialog_id": client.dialog_id,
            "auth_type": client.auth_type,
            "connected_at": client.connected_at,
            "connected_duration": time.time() - client.connected_at,
            "origin": client.origin,
            "last_event_id": client.last_event_id,
        })
    
    return {
        **stats,
        "connections_by_dialog": dict(sse_connections),
        "client_details": client_details,
        "redis_url": sse_manager.redis.connection_pool.connection_kwargs.get("host", "unknown") if sse_manager.redis else "not connected",
    }

@router.post("/sse/test-event")
async def send_test_event(
    dialog_id: int = Query(...),
    message: str = Query("Test SSE event"),
    db: Session = Depends(get_db)
):
    """
    Отправка тестового события через SSE
    Только для development режима
    """
    if not is_development:
        raise HTTPException(status_code=403, detail="Available only in development mode")
    
    # Проверяем существование диалога
    dialog = db.query(Dialog).filter(Dialog.id == dialog_id).first()
    if not dialog:
        raise HTTPException(status_code=404, detail="Dialog not found")
    
    # Создаем тестовое событие
    test_event = {
        "id": f"test_{int(time.time())}",
        "sender": "system",
        "text": message,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "type": "test_event"
    }
    
    # Отправляем через SSE менеджер
    from services.sse_manager import push_sse_event, sse_connections
    await push_sse_event(dialog_id, test_event)
    
    logger.info(f"📤 [SSE Test] Sent test event to dialog {dialog_id}: {message}")
    
    return {
        "status": "sent",
        "dialog_id": dialog_id,
        "event": test_event,
        "active_connections": len(sse_connections.get(dialog_id, [])),
    }

# CORS preflight для SSE endpoints
@router.options("/dialogs/{dialog_id}/events")
@router.options("/site/dialogs/{dialog_id}/events")  
@router.options("/widget/dialogs/{dialog_id}/events")
async def sse_cors_preflight(request: Request):
    """
    CORS preflight для SSE endpoints
    """
    origin = request.headers.get("origin")
    
    return {
        "status": "ok"
    }, {
        "Access-Control-Allow-Origin": origin if origin else "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Last-Event-ID, Cache-Control, Authorization",
        "Access-Control-Max-Age": "3600",
    }