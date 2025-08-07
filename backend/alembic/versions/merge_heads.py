"""merge heads

Revision ID: merge_heads
Revises: 4ad3ce709da3, 2954bb358e92
Create Date: 2023-11-02

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_heads'
down_revision = None
branch_labels = None
depends_on = ('4ad3ce709da3', '2954bb358e92')

def upgrade():
    pass

def downgrade():
    pass 