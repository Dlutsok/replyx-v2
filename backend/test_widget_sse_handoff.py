#!/usr/bin/env python3
"""
Тест SSE событий для виджета - имитирует реальный сценарий
"""
import sys
import os
from pathlib import Path
import asyncio

# Add the backend path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

import logging
logging.basicConfig(level=logging.INFO)

async def test_widget_sse_handoff():
    print("🧪 ТЕСТ WIDGET SSE HANDOFF СОБЫТИЙ")
    print("=" * 60)
    
    try:
        from database.connection import get_db
        from database import models
        from services.handoff_service import HandoffService
        from services.sse_manager import sse_manager, sse_connections, sse_clients
        from uuid import uuid4
        import asyncio
        from datetime import datetime, timedelta
        
        # Create session
        db = next(get_db())
        
        # Find existing dialog or create test case
        dialog = db.query(models.Dialog).filter(
            models.Dialog.id == 8  # Test with dialog ID 8 from logs
        ).first()
        
        if not dialog:
            print("❌ Dialog ID 8 not found - cannot test")
            return False
        
        dialog_id = dialog.id
        print(f"📋 Testing with dialog ID: {dialog_id}")
        print(f"   Current handoff status: {dialog.handoff_status}")
        
        # Simulate widget SSE connection
        print("\n🔌 STEP 1: Simulate widget SSE connection")
        
        # Initialize SSE manager if needed
        if sse_manager.redis is None:
            await sse_manager.initialize()
            
        # Simulate widget client connection
        widget_client_id = f"widget_{dialog_id}_{uuid4().hex[:8]}"
        
        # Mock widget SSE connection
        sse_connections.setdefault(dialog_id, set()).add(widget_client_id)
        
        class MockSSEClient:
            def __init__(self, client_id, auth_type):
                self.client_id = client_id
                self.auth_type = auth_type
                self.connected_at = datetime.utcnow()
                
        sse_clients[widget_client_id] = MockSSEClient(widget_client_id, "widget")
        
        print(f"   ✅ Simulated widget connection: {widget_client_id}")
        print(f"   📊 Active connections for dialog {dialog_id}: {len(sse_connections.get(dialog_id, []))}")
        
        # Step 2: Test handoff request (should send handoff_requested SSE to widget)
        print("\n🔄 STEP 2: Request handoff")
        
        # Reset dialog state first
        dialog.handoff_status = 'none'
        dialog.is_taken_over = 0  
        dialog.assigned_manager_id = None
        dialog.handoff_started_at = None
        db.commit()
        
        handoff_service = HandoffService(db)
        
        request_id = str(uuid4())
        result = handoff_service.request_handoff(
            dialog_id=dialog_id,
            reason="auto_trigger",
            request_id=request_id,
            last_user_text="нужен оператор"
        )
        
        print(f"   ✅ Handoff requested: {result.status}")
        print(f"   🎯 Check SSE events sent to widget client: {widget_client_id}")
        
        # Wait for async tasks to complete
        await asyncio.sleep(2)
        
        # Step 3: Test handoff takeover by admin
        print("\n🔄 STEP 3: Admin takes over handoff")
        
        admin_user = db.query(models.User).first()
        if admin_user:
            result = handoff_service.takeover_handoff(dialog_id, admin_user.id)
            print(f"   ✅ Handoff taken over by user {admin_user.id}: {result.status}")
            print(f"   🎯 Check if widget receives handoff_started event")
            
            # Wait for async tasks
            await asyncio.sleep(2)
            
            # Step 4: Test handoff release
            print("\n🔄 STEP 4: Release handoff")
            result = handoff_service.release_handoff(dialog_id, admin_user.id)
            print(f"   ✅ Handoff released: {result.status}")
            print(f"   🎯 Check if widget receives handoff_released event")
            
            await asyncio.sleep(2)
        
        print("\n🎯 EXPECTED SSE EVENTS TO WIDGET:")
        print("   1. handoff_requested → 'Переключаем ваш диалог на сотрудника...'")
        print("   2. handoff_started → 'Оператор подключился'")
        print("   3. handoff_released → 'Диалог возвращен к AI-ассистенту'")
        
        # Cleanup
        if dialog_id in sse_connections:
            sse_connections[dialog_id].discard(widget_client_id)
        sse_clients.pop(widget_client_id, None)
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_widget_sse_handoff())
    if success:
        print("\n✅ WIDGET SSE HANDOFF TEST COMPLETED")
    else:
        print("\n❌ WIDGET SSE HANDOFF TEST FAILED")