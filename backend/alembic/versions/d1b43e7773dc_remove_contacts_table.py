"""remove_contacts_table

Revision ID: d1b43e7773dc
Revises: 2954bb358e92
Create Date: 2025-07-25 09:43:15.883692

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import DateTime, Text


# revision identifiers, used by Alembic.
revision: str = 'd1b43e7773dc'
down_revision: Union[str, Sequence[str], None] = '2954bb358e92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove contacts table and related indexes."""
    # Drop indexes first
    op.execute("DROP INDEX IF EXISTS idx_contacts_user_collected")
    op.execute("DROP INDEX IF EXISTS idx_contacts_status_platform") 
    op.execute("DROP INDEX IF EXISTS idx_contacts_dialog_id")
    
    # Drop the contacts table
    op.drop_table('contacts')


def downgrade() -> None:
    """Recreate contacts table and indexes."""
    # Recreate contacts table
    op.create_table('contacts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('dialog_id', sa.Integer(), nullable=True),
        sa.Column('guest_id', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('collected_at', DateTime(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('notes', Text(), nullable=True),
        sa.Column('first_message', Text(), nullable=True),
        sa.ForeignKeyConstraint(['dialog_id'], ['dialogs.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Recreate indexes
    op.create_index('idx_contacts_user_collected', 'contacts', ['user_id', 'collected_at'])
    op.create_index('idx_contacts_status_platform', 'contacts', ['status', 'platform'])
    op.create_index('idx_contacts_dialog_id', 'contacts', ['dialog_id'])
    op.create_index(op.f('ix_contacts_id'), 'contacts', ['id'])
