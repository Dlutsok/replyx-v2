"""
Сервис для отправки email уведомлений с поддержкой шаблонов
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Set
import logging
from pathlib import Path
from datetime import datetime, timedelta
from threading import Lock
import pytz

# Импортируем шаблоны
import sys
sys.path.append(str(Path(__file__).parent.parent))
from templates.email_templates import EmailTemplates

logger = logging.getLogger(__name__)

# Используем настройки из app_config
from core.app_config import (
    SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD,
    FROM_EMAIL, FROM_NAME, FRONTEND_URL
)

# Базовый URL приложения
BASE_URL = FRONTEND_URL



class EmailService:
    def __init__(self):
        # Используем единую почтовую систему info@replyx.ru
        self.smtp_server = SMTP_SERVER
        self.smtp_port = SMTP_PORT
        self.username = SMTP_USERNAME
        self.password = SMTP_PASSWORD
        self.from_email = FROM_EMAIL
        self.from_name = FROM_NAME or "ReplyX"

        # Режим шифрования: SSL для 465, STARTTLS для 587/2525, иначе без TLS
        self.use_ssl = str(self.smtp_port) == "465"
        self.use_starttls = str(self.smtp_port) in ["587", "2525"]
            
        self.from_name = FROM_NAME
        
        # Троттлинг для handoff уведомлений
        self._handoff_throttle: Dict[int, datetime] = {}  # dialog_id -> last_sent_time
        self._throttle_lock = Lock()
        self._handoff_cooldown_minutes = 10  # Не чаще 1 письма в 10 минут на диалог
        
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
                msg['From'] = f"{self.from_name} <{self.from_email}>" if self.from_name else self.from_email
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
                msg['From'] = f"{self.from_name} <{self.from_email}>" if self.from_name else self.from_email
                msg['To'] = to_email
            
            # Отправляем сообщение с учетом SSL/STARTTLS и увеличенным таймаутом
            logger.info(f"Подключение к SMTP серверу {self.smtp_server}:{self.smtp_port} (SSL={self.use_ssl}, STARTTLS={self.use_starttls})")
            
            if self.use_ssl:
                with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=30) as server:
                    server.set_debuglevel(0)  # Включаем отладку при необходимости
                    logger.info("SSL соединение установлено")
                    server.login(self.username, self.password)
                    logger.info("SMTP авторизация успешна")
                    server.send_message(msg)
                    logger.info("Сообщение отправлено")
            else:
                with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=30) as server:
                    server.set_debuglevel(0)  # Включаем отладку при необходимости
                    logger.info("SMTP соединение установлено")
                    server.ehlo()
                    if self.use_starttls:
                        logger.info("Активируем STARTTLS")
                        server.starttls()
                        server.ehlo()
                        logger.info("STARTTLS активирован")
                    server.login(self.username, self.password)
                    logger.info("SMTP авторизация успешна")
                    server.send_message(msg)
                    logger.info("Сообщение отправлено")

            logger.info(
                f"Email успешно отправлен на {to_email} (server={self.smtp_server}:{self.smtp_port}, ssl={self.use_ssl}, starttls={self.use_starttls})"
            )
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(
                f"SMTP auth error for {self.username} on {self.smtp_server}:{self.smtp_port}: {e}"
            )
            print(f"[EMAIL ERROR] SMTP auth error: {e}")
            return False
        except Exception as e:
            logger.error(
                f"Ошибка отправки email на {to_email}: {str(e)} (server={self.smtp_server}:{self.smtp_port}, user={self.username})"
            )
            print(f"[EMAIL ERROR] Не удалось отправить письмо на {to_email}: {e}")
            return False
    
    # Методы для отправки типизированных email с использованием шаблонов
    
    def send_welcome_email(self, to_email: str, user_name: str = "Пользователь") -> bool:
        """Отправляет приветственное письмо"""
        template_data = EmailTemplates.welcome_email(user_name, BASE_URL)
        return self._send_email(
            to_email=to_email,
            subject=template_data["subject"],
            html_content=template_data["html"],
            text_content=template_data["text"]
        )
    
    def send_password_reset_email(self, to_email: str, reset_link: str, user_name: str = "Пользователь") -> bool:
        """Отправляет письмо для сброса пароля"""
        template_data = EmailTemplates.password_reset_email(reset_link, user_name)
        return self._send_email(
            to_email=to_email,
            subject=template_data["subject"],
            html_content=template_data["html"],
            text_content=template_data["text"]
        )
    
    def send_payment_confirmation_email(
        self, 
        to_email: str, 
        amount: float, 
        messages_count: int, 
        current_balance: int,
        bonus_amount: Optional[float] = None
    ) -> bool:
        """Отправляет подтверждение пополнения баланса"""
        template_data = EmailTemplates.payment_confirmation_email(
            amount, messages_count, current_balance, bonus_amount, BASE_URL
        )
        return self._send_email(
            to_email=to_email,
            subject=template_data["subject"],
            html_content=template_data["html"],
            text_content=template_data["text"]
        )

    def send_test_email(self, to_email: str) -> Dict:
        """Пытается отправить тестовое письмо и возвращает диагностику."""
        subject = "Тест отправки email"
        html = f"<p>Это тестовое письмо от ReplyX.</p><p>SMTP: {self.smtp_server}:{self.smtp_port}, SSL={self.use_ssl}, STARTTLS={self.use_starttls}</p>"
        ok = self._send_email(to_email, subject, html, "Тестовое письмо")
        return {
            "success": ok,
            "server": self.smtp_server,
            "port": self.smtp_port,
            "ssl": self.use_ssl,
            "starttls": self.use_starttls,
            "username_configured": bool(self.username),
            "from_email": self.from_email,
        }
    
    def _is_handoff_throttled(self, dialog_id: int) -> bool:
        """Проверяет, не слишком ли часто отправляются handoff письма для диалога"""
        with self._throttle_lock:
            last_sent = self._handoff_throttle.get(dialog_id)
            if last_sent is None:
                return False
            
            time_passed = datetime.utcnow() - last_sent
            return time_passed < timedelta(minutes=self._handoff_cooldown_minutes)
    
    def _record_handoff_sent(self, dialog_id: int) -> None:
        """Записывает время отправки handoff письма для диалога"""
        with self._throttle_lock:
            self._handoff_throttle[dialog_id] = datetime.utcnow()
            
            # Очищаем старые записи (старше суток)
            cutoff = datetime.utcnow() - timedelta(hours=24)
            self._handoff_throttle = {
                k: v for k, v in self._handoff_throttle.items() 
                if v > cutoff
            }
    
    def send_handoff_notification(
        self, 
        to_email: str, 
        dialog_id: int, 
        reason: str, 
        user_preview: str, 
        timestamp: Optional[str] = None
    ) -> bool:
        """Отправляет уведомление оператору о запросе handoff с троттлингом"""
        
        # Проверяем троттлинг
        if self._is_handoff_throttled(dialog_id):
            logger.info(
                f"Handoff email для диалога {dialog_id} пропущен из-за троттлинга "
                f"(cooldown: {self._handoff_cooldown_minutes} минут)"
            )
            return False
        
        # Формируем ссылку на диалог
        dialog_link = f"{BASE_URL}/admin?dialog_id={dialog_id}"
        
        # Если timestamp не передан, используем текущее время в локальном часовом поясе
        if timestamp is None:
            # Используем часовой пояс Москвы (Europe/Moscow) вместо UTC
            moscow_tz = pytz.timezone('Europe/Moscow')
            local_time = datetime.now(moscow_tz)
            timestamp = local_time.strftime("%d.%m.%Y %H:%M")
        
        # Получаем шаблон
        template_data = EmailTemplates.handoff_notification_email(
            dialog_id=dialog_id,
            reason=reason,
            user_preview=user_preview,
            dialog_link=dialog_link,
            timestamp=timestamp,
            base_url=BASE_URL
        )
        
        # Отправляем письмо
        success = self._send_email(
            to_email=to_email,
            subject=template_data["subject"],
            html_content=template_data["html"],
            text_content=template_data["text"]
        )
        
        # Если письмо отправлено успешно, записываем время отправки
        if success:
            self._record_handoff_sent(dialog_id)
            logger.info(
                f"Handoff email отправлен на {to_email} для диалога {dialog_id} (reason: {reason})"
            )
        
        return success
    
    def send_low_balance_warning_email(self, to_email: str, remaining_messages: int) -> bool:
        """Отправляет предупреждение о низком балансе"""
        template_data = EmailTemplates.low_balance_warning_email(remaining_messages, BASE_URL)
        return self._send_email(
            to_email=to_email,
            subject=template_data["subject"],
            html_content=template_data["html"],
            text_content=template_data["text"]
        )
    
    def send_balance_depleted_email(self, to_email: str) -> bool:
        """Отправляет уведомление о том, что баланс закончился"""
        template_data = EmailTemplates.balance_depleted_email(BASE_URL)
        return self._send_email(
            to_email=to_email,
            subject=template_data["subject"],
            html_content=template_data["html"],
            text_content=template_data["text"]
        )

    def send_new_user_admin_notification(
        self,
        admin_email: str,
        user_email: str,
        user_name: str,
        user_id: int,
        registration_time: Optional[str] = None
    ) -> bool:
        """Отправляет уведомление админу о новом пользователе"""

        # Если время регистрации не передано, используем текущее время в московском поясе
        if registration_time is None:
            moscow_tz = pytz.timezone('Europe/Moscow')
            local_time = datetime.now(moscow_tz)
            registration_time = local_time.strftime("%d.%m.%Y %H:%M")

        # Получаем шаблон
        template_data = EmailTemplates.new_user_admin_notification(
            user_email=user_email,
            user_name=user_name,
            registration_time=registration_time,
            user_id=user_id,
            base_url=BASE_URL
        )

        # Отправляем письмо
        success = self._send_email(
            to_email=admin_email,
            subject=template_data["subject"],
            html_content=template_data["html"],
            text_content=template_data["text"]
        )

        if success:
            logger.info(
                f"New user admin notification sent to {admin_email} for user {user_email} (ID: {user_id})"
            )

        return success


# Глобальный экземпляр сервиса
email_service = EmailService()