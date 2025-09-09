"""
Email шаблоны для ReplyX
Система шаблонов с поддержкой русского языка и адаптивной версткой
"""

from typing import Dict, Any, Optional
from jinja2 import Template

class SVGIcons:
    """SVG иконки для email шаблонов"""
    
    @staticmethod
    def check_circle(color="#10b981", size="16"):
        """Галочка в круге (успех)"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fill="{color}"/>
        </svg>
        '''
    
    @staticmethod
    def gift(color="#8b5cf6", size="16"):
        """Подарок (бонус)"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5 5a3 3 0 015.905-.75A3 3 0 0117 8v2h1a1 1 0 110 2h-1v3a3 3 0 01-3 3H6a3 3 0 01-3-3v-3H2a1 1 0 110-2h1V8a3 3 0 012-2.83V5zm6 0v3h4V5a1 1 0 00-2 0zm-2 3V5a1 1 0 00-2 0v3h4z" fill="{color}"/>
        </svg>
        '''
    
    @staticmethod 
    def currency_dollar(color="#059669", size="16"):
        """Доллар/деньги"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" fill="{color}"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 5a1 1 0 112 0v.092a4.535 4.535 0 011.676.662C13.398 6.28 14 7.36 14 8.5c0 1.14-.602 2.22-1.324 2.746a4.535 4.535 0 01-1.676.662V15a1 1 0 11-2 0v-2.092a4.535 4.535 0 01-1.676-.662C6.602 11.72 6 10.64 6 9.5c0-1.14.602-2.22 1.324-2.746A4.535 4.535 0 019 6.092V5z" fill="{color}"/>
        </svg>
        '''
    
    @staticmethod
    def chat_alt(color="#3b82f6", size="16"):
        """Сообщения/чат"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" fill="{color}"/>
        </svg>
        '''
    
    @staticmethod
    def lock_closed(color="#ef4444", size="16"):
        """Замок (блокировка)"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" fill="{color}"/>
        </svg>
        '''
    
    @staticmethod
    def exclamation_triangle(color="#f59e0b", size="16"):
        """Предупреждение"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" fill="{color}"/>
        </svg>
        '''
    
    @staticmethod
    def sparkles(color="#fbbf24", size="16"):
        """Звездочки (приветствие)"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 5a1 1 0 011 1v1a1 1 0 11-2 0V8a1 1 0 011-1zm6-5a1 1 0 01.707.293l.707.707a1 1 0 01-1.414 1.414L10.293 3.707A1 1 0 0111 2zM9 7a1 1 0 01.707.293l.707.707a1 1 0 01-1.414 1.414L8.293 8.707A1 1 0 019 7zM15 5a1 1 0 011 1v1a1 1 0 11-2 0V6a1 1 0 011-1zm0 5a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-5 3a1 1 0 01.707.293l.707.707a1 1 0 01-1.414 1.414l-.707-.707A1 1 0 0110 13zm5-8a1 1 0 01.707.293l.707.707a1 1 0 01-1.414 1.414l-.707-.707A1 1 0 0115 5z" fill="{color}"/>
        </svg>
        '''
    
    @staticmethod
    def arrow_right(color="#6366f1", size="16"):
        """Стрелка вправо"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" fill="{color}"/>
        </svg>
        '''

    @staticmethod
    def user(color="#7c3aed", size="16"):
        """Человек/оператор"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fill="{color}"/>
        </svg>
        '''

    @staticmethod
    def clock(color="#f59e0b", size="16"):
        """Часы/время"""
        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; vertical-align: middle; margin-right: 6px;">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" fill="{color}"/>
        </svg>
        '''

class EmailTemplateConfig:
    """Конфигурация email шаблонов"""
    BRAND_NAME = "ReplyX"
    DOMAIN = "replyx.ru"
    # Минималистичная цветовая схема
    ACCENT_COLOR = "#6334E5"  # Фиолетовый для кнопок
    TEXT_COLOR = "#374151"              # Серый текст
    LIGHT_GRAY = "#F3F4F6"             # Светло-серый фон
    MEDIUM_GRAY = "#6B7280"            # Средний серый для подписей
    CODE_BG = "#F9FAFB"                # Фон для кода/выделений
    
    # CSS стили в минималистичном стиле
    BASE_STYLES = f"""
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.5;
            color: {TEXT_COLOR};
            background-color: #ffffff;
        }}
        
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background: white;
        }}
        
        .content {{
            padding: 40px 24px;
        }}
        
        .title {{
            font-size: 18px;
            font-weight: 600;
            color: {TEXT_COLOR};
            margin-bottom: 24px;
        }}
        
        .text {{
            font-size: 16px;
            line-height: 1.5;
            color: {TEXT_COLOR};
            margin-bottom: 20px;
        }}
        
        .guide {{
            background: {LIGHT_GRAY};
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }}
        
        .guide-item {{
            font-size: 16px;
            color: {TEXT_COLOR};
            margin-bottom: 8px;
            line-height: 1.4;
        }}
        
        .highlight {{
            background: {CODE_BG};
            color: {TEXT_COLOR};
            padding: 16px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
            border: 1px solid #E5E7EB;
        }}
        
        .code {{
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
            font-size: 14px;
            background: {LIGHT_GRAY};
            padding: 2px 6px;
            border-radius: 4px;
        }}
        
        .cta-button {{
            display: inline-block;
            background: {ACCENT_COLOR};
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 500;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
            transition: opacity 0.2s;
        }}
        
        .cta-button:hover {{
            opacity: 0.9;
        }}
        
        .cta-center {{
            text-align: center;
        }}
        
        .footer {{
            padding: 24px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
            margin-top: 32px;
        }}
        
        .footer-text {{
            font-size: 14px;
            color: {MEDIUM_GRAY};
            margin-bottom: 4px;
        }}
        
        .footer-link {{
            color: {MEDIUM_GRAY};
            text-decoration: none;
        }}
        
        /* Адаптивность для мобильных */
        @media only screen and (max-width: 600px) {{
            .content {{ padding: 32px 20px; }}
            .title {{ font-size: 16px; }}
            .text {{ font-size: 15px; }}
            .cta-button {{ padding: 10px 20px; font-size: 15px; width: 100%; }}
        }}
    </style>
    """

class EmailTemplates:
    """Класс с email шаблонами для ReplyX"""
    
    @staticmethod
    def _get_base_template() -> str:
        """Минималистичный HTML шаблон"""
        return f"""<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{{{ subject }}}}</title>
    {EmailTemplateConfig.BASE_STYLES}
</head>
<body>
    <div class="container">
        <div class="content">
            {{{{ content }}}}
        </div>
        
        <div class="footer">
            <div class="footer-text">
                — Команда {EmailTemplateConfig.BRAND_NAME}
            </div>
        </div>
    </div>
</body>
</html>"""
    
    @staticmethod
    def welcome_email(user_name: str = "Пользователь", base_url: str = "https://replyx.ru") -> Dict[str, str]:
        """Приветственное письмо после подтверждения email"""
        
        content = f"""
        <h1 class="title">{SVGIcons.sparkles(color="#fbbf24", size="20")}Привет! Ваш аккаунт готов к работе</h1>
        
        <p class="text">
            {SVGIcons.check_circle(color="#10b981", size="16")}Отлично! Ваш email подтвержден, и теперь вы можете пользоваться нашим AI-помощником.
        </p>
        
        <div class="guide">
            <div class="guide-item">{SVGIcons.arrow_right(color="#6366f1", size="14")}1. Задайте первый вопрос</div>
            <div class="guide-item">{SVGIcons.arrow_right(color="#6366f1", size="14")}2. Пополните баланс для безлимитного общения</div>
            <div class="guide-item">{SVGIcons.arrow_right(color="#6366f1", size="14")}3. Сохраняйте диалоги и документы</div>
        </div>
        
        <p class="text">
            ReplyX работает просто: задавайте вопросы — получайте умные ответы. 
            Оплата только за отправленные сообщения, никаких скрытых платежей.
        </p>
        
        <div class="cta-center">
            <a href="{base_url}/dashboard" class="cta-button">Начать пользоваться</a>
        </div>
        """
        
        template = Template(EmailTemplates._get_base_template())
        html = template.render(
            subject="Добро пожаловать в ReplyX! 🚀",
            content=content
        )
        
        return {
            "subject": "Добро пожаловать в ReplyX! 🚀",
            "html": html,
            "text": f"Привет! Ваш аккаунт в ReplyX готов к работе. Перейдите по ссылке: {base_url}/dashboard"
        }
    
    @staticmethod
    def password_reset_email(reset_link: str, user_name: str = "Пользователь") -> Dict[str, str]:
        """Email для сброса пароля"""
        
        content = f"""
        <h1 class="title">Восстановление пароля</h1>
        
        <p class="text">
            Ваш код для сброса пароля в <strong>ReplyX</strong>:
        </p>
        
        <div class="guide">
            <div style="font-size: 14px; font-weight: 600; text-align: center; color: {EmailTemplateConfig.TEXT_COLOR}; word-break: break-all;">
                {reset_link}
            </div>
        </div>
        
        <p class="text">
            Ссылка действительна в течение 24 часов.
        </p>
        
        <div class="cta-center">
            <a href="{reset_link}" class="cta-button">Сбросить пароль</a>
        </div>
        
        <p class="text">
            Если вы не запрашивали восстановление пароля для аккаунта в ReplyX, просто проигнорируйте это письмо.
        </p>
        """
        
        template = Template(EmailTemplates._get_base_template())
        html = template.render(
            subject="Восстановление пароля ReplyX",
            content=content
        )
        
        return {
            "subject": "Восстановление пароля ReplyX",
            "html": html,
            "text": f"Восстановление пароля ReplyX. Перейдите по ссылке: {reset_link}"
        }
    
    @staticmethod
    def payment_confirmation_email(
        amount: float, 
        messages_count: int, 
        current_balance: int,
        bonus_amount: Optional[float] = None,
        base_url: str = "https://replyx.ru"
    ) -> Dict[str, str]:
        """Email подтверждения пополнения баланса"""
        
        bonus_text = ""
        if bonus_amount:
            bonus_text = f"""
            <div class="highlight">
                {SVGIcons.gift(color="#8b5cf6", size="18")}Вы получили +{bonus_amount:.0f} ₽ бонуса!
            </div>
            """
        
        content = f"""
        <h1 class="title">{SVGIcons.check_circle(color="#10b981", size="20")}Платёж успешно обработан</h1>
        
        <p class="text">
            {SVGIcons.currency_dollar(color="#059669", size="16")}Ваш баланс пополнен на {amount:.0f} ₽. Начислено {messages_count} сообщений.
        </p>
        
        {bonus_text}
        
        <div class="guide">
            <div class="guide-item">{SVGIcons.chat_alt(color="#3b82f6", size="16")}<strong>Текущий остаток:</strong> {current_balance} сообщений</div>
        </div>
        
        <p class="text">
            Теперь вы можете продолжить общение с AI-помощником без ограничений!
        </p>
        
        <div class="cta-center">
            <a href="{base_url}/dashboard" class="cta-button">Перейти в личный кабинет</a>
        </div>
        """
        
        template = Template(EmailTemplates._get_base_template())
        html = template.render(
            subject=f"Баланс пополнен! +{messages_count} сообщений",
            content=content
        )
        
        return {
            "subject": f"Баланс пополнен! +{messages_count} сообщений",
            "html": html,
            "text": f"Ваш баланс пополнен на {amount:.0f} ₽. Начислено {messages_count} сообщений. Текущий остаток: {current_balance} сообщений."
        }
    
    @staticmethod
    def low_balance_warning_email(
        remaining_messages: int, 
        base_url: str = "https://replyx.ru"
    ) -> Dict[str, str]:
        """Email предупреждения о низком балансе"""
        
        content = f"""
        <h1 class="title">{SVGIcons.exclamation_triangle(color="#f59e0b", size="20")}Баланс заканчивается</h1>
        
        <p class="text">
            {SVGIcons.chat_alt(color="#ef4444", size="16")}У вас осталось всего <strong>{remaining_messages} сообщений</strong> в ReplyX.
        </p>
        
        <div class="highlight">
            Баланс может закончиться уже сегодня — пополните сейчас, чтобы не прерывать важные диалоги с AI-помощником.
        </div>
        
        <p class="text">
            Пополнение происходит мгновенно, и вы сразу сможете продолжить работу.
        </p>
        
        <div class="cta-center">
            <a href="{base_url}/balance" class="cta-button">Пополнить баланс</a>
        </div>
        """
        
        template = Template(EmailTemplates._get_base_template())
        html = template.render(
            subject=f"Осталось {remaining_messages} сообщений — время пополнить баланс",
            content=content
        )
        
        return {
            "subject": f"Осталось {remaining_messages} сообщений — время пополнить баланс",
            "html": html,
            "text": f"У вас осталось {remaining_messages} сообщений в ReplyX. Пополните баланс: {base_url}/balance"
        }
    
    @staticmethod
    def balance_depleted_email(base_url: str = "https://replyx.ru") -> Dict[str, str]:
        """Email уведомления о том, что баланс закончился"""
        
        content = f"""
        <h1 class="title">{SVGIcons.lock_closed(color="#ef4444", size="20")}Сообщения закончились</h1>
        
        <p class="text">
            {SVGIcons.chat_alt(color="#6b7280", size="16")}Ваши сообщения в ReplyX закончились, поэтому доступ к чату временно приостановлен.
        </p>
        
        <div class="highlight">
            Не волнуйтесь — все ваши диалоги сохранены, а пополнение займёт меньше минуты.
        </div>
        
        <p class="text">
            Пополните баланс, чтобы мгновенно возобновить общение с AI-помощником.
        </p>
        
        <div class="cta-center">
            <a href="{base_url}/balance" class="cta-button">Пополнить баланс</a>
        </div>
        """
        
        template = Template(EmailTemplates._get_base_template())
        html = template.render(
            subject="Доступ приостановлен — пополните баланс для продолжения",
            content=content
        )
        
        return {
            "subject": "Доступ приостановлен — пополните баланс для продолжения",
            "html": html,
            "text": f"Ваши сообщения в ReplyX закончились. Пополните баланс для продолжения: {base_url}/balance"
        }

    @staticmethod
    def handoff_notification_email(
        dialog_id: int,
        reason: str,
        user_preview: str,
        dialog_link: str,
        timestamp: str,
        base_url: str = "https://replyx.ru"
    ) -> Dict[str, str]:
        """Email уведомления операторам о запросе handoff"""
        
        reason_text_map = {
            "keyword": "Пользователь запросил оператора",
            "fallback": "AI не смог ответить на вопрос",
            "retries": "Повторные неудачи в диалоге",
            "manual": "Ручной запрос из админки"
        }
        reason_text = reason_text_map.get(reason, "Неизвестная причина")
        
        user_preview_html = user_preview[:150] + "..." if len(user_preview) > 150 else user_preview
        
        content = f"""
        <h1 class="title">{SVGIcons.user(color="#7c3aed", size="20")}Требуется помощь оператора</h1>
        
        <p class="text">
            {SVGIcons.exclamation_triangle(color="#f59e0b", size="16")}Пользователь в диалоге #{dialog_id} нуждается в помощи живого оператора.
        </p>
        
        <div class="guide">
            <div class="guide-item">{SVGIcons.arrow_right(color="#6366f1", size="14")}<strong>Диалог:</strong> #{dialog_id}</div>
            <div class="guide-item">{SVGIcons.arrow_right(color="#6366f1", size="14")}<strong>Причина:</strong> {reason_text}</div>
            <div class="guide-item">{SVGIcons.clock(color="#f59e0b", size="14")}<strong>Время запроса:</strong> {timestamp}</div>
        </div>
        
        <div class="highlight">
            <strong>Последнее сообщение пользователя:</strong><br>
            "{user_preview_html}"
        </div>
        
        <p class="text">
            {SVGIcons.chat_alt(color="#3b82f6", size="16")}Пожалуйста, возьмите диалог как можно скорее, чтобы не заставлять клиента ждать.
        </p>
        
        <div class="cta-center">
            <a href="{dialog_link}?utm_source=email&utm_campaign=handoff" class="cta-button">Открыть диалог в админке</a>
        </div>
        
        <p class="text" style="font-size: 14px; color: {EmailTemplateConfig.MEDIUM_GRAY};">
            Это автоматическое уведомление системы handoff. Если у вас есть вопросы по работе с диалогами, обратитесь к администратору.
        </p>
        """
        
        subject = f"[Handoff requested] Диалог #{dialog_id} | {reason} | \"{user_preview[:50]}\""
        
        template = Template(EmailTemplates._get_base_template())
        html = template.render(
            subject=subject,
            content=content
        )
        
        return {
            "subject": subject,
            "html": html,
            "text": f"Требуется оператор для диалога #{dialog_id}. Причина: {reason_text}. Последнее сообщение: \"{user_preview}\". Ссылка: {dialog_link}"
        }