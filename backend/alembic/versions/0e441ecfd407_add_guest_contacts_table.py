"""add_guest_contacts_table

Revision ID: 0e441ecfd407
Revises: 106c75cbc7d5
Create Date: 2025-07-25 10:16:35.168892

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e441ecfd407'
down_revision: Union[str, Sequence[str], None] = '106c75cbc7d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
