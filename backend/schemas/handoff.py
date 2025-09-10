"""Pydantic schemas for handoff system."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from enum import Enum


class HandoffStatus(str, Enum):
    """Handoff status enumeration."""
    NONE = "none"
    REQUESTED = "requested"
    ACTIVE = "active"
    RELEASED = "released"
    CANCELLED = "cancelled"


class HandoffReason(str, Enum):
    """Handoff reason enumeration."""
    KEYWORD = "keyword"
    FALLBACK = "fallback"
    RETRIES = "retries"
    MANUAL = "manual"
    AUTO_TRIGGER = "auto_trigger"


class OperatorStatus(str, Enum):
    """Operator presence status enumeration."""
    ONLINE = "online"
    AWAY = "away"
    OFFLINE = "offline"


class HandoffRequestIn(BaseModel):
    """Schema for handoff request input."""
    reason: Optional[HandoffReason] = Field(None, description="Reason for requesting handoff")
    last_user_text: Optional[str] = Field(None, max_length=1000, description="Last message from user")
    request_id: UUID = Field(..., description="Unique request ID for idempotency")


class HandoffStatusOut(BaseModel):
    """Schema for handoff status output."""
    status: HandoffStatus = Field(..., description="Current handoff status")
    assigned_manager: Optional[Dict[str, Any]] = Field(None, description="Assigned manager info")
    requested_at: Optional[datetime] = Field(None, description="When handoff was requested")
    started_at: Optional[datetime] = Field(None, description="When handoff was started")
    resolved_at: Optional[datetime] = Field(None, description="When handoff was resolved")
    reason: Optional[HandoffReason] = Field(None, description="Reason for handoff")
    request_id: Optional[str] = Field(None, description="Original request ID")
    queue_position: Optional[int] = Field(None, ge=0, description="Position in queue")
    estimated_wait_minutes: Optional[int] = Field(None, ge=0, description="Estimated wait time")
    sla_deadline: Optional[datetime] = Field(None, description="SLA deadline")

    class Config:
        from_attributes = True


class HandoffTakeoverIn(BaseModel):
    """Schema for handoff takeover input (empty - all data from JWT and URL)."""
    pass


class HandoffReleaseIn(BaseModel):
    """Schema for handoff release input (empty - all data from JWT and URL)."""
    pass


class HandoffCancelIn(BaseModel):
    """Schema for handoff cancel input (empty - all data from URL)."""
    pass


class OperatorHeartbeatIn(BaseModel):
    """Schema for operator heartbeat input."""
    status: OperatorStatus = Field(..., description="Operator status")
    max_active_chats_web: Optional[int] = Field(None, ge=0, le=20, description="Max web chats")
    max_active_chats_telegram: Optional[int] = Field(None, ge=0, le=50, description="Max telegram chats")


class OperatorPresenceOut(BaseModel):
    """Schema for operator presence output."""
    user_id: int = Field(..., description="User ID")
    status: OperatorStatus = Field(..., description="Current status")
    last_heartbeat: Optional[datetime] = Field(None, description="Last heartbeat timestamp")
    max_active_chats_web: int = Field(..., description="Max web chat capacity")
    max_active_chats_telegram: int = Field(..., description="Max telegram chat capacity")
    active_chats: int = Field(..., description="Current active chats")
    created_at: datetime = Field(..., description="Created timestamp")
    updated_at: datetime = Field(..., description="Last updated timestamp")

    class Config:
        from_attributes = True


class HandoffQueueItem(BaseModel):
    """Schema for queue item."""
    dialog_id: int = Field(..., description="Dialog ID")
    requested_at: datetime = Field(..., description="Request timestamp")
    reason: HandoffReason = Field(..., description="Request reason")
    last_user_text: Optional[str] = Field(None, description="Last user message")
    wait_time_minutes: int = Field(..., description="Current wait time in minutes")
    priority: int = Field(..., description="Priority in queue")

    class Config:
        from_attributes = True


class HandoffTakeoverIn(BaseModel):
    """Schema for takeover request."""
    pass  # Manager ID comes from JWT token


class HandoffReleaseIn(BaseModel):
    """Schema for release request."""
    pass  # Manager ID comes from JWT token


class HandoffCancelIn(BaseModel):
    """Schema for cancel request."""
    pass  # Can be called by user or manager


class HandoffDetectionRequest(BaseModel):
    """Schema for handoff detection request."""
    user_text: str = Field(..., description="User's message text")
    ai_text: Optional[str] = Field(None, description="AI response text (optional)")
    dialog_id: Optional[int] = Field(None, description="Dialog ID for context (optional)")


class HandoffDetectionResponse(BaseModel):
    """Schema for handoff detection response."""
    should_handoff: bool = Field(..., description="Whether handoff should be triggered")
    reason: str = Field(..., description="Reason for handoff decision")
    score: float = Field(..., description="Confidence score (0.0-1.0+)")
    matched_patterns: list = Field(default_factory=list, description="List of matched pattern descriptions")
    details: dict = Field(default_factory=dict, description="Detailed analysis results")