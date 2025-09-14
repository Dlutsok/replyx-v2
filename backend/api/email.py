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
from integrations.email_service import email_service
import os
import logging
from typing import Optional, List
import random

from database import models, get_db
from database.schemas import ConfirmEmailRequest, ConfirmEmailResponse, ContactFormCreate, ContactFormResponse
from validators.rate_limiter import rate_limit_api
from core.auth import create_access_token

# Загружаем переменные окружения из корневого .env файла
PROJECT_ROOT = Path(__file__).parent.parent.parent
ENV_PATH = PROJECT_ROOT / '.env'
load_dotenv(dotenv_path=ENV_PATH)

from core.app_config import SMTP_USERNAME, SMTP_PASSWORD

router = APIRouter()
logger = logging.getLogger(__name__)
@router.post("/test_send")
def test_send_email(to: str):
    """Тест отправки письма для диагностики SMTP конфигурации."""
    try:
        result = email_service.send_test_email(to)
        if result.get("success"):
            return {"message": "Письмо успешно отправлено", **result}
        return {"message": "Отправка не удалась", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка тестовой отправки: {e}")

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
          <p>Ваш код подтверждения почты в <b>ReplyX</b>:</p>
          <div style='background:#f4f5f7;border-radius:6px;padding:18px 0;text-align:center;font-size:2rem;font-weight:bold;letter-spacing:2px;margin:16px 0 20px 0;'>
            {code}
          </div>
          <p style='margin:0 0 12px 0;color:#555;'>Код действителен в течение 15 минут.</p>
          <p style='margin:0 0 18px 0;color:#888;font-size:0.97em;'>Если вы не запрашивали подтверждение почты для аккаунта в ReplyX, просто проигнорируйте это письмо.</p>
          <div style='margin-top:32px;color:#888;font-size:0.95em;'>— Команда ReplyX</div>
        </div>
      </body>
    </html>
    """
    msg = MIMEText(html, "html")
    msg['Subject'] = 'Код подтверждения регистрации'
    msg['From'] = os.getenv('FROM_EMAIL', 'info@replyx.ru')
    msg['To'] = to_email
    try:
        smtp_server = os.getenv('SMTP_SERVER', 'smtp.timeweb.ru')
        smtp_port = int(os.getenv('SMTP_PORT', '2525'))
        smtp_user = os.getenv('SMTP_USER', 'info@replyx.ru')
        smtp_password = os.getenv('SMTP_PASSWORD')

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
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

    # Создаем токен авторизации для автоматического входа
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    # Отправляем приветственное письмо после подтверждения email
    try:
        email_service.send_welcome_email(user.email, user.first_name or "Пользователь")
        logger.info(f"Welcome email sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.email}: {e}")
        # Не прерываем процесс подтверждения если письмо не отправилось

    return ConfirmEmailResponse(
        message="Email успешно подтвержден",
        access_token=access_token,
        token_type="bearer"
    )

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

# === CONTACT FORM ENDPOINT ===
@router.post("/contact", response_model=ContactFormResponse)
@rate_limit_api(limit=5, window=3600)  # 5 заявок в час на IP
def submit_contact_form(data: ContactFormCreate):
    """Обрабатывает форму обратной связи и отправляет уведомление на email"""
    try:
        # Проверяем данные формы
        if not data.name.strip():
            raise HTTPException(status_code=400, detail="Имя не может быть пустым")
        if not data.phone.strip():
            raise HTTPException(status_code=400, detail="Телефон не может быть пустым")
        if not data.message.strip():
            raise HTTPException(status_code=400, detail="Сообщение не может быть пустым")

        # Очищаем номер телефона для WhatsApp
        clean_phone = ''.join(filter(str.isdigit, data.phone))
        if clean_phone.startswith('8'):
            clean_phone = '7' + clean_phone[1:]
        if not clean_phone.startswith('7'):
            clean_phone = '7' + clean_phone

        # Создаем HTML шаблон для новой заявки
        html_content = f"""
        <!DOCTYPE html>
        <html lang="ru">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Новая заявка от {data.name} - ReplyX</title>
            <style>
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}

                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.5;
                    color: #374151;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    padding: 20px;
                }}

                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }}

                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 40px 32px;
                    text-align: center;
                    position: relative;
                }}

                .header::before {{
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.2)"/><circle cx="10" cy="50" r="0.5" fill="rgba(255,255,255,0.2)"/><circle cx="90" cy="50" r="0.5" fill="rgba(255,255,255,0.2)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                    opacity: 0.3;
                }}

                .header-content {{
                    position: relative;
                    z-index: 1;
                }}

                .header h1 {{
                    margin: 0 0 8px 0;
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: -0.025em;
                }}

                .header p {{
                    margin: 0;
                    opacity: 0.95;
                    font-size: 16px;
                    font-weight: 400;
                }}

                .content {{
                    padding: 40px 32px;
                }}

                .info-card {{
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 24px;
                    margin-bottom: 24px;
                }}

                .info-title {{
                    font-size: 18px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }}

                .info-item {{
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    margin-bottom: 16px;
                    padding: 16px;
                    background: white;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                    transition: all 0.2s ease;
                }}

                .info-item:hover {{
                    border-color: #667eea;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
                }}

                .info-icon {{
                    width: 20px;
                    height: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                    flex-shrink: 0;
                    margin-top: 2px;
                }}

                .info-content {{
                    flex: 1;
                }}

                .info-label {{
                    font-size: 12px;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 4px;
                }}

                .info-value {{
                    font-size: 16px;
                    color: #1f2937;
                    line-height: 1.5;
                    font-weight: 500;
                }}

                .message-card {{
                    background: linear-gradient(135deg, #fef7ed 0%, #fef3c7 100%);
                    border: 1px solid #f59e0b;
                    border-radius: 12px;
                    padding: 20px;
                    position: relative;
                }}

                .message-card::before {{
                    content: '💬';
                    position: absolute;
                    top: -8px;
                    left: 20px;
                    background: white;
                    padding: 8px;
                    border-radius: 50%;
                    border: 2px solid #f59e0b;
                    font-size: 14px;
                }}

                .message-content {{
                    padding-left: 8px;
                }}

                .message-text {{
                    color: #92400e;
                    line-height: 1.6;
                    font-size: 15px;
                    margin-top: 8px;
                    white-space: pre-wrap;
                }}

                .actions-section {{
                    margin-top: 32px;
                    padding: 24px;
                    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                    border-radius: 12px;
                    border: 1px solid #0ea5e9;
                }}

                .actions-title {{
                    font-size: 18px;
                    font-weight: 600;
                    color: #0c4a6e;
                    margin-bottom: 16px;
                    text-align: center;
                }}

                .actions-grid {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: 12px;
                }}

                .action-button {{
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 16px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    text-align: center;
                    border: none;
                    cursor: pointer;
                }}

                .action-button.phone {{
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                }}

                .action-button.phone:hover {{
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                    transform: translateY(-1px);
                }}

                .action-button.email {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }}

                .action-button.email:hover {{
                    background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
                    transform: translateY(-1px);
                }}

                .action-button.whatsapp {{
                    background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
                    color: white;
                }}

                .action-button.whatsapp:hover {{
                    background: linear-gradient(135deg, #128c7e 0%, #075e54 100%);
                    transform: translateY(-1px);
                }}

                .footer {{
                    background: #f8fafc;
                    padding: 32px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }}

                .footer-logo {{
                    font-size: 20px;
                    font-weight: 700;
                    color: #667eea;
                    margin-bottom: 8px;
                }}

                .footer-text {{
                    color: #6b7280;
                    font-size: 14px;
                    line-height: 1.5;
                }}

                .priority-badge {{
                    display: inline-block;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-left: 8px;
                }}

                @media (max-width: 600px) {{
                    .container {{
                        margin: 10px;
                        border-radius: 12px;
                    }}

                    .header {{
                        padding: 32px 24px;
                    }}

                    .header h1 {{
                        font-size: 24px;
                    }}

                    .content {{
                        padding: 24px 20px;
                    }}

                    .actions-grid {{
                        grid-template-columns: 1fr;
                    }}

                    .action-button {{
                        padding: 14px 16px;
                        font-size: 15px;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="header-content">
                        <h1>📬 Новая заявка</h1>
                        <p>Клиент ждет вашего ответа</p>
                    </div>
                </div>

                <div class="content">
                    <div class="info-card">
                        <div class="info-title">
                            👋 Информация о клиенте
                            <span class="priority-badge">срочно</span>
                        </div>

                        <div class="info-item">
                            <div class="info-icon">👤</div>
                            <div class="info-content">
                                <div class="info-label">Имя</div>
                                <div class="info-value">{data.name}</div>
                            </div>
                        </div>

                        <div class="info-item">
                            <div class="info-icon">📱</div>
                            <div class="info-content">
                                <div class="info-label">Телефон</div>
                                <div class="info-value">{data.phone}</div>
                            </div>
                        </div>
                    </div>

                    <div class="message-card">
                        <div class="message-content">
                            <div class="info-label" style="color: #92400e; margin-bottom: 8px;">💬 Сообщение клиента</div>
                            <div class="message-text">{data.message.replace(chr(10), '<br>')}</div>
                        </div>
                    </div>

                    <div class="actions-section">
                        <div class="actions-title">🚀 Быстрые действия</div>
                        <div class="actions-grid">
                            <a href="tel:+{clean_phone}" class="action-button phone">
                                📞 Позвонить
                            </a>
                            <a href="mailto:dlutsok13@ya.ru?subject=Новая заявка от {data.name}&body=Здравствуйте!%0A%0AПолучена новая заявка:%0A👤 Имя: {data.name}%0A📱 Телефон: {data.phone}%0A💬 Сообщение: {data.message.replace(chr(10), '%0A')}%0A%0AПожалуйста, свяжитесь с клиентом." class="action-button email">
                                ✉️ Ответить
                            </a>
                            <a href="https://wa.me/{clean_phone}?text=Здравствуйте, {data.name}! Спасибо за вашу заявку на ReplyX." class="action-button whatsapp">
                                💬 WhatsApp
                            </a>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <div class="footer-logo">ReplyX</div>
                    <div class="footer-text">
                        Заявка получена через форму обратной связи<br>
                        Рекомендуется ответить в течение 2 часов для лучшего впечатления клиента
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        # Отправляем email на указанный адрес
        success = email_service._send_email(
            to_email="dlutsok13@ya.ru",
            subject=f"Новая заявка от {data.name} - ReplyX",
            html_content=html_content,
            text_content=f"""
Новая заявка от {data.name}

Телефон: {data.phone}

Сообщение:
{data.message}

---
Заявка получена через форму обратной связи на сайте ReplyX
Рекомендуется ответить в течение 2 часов
            """.strip()
        )

        if success:
            logger.info(f"Contact form submitted successfully from {data.name} ({data.phone})")
            return ContactFormResponse(
                message="Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в течение 2 часов.",
                success=True
            )
        else:
            logger.error(f"Failed to send contact form email from {data.name}")
            raise HTTPException(status_code=500, detail="Не удалось отправить заявку. Попробуйте позже.")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing contact form: {str(e)}")
        raise HTTPException(status_code=500, detail="Внутренняя ошибка сервера")