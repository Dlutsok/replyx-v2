"""
WebSocket менеджер для диалогов
"""
import asyncio
from typing import Dict, List
import time
import logging
from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from database import models, auth
from core.site_auth import get_current_site_user_simple

# Хранилище подключений по dialog_id
ws_connections: Dict[int, List[WebSocket]] = {}
ws_site_connections: Dict[int, List[WebSocket]] = {}

# Метаданные соединений: last_pong, создано, счётчики
ws_meta: Dict[int, Dict[WebSocket, Dict[str, float]]] = {}
ws_site_meta: Dict[int, Dict[WebSocket, Dict[str, float]]] = {}

# Глобальный счетчик sequence numbers для упорядочивания событий
_sequence_counter = 0

# Лимиты подключений
MAX_CONNECTIONS_PER_DIALOG = 50
MAX_TOTAL_CONNECTIONS = 1000
PING_INTERVAL_SECONDS = 25
PONG_TIMEOUT_SECONDS = 40

logger = logging.getLogger(__name__)

async def _register_connection(bucket: Dict[int, List[WebSocket]], meta_bucket: Dict[int, Dict[WebSocket, Dict[str, float]]], dialog_id: int, websocket: WebSocket) -> bool:
    # Глобальный лимит
    total = sum(len(lst) for lst in bucket.values())
    if total >= MAX_TOTAL_CONNECTIONS:
        await websocket.close(code=1013)
        return False
    # Лимит на диалог
    conns = bucket.get(dialog_id, [])
    if len(conns) >= MAX_CONNECTIONS_PER_DIALOG:
        await websocket.close(code=1013)
        return False
    if dialog_id not in bucket:
        bucket[dialog_id] = []
    if dialog_id not in meta_bucket:
        meta_bucket[dialog_id] = {}
    bucket[dialog_id].append(websocket)
    meta_bucket[dialog_id][websocket] = {"created": time.time(), "last_pong": time.time()}
    return True

async def _unregister_connection(bucket: Dict[int, List[WebSocket]], meta_bucket: Dict[int, Dict[WebSocket, Dict[str, float]]], dialog_id: int, websocket: WebSocket):
    try:
        if dialog_id in bucket and websocket in bucket[dialog_id]:
            bucket[dialog_id].remove(websocket)
        if dialog_id in meta_bucket and websocket in meta_bucket[dialog_id]:
            del meta_bucket[dialog_id][websocket]
    except Exception:
        pass

async def _heartbeat_loop(dialog_id: int, websocket: WebSocket, meta_bucket: Dict[int, Dict[WebSocket, Dict[str, float]]]):
    try:
        while True:
            await asyncio.sleep(PING_INTERVAL_SECONDS)
            # Если соединение пропало из меты — прекращаем
            if dialog_id not in meta_bucket or websocket not in meta_bucket[dialog_id]:
                break
            try:
                await websocket.send_text("__ping__")
            except Exception:
                break
            # Проверяем таймаут по pong
            last_pong = meta_bucket[dialog_id][websocket].get("last_pong", 0)
            if time.time() - last_pong > PONG_TIMEOUT_SECONDS:
                try:
                    await websocket.close(code=1002)
                finally:
                    break
    except Exception:
        pass

async def _receive_loop(dialog_id: int, websocket: WebSocket, meta_bucket: Dict[int, Dict[WebSocket, Dict[str, float]]]):
    try:
        while True:
            data = await websocket.receive_text()
            if data == "__pong__":
                if dialog_id in meta_bucket and websocket in meta_bucket[dialog_id]:
                    meta_bucket[dialog_id][websocket]["last_pong"] = time.time()
            # Игнор остальных входящих сообщений
            await asyncio.sleep(0)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

async def dialog_websocket_endpoint(websocket: WebSocket, dialog_id: int, token: str = None, db: Session = None):
    """WebSocket endpoint для диалогов с авторизацией"""
    # Авторизация по токену (JWT) для WebSocket
    user = None
    if token:
        try:
            from core.auth import get_user_from_token
            user = get_user_from_token(token, db)
            if not user:
                await websocket.close(code=4001, reason="Invalid token")
                return
        except Exception as e:
            print(f"❌ [WebSocket] Auth error: {e}")
            await websocket.close(code=4001, reason="Auth failed")
            return
    await websocket.accept()
    ok = await _register_connection(ws_connections, ws_meta, dialog_id, websocket)
    if not ok:
        return
    print(f"🔌 [Admin] WebSocket подключён к диалогу {dialog_id}")
    print(f"📊 [Admin] Total connections for dialog {dialog_id}: {len(ws_connections[dialog_id])}")
    # Параллельно: приём сообщений (pong) и heartbeat
    receive_task = asyncio.create_task(_receive_loop(dialog_id, websocket, ws_meta))
    heartbeat_task = asyncio.create_task(_heartbeat_loop(dialog_id, websocket, ws_meta))
    try:
        await asyncio.wait([receive_task, heartbeat_task], return_when=asyncio.FIRST_COMPLETED)
    finally:
        receive_task.cancel()
        heartbeat_task.cancel()
        await _unregister_connection(ws_connections, ws_meta, dialog_id, websocket)
        print(f"🔌 [Admin] WebSocket отключён от диалога {dialog_id}")
        print(f"📊 [Admin] Remaining connections for dialog {dialog_id}: {len(ws_connections.get(dialog_id, []))}")

async def site_dialog_websocket_endpoint(websocket: WebSocket, dialog_id: int, site_token: str = Query(None), db: Session = None):
    """WebSocket endpoint для site диалогов"""
    user = None
    try:
        user = get_current_site_user_simple(site_token, db)
    except Exception:
        await websocket.close(code=4001)
        return
    await websocket.accept()
    ok = await _register_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)
    if not ok:
        return
    receive_task = asyncio.create_task(_receive_loop(dialog_id, websocket, ws_site_meta))
    heartbeat_task = asyncio.create_task(_heartbeat_loop(dialog_id, websocket, ws_site_meta))
    try:
        await asyncio.wait([receive_task, heartbeat_task], return_when=asyncio.FIRST_COMPLETED)
    finally:
        receive_task.cancel()
        heartbeat_task.cancel()
        await _unregister_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)

async def widget_dialog_websocket_endpoint(websocket: WebSocket, dialog_id: int, assistant_id: int, db: Session = None):
    """WebSocket endpoint для widget диалогов"""
    print(f"🔌 [Widget] WebSocket connection attempt for dialog {dialog_id}, assistant {assistant_id}")
    
    # Проверяем, что ассистент существует
    assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
    if not assistant:
        print(f"❌ [Widget] Assistant {assistant_id} not found")
        await websocket.close(code=4004)
        return
    
    await websocket.accept()
    print(f"✅ [Widget] WebSocket accepted for dialog {dialog_id}")
    
    ok = await _register_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)
    if not ok:
        return
    print(f"📊 [Widget] Total connections for dialog {dialog_id}: {len(ws_site_connections[dialog_id])}")
    receive_task = asyncio.create_task(_receive_loop(dialog_id, websocket, ws_site_meta))
    heartbeat_task = asyncio.create_task(_heartbeat_loop(dialog_id, websocket, ws_site_meta))
    try:
        await asyncio.wait([receive_task, heartbeat_task], return_when=asyncio.FIRST_COMPLETED)
    finally:
        receive_task.cancel()
        heartbeat_task.cancel()
        print(f"🔌 [Widget] WebSocket disconnected for dialog {dialog_id}")
        await _unregister_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)
        print(f"📊 [Widget] Remaining connections for dialog {dialog_id}: {len(ws_site_connections.get(dialog_id, []))}")

# Функция для пуша нового сообщения всем клиентам диалога
async def push_dialog_message(dialog_id: int, message: dict):
    """Отправляет сообщение всем подключенным клиентам диалога (админ панель)"""
    conns = ws_connections.get(dialog_id, [])
    print(f"🔍 [WebSocketManager] Push to ADMIN dialog {dialog_id}: {len(conns)} connections")
    print(f"📨 [WebSocketManager] Admin message: {message}")
    
    if not conns:
        print(f"⚠️ [WebSocketManager] No ADMIN WebSocket connections found for dialog {dialog_id}")
        print(f"📊 [WebSocketManager] Available ADMIN dialogs: {list(ws_connections.keys())}")
        return
    
    sent_count = 0
    for ws in conns:
        try:
            await ws.send_json(message)
            sent_count += 1
            print(f"✅ [WebSocketManager] Message sent via ADMIN WebSocket")
        except Exception as e:
            print(f"❌ [WebSocketManager] Failed to send ADMIN WebSocket message: {e}")
    
    print(f"📊 [WebSocketManager] Sent to {sent_count}/{len(conns)} ADMIN connections")

# Функция для пуша нового сообщения всем клиентам site-диалога
async def push_site_dialog_message(dialog_id: int, message: dict):
    """Отправляет сообщение всем подключенным клиентам site-диалога (виджеты)"""
    conns = ws_site_connections.get(dialog_id, [])
    print(f"🔍 [WebSocketManager] Push to SITE/WIDGET dialog {dialog_id}: {len(conns)} connections")
    print(f"📨 [WebSocketManager] Site/Widget message: {message}")
    
    if not conns:
        print(f"⚠️ [WebSocketManager] No SITE/WIDGET WebSocket connections found for dialog {dialog_id}")
        print(f"📊 [WebSocketManager] Available SITE/WIDGET dialogs: {list(ws_site_connections.keys())}")
        return
    
    sent_count = 0
    for ws in conns:
        try:
            await ws.send_json(message)
            sent_count += 1
            print(f"✅ [WebSocketManager] Message sent via SITE/WIDGET WebSocket")
        except Exception as e:
            print(f"❌ [WebSocketManager] Failed to send SITE/WIDGET WebSocket message: {e}")
    
    print(f"📊 [WebSocketManager] Sent to {sent_count}/{len(conns)} SITE/WIDGET connections")

def _get_next_sequence() -> int:
    """Получает следующий sequence number для событий"""
    global _sequence_counter
    _sequence_counter += 1
    return _sequence_counter

async def push_handoff_requested(dialog_id: int, reason: str, queue_position: int = None, metadata: dict = None):
    """Отправляет событие handoff_requested всем подключенным клиентам диалога"""
    event = {
        "type": "handoff_requested",
        "dialog_id": dialog_id,
        "reason": reason,
        "seq": _get_next_sequence(),
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    
    if queue_position is not None:
        event["queue_position"] = queue_position
    
    if metadata:
        event["metadata"] = metadata
    
    print(f"📨 [WebSocketManager] Handoff requested event: {event}")
    
    # Отправляем в обычные и site connections
    await push_dialog_message(dialog_id, event)
    await push_site_dialog_message(dialog_id, event)

async def push_handoff_started(dialog_id: int, manager_info: dict, metadata: dict = None):
    """Отправляет событие handoff_started всем подключенным клиентам диалога"""
    event = {
        "type": "handoff_started", 
        "dialog_id": dialog_id,
        "manager": manager_info,  # {"id": int, "name": str, "avatar": str}
        "seq": _get_next_sequence(),
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    
    if metadata:
        event["metadata"] = metadata
    
    print(f"📨 [WebSocketManager] Handoff started event: {event}")
    
    # Отправляем в обычные и site connections
    await push_dialog_message(dialog_id, event)
    await push_site_dialog_message(dialog_id, event)

async def push_handoff_released(dialog_id: int, metadata: dict = None):
    """Отправляет событие handoff_released всем подключенным клиентам диалога"""
    event = {
        "type": "handoff_released",
        "dialog_id": dialog_id,
        "seq": _get_next_sequence(),
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    
    if metadata:
        event["metadata"] = metadata
    
    print(f"📨 [WebSocketManager] Handoff released event: {event}")
    
    # Отправляем в обычные и site connections
    await push_dialog_message(dialog_id, event)
    await push_site_dialog_message(dialog_id, event)

async def push_handoff_cancelled(dialog_id: int, reason: str = None, metadata: dict = None):
    """Отправляет событие handoff_cancelled всем подключенным клиентам диалога"""
    event = {
        "type": "handoff_cancelled",
        "dialog_id": dialog_id,
        "seq": _get_next_sequence(),
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    
    if reason:
        event["reason"] = reason
    
    if metadata:
        event["metadata"] = metadata
    
    print(f"📨 [WebSocketManager] Handoff cancelled event: {event}")
    
    # Отправляем в обычные и site connections
    await push_dialog_message(dialog_id, event)
    await push_site_dialog_message(dialog_id, event)

async def push_operator_handling(dialog_id: int, message_text: str, metadata: dict = None):
    """Отправляет событие operator_handling когда оператор обрабатывает диалог"""
    event = {
        "type": "operator_handling",
        "dialog_id": dialog_id,
        "message": message_text,
        "seq": _get_next_sequence(),
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    }
    
    if metadata:
        event["metadata"] = metadata
    
    print(f"📨 [WebSocketManager] Operator handling event: {event}")
    
    # Отправляем в обычные и site connections
    await push_dialog_message(dialog_id, event)
    await push_site_dialog_message(dialog_id, event)