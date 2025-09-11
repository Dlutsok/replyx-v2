#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
T-Bank (Tinkoff) Cashier Healthcheck — «железобетонная» диагностика кассы

Встроенные параметры (из твоего ЛК):
  TerminalKey: 1757348842151DEMO
  SecretKey:   lczutIQhGoZoZrgW
Окружение: Sandbox (DEMO): https://rest-api-test.tinkoff.ru/v2

Exit codes:
  0  — OK (Init успешен)
  10 — локальная конфиг-ошибка (нет requests и т.п.)
  20 — сетевой запрет (403, вероятно IP не в whitelist DEMO)
  30 — 501 «Терминал не найден» (не активен/не тот ключ/залип у банка)
  40 — 204 «Неверный токен» (SecretKey/алгоритм подписи)
  50 — прочая ошибка API (Success=false, другой код)
  60 — неожиданный HTTP/исключение/не-JSON
"""

import sys, os, re, json, uuid, socket, hashlib
from datetime import datetime, timezone

# ---- зависимости
try:
    import requests
except Exception:
    print("❌ Требуется пакет 'requests' (pip install requests)", file=sys.stderr)
    sys.exit(10)

import urllib.request

# ==== ЖЁСТКО ПОДСТАВЛЕННЫЕ ДАННЫЕ КАССЫ (из твоего ЛК) ====
TERMINAL_KEY_RAW = "1757348842151DEMO"
SECRET_KEY_RAW   = "lczutIQhGoZoZrgW"
BASE_URL         = "https://rest-api-test.tinkoff.ru/v2"  # DEMO
# ==========================================================

def sanitize(s: str) -> str:
    # убираем все пробельные символы, в т.ч. неразрывные пробелы/переносы
    return re.sub(r"\s+", "", s or "").strip()

def dump_hex(label: str, s: str):
    print(f"{label}: {repr(s)} len={len(s)}")
    try:
        print("hex:", " ".join(f"{ord(c):02x}" for c in s))
    except Exception:
        # на всякий случай, если прилетит bytes
        print("hex-bytes:", " ".join(f"{b:02x}" for b in s.encode("utf-8", "ignore")))

def outbound_ip() -> str:
    try:
        return urllib.request.urlopen("https://api.ipify.org", timeout=5).read().decode()
    except Exception:
        return "unknown"

def boolstr(v):
    return 'true' if isinstance(v, bool) and v else ('false' if isinstance(v, bool) else str(v))

def calc_token(payload: dict, secret: str) -> str:
    # 1) исключаем Token и пустые/None
    items = [(k, v) for k, v in payload.items() if k != 'Token' and v is not None and str(v).strip() != '']
    # 2) добавляем секрет как поле Password
    items.append(('Password', secret))
    # 3) сортировка по имени ключа (ASCII)
    items.sort(key=lambda kv: kv[0])
    # 4) склейка значений (bool → true/false)
    concatenated = ''.join(boolstr(v) for _, v in items)
    # 5) sha256 → hex
    return hashlib.sha256(concatenated.encode('utf-8')).hexdigest()

class IPv4Adapter(requests.adapters.HTTPAdapter):
    """Форсируем IPv4 — помогает в DEMO, когда whitelist у банка по IPv4."""
    def init_poolmanager(self, *args, **kwargs):
        import urllib3.util.connection as conn
        orig = conn.allowed_gai_family
        conn.allowed_gai_family = lambda: socket.AF_INET
        try:
            super().init_poolmanager(*args, **kwargs)
        finally:
            conn.allowed_gai_family = orig

def minimal_init():
    # 0) Санация и отладочные дампы ключа
    terminal_key = sanitize(TERMINAL_KEY_RAW)
    secret_key   = SECRET_KEY_RAW.strip()

    print("============================================================")
    print("🔑 КЛЮЧИ")
    print("============================================================")
    dump_hex("TerminalKey RAW", TERMINAL_KEY_RAW)
    dump_hex("TerminalKey SAN", terminal_key)
    print("endswith('DEMO'):", terminal_key.endswith("DEMO"))
    print(f"SecretKey len: {len(secret_key)} (значение скрыто)")
    print(f"Base URL: {BASE_URL}")
    print(f"🌐 Outbound IP: {outbound_ip()}")

    if not terminal_key or not secret_key:
        print("❌ Пустой TerminalKey/SecretKey — проверь данные", file=sys.stderr)
        return 10

    # 1) Минимальный Init (без лишних полей)
    order_id = f"diag_{int(datetime.now(timezone.utc).timestamp())}_{uuid.uuid4().hex[:8]}"
    amount_kop = 10000  # 100 ₽

    payload = {
        "TerminalKey": terminal_key,
        "Amount": amount_kop,
        "OrderId": order_id,
        "Description": "health",
    }
    token = calc_token(payload, secret_key)
    payload["Token"] = token

    print("\n============================================================")
    print("🧪 MINIMAL INIT")
    print("============================================================")
    print(f"OrderId: {order_id}")
    print(f"Amount:  {amount_kop} коп. ({amount_kop/100:.2f} ₽)")
    print(f"Token:   {token}")
    url = f"{BASE_URL}/Init"
    print(f"POST {url}")

    # 2) HTTP c IPv4 и явным UA
    sess = requests.Session()
    sess.headers.update({
        "Content-Type": "application/json",
        "User-Agent": "ReplyX-Healthcheck/1.0"
    })
    try:
        sess.mount("https://", IPv4Adapter())
    except Exception:
        pass

    try:
        r = sess.post(url, json=payload, timeout=20)
    except requests.exceptions.Timeout:
        print("⏰ TIMEOUT — банк не ответил")
        return 60
    except requests.exceptions.ConnectionError as e:
        print(f"🔌 Connection error: {e}")
        return 60
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        return 60
    finally:
        sess.close()

    print(f"HTTP {r.status_code}")
    body = r.text or ""
    if r.status_code == 403:
        print("❌ 403 Forbidden — периметр отклонил запрос.")
        print("   DEMO обычно требует whitelist исходящего IP. Добавь свой текущий IP у тестового терминала.")
        return 20

    if r.status_code != 200:
        print("❌ Неожиданный HTTP статус. Фрагмент ответа ниже:")
        print(body[:1000])
        return 60

    # 3) Разбор JSON и классификация ошибок
    try:
        resp = r.json()
    except Exception:
        print("❌ Не JSON в ответе. Фрагмент тела ниже:")
        print(body[:1000])
        return 60

    print("Ответ JSON:")
    print(json.dumps(resp, ensure_ascii=False, indent=2))

    if resp.get("Success") is True and "PaymentURL" in resp:
        print("\n✅ OK: Init успешен, касса работает. PaymentURL:", resp.get("PaymentURL"))
        return 0

    # Уточняем типичную причину
    code = str(resp.get("ErrorCode", "")).strip()
    details = (resp.get("Details") or "").strip()
    message = (resp.get("Message") or "").strip()

    if code == "501" or "Терминал не найден" in details:
        print("\n❌ 501: «Терминал не найден».")
        print("   Проверь, что в запрос уходит ровно этот ключ (без скрытых символов) и терминал активирован в sandbox.")
        print("   Если ключ верный и активен, такое бывает при «залипшем» терминале у банка — пиши в поддержку T-Bank.")
        return 30

    if code == "204" or "Неверный токен" in details:
        print("\n❌ 204: «Неверный токен».")
        print("   Проверь SecretKey и алгоритм подписи (Password как поле, сортировка по ключу, sha256 hex).")
        return 40

    print(f"\n⚠️ Ошибка API: code={code or '—'} message={message or '—'} details={details or '—'}")
    return 50

def main():
    rc = minimal_init()
    print("\n============================================================")
    print("📊 ИТОГ")
    print("============================================================")
    if   rc == 0:  print("✅ Всё в порядке: касса отвечает, Init успешен.")
    elif rc == 20: print("🚫 Сетевой запрет (403). Вероятно, IP не в whitelist DEMO.")
    elif rc == 30: print("🧭 501 «Терминал не найден». Проверь ключ/активацию/напиши в поддержку.")
    elif rc == 40: print("🔐 204 «Неверный токен». Проверь SecretKey/алгоритм подписи.")
    elif rc == 50: print("⚠️ Ошибка API. Смотри детали выше.")
    else:          print("❓ Неожиданная ошибка. Смотри лог выше.")
    sys.exit(rc)

if __name__ == "__main__":
    main()