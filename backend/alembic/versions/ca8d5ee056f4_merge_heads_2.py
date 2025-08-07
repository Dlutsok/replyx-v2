"""merge_heads_2

Revision ID: ca8d5ee056f4
Revises: merge_heads
Create Date: 2025-06-19 20:20:58.499805

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca8d5ee056f4'
down_revision: Union[str, Sequence[str], None] = 'merge_heads'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
