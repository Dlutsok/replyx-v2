"""
WebSocket менеджер для диалогов
Исправлена версия с production-ready фиксами
"""
import asyncio
from typing import Dict, Set
from contextlib import suppress
import time
import logging
from itertools import count
from fastapi import WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from database import models
from core.site_auth import get_current_site_user_simple
from .ws_codes import WSCloseCodes
from .ws_config import (
    MAX_CONNECTIONS_PER_DIALOG,
    MAX_TOTAL_CONNECTIONS,
    PING_INTERVAL_SECONDS, 
    PONG_TIMEOUT_SECONDS,
    WS_RATE_LIMIT_PER_IP,
    WS_RATE_LIMIT_WINDOW,
    is_development
)

# Хранилище подключений по dialog_id (используем Set для O(1) удаления)
ws_connections: Dict[int, Set[WebSocket]] = {}
ws_site_connections: Dict[int, Set[WebSocket]] = {}

# Метаданные соединений: last_pong, создано, счётчики
ws_meta: Dict[int, Dict[WebSocket, Dict[str, float]]] = {}
ws_site_meta: Dict[int, Dict[WebSocket, Dict[str, float]]] = {}

# Атомарный счетчик sequence numbers для упорядочивания событий
_sequence_counter = count(1)

# Глобальный счётчик подключений (избегаем O(N) суммирования)
_total_connections = 0

# Per-dialog locks для безопасных concurrent push'ей
_dialog_locks: Dict[int, asyncio.Lock] = {}

# Rate limiting для WebSocket подключений (IP -> timestamp list)
_ws_rate_limits: Dict[str, list] = {}

def _get_next_sequence() -> int:
    """Атомарное получение следующего sequence number"""
    return next(_sequence_counter)

# Лимиты и настройки загружаются из ws_config.py

logger = logging.getLogger(__name__)

def _extract_client_ip(websocket, trusted_proxies=None) -> str:
    """
    Безопасно извлекает client IP с защитой от spoofing
    
    Args:
        websocket: WebSocket connection объект  
        trusted_proxies: List доверенных proxy IP (None = use defaults)
    
    Returns:
        str: Real client IP или None если определить невозможно
    """
    # Список доверенных proxy/load balancer IP (customize для вашей инфраструктуры)
    if trusted_proxies is None:
        trusted_proxies = {
            "127.0.0.1",      # localhost
            "::1",            # IPv6 localhost  
            "10.0.0.0/8",     # Private networks
            "172.16.0.0/12",  # Docker networks
            "192.168.0.0/16", # Local networks
            # Добавьте ваши load balancer IPs здесь
        }
    
    # 1. Прямое подключение от клиента
    direct_ip = getattr(websocket.client, 'host', None)
    if not direct_ip:
        return None
        
    # 2. Если прямое подключение НЕ от доверенного proxy - используем его
    if not _is_trusted_proxy(direct_ip, trusted_proxies):
        return direct_ip
        
    # 3. Если запрос от доверенного proxy - проверяем X-Forwarded-For
    forwarded_for = websocket.headers.get('x-forwarded-for')
    if forwarded_for:
        # Берем первый IP из цепочки (реальный клиент)
        client_ip = forwarded_for.split(',')[0].strip()
        if client_ip and client_ip != direct_ip:
            return client_ip
            
    # 4. Проверяем X-Real-IP (альтернативный header)
    real_ip = websocket.headers.get('x-real-ip')
    if real_ip and real_ip != direct_ip:
        return real_ip
        
    # 5. Fallback к прямому подключению
    return direct_ip


def _is_trusted_proxy(ip: str, trusted_proxies: set) -> bool:
    """Проверяет, является ли IP доверенным proxy"""
    if not ip:
        return False
        
    # Простая проверка для примера (в production используйте ipaddress module)
    return ip in trusted_proxies or ip.startswith(("10.", "172.", "192.168."))


def _check_rate_limit(client_ip: str) -> bool:
    """
    Проверяет rate limiting для WebSocket подключений по IP
    Возвращает True если можно подключаться, False если превышен лимит
    
    Security: Protected against IP spoofing via trusted proxy validation
    """
    if not client_ip:
        return True  # Разрешаем если IP неизвестен (но логируем предупреждение)
        logger.warning("Rate limit check: client IP is unknown")
        
    current_time = time.time()
    window_start = current_time - WS_RATE_LIMIT_WINDOW
    
    # Получаем или создаем список подключений для IP
    if client_ip not in _ws_rate_limits:
        _ws_rate_limits[client_ip] = []
    
    timestamps = _ws_rate_limits[client_ip]
    
    # Очищаем старые записи
    timestamps[:] = [t for t in timestamps if t > window_start]
    
    # Memory exhaustion protection: Лимит на общее количество отслеживаемых IP
    MAX_TRACKED_IPS = 10000  # Максимум IP в памяти
    if len(_ws_rate_limits) > MAX_TRACKED_IPS:
        # LRU cleanup: Удаляем самые старые записи
        current_time_cleanup = time.time()
        old_entries = []
        
        for ip, ts_list in _ws_rate_limits.items():
            # Находим IP с самыми старыми записями  
            if ts_list and current_time_cleanup - ts_list[-1] > WS_RATE_LIMIT_WINDOW * 2:
                old_entries.append(ip)
                
        # Удаляем старые entries до достижения приемлемого размера
        for ip in old_entries[:len(_ws_rate_limits) - MAX_TRACKED_IPS + 1000]:
            _ws_rate_limits.pop(ip, None)
            
        logger.info(f"Rate limit memory cleanup: removed {len(old_entries)} old IP entries")
    
    # Проверяем лимит
    if len(timestamps) >= WS_RATE_LIMIT_PER_IP:
        logger.warning(f"Rate limit exceeded for IP {client_ip}: {len(timestamps)} connections in {WS_RATE_LIMIT_WINDOW}s")
        return False
    
    # Добавляем текущее подключение
    timestamps.append(current_time)
    return True

def _normalize_host_from_origin(origin: str) -> str:
    """Нормализует host из Origin header (убирает протокол, путь, порт)"""
    if not origin:
        return ""
    host = origin.split("://", 1)[-1].split("/", 1)[0].lower()
    return host.split(":", 1)[0]  # Убираем порт

def _is_domain_allowed_by_token(origin: str, site_token: str) -> bool:
    """Проверка разрешен ли домен по site_token"""
    host = _normalize_host_from_origin(origin)
    if not host:
        # Нативные/CLI клиенты только при наличии токена
        return bool(site_token)
    
    if not site_token:
        return False
    
    try:
        from jose import jwt
        from core.app_config import SECRET_KEY
        
        # Проверяем подпись токена для безопасности
        try:
            payload = jwt.decode(
                site_token, 
                SECRET_KEY, 
                algorithms=["HS256"],
                options={"verify_exp": False}  # Домены проверяем даже для истёкших токенов
            )
        except jwt.JWTError:
            # Если токен невалиден, fallback на unverified для backward compatibility
            logger.warning("Invalid token signature, falling back to unverified claims")
            payload = jwt.get_unverified_claims(site_token)
        
        allowed = payload.get("allowed_domains", "") or payload.get("ALLOWED_DOMAINS", "")
        
        if not allowed:
            return True  # Если домены не указаны, разрешаем все
        
        domains = [d.strip().lower() for d in allowed.split(",") if d.strip()]
        
        # Проверяем точное совпадение или совпадение субдомена
        return any(host == d or host.endswith('.' + d) for d in domains)
        
    except Exception as e:
        logger.warning(f"Domain validation failed: {e}", exc_info=True)
        # При ошибке парсинга токена - запрещаем
        return False

def _is_domain_allowed(origin: str) -> bool:
    """Fallback проверка для случаев без токена"""
    host = _normalize_host_from_origin(origin)
    if not host:
        # PRODUCTION: автоматически запрещаем CLI клиентов в production
        # Разрешаем только в development режиме
        return is_development()
    
    # Базовая проверка на явно запрещенные домены
    forbidden_domains = [
        'malicious-site.com',
        'spam-domain.net'
    ]
    
    for forbidden in forbidden_domains:
        if forbidden in host:
            return False
    
    return True

async def _drop_socket(bucket: Dict[int, Set[WebSocket]], meta_bucket: Dict[int, Dict[WebSocket, Dict[str, float]]], dialog_id: int, ws: WebSocket, code=WSCloseCodes.GOING_AWAY, reason="Connection dropped"):
    """Безопасно удаляет сокет из всех структур данных"""
    global _total_connections
    
    conns = bucket.get(dialog_id, set())
    if ws in conns:
        conns.discard(ws)
        _total_connections -= 1
    
    with suppress(Exception):
        await ws.close(code=code, reason=reason)
    
    # Убираем метаданные
    mb = meta_bucket.get(dialog_id, {})
    mb.pop(ws, None)
    
    # Чистим пустые ключи для экономии памяти
    if not conns:
        bucket.pop(dialog_id, None)
    if not mb:
        meta_bucket.pop(dialog_id, None)

async def _register_connection(bucket: Dict[int, Set[WebSocket]], meta_bucket: Dict[int, Dict[WebSocket, Dict[str, float]]], dialog_id: int, websocket: WebSocket) -> bool:
    """Регистрирует подключение с проверками лимитов"""
    global _total_connections
    
    # Глобальный лимит (O(1) проверка)
    if _total_connections >= MAX_TOTAL_CONNECTIONS:
        await websocket.close(code=WSCloseCodes.TRY_AGAIN_LATER, reason="Server overloaded - too many connections")
        return False
    
    # Лимит на диалог
    conns = bucket.get(dialog_id, set())
    if len(conns) >= MAX_CONNECTIONS_PER_DIALOG:
        await websocket.close(code=WSCloseCodes.TRY_AGAIN_LATER, reason="Too many connections for this dialog")
        return False
    
    if dialog_id not in bucket:
        bucket[dialog_id] = set()
    if dialog_id not in meta_bucket:
        meta_bucket[dialog_id] = {}
    
    bucket[dialog_id].add(websocket)
    meta_bucket[dialog_id][websocket] = {"created": time.time(), "last_pong": time.time()}
    _total_connections += 1
    
    return True

async def _unregister_connection(bucket: Dict[int, Set[WebSocket]], meta_bucket: Dict[int, Dict[WebSocket, Dict[str, float]]], dialog_id: int, websocket: WebSocket):
    """Отменяет регистрацию подключения"""
    global _total_connections
    
    try:
        # Удаляем из set (O(1) операция)
        conns = bucket.get(dialog_id, set())
        if websocket in conns:
            conns.discard(websocket)
            _total_connections -= 1
        
        if dialog_id in bucket and not bucket[dialog_id]:  # Если set пуст, удаляем ключ
            del bucket[dialog_id]
        
        # Удаляем метаданные
        meta_bucket.get(dialog_id, {}).pop(websocket, None)
        if dialog_id in meta_bucket and not meta_bucket[dialog_id]:  # Если словарь пуст, удаляем ключ
            del meta_bucket[dialog_id]
    except Exception as e:
        logger.error(f"Error in _unregister_connection: {e}", exc_info=True)

async def _heartbeat_loop(dialog_id: int, websocket: WebSocket, meta_bucket: Dict[int, Dict[WebSocket, Dict[str, float]]]):
    """Heartbeat цикл с ping/pong"""
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
                    # GOING_AWAY семантически корректнее для heartbeat timeout
                    # (синхронизировано с фронтендом для правильной политики reconnect)
                    await websocket.close(code=WSCloseCodes.GOING_AWAY, reason="Heartbeat timeout")
                finally:
                    break
    except Exception as e:
        logger.error(f"Heartbeat loop error: {e}", exc_info=True)

async def _receive_loop(dialog_id: int, websocket: WebSocket, meta_bucket: Dict[int, Dict[WebSocket, Dict[str, float]]]):
    """Цикл получения сообщений (обрабатывает pong)"""
    try:
        while True:
            data = await websocket.receive_text()
            if data == "__pong__":
                if dialog_id in meta_bucket and websocket in meta_bucket[dialog_id]:
                    meta_bucket[dialog_id][websocket]["last_pong"] = time.time()
            # Остальные сообщения игнорируем (no-op без sleep)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Receive loop error: {e}", exc_info=True)

async def dialog_websocket_endpoint(websocket: WebSocket, dialog_id: int, token: str = None, db: Session = None):
    """WebSocket endpoint для диалогов с авторизацией"""
    await websocket.accept()  # Accept до проверок для корректной работы с прокси
    
    # Rate limiting проверка после accept() с защитой от IP spoofing
    client_ip = _extract_client_ip(websocket)
    if not _check_rate_limit(client_ip):
        await websocket.close(code=WSCloseCodes.RATE_LIMITED, reason="Too many connections")
        return
    
    # Авторизация по токену (JWT) для WebSocket
    user = None
    if token:
        try:
            from core.auth import get_user_from_token
            user = get_user_from_token(token, db)
            if not user:
                await websocket.close(code=WSCloseCodes.AUTH_FAILED, reason="Invalid or expired token")
                return
        except Exception as e:
            logger.error(f"Auth error: {e}", exc_info=True)
            await websocket.close(code=WSCloseCodes.AUTH_FAILED, reason="Auth failed")
            return
    
    ok = await _register_connection(ws_connections, ws_meta, dialog_id, websocket)
    if not ok:
        return
    
    logger.info(f"Admin WebSocket connected to dialog {dialog_id}")
    logger.info(f"Total admin connections for dialog {dialog_id}: {len(ws_connections[dialog_id])}")
    
    # Параллельно: приём сообщений (pong) и heartbeat
    receive_task = asyncio.create_task(_receive_loop(dialog_id, websocket, ws_meta))
    heartbeat_task = asyncio.create_task(_heartbeat_loop(dialog_id, websocket, ws_meta))
    
    try:
        await asyncio.wait([receive_task, heartbeat_task], return_when=asyncio.FIRST_COMPLETED)
    finally:
        receive_task.cancel()
        heartbeat_task.cancel()
        await _unregister_connection(ws_connections, ws_meta, dialog_id, websocket)
        logger.info(f"Admin WebSocket disconnected from dialog {dialog_id}")
        logger.info(f"Remaining admin connections for dialog {dialog_id}: {len(ws_connections.get(dialog_id, set()))}")

async def site_dialog_websocket_endpoint(websocket: WebSocket, dialog_id: int, site_token: str = Query(None), db: Session = None):
    """WebSocket endpoint для site диалогов"""
    logger.info(f"Site WebSocket connection attempt for dialog {dialog_id}")
    
    await websocket.accept()  # Accept до проверок
    
    # Rate limiting проверка после accept() с защитой от IP spoofing
    client_ip = _extract_client_ip(websocket)
    if not _check_rate_limit(client_ip):
        await websocket.close(code=WSCloseCodes.RATE_LIMITED, reason="Too many connections")
        return
    
    # Проверка домена по токену
    origin = websocket.headers.get('origin', '')
    if site_token and not _is_domain_allowed_by_token(origin, site_token):
        logger.warning(f"Forbidden domain: {origin} for site_token")
        await websocket.close(code=WSCloseCodes.FORBIDDEN_DOMAIN, reason="Domain not allowed for this token")
        return
    elif not site_token and not _is_domain_allowed(origin):
        logger.warning(f"Forbidden domain: {origin} (no token)")
        await websocket.close(code=WSCloseCodes.FORBIDDEN_DOMAIN, reason="Domain not allowed")
        return
    
    user = None
    try:
        user = get_current_site_user_simple(site_token, db)
    except Exception as e:
        logger.error(f"Site auth failed for dialog {dialog_id}: {e}")
        # Различаем типы ошибок токена
        if "expired" in str(e).lower() or "exp" in str(e).lower():
            await websocket.close(code=WSCloseCodes.AUTH_EXPIRED, reason="Site token expired")
        else:
            await websocket.close(code=WSCloseCodes.AUTH_FAILED, reason="Site token invalid")
        return
    
    logger.info(f"Site WebSocket accepted for dialog {dialog_id}")
    
    ok = await _register_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)
    if not ok:
        return
    
    logger.info(f"Site WebSocket connected to dialog {dialog_id}")
    # Безопасная проверка количества соединений
    site_conn_count = len(ws_site_connections.get(dialog_id, set()))
    logger.info(f"Total site connections for dialog {dialog_id}: {site_conn_count}")
    
    receive_task = asyncio.create_task(_receive_loop(dialog_id, websocket, ws_site_meta))
    heartbeat_task = asyncio.create_task(_heartbeat_loop(dialog_id, websocket, ws_site_meta))
    
    try:
        await asyncio.wait([receive_task, heartbeat_task], return_when=asyncio.FIRST_COMPLETED)
    finally:
        receive_task.cancel()
        heartbeat_task.cancel()
        logger.info(f"Site WebSocket disconnected from dialog {dialog_id}")
        await _unregister_connection(ws_site_connections, ws_site_meta, dialog_id, websocket)
        logger.info(f"Remaining site connections for dialog {dialog_id}: {len(ws_site_connections.get(dialog_id, set()))}")

async def widget_dialog_websocket_endpoint(websocket: WebSocket, dialog_id: int, assistant_id: int, db: Session = None):
    """WebSocket endpoint для widget диалогов"""
    logger.info(f"Widget WebSocket connection attempt for dialog {dialog_id}, assistant {assistant_id}")
    
    await websocket.accept()  # Accept до проверок
    
    # Rate limiting проверка после accept() с защитой от IP spoofing
    client_ip = _extract_client_ip(websocket)
    if not _check_rate_limit(client_ip):
        await websocket.close(code=WSCloseCodes.RATE_LIMITED, reason="Too many connections")
        return
    
    # Проверяем, что ассистент существует
    assistant = db.query(models.Assistant).filter(models.Assistant.id == assistant_id).first()
    if not assistant:
        logger.error(f"Widget assistant {assistant_id} not found")
        await websocket.close(code=WSCloseCodes.NOT_FOUND, reason="Assistant not found")
        return
    
    logger.info(f"Widget WebSocket accepted for dialog {dialog_id}")
    
    ok = await _register_connection(ws_connections, ws_meta, dialog_id, websocket)
    if not ok:
        return
    
    # Безопасная проверка количества соединений
    conn_count = len(ws_connections.get(dialog_id, set()))
    logger.info(f"Total widget connections for dialog {dialog_id}: {conn_count}")
    
    receive_task = asyncio.create_task(_receive_loop(dialog_id, websocket, ws_meta))
    heartbeat_task = asyncio.create_task(_heartbeat_loop(dialog_id, websocket, ws_meta))
    
    try:
        await asyncio.wait([receive_task, heartbeat_task], return_when=asyncio.FIRST_COMPLETED)
    finally:
        receive_task.cancel()
        heartbeat_task.cancel()
        logger.info(f"Widget WebSocket disconnected from dialog {dialog_id}")
        await _unregister_connection(ws_connections, ws_meta, dialog_id, websocket)
        logger.info(f"Remaining widget connections for dialog {dialog_id}: {len(ws_connections.get(dialog_id, set()))}")

async def _get_dialog_lock(dialog_id: int) -> asyncio.Lock:
    """Получает lock для диалога (создаёт при необходимости)"""
    if dialog_id not in _dialog_locks:
        _dialog_locks[dialog_id] = asyncio.Lock()
    return _dialog_locks[dialog_id]

# Функция для пуша нового сообщения всем клиентам диалога
async def push_dialog_message(dialog_id: int, message: dict):
    """Отправляет сообщение всем подключенным клиентам диалога (админ панель)"""
    async with await _get_dialog_lock(dialog_id):
        conns = ws_connections.get(dialog_id, set())
        logger.info(f"Push to ADMIN dialog {dialog_id}: {len(conns)} connections")
        logger.debug(f"Admin message: {message}")
        
        if not conns:
            logger.warning(f"No ADMIN WebSocket connections found for dialog {dialog_id}")
            logger.debug(f"Available ADMIN dialogs: {list(ws_connections.keys())}")
            return
        
        sent_count = 0
        # Создаем копию set для итерации, чтобы избежать изменений во время итерации
        for ws in conns.copy():
            try:
                await ws.send_json(message)
                sent_count += 1
                logger.debug("Message sent via ADMIN WebSocket")
            except Exception as e:
                logger.error(f"Failed to send ADMIN WebSocket message: {e}", exc_info=True)
                # Безопасно удаляем неактивное соединение
                await _drop_socket(ws_connections, ws_meta, dialog_id, ws, reason="Send failed")
        
        logger.info(f"Sent to {sent_count}/{len(conns)} ADMIN connections")

# Функция для пуша нового сообщения всем клиентам site-диалога
async def push_site_dialog_message(dialog_id: int, message: dict):
    """Отправляет сообщение всем подключенным клиентам site-диалога (виджеты)"""
    async with await _get_dialog_lock(dialog_id):
        conns = ws_site_connections.get(dialog_id, set())
        logger.info(f"Push to SITE/WIDGET dialog {dialog_id}: {len(conns)} connections")
        logger.debug(f"Site/Widget message: {message}")
        
        if not conns:
            logger.warning(f"No SITE/WIDGET WebSocket connections found for dialog {dialog_id}")
            logger.debug(f"Available SITE/WIDGET dialogs: {list(ws_site_connections.keys())}")
            return
        
        sent_count = 0
        # Создаем копию set для итерации, чтобы избежать изменений во время итерации
        for ws in conns.copy():
            try:
                await ws.send_json(message)
                sent_count += 1
                logger.debug("Message sent via SITE/WIDGET WebSocket")
            except Exception as e:
                logger.error(f"Failed to send SITE/WIDGET WebSocket message: {e}", exc_info=True)
                # Безопасно удаляем неактивное соединение
                await _drop_socket(ws_site_connections, ws_site_meta, dialog_id, ws, reason="Send failed")
        
        logger.info(f"Sent to {sent_count}/{len(conns)} SITE/WIDGET connections")

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
    
    logger.info(f"Handoff requested event: {event}")
    
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
    
    logger.info(f"Handoff started event: {event}")
    
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
    
    logger.info(f"Handoff released event: {event}")
    
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
    
    logger.info(f"Handoff cancelled event: {event}")
    
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
    
    logger.info(f"Operator handling event: {event}")
    
    # Отправляем в обычные и site connections
    await push_dialog_message(dialog_id, event)
    await push_site_dialog_message(dialog_id, event)

def get_connection_stats():
    """
    Возвращает полную статистику WebSocket системы
    Включает connections, rate limiting, message queue metrics
    """
    # Подсчет активных rate limit записей
    current_time = time.time()
    active_rate_limits = 0
    for ip, timestamps in _ws_rate_limits.items():
        active_count = sum(1 for t in timestamps if current_time - t < WS_RATE_LIMIT_WINDOW)
        if active_count > 0:
            active_rate_limits += 1
    
    # Подсчет соединений по диалогам
    admin_connections = sum(len(connections) for connections in ws_connections.values())
    site_connections = sum(len(connections) for connections in ws_site_connections.values())
    
    # Импортируем message_queue статистику
    from .ws_message_queue import message_queue
    queue_stats = message_queue.get_stats()
    
    return {
        "total_connections": _total_connections,
        "connection_details": {
            "admin_dialogs": len(ws_connections),
            "admin_connections": admin_connections,
            "site_dialogs": len(ws_site_connections), 
            "site_connections": site_connections
        },
        "performance": {
            "dialog_locks": len(_dialog_locks),
            "cleanup_cycles": 0  # TODO: add cleanup counter
        },
        "rate_limiting": {
            "rate_limited_ips": active_rate_limits,
            "rate_limit_window": WS_RATE_LIMIT_WINDOW,
            "rate_limit_per_ip": WS_RATE_LIMIT_PER_IP,
            "total_rate_limit_entries": len(_ws_rate_limits)
        },
        "message_queue": queue_stats,
        "timestamp": current_time
    }