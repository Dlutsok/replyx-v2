"""merge_multiple_heads

Revision ID: 2b7ea03ef3d4
Revises: 0e441ecfd407, 59763189383d, add_balance_system_tables, add_employee_system, add_website_integration, remove_plan_column, update_system_prompt
Create Date: 2025-08-01 22:14:58.466837

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b7ea03ef3d4'
down_revision: Union[str, Sequence[str], None] = ('0e441ecfd407', '59763189383d', 'add_balance_system_tables', 'add_employee_system', 'add_website_integration', 'remove_plan_column', 'update_system_prompt')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
