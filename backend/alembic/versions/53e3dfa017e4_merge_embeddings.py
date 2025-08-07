"""merge_embeddings

Revision ID: 53e3dfa017e4
Revises: add_embeddings_system
Create Date: 2025-08-04 23:17:05.323959

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '53e3dfa017e4'
down_revision: Union[str, Sequence[str], None] = 'add_embeddings_system'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
