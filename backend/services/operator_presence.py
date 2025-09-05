"""Operator presence service for managing operator status and availability."""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from database import models


logger = logging.getLogger(__name__)


class OperatorPresenceService:
    """Service for managing operator presence, heartbeat, and availability."""
    
    def __init__(self, db: Session):
        self.db = db

    def update_heartbeat(
        self, 
        user_id: int, 
        status: str = "online",
        max_active_chats_web: Optional[int] = None,
        max_active_chats_telegram: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update operator heartbeat and status.
        
        Args:
            user_id: Operator user ID
            status: Operator status (online, away, offline)
            max_active_chats_web: Maximum web chat capacity (optional)
            max_active_chats_telegram: Maximum telegram chat capacity (optional)
            
        Returns:
            Dict with updated operator presence info
        """
        try:
            # Get or create operator presence
            presence = self.db.query(models.OperatorPresence).filter(
                models.OperatorPresence.user_id == user_id
            ).first()
            
            if not presence:
                presence = models.OperatorPresence(
                    user_id=user_id,
                    status=status,
                    last_heartbeat=datetime.utcnow(),
                    max_active_chats_web=max_active_chats_web or 3,
                    max_active_chats_telegram=max_active_chats_telegram or 5,
                    active_chats=0
                )
                self.db.add(presence)
            else:
                # Update existing presence
                presence.status = status
                presence.last_heartbeat = datetime.utcnow()
                
                if max_active_chats_web is not None:
                    presence.max_active_chats_web = max_active_chats_web
                if max_active_chats_telegram is not None:
                    presence.max_active_chats_telegram = max_active_chats_telegram
            
            self.db.commit()
            
            logger.info(f"Updated heartbeat for operator {user_id}, status: {status}")
            
            return {
                "user_id": presence.user_id,
                "status": presence.status,
                "last_heartbeat": presence.last_heartbeat,
                "max_active_chats_web": presence.max_active_chats_web,
                "max_active_chats_telegram": presence.max_active_chats_telegram,
                "active_chats": presence.active_chats,
                "updated_at": presence.updated_at
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating heartbeat for operator {user_id}: {str(e)}")
            raise

    def set_status(self, user_id: int, status: str) -> Dict[str, Any]:
        """
        Set operator status.
        
        Args:
            user_id: Operator user ID
            status: New status (online, away, offline)
            
        Returns:
            Dict with updated operator presence info
        """
        try:
            presence = self.db.query(models.OperatorPresence).filter(
                models.OperatorPresence.user_id == user_id
            ).first()
            
            if not presence:
                presence = models.OperatorPresence(
                    user_id=user_id,
                    status=status,
                    last_heartbeat=datetime.utcnow(),
                    active_chats=0
                )
                self.db.add(presence)
            else:
                presence.status = status
                presence.last_heartbeat = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"Set status for operator {user_id}: {status}")
            
            return {
                "user_id": presence.user_id,
                "status": presence.status,
                "last_heartbeat": presence.last_heartbeat,
                "active_chats": presence.active_chats
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error setting status for operator {user_id}: {str(e)}")
            raise

    def get_available_operators(self) -> List[models.User]:
        """
        Get list of operators available to take new chats.
        
        Returns:
            List of User objects for available operators
        """
        try:
            # Get operators who are online and not at capacity
            available_operators = self.db.query(models.User).join(
                models.OperatorPresence,
                models.User.id == models.OperatorPresence.user_id
            ).filter(
                models.OperatorPresence.status == "online",
                models.OperatorPresence.active_chats < models.OperatorPresence.max_active_chats_web,
                models.OperatorPresence.last_heartbeat > datetime.utcnow() - timedelta(seconds=90)
            ).all()
            
            logger.info(f"Found {len(available_operators)} available operators")
            return available_operators
            
        except Exception as e:
            logger.error(f"Error getting available operators: {str(e)}")
            return []

    def auto_offline_stale_operators(self) -> int:
        """
        Automatically mark operators as offline if they haven't sent heartbeat recently.
        
        Returns:
            Number of operators marked as offline
        """
        try:
            threshold = datetime.utcnow() - timedelta(seconds=90)  # 90 seconds threshold
            
            # Find operators who should be marked offline
            stale_operators = self.db.query(models.OperatorPresence).filter(
                or_(
                    models.OperatorPresence.last_heartbeat < threshold,
                    models.OperatorPresence.last_heartbeat.is_(None)
                ),
                models.OperatorPresence.status != "offline"
            ).all()
            
            count = 0
            for operator in stale_operators:
                operator.status = "offline"
                count += 1
            
            if count > 0:
                self.db.commit()
                logger.info(f"Marked {count} stale operators as offline")
            
            return count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error auto-offlining stale operators: {str(e)}")
            return 0

    def get_operator_stats(self, user_id: int) -> Dict[str, Any]:
        """
        Get operator statistics and current status.
        
        Args:
            user_id: Operator user ID
            
        Returns:
            Dict with operator statistics
        """
        try:
            presence = self.db.query(models.OperatorPresence).filter(
                models.OperatorPresence.user_id == user_id
            ).first()
            
            if not presence:
                return {
                    "user_id": user_id,
                    "status": "offline",
                    "active_chats": 0,
                    "capacity_web": 3,
                    "capacity_telegram": 5,
                    "last_heartbeat": None
                }
            
            # Get active dialogs count
            active_dialogs = self.db.query(models.Dialog).filter(
                models.Dialog.assigned_manager_id == user_id,
                models.Dialog.handoff_status == "active"
            ).count()
            
            # Update active_chats if it's out of sync
            if presence.active_chats != active_dialogs:
                presence.active_chats = active_dialogs
                self.db.commit()
            
            return {
                "user_id": user_id,
                "status": presence.status,
                "active_chats": presence.active_chats,
                "capacity_web": presence.max_active_chats_web,
                "capacity_telegram": presence.max_active_chats_telegram,
                "last_heartbeat": presence.last_heartbeat,
                "is_available": (
                    presence.status == "online" and 
                    presence.active_chats < presence.max_active_chats_web and
                    presence.last_heartbeat and 
                    presence.last_heartbeat > datetime.utcnow() - timedelta(seconds=90)
                )
            }
            
        except Exception as e:
            logger.error(f"Error getting operator stats for user {user_id}: {str(e)}")
            return {
                "user_id": user_id,
                "status": "offline",
                "active_chats": 0,
                "error": str(e)
            }

    def get_all_operators_status(self) -> List[Dict[str, Any]]:
        """
        Get status of all operators for admin dashboard.
        
        Returns:
            List of operator status dicts
        """
        try:
            operators = self.db.query(models.OperatorPresence).join(
                models.User,
                models.User.id == models.OperatorPresence.user_id
            ).all()
            
            result = []
            for operator in operators:
                user = self.db.query(models.User).filter(models.User.id == operator.user_id).first()
                
                result.append({
                    "user_id": operator.user_id,
                    "name": f"{user.first_name} {user.last_name}".strip() if user else f"User #{operator.user_id}",
                    "email": user.email if user else None,
                    "status": operator.status,
                    "last_heartbeat": operator.last_heartbeat,
                    "active_chats": operator.active_chats,
                    "capacity_web": operator.max_active_chats_web,
                    "capacity_telegram": operator.max_active_chats_telegram,
                    "is_available": (
                        operator.status == "online" and 
                        operator.active_chats < operator.max_active_chats_web and
                        operator.last_heartbeat and 
                        operator.last_heartbeat > datetime.utcnow() - timedelta(seconds=90)
                    )
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error getting all operators status: {str(e)}")
            return []

    def sync_active_chats_count(self, user_id: int) -> int:
        """
        Synchronize active_chats count with actual active dialogs.
        
        Args:
            user_id: Operator user ID
            
        Returns:
            Actual count of active dialogs
        """
        try:
            # Count actual active dialogs
            actual_count = self.db.query(models.Dialog).filter(
                models.Dialog.assigned_manager_id == user_id,
                models.Dialog.handoff_status == "active"
            ).count()
            
            # Update presence record
            presence = self.db.query(models.OperatorPresence).filter(
                models.OperatorPresence.user_id == user_id
            ).first()
            
            if presence:
                presence.active_chats = actual_count
                self.db.commit()
                logger.info(f"Synced active chats for operator {user_id}: {actual_count}")
            
            return actual_count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error syncing active chats for operator {user_id}: {str(e)}")
            return 0