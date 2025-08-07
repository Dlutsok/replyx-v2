"""add welcome_bonus_received field to users

Revision ID: add_welcome_bonus_field
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_welcome_bonus_field'
down_revision = None  # This should be updated to the latest revision
branch_labels = None
depends_on = None


def upgrade():
    # Добавляем поле welcome_bonus_received в таблицу users
    op.add_column('users', sa.Column('welcome_bonus_received', sa.Boolean(), nullable=False, default=False, server_default='false'))


def downgrade():
    # Удаляем поле welcome_bonus_received из таблицы users
    op.drop_column('users', 'welcome_bonus_received')