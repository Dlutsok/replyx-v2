"""Add embeddings system for lazy knowledge retrieval

Revision ID: add_embeddings_system
Revises: merge_heads_3
Create Date: 2025-01-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_embeddings_system'
down_revision = '2b7ea03ef3d4'
branch_labels = None
depends_on = None


def upgrade():
    # Создаем расширение pgvector если его нет
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    
    # Создаем таблицу для хранения embeddings
    op.create_table('knowledge_embeddings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('assistant_id', sa.Integer(), nullable=True),
        sa.Column('doc_id', sa.Integer(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('embedding', postgresql.ARRAY(sa.Float), nullable=False),
        sa.Column('doc_type', sa.String(), nullable=True),
        sa.Column('importance', sa.Integer(), default=10),
        sa.Column('token_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ),
        sa.ForeignKeyConstraint(['doc_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Создаем индексы для быстрого поиска
    op.create_index('ix_knowledge_embeddings_user_id', 'knowledge_embeddings', ['user_id'])
    op.create_index('ix_knowledge_embeddings_assistant_id', 'knowledge_embeddings', ['assistant_id'])
    op.create_index('ix_knowledge_embeddings_doc_id', 'knowledge_embeddings', ['doc_id'])
    
    # Создаем индекс для векторного поиска (cosine similarity)
    op.execute("""
        CREATE INDEX ix_knowledge_embeddings_embedding_cosine 
        ON knowledge_embeddings 
        USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100)
    """)
    
    # Добавляем колонку knowledge_version в таблицу assistants для lazy reload
    op.add_column('assistants', sa.Column('knowledge_version', sa.Integer(), default=1))
    op.create_index('ix_assistants_knowledge_version', 'assistants', ['knowledge_version'])
    
    # Создаем таблицу для кэширования embeddings запросов
    op.create_table('query_embeddings_cache',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('query_hash', sa.String(64), nullable=False),
        sa.Column('query_text', sa.Text(), nullable=False),
        sa.Column('embedding', postgresql.ARRAY(sa.Float), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_used', sa.DateTime(), nullable=False),
        sa.Column('usage_count', sa.Integer(), default=1),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_query_embeddings_cache_hash', 'query_embeddings_cache', ['query_hash'], unique=True)
    op.create_index('ix_query_embeddings_cache_last_used', 'query_embeddings_cache', ['last_used'])


def downgrade():
    # Удаляем таблицы и индексы
    op.drop_table('query_embeddings_cache')
    op.drop_table('knowledge_embeddings')
    op.drop_column('assistants', 'knowledge_version')
    
    # Удаляем расширение vector (осторожно, может использоваться в других местах)
    # op.execute('DROP EXTENSION IF EXISTS vector')