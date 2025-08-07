"""update system prompt and ai model

Revision ID: update_system_prompt
Revises: update_user_knowledge
Create Date: 2023-11-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = 'update_system_prompt'
down_revision = 'update_user_knowledge'
branch_labels = None
depends_on = None


def upgrade():
    # Обновляем системный промпт и модель AI для всех пользователей
    new_system_prompt = 'Ты — корпоративный ИИ-ассистент компании. Твоя задача — помогать с вопросами, связанными с компанией, её регламентами, процессами и документами. Отвечай только на вопросы, относящиеся к работе компании. Если пользователь спрашивает о чём-то, не связанном с компанией (например, о погоде, курсах валют, новостях, личных советах), вежливо объясни, что ты создан для помощи только по рабочим вопросам компании. При ответах всегда опирайся на предоставленные документы компании. Не выдумывай информацию, которой нет в документах.'
    
    op.execute(
        text("UPDATE users SET system_prompt = :prompt, ai_model = :model"),
        {"prompt": new_system_prompt, "model": "gpt-3.5-turbo"}
    )
    
    # Изменяем значение по умолчанию для новых записей
    op.alter_column('users', 'ai_model',
                    existing_type=sa.String(),
                    server_default='gpt-3.5-turbo')


def downgrade():
    # Возвращаем значение по умолчанию обратно
    old_system_prompt = 'Ты — дружелюбный и полезный ИИ-ассистент.'
    
    op.execute(
        text("UPDATE users SET system_prompt = :prompt, ai_model = :model"),
        {"prompt": old_system_prompt, "model": "gpt-4"}
    )
    
    # Изменяем значение по умолчанию для новых записей
    op.alter_column('users', 'ai_model',
                    existing_type=sa.String(),
                    server_default='gpt-4') 