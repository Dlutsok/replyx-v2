"""
Сервис для отправки email уведомлений (интеграция с существующей системой)
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from jinja2 import Template
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения из корневого .env файла
PROJECT_ROOT = Path(__file__).parent.parent.parent
ENV_PATH = PROJECT_ROOT / '.env'
load_dotenv(dotenv_path=ENV_PATH)

logger = logging.getLogger(__name__)

# Используем существующие Yandex SMTP настройки
from core.app_config import YANDEX_SMTP_USER, YANDEX_SMTP_PASS

# Fallback на другие SMTP настройки если Yandex не настроен
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", YANDEX_SMTP_USER or "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", YANDEX_SMTP_PASS or "")
FROM_EMAIL = os.getenv("FROM_EMAIL", YANDEX_SMTP_USER or SMTP_USERNAME)
FROM_NAME = os.getenv("FROM_NAME", "ChatAI MVP")

# Базовый URL приложения
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")



class EmailService:
    def __init__(self):
        # Приоритет: Yandex SMTP -> другие настройки
        self.use_yandex = bool(YANDEX_SMTP_USER and YANDEX_SMTP_PASS)
        
        if self.use_yandex:
            self.smtp_server = "smtp.yandex.ru"
            self.smtp_port = 465
            self.username = YANDEX_SMTP_USER
            self.password = YANDEX_SMTP_PASS
            self.from_email = YANDEX_SMTP_USER
            self.use_ssl = True
        else:
            self.smtp_server = SMTP_SERVER
            self.smtp_port = SMTP_PORT
            self.username = SMTP_USERNAME
            self.password = SMTP_PASSWORD
            self.from_email = FROM_EMAIL
            self.use_ssl = False
            
        self.from_name = FROM_NAME
        
    def _send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str, 
        text_content: Optional[str] = None
    ) -> bool:
        """Отправляет email используя существующую инфраструктуру"""
        try:
            # Создаем сообщение (используем тот же формат что и в main.py)
            if text_content:
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = self.from_email
                msg['To'] = to_email
                
                # Добавляем текстовую версию
                text_part = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(text_part)
                
                # Добавляем HTML версию
                html_part = MIMEText(html_content, 'html', 'utf-8')
                msg.attach(html_part)
            else:
                # Простое HTML сообщение (как в существующей системе)
                msg = MIMEText(html_content, "html", 'utf-8')
                msg['Subject'] = subject
                msg['From'] = self.from_email
                msg['To'] = to_email
            
            # Отправляем используя ту же логику что и в main.py
            if self.use_yandex:
                # Используем Yandex SMTP (как в существующей системе)
                with smtplib.SMTP_SSL('smtp.yandex.ru', 465) as server:
                    server.login(self.username, self.password)
                    server.send_message(msg)
            else:
                # Используем другой SMTP
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.username, self.password)
                    server.send_message(msg)
            
            logger.info(f"Email успешно отправлен на {to_email} через {'Yandex' if self.use_yandex else 'SMTP'}")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка отправки email на {to_email}: {str(e)}")
            print(f"[EMAIL ERROR] Не удалось отправить письмо на {to_email}: {e}")
            return False
    


# Глобальный экземпляр сервиса
email_service = EmailService()