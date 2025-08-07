"""
WebSocket менеджер для диалогов
"""
import asyncio
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from database import models, auth
from core.site_auth import get_current_site_user_simple

# Хранилище подключений по dialog_id
ws_connections: Dict[int, List[WebSocket]] = {}
ws_site_connections: Dict[int, List[WebSocket]] = {}

async def dialog_websocket_endpoint(websocket: WebSocket, dialog_id: int, token: str = None, db: Session = None):
    """WebSocket endpoint для диалогов с авторизацией"""
    # Простая авторизация по токену (JWT)
    user = None
    if token:
        try:
            user = auth.get_current_user(token, db)
        except Exception as e:
            await websocket.close(code=4001)
            return
    await websocket.accept()
    if dialog_id not in ws_connections:
        ws_connections[dialog_id] = []
    ws_connections[dialog_id].append(websocket)
    print(f"WebSocket подключён к диалогу {dialog_id}")
    try:
        while True:
            data = await websocket.receive_text()
            # Не используем входящие сообщения, только пушим новые
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        ws_connections[dialog_id].remove(websocket)
        print(f"WebSocket отключён от диалога {dialog_id}")

async def site_dialog_websocket_endpoint(websocket: WebSocket, dialog_id: int, site_token: str = Query(None), db: Session = None):
    """WebSocket endpoint для site диалогов"""
    user = None
    try:
        user = get_current_site_user_simple(site_token, db)
    except Exception:
        await websocket.close(code=4001)
        return
    await websocket.accept()
    if dialog_id not in ws_site_connections:
        ws_site_connections[dialog_id] = []
    ws_site_connections[dialog_id].append(websocket)
    try:
        while True:
            await websocket.receive_text()  # ping-pong, не используем входящие
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        ws_site_connections[dialog_id].remove(websocket)

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
    
    if dialog_id not in ws_site_connections:
        ws_site_connections[dialog_id] = []
    ws_site_connections[dialog_id].append(websocket)
    print(f"📊 [Widget] Total connections for dialog {dialog_id}: {len(ws_site_connections[dialog_id])}")
    
    try:
        while True:
            await websocket.receive_text()  # ping-pong, не используем входящие
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        print(f"🔌 [Widget] WebSocket disconnected for dialog {dialog_id}")
        if dialog_id in ws_site_connections:
            ws_site_connections[dialog_id].remove(websocket)
            print(f"📊 [Widget] Remaining connections for dialog {dialog_id}: {len(ws_site_connections[dialog_id])}")

# Функция для пуша нового сообщения всем клиентам диалога
async def push_dialog_message(dialog_id: int, message: dict):
    """Отправляет сообщение всем подключенным клиентам диалога"""
    conns = ws_connections.get(dialog_id, [])
    for ws in conns:
        try:
            await ws.send_json(message)
        except Exception:
            pass

# Функция для пуша нового сообщения всем клиентам site-диалога
async def push_site_dialog_message(dialog_id: int, message: dict):
    """Отправляет сообщение всем подключенным клиентам site-диалога"""
    conns = ws_site_connections.get(dialog_id, [])
    print(f"🔍 [WebSocketManager] Push message to dialog {dialog_id}: {len(conns)} connections")
    print(f"📨 [WebSocketManager] Message: {message}")
    
    if not conns:
        print(f"⚠️ [WebSocketManager] No WebSocket connections found for dialog {dialog_id}")
        print(f"📊 [WebSocketManager] Available dialogs: {list(ws_site_connections.keys())}")
        return
    
    sent_count = 0
    for ws in conns:
        try:
            await ws.send_json(message)
            sent_count += 1
            print(f"✅ [WebSocketManager] Message sent via WebSocket")
        except Exception as e:
            print(f"❌ [WebSocketManager] Failed to send WebSocket message: {e}")
    
    print(f"📊 [WebSocketManager] Sent to {sent_count}/{len(conns)} connections")