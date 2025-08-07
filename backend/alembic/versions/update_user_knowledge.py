"""update user knowledge importance

Revision ID: update_user_knowledge
Revises: ca8d5ee056f4
Create Date: 2023-11-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'update_user_knowledge'
down_revision = 'ca8d5ee056f4'
branch_labels = None
depends_on = None

def upgrade():
    # Обновляем все существующие записи в user_knowledge, устанавливая importance = 10
    op.execute("UPDATE user_knowledge SET importance = 10")
    # Изменяем значение по умолчанию для новых записей
    op.alter_column('user_knowledge', 'importance',
                    existing_type=sa.Integer(),
                    server_default='10')

def downgrade():
    # Возвращаем значение по умолчанию обратно к 5
    op.alter_column('user_knowledge', 'importance',
                    existing_type=sa.Integer(),
                    server_default='5')
    # Обновляем все записи обратно к значению 5
    op.execute("UPDATE user_knowledge SET importance = 5") 