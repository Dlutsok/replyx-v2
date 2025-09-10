#!/usr/bin/env python3
"""
Тест реальной работы handoff с SSE событиями - имитирует реальный сценарий
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

async def test_real_handoff_sse():
    print("🧪 ТЕСТ РЕАЛЬНОЙ РАБОТЫ HANDOFF + SSE")
    print("=" * 60)
    
    try:
        # Simulate the real scenario
        from database.connection import get_db
        from database import models
        from services.handoff_service import HandoffService
        from services.sse_manager import push_sse_event
        from uuid import uuid4
        import asyncio
        
        # Create session
        db = next(get_db())
        
        # Find existing dialog or create test case
        dialog = db.query(models.Dialog).filter(
            models.Dialog.id == 1  # Assume dialog ID 1 exists
        ).first()
        
        if not dialog:
            print("❌ Dialog ID 1 not found - cannot test")
            return False
        
        dialog_id = dialog.id
        print(f"📋 Testing with dialog ID: {dialog_id}")
        print(f"   Current handoff status: {dialog.handoff_status}")
        
        # Reset dialog state
        dialog.handoff_status = 'none'
        dialog.is_taken_over = 0  
        dialog.assigned_manager_id = None
        dialog.handoff_started_at = None
        db.commit()
        print(f"   Reset dialog to 'none' status")
        
        # Step 1: Test handoff request (should send handoff_requested SSE)
        print("\n🔄 STEP 1: Request handoff")
        handoff_service = HandoffService(db)
        
        request_id = str(uuid4())
        result = handoff_service.request_handoff(
            dialog_id=dialog_id,
            reason="auto_trigger", 
            request_id=request_id,
            last_user_text="оператор"
        )
        
        print(f"   ✅ Handoff requested: {result.status}")
        
        # Wait for async tasks to complete
        await asyncio.sleep(1)
        
        # Step 2: Test handoff takeover (should send handoff_started SSE) 
        print("\n🔄 STEP 2: Takeover handoff")
        
        # Find first available admin user or any user for testing
        admin_user = db.query(models.User).first()
        
        if admin_user:
            result = handoff_service.takeover_handoff(dialog_id, admin_user.id)
            print(f"   ✅ Handoff taken over by user {admin_user.id}: {result.status}")
            
            # Wait for async tasks
            await asyncio.sleep(1)
            
            # Step 3: Test handoff release (should send handoff_released SSE)
            print("\n🔄 STEP 3: Release handoff")
            result = handoff_service.release_handoff(dialog_id, admin_user.id)
            print(f"   ✅ Handoff released: {result.status}")
            
            # Wait for async tasks
            await asyncio.sleep(1)
        else:
            print("   ❌ No admin user found - cannot test takeover/release")
        
        print("\n🎯 ПРОВЕРЬТЕ ЛОГИ НА SSE СОБЫТИЯ:")
        print("   - 'SSE event handoff_requested sent for dialog'")
        print("   - 'SSE event handoff_started sent for dialog'") 
        print("   - 'SSE event handoff_released sent for dialog'")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_real_handoff_sse())
    if success:
        print("\n✅ REAL HANDOFF SSE TEST COMPLETED - CHECK LOGS FOR SSE EVENTS")
    else:
        print("\n❌ REAL HANDOFF SSE TEST FAILED")