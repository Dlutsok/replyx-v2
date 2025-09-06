#!/usr/bin/env python3
"""
Скрипт валидации WebSocket исправлений от 5 сентября 2025
Проверяет что все критические исправления применены корректно
"""

import os
import re
import sys
from pathlib import Path

# Пути к файлам
PROJECT_ROOT = Path(__file__).parent.parent
WEBSOCKET_MANAGER = PROJECT_ROOT / "backend/services/websocket_manager.py"
SITE_API = PROJECT_ROOT / "backend/api/site.py"
CHAT_IFRAME = PROJECT_ROOT / "frontend/pages/chat-iframe.js"

def check_websocket_routing_fix():
    """Проверка исправления WebSocket routing в widget_dialog_websocket_endpoint"""
    print("🔍 Checking WebSocket routing fix...")
    
    with open(WEBSOCKET_MANAGER, 'r') as f:
        content = f.read()
    
    # Проверка правильного routing для widget
    widget_section = re.search(
        r'async def widget_dialog_websocket_endpoint.*?await _unregister_connection',
        content, re.DOTALL
    )
    
    if not widget_section:
        print("❌ Widget websocket endpoint not found")
        return False
    
    widget_code = widget_section.group()
    
    # Должно быть ws_connections, НЕ ws_site_connections
    if "ws_site_connections" in widget_code:
        print("❌ КРИТИЧНО: Widget endpoint still uses ws_site_connections!")
        print("   Найдено в widget_dialog_websocket_endpoint:")
        for line_num, line in enumerate(widget_code.split('\n'), 1):
            if "ws_site_connections" in line:
                print(f"   Line {line_num}: {line.strip()}")
        return False
    
    if "ws_connections" not in widget_code:
        print("❌ Widget endpoint doesn't use ws_connections")
        return False
    
    print("✅ Widget WebSocket routing fix confirmed")
    return True

def check_duplicate_endpoint_removal():
    """Проверка удаления дублирующего endpoint из site.py"""
    print("🔍 Checking duplicate endpoint removal...")
    
    with open(SITE_API, 'r') as f:
        content = f.read()
    
    # Проверка отсутствия дублирующего WebSocket endpoint
    if '@router.websocket("/ws/site/dialogs/{dialog_id}")' in content:
        print("❌ КРИТИЧНО: Duplicate WebSocket endpoint still exists in site.py!")
        return False
    
    # Проверка отсутствия импорта ws_site_connections
    if "from services.websocket_manager import ws_site_connections" in content:
        print("❌ КРИТИЧНО: ws_site_connections import still exists in site.py!")
        return False
    
    print("✅ Duplicate endpoint removal confirmed")
    return True

def check_race_condition_fix():
    """Проверка исправления race condition в frontend"""
    print("🔍 Checking race condition fix...")
    
    with open(CHAT_IFRAME, 'r') as f:
        content = f.read()
    
    # Проверка добавления dialogLoaded в условие
    websocket_useeffect = re.search(
        r'if \(dialogId && \(siteToken \|\| assistantId\) && guestId && dialogLoaded\)',
        content
    )
    
    if not websocket_useeffect:
        print("❌ WebSocket useEffect condition with dialogLoaded not found")
        return False
    
    # Проверка добавления dialogLoaded в dependencies
    deps_pattern = r'\[dialogId, siteToken, assistantId, guestId, wsReconnectNonce, dialogLoaded\]'
    deps_match = re.search(deps_pattern, content)
    
    if not deps_match:
        print("❌ КРИТИЧНО: WebSocket useEffect dependencies not correct!")
        return False
    
    print("✅ Race condition fix confirmed")
    return True

def check_site_websocket_logging():
    """Проверка добавления логов для site WebSocket"""
    print("🔍 Checking site WebSocket logging...")
    
    with open(WEBSOCKET_MANAGER, 'r') as f:
        content = f.read()
    
    # Проверка логов в site_dialog_websocket_endpoint
    site_section = re.search(
        r'async def site_dialog_websocket_endpoint.*?await _unregister_connection',
        content, re.DOTALL
    )
    
    if not site_section:
        print("❌ Site websocket endpoint not found")
        return False
    
    site_code = site_section.group()
    
    required_logs = [
        "[Site] WebSocket connection attempt",
        "[Site] WebSocket accepted", 
        "[Site] WebSocket подключён к диалогу",
        "[Site] Total connections"
    ]
    
    missing_logs = []
    for log in required_logs:
        if log not in site_code:
            missing_logs.append(log)
    
    if missing_logs:
        print(f"❌ Missing site WebSocket logs: {missing_logs}")
        return False
    
    print("✅ Site WebSocket logging confirmed")
    return True

def check_websocket_endpoints_consistency():
    """Проверка консистентности WebSocket endpoints"""
    print("🔍 Checking WebSocket endpoints consistency...")
    
    # Проверка что есть только правильные endpoints
    websocket_files = [
        PROJECT_ROOT / "backend/api/websockets.py",
        PROJECT_ROOT / "backend/api/site.py"
    ]
    
    total_site_endpoints = 0
    
    for file_path in websocket_files:
        if not file_path.exists():
            continue
            
        with open(file_path, 'r') as f:
            content = f.read()
        
        site_endpoints = content.count('@router.websocket("/ws/site/dialogs/{dialog_id}")')
        total_site_endpoints += site_endpoints
        
        if file_path.name == "site.py" and site_endpoints > 0:
            print(f"❌ Found {site_endpoints} site WebSocket endpoints in {file_path.name}")
            return False
    
    if total_site_endpoints != 1:
        print(f"❌ Expected 1 site WebSocket endpoint, found {total_site_endpoints}")
        return False
    
    print("✅ WebSocket endpoints consistency confirmed")
    return True

def main():
    """Главная функция проверки"""
    print("🚀 Validating WebSocket fixes from September 5, 2025\n")
    
    checks = [
        check_websocket_routing_fix,
        check_duplicate_endpoint_removal, 
        check_race_condition_fix,
        check_site_websocket_logging,
        check_websocket_endpoints_consistency
    ]
    
    passed = 0
    failed = 0
    
    for check in checks:
        try:
            if check():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Error in {check.__name__}: {e}")
            failed += 1
        print()
    
    print(f"📊 Results: {passed} passed, {failed} failed\n")
    
    if failed == 0:
        print("🎉 All WebSocket fixes are correctly applied!")
        print("✅ System is ready for stable deployment")
        return 0
    else:
        print("🚨 CRITICAL: Some fixes are not properly applied!")
        print("❌ DO NOT DEPLOY until all checks pass")
        return 1

if __name__ == "__main__":
    sys.exit(main())