"""Remove plan column from users table

Revision ID: remove_plan_column
Revises: 217ce33d5f67
Create Date: 2025-01-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'remove_plan_column'
down_revision: Union[str, Sequence[str], None] = '217ce33d5f67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove plan column from users table."""
    # Drop indexes that reference the plan column
    try:
        op.drop_index('idx_users_paid_plans', table_name='users')
    except:
        pass  # Index might not exist
    
    try:
        op.drop_index('idx_users_activity_monitoring', table_name='users')
    except:
        pass  # Index might not exist
    
    try:
        op.drop_index('idx_users_admin_panel_filter', table_name='users')
    except:
        pass  # Index might not exist
    
    try:
        op.drop_index('idx_users_stats_aggregation', table_name='users')
    except:
        pass  # Index might not exist
    
    try:
        op.drop_index('idx_users_search_admin', table_name='users')
    except:
        pass  # Index might not exist
    
    # Remove the plan column
    op.drop_column('users', 'plan')


def downgrade() -> None:
    """Add plan column back to users table."""
    # Add the plan column back
    op.add_column('users', sa.Column('plan', sa.String(), nullable=True))
    
    # Recreate indexes (simplified versions without plan references)
    op.create_index('idx_users_activity_monitoring', 'users', ['last_activity', 'status'])
    op.create_index('idx_users_admin_panel_filter', 'users', ['status', 'role', 'created_at'])
    op.create_index('idx_users_stats_aggregation', 'users', ['created_at', 'status'])
    op.create_index('idx_users_search_admin', 'users', ['email', 'first_name', 'last_name'])