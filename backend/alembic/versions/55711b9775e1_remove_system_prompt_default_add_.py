"""remove_system_prompt_default_add_centralized_prompts

Revision ID: 55711b9775e1
Revises: 85e1ab744cb0
Create Date: 2025-09-18 21:47:07.013109

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '55711b9775e1'
down_revision: Union[str, Sequence[str], None] = '85e1ab744cb0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema and migrate existing assistants to centralized prompts."""
    # 1. Убираем дефолтное значение из колонки system_prompt
    op.alter_column('assistants', 'system_prompt',
                   existing_type=sa.Text(),
                   nullable=True,
                   server_default=None)

    # 2. Обновляем существующих агентов со старыми промптами на новые централизованные
    connection = op.get_bind()

    # Получаем централизованный промпт
    centralized_prompt = """Ты ассистент службы поддержки этой компании. Помогай клиентам с вопросами о продуктах и услугах компании.

ПРИОРИТЕТЫ:
1. База знаний компании (основной источник)
2. Практические советы в контексте деятельности компании
3. Общие рекомендации если они полезны клиенту

ОТВЕЧАЙ на вопросы о:
- Продуктах/услугах компании
- Технических проблемах с сайтом
- Процедурах и процессах компании

НЕ ОТВЕЧАЙ на:
- Вопросы не связанные с компанией
- Математику, программирование (если не относится к услугам)
- Другие компании/конкуренты

При недостатке информации направляй к менеджеру."""

    # Список старых промптов, которые нужно заменить
    old_prompts = [
        'Привет! Я ваш AI-помощник. Готов ответить на вопросы и помочь с любыми задачами. Чем могу быть полезен?',
        'Добро пожаловать! Я Ваш AI-ассистент. Готов предоставить информацию и помочь с любыми вопросами на основе загруженных в мою базу знаний материалов. Отвечаю вежливо, обращаясь к Вам на «Вы». ВАЖНО: Я использую только предоставленную Вами информацию, не выдумываю ответы.',
        'Ты — дружелюбный специалист службы поддержки. Помогаешь клиентам решать их вопросы быстро и эффективно.',
        'Ты — опытный консультант по продажам. Помогаешь клиентам выбрать подходящий товар или услугу.',
        'Ты — информационный ассистент. Предоставляешь актуальную информацию о компании и услугах.',
        'Ты — ассистент для записи на услуги. Помогаешь клиентам выбрать удобное время и забронировать услугу.',
        'Ты — полезный AI-ассистент. Отвечаешь на вопросы пользователей дружелюбно и профессионально.'
    ]

    # Обновляем агентов со старыми промптами
    for old_prompt in old_prompts:
        connection.execute(
            sa.text("UPDATE assistants SET system_prompt = :new_prompt WHERE system_prompt = :old_prompt"),
            {"new_prompt": centralized_prompt, "old_prompt": old_prompt}
        )

    # Обновляем агентов с NULL промптами
    connection.execute(
        sa.text("UPDATE assistants SET system_prompt = :new_prompt WHERE system_prompt IS NULL"),
        {"new_prompt": centralized_prompt}
    )


def downgrade() -> None:
    """Downgrade schema - restore old default."""
    # Возвращаем старый дефолт
    op.alter_column('assistants', 'system_prompt',
                   existing_type=sa.Text(),
                   nullable=True,
                   server_default='Привет! Я ваш AI-помощник. Готов ответить на вопросы и помочь с любыми задачами. Чем могу быть полезен?')
