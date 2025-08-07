from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path
from dotenv import load_dotenv
import os
import logging
from typing import Optional, List
import random

from database import models, get_db
from database.schemas import ConfirmEmailRequest, ConfirmEmailResponse
from validators.rate_limiter import rate_limit_api

# Загружаем переменные окружения из корневого .env файла
PROJECT_ROOT = Path(__file__).parent.parent.parent
ENV_PATH = PROJECT_ROOT / '.env'
load_dotenv(dotenv_path=ENV_PATH)

from core.app_config import YANDEX_SMTP_USER, YANDEX_SMTP_PASS

router = APIRouter()

# Helper functions
def generate_confirmation_code():
    """Генерирует 6-значный код подтверждения"""
    return str(random.randint(100000, 999999))

def send_confirmation_email(to_email, code):
    """Отправляет email с кодом подтверждения"""
    html = f"""
    <html>
      <body style='background:#fafbfc;padding:24px;'>
        <div style='max-width:420px;margin:auto;background:#fff;border-radius:8px;padding:32px 24px 24px 24px;font-family:sans-serif;color:#222;'>
          <p style='margin-top:0;'>Здравствуйте!</p>
          <p>Ваш код подтверждения почты в <b>AI-ассистенте</b>:</p>
          <div style='background:#f4f5f7;border-radius:6px;padding:18px 0;text-align:center;font-size:2rem;font-weight:bold;letter-spacing:2px;margin:16px 0 20px 0;'>
            {code}
          </div>
          <p style='margin:0 0 12px 0;color:#555;'>Код действителен в течение 15 минут.</p>
          <p style='margin:0 0 18px 0;color:#888;font-size:0.97em;'>Если вы не запрашивали подтверждение почты для аккаунта в AI-ассистенте, просто проигнорируйте это письмо.</p>
          <div style='margin-top:32px;color:#888;font-size:0.95em;'>— Команда AI-ассистента</div>
        </div>
      </body>
    </html>
    """
    msg = MIMEText(html, "html")
    msg['Subject'] = 'Код подтверждения регистрации'
    msg['From'] = YANDEX_SMTP_USER
    msg['To'] = to_email
    try:
        with smtplib.SMTP_SSL('smtp.yandex.ru', 465) as server:
            server.login(YANDEX_SMTP_USER, YANDEX_SMTP_PASS)
            server.send_message(msg)
    except Exception as e:
        print(f"[EMAIL ERROR] Не удалось отправить письмо с кодом на {to_email}: {e}")

# === EMAIL CONFIRMATION ENDPOINTS ===

@router.post("/confirm_email", response_model=ConfirmEmailResponse)
def confirm_email(data: ConfirmEmailRequest, db: Session = Depends(get_db)):
    """Подтверждает email пользователя по коду"""
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.is_email_confirmed:
        raise HTTPException(status_code=400, detail="Email уже подтвержден")
    if user.email_confirmation_code != data.code:
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")
    user.is_email_confirmed = True
    user.email_confirmation_code = None
    db.commit()
    return ConfirmEmailResponse(message="Email успешно подтвержден")

@router.post("/resend_email_code")
@rate_limit_api(limit=3, window=3600)  # 3 попытки отправки кода в час
def resend_email_code(data: ConfirmEmailRequest, db: Session = Depends(get_db)):
    """Повторно отправляет код подтверждения email"""
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.is_email_confirmed:
        raise HTTPException(status_code=400, detail="Email уже подтвержден")
    code = generate_confirmation_code()
    user.email_confirmation_code = code
    db.commit()
    send_confirmation_email(user.email, code)
    return {"message": "Код подтверждения отправлен повторно"}