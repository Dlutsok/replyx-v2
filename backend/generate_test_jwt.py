#!/usr/bin/env python3
"""
Утилита для генерации тестовых JWT токенов виджетов
Используется для тестирования CORS безопасности
"""
import jwt
import time
import sys
from datetime import datetime, timedelta

def generate_widget_token(allowed_domains, site_secret, assistant_id=123, expire_minutes=10):
    """Генерирует JWT токен для виджета"""
    
    now = datetime.utcnow()
    exp_time = now + timedelta(minutes=expire_minutes)
    
    payload = {
        'assistant_id': assistant_id,
        'allowed_domains': allowed_domains,
        'iat': int(now.timestamp()),
        'exp': int(exp_time.timestamp())
    }
    
    token = jwt.encode(payload, site_secret, algorithm='HS256')
    return token

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 generate_test_jwt.py <site_secret> <domain1,domain2,...>")
        print("Example: python3 generate_test_jwt.py 'secret123' 'stencom.ru,www.stencom.ru'")
        sys.exit(1)
    
    site_secret = sys.argv[1]
    domains_str = sys.argv[2]
    allowed_domains = [d.strip() for d in domains_str.split(',')]
    
    token = generate_widget_token(allowed_domains, site_secret)
    
    print("🎫 Generated Widget JWT Token:")
    print(f"   Domains: {allowed_domains}")
    print(f"   Expires: +10 minutes")
    print(f"   Token: {token}")
    print("")
    print("📋 Copy for curl test:")
    print(f'curl -sS https://replyx.ru/api/validate-widget-token \\')
    print(f'  -H "Origin: https://{allowed_domains[0]}" \\')
    print(f'  -H "Content-Type: application/json" \\')
    print(f'  -d \'{{"token":"{token}","domain":"{allowed_domains[0].replace("www.", "")}"}}\'')

if __name__ == '__main__':
    main()