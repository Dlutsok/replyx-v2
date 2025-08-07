"""remove_generated_articles_table

Revision ID: 106c75cbc7d5
Revises: d1b43e7773dc
Create Date: 2025-07-25 09:50:32.064033

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import DateTime, Text


# revision identifiers, used by Alembic.
revision: str = '106c75cbc7d5'
down_revision: Union[str, Sequence[str], None] = 'd1b43e7773dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove generated_articles table."""
    # Drop the generated_articles table
    op.drop_table('generated_articles')


def downgrade() -> None:
    """Recreate generated_articles table."""
    # Recreate generated_articles table
    op.create_table('generated_articles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('topic', sa.String(), nullable=False),
        sa.Column('article_type', sa.String(), nullable=False),
        sa.Column('target_audience', sa.String(), nullable=False),
        sa.Column('specialty', sa.String(), nullable=True),
        sa.Column('content', Text(), nullable=False),
        sa.Column('keywords', sa.String(), nullable=True),
        sa.Column('tone', sa.String(), nullable=True),
        sa.Column('word_count', sa.Integer(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('created_at', DateTime(), nullable=True),
        sa.Column('updated_at', DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Recreate index
    op.create_index(op.f('ix_generated_articles_id'), 'generated_articles', ['id'])
