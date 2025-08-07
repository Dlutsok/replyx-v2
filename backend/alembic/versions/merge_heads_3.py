"""merge_heads_3

Revision ID: merge_heads_3
Revises: ca8d5ee056f4, update_user_knowledge
Create Date: 2023-11-03

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_heads_3'
down_revision = ('ca8d5ee056f4', 'update_user_knowledge')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass 