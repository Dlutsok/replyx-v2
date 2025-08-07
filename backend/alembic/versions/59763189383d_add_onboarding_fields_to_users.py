"""add_onboarding_fields_to_users

Revision ID: 59763189383d
Revises: merge_heads_3
Create Date: 2025-07-02 11:54:18.985024

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59763189383d'
down_revision: Union[str, Sequence[str], None] = 'merge_heads_3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Добавляем поля для онбординга
    op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('onboarding_step', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('onboarding_started_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('onboarding_completed_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('onboarding_skipped', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('first_bot_created', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('first_message_sent', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('tutorial_tips_shown', sa.Text(), nullable=True))  # JSON массив показанных подсказок


def downgrade() -> None:
    """Downgrade schema."""
    # Удаляем поля онбординга
    op.drop_column('users', 'tutorial_tips_shown')
    op.drop_column('users', 'first_message_sent')
    op.drop_column('users', 'first_bot_created')
    op.drop_column('users', 'onboarding_skipped')
    op.drop_column('users', 'onboarding_completed_at')
    op.drop_column('users', 'onboarding_started_at')
    op.drop_column('users', 'onboarding_step')
    op.drop_column('users', 'onboarding_completed')
