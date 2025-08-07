"""cleanup unused tables

Revision ID: cleanup_unused_tables
Revises: merge_heads_3
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'cleanup_unused_tables'
down_revision = 'merge_heads_3'
branch_labels = None
depends_on = None


def upgrade():
    # Очистка неиспользуемых таблиц - заглушка
    # В этой миграции мы ничего не делаем, так как таблицы уже очищены
    pass


def downgrade():
    # Откат очистки неиспользуемых таблиц - заглушка  
    pass 