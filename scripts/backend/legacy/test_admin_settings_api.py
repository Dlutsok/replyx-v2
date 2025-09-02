#!/usr/bin/env python3
"""
Test script to verify admin settings API endpoints work correctly.
This simulates what the frontend admin page would do.
"""

import os
import sys
import requests
import json
from typing import Optional

sys.path.append('.')

def test_admin_settings_api(base_url: str = "http://localhost:8000", auth_token: Optional[str] = None):
    """Test the admin settings API endpoints."""
    
    headers = {}
    if auth_token:
        headers['Authorization'] = f'Bearer {auth_token}'
    
    print("🔍 Testing Admin Settings API Endpoints...")
    print(f"Base URL: {base_url}")
    
    # Test 1: Get all settings
    try:
        print("\n1. Testing GET /admin/settings")
        response = requests.get(f"{base_url}/admin/settings", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Found {data.get('total_settings', 0)} settings")
            print(f"   Categories: {[cat['category'] for cat in data.get('categories', [])]}")
            
            # Show sample settings
            for category in data.get('categories', [])[:2]:  # Show first 2 categories
                print(f"   {category['category'].upper()}: {len(category['settings'])} settings")
                for setting in category['settings'][:2]:  # Show first 2 settings per category
                    value_display = setting['value'] if not setting.get('is_sensitive') else '***'
                    print(f"     - {setting['key']}: {value_display}")
        else:
            print(f"   ❌ Failed: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Connection Error: {e}")
    
    # Test 2: Get settings by category
    try:
        print("\n2. Testing GET /admin/settings?category=general")
        response = requests.get(f"{base_url}/admin/settings?category=general", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success: Found {data.get('total_settings', 0)} general settings")
        else:
            print(f"   ❌ Failed: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Connection Error: {e}")
    
    # Test 3: Update a setting (if we have auth token)
    if auth_token:
        try:
            print("\n3. Testing PUT /admin/settings/general/site_name")
            test_data = {"value": "ChatAI MVP Test"}
            response = requests.put(
                f"{base_url}/admin/settings/general/site_name", 
                headers=headers, 
                json=test_data,
                timeout=10
            )
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ Success: Setting updated")
                
                # Revert the change
                revert_data = {"value": "ChatAI MVP"}
                requests.put(
                    f"{base_url}/admin/settings/general/site_name", 
                    headers=headers, 
                    json=revert_data,
                    timeout=10
                )
            else:
                print(f"   ❌ Failed: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Connection Error: {e}")
    else:
        print("\n3. Skipping PUT test (no auth token provided)")
    
    print("\n🏁 Admin Settings API Test Complete")

def check_backend_running(base_url: str = "http://localhost:8000"):
    """Check if backend is running."""
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

if __name__ == "__main__":
    base_url = os.getenv('API_BASE_URL', 'http://localhost:8000')
    auth_token = os.getenv('TEST_AUTH_TOKEN')  # Optional auth token for testing
    
    print("🚀 Admin Settings API Test Suite")
    
    if not check_backend_running(base_url):
        print(f"❌ Backend not running at {base_url}")
        print("Please start the backend server first:")
        print("   cd /Users/dan/Documents/chatAI/MVP\\ 9/backend")
        print("   python3 main.py")
        sys.exit(1)
    
    test_admin_settings_api(base_url, auth_token)