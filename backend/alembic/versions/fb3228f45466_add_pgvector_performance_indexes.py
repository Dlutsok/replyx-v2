"""add_pgvector_performance_indexes

Revision ID: fb3228f45466
Revises: 23081a5beb71
Create Date: 2025-09-03 20:46:12.244243

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fb3228f45466'
down_revision: Union[str, Sequence[str], None] = '23081a5beb71'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add pgvector performance indexes for production."""
    # выполняем вне транзакции Alembic
    with op.get_context().autocommit_block():
        op.execute("""
            CREATE INDEX CONCURRENTLY knowledge_embeddings_embedding_cosine_idx
            ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
        """)
        op.execute("""
            CREATE INDEX CONCURRENTLY knowledge_embeddings_embedding_l2_idx
            ON knowledge_embeddings USING ivfflat (embedding vector_l2_ops)
            WITH (lists = 100);
        """)
        op.execute("""
            CREATE INDEX CONCURRENTLY query_embeddings_cache_embedding_cosine_idx
            ON query_embeddings_cache USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 50);
        """)


def downgrade() -> None:
    """Remove pgvector performance indexes."""
    with op.get_context().autocommit_block():
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS query_embeddings_cache_embedding_cosine_idx;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS knowledge_embeddings_embedding_l2_idx;")
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS knowledge_embeddings_embedding_cosine_idx;")
