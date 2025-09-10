"""API endpoints for handoff system."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database.connection import get_db
from core.auth import get_current_user
from database import models
from schemas.handoff import (
    HandoffRequestIn, HandoffStatusOut, HandoffTakeoverIn, 
    HandoffReleaseIn, HandoffCancelIn, OperatorHeartbeatIn,
    HandoffQueueItem, HandoffDetectionRequest, HandoffDetectionResponse
)
from pydantic import BaseModel
from services.handoff_service import HandoffService


logger = logging.getLogger(__name__)


# Router for dialog-specific handoff endpoints
router = APIRouter(prefix="/dialogs/{dialog_id}/handoff", tags=["handoff"])

# Router for operator-specific endpoints  
operator_router = APIRouter(prefix="/operator", tags=["operator"])


@router.post("/request", response_model=HandoffStatusOut)
def request_handoff(
    dialog_id: int,
    body: HandoffRequestIn,
    db: Session = Depends(get_db)
):
    """
    Request operator handoff with idempotency protection.
    
    - **dialog_id**: ID of the dialog to request handoff for
    - **body**: Request details including reason and request_id for idempotency
    
    Returns current handoff status. If request_id was already processed,
    returns the same response (idempotency).
    
    **Rate limits**: Max 3 requests per minute per dialog.
    """
    logger.info(f"Handoff request for dialog {dialog_id}, reason: {body.reason}, request_id: {body.request_id}")
    try:
        service = HandoffService(db)
        return service.request_handoff(
            dialog_id=dialog_id,
            reason=body.reason or "manual",
            request_id=str(body.request_id),
            last_user_text=body.last_user_text
        )
    except HandoffService.Conflict as e:
        raise HTTPException(status_code=409, detail=str(e))
    except HandoffService.RateLimit as e:
        raise HTTPException(status_code=429, detail=str(e))
    except HandoffService.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error requesting handoff for dialog {dialog_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка. Попробуйте позже.")


@router.post("/takeover", response_model=HandoffStatusOut)
def takeover_handoff(
    dialog_id: int,
    body: HandoffTakeoverIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Operator takes over dialog with concurrency protection.
    
    - **dialog_id**: ID of the dialog to take over
    - Manager ID is extracted from JWT token
    
    Only works if dialog is in 'requested' state and operator has capacity.
    Uses SELECT FOR UPDATE to prevent race conditions.
    """
    try:
        service = HandoffService(db)
        return service.takeover_handoff(dialog_id, user.id)
    except HandoffService.Conflict as e:
        raise HTTPException(status_code=409, detail=str(e))
    except HandoffService.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error taking over handoff for dialog {dialog_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка. Попробуйте позже.")


@router.post("/release", response_model=HandoffStatusOut)
def release_handoff(
    dialog_id: int,
    body: HandoffReleaseIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Release dialog back to AI (only by assigned manager).
    
    - **dialog_id**: ID of the dialog to release
    - Only the assigned manager can release the dialog
    - Transitions dialog from 'active' to 'released' state
    - Re-enables AI responses and decreases operator load
    """
    try:
        service = HandoffService(db)
        return service.release_handoff(dialog_id, user.id)
    except HandoffService.Conflict as e:
        raise HTTPException(status_code=409, detail=str(e))
    except HandoffService.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error releasing handoff for dialog {dialog_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка. Попробуйте позже.")


@router.post("/cancel", response_model=HandoffStatusOut)
def cancel_handoff(
    dialog_id: int,
    body: HandoffCancelIn,
    db: Session = Depends(get_db)
):
    """
    Cancel handoff request (before it becomes active).
    
    - **dialog_id**: ID of the dialog to cancel handoff for
    - Can only cancel requests in 'requested' state
    - Transitions dialog to 'cancelled' state
    """
    try:
        service = HandoffService(db)
        return service.cancel_handoff(dialog_id)
    except HandoffService.Conflict as e:
        raise HTTPException(status_code=409, detail=str(e))
    except HandoffService.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error cancelling handoff for dialog {dialog_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка. Попробуйте позже.")


@router.get("/status", response_model=HandoffStatusOut)
def get_handoff_status(
    dialog_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current handoff status for UI synchronization.
    
    - **dialog_id**: ID of the dialog to get status for
    
    Returns complete handoff status including assigned manager,
    queue position, estimated wait time, and timestamps.
    Used by frontend to sync UI state after WebSocket reconnection.
    """
    try:
        service = HandoffService(db)
        return service.get_status(dialog_id)
    except HandoffService.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting handoff status for dialog {dialog_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка. Попробуйте позже.")


# Operator-specific endpoints
@operator_router.post("/heartbeat")
def operator_heartbeat(
    body: OperatorHeartbeatIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Operator heartbeat to maintain presence and update capacity.
    
    - **body**: Status and capacity settings
    - Updates last_heartbeat timestamp and operator status
    - Should be called every 30 seconds by frontend
    - Operators are auto-marked offline if no heartbeat for 90+ seconds
    """
    try:
        from backend.services.operator_presence import OperatorPresenceService
        service = OperatorPresenceService(db)
        return service.update_heartbeat(
            user_id=user.id,
            status=body.status,
            max_active_chats_web=body.max_active_chats_web,
            max_active_chats_telegram=body.max_active_chats_telegram
        )
    except Exception as e:
        logger.error(f"Error updating operator heartbeat for user {user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка. Попробуйте позже.")


@operator_router.get("/queue", response_model=List[HandoffQueueItem])
def get_handoff_queue(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get queue of dialogs waiting for operator.
    
    Returns list of dialogs in 'requested' state ordered by request time.
    Includes last user message, wait time, and priority for each dialog.
    Used by admin interface to show operator queue.
    """
    try:
        service = HandoffService(db)
        return service.get_queue()
    except Exception as e:
        logger.error(f"Error getting handoff queue: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка. Попробуйте позже.")


@operator_router.get("/my-dialogs", response_model=List[dict])
def get_my_active_dialogs(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dialogs currently assigned to this operator.
    
    Returns list of active dialogs assigned to current user.
    Used by operator interface to show their current workload.
    """
    try:
        dialogs = db.query(models.Dialog).filter(
            models.Dialog.assigned_manager_id == user.id,
            models.Dialog.handoff_status == "active"
        ).order_by(models.Dialog.handoff_started_at.desc()).all()
        
        result = []
        for dialog in dialogs:
            # Get last message
            last_message = db.query(models.DialogMessage).filter(
                models.DialogMessage.dialog_id == dialog.id
            ).order_by(models.DialogMessage.timestamp.desc()).first()
            
            result.append({
                "id": dialog.id,
                "started_at": dialog.handoff_started_at.isoformat() + 'Z' if dialog.handoff_started_at else None,
                "last_message": {
                    "text": last_message.text if last_message else "",
                    "sender": last_message.sender if last_message else "",
                    "timestamp": last_message.timestamp.isoformat() + 'Z' if last_message and last_message.timestamp else None
                },
                "user_info": {
                    "first_name": dialog.first_name,
                    "last_name": dialog.last_name
                }
            })
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting active dialogs for user {user.id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка. Попробуйте позже.")


@router.post("/force-reset")
def force_reset_handoff(
    dialog_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Force reset handoff state for admin use.
    
    - **dialog_id**: ID of the dialog to reset
    
    Only available to admin users. Resets dialog to normal state
    regardless of current handoff status. Use carefully!
    """
    # Проверяем что пользователь - администратор
    if not user.is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Only admin users can force reset handoff state"
        )
    
    try:
        dialog = db.query(models.Dialog).filter(models.Dialog.id == dialog_id).first()
        if not dialog:
            raise HTTPException(status_code=404, detail="Dialog not found")
        
        # Принудительно сбрасываем состояние
        old_status = dialog.handoff_status
        dialog.handoff_status = 'none'
        dialog.is_taken_over = 0
        dialog.assigned_manager_id = None
        dialog.handoff_started_at = None
        
        # Добавляем запись в audit log
        audit = models.HandoffAudit(
            dialog_id=dialog_id,
            from_status=old_status or 'none',
            to_status='none',
            user_id=user.id,
            reason='admin_force_reset',
            seq=1,
            extra_data={"reset_by_admin": user.id, "old_status": old_status}
        )
        db.add(audit)
        
        db.commit()
        
        logger.info(f"Admin {user.id} force reset handoff for dialog {dialog_id} from {old_status} to none")
        
        return {
            "success": True,
            "dialog_id": dialog_id,
            "old_status": old_status,
            "new_status": "none",
            "message": f"Dialog {dialog_id} handoff state reset to normal"
        }
        
    except Exception as e:
        logger.error(f"Error force resetting handoff for dialog {dialog_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Произошла ошибка. Попробуйте позже.")


# Новый endpoint для определения handoff
@router.post("/should-request", response_model=HandoffDetectionResponse)
def should_request_handoff_api(
    request: HandoffDetectionRequest,
    db: Session = Depends(get_db)
):
    """
    API для определения нужен ли handoff с улучшенной логикой.
    
    Используется bot_worker.js и другими компонентами для 
    единообразного определения потребности в операторе.
    
    **Features:**
    - Контекстный анализ текста
    - Исключение ложных срабатываний  
    - Весовая система оценки
    - Подробная диагностика решений
    """
    try:
        from services.improved_handoff_detector import ImprovedHandoffDetector
        detector = ImprovedHandoffDetector()
        
        # Получаем диалог если передан dialog_id
        dialog = None
        if request.dialog_id:
            dialog = db.query(models.Dialog).filter(
                models.Dialog.id == request.dialog_id
            ).first()
        
        # Анализируем текст на необходимость handoff
        should_handoff, reason, details = detector.should_request_handoff(
            user_text=request.user_text,
            ai_text=request.ai_text,
            dialog=dialog
        )
        
        # Подробное логирование для диагностики
        if should_handoff:
            matched_patterns = [p['description'] for p in details.get('matched_patterns', [])]
            logger.info(f"🔍 Handoff detection API: SHOULD_HANDOFF=True")
            logger.info(f"   Dialog ID: {request.dialog_id}")
            logger.info(f"   Reason: {reason}")
            logger.info(f"   Score: {details.get('total_score', 0):.2f}")
            logger.info(f"   Patterns: {matched_patterns}")
            logger.info(f"   Text: {request.user_text[:100]}...")
        else:
            logger.debug(f"🔍 Handoff detection API: SHOULD_HANDOFF=False (score: {details.get('total_score', 0):.2f})")
        
        return HandoffDetectionResponse(
            should_handoff=should_handoff,
            reason=reason,
            score=details.get('total_score', 0.0),
            matched_patterns=[p['description'] for p in details.get('matched_patterns', [])],
            details=details
        )
        
    except Exception as e:
        logger.error(f"Error in handoff detection API: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка анализа handoff")