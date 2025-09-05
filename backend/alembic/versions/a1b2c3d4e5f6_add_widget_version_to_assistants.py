"""add_widget_version_to_assistants

Revision ID: a1b2c3d4e5f6
Revises: fb3228f45466
Create Date: 2025-09-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'fb3228f45466'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Добавляем колонку как nullable для безопасного апдейта существующих строк
    with op.batch_alter_table('assistants') as batch_op:
        batch_op.add_column(sa.Column('widget_version', sa.Integer(), nullable=True))

    # 2) Инициализируем существующие записи значением 1
    op.execute("UPDATE assistants SET widget_version = 1 WHERE widget_version IS NULL")

    # 3) Делаем колонку NOT NULL и ставим server_default
    with op.batch_alter_table('assistants') as batch_op:
        batch_op.alter_column('widget_version', existing_type=sa.Integer(), nullable=False, server_default='1')


def downgrade() -> None:
    with op.batch_alter_table('assistants') as batch_op:
        batch_op.drop_column('widget_version')
