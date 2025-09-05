"""fix_unique_constraints_naming

Revision ID: 6d3478c239ce
Revises: 165e5d314eaf
Create Date: 2025-09-03 20:23:04.872920

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d3478c239ce'
down_revision: Union[str, Sequence[str], None] = '165e5d314eaf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix unique constraints naming and consistency."""
    
    # Convert unique indexes to unique constraints for consistency
    # This aligns the database schema with the models' UniqueConstraint definitions
    
    # users table
    op.drop_index('ix_users_yandex_id', table_name='users')
    op.create_unique_constraint('uq_users_yandex_id', 'users', ['yandex_id'])
    
    # ai_token_pool table  
    op.drop_index('ix_ai_token_pool_token', table_name='ai_token_pool')
    op.create_unique_constraint('uq_ai_token_pool_token', 'ai_token_pool', ['token'])
    
    # integration_tokens table
    op.drop_index('ix_integration_tokens_token', table_name='integration_tokens')
    op.create_unique_constraint('uq_integration_tokens_token', 'integration_tokens', ['token'])
    
    # query_embeddings_cache table
    op.drop_index('ix_query_embeddings_cache_query_hash', table_name='query_embeddings_cache')
    op.create_unique_constraint('uq_query_embeddings_cache_query_hash', 'query_embeddings_cache', ['query_hash'])
    
    # Additional tables from second migration
    op.drop_index('ix_openai_tokens_user_id', table_name='openai_tokens')  
    op.create_unique_constraint('uq_openai_tokens_user_id', 'openai_tokens', ['user_id'])
    
    op.drop_index('ix_operator_presence_user_id', table_name='operator_presence')
    op.create_unique_constraint('uq_operator_presence_user_id', 'operator_presence', ['user_id'])
    
    op.drop_index('ix_payments_order_id', table_name='payments')
    op.create_unique_constraint('uq_payments_order_id', 'payments', ['order_id'])
    
    op.drop_index('ix_service_prices_service_type', table_name='service_prices')
    op.create_unique_constraint('uq_service_prices_service_type', 'service_prices', ['service_type'])
    
    op.drop_index('ix_telegram_tokens_user_id', table_name='telegram_tokens')
    op.create_unique_constraint('uq_telegram_tokens_user_id', 'telegram_tokens', ['user_id'])
    
    op.drop_index('ix_user_balances_user_id', table_name='user_balances')
    op.create_unique_constraint('uq_user_balances_user_id', 'user_balances', ['user_id'])
    
    # Add server_default for timestamps where models expect it
    op.alter_column('handoff_audit', 'created_at',
                   existing_type=sa.DateTime(),
                   server_default=sa.text('now()'),
                   existing_nullable=False)
                   
    op.alter_column('operator_presence', 'created_at',
                   existing_type=sa.DateTime(), 
                   server_default=sa.text('now()'),
                   existing_nullable=False)
                   
    op.alter_column('operator_presence', 'updated_at',
                   existing_type=sa.DateTime(),
                   server_default=sa.text('now()'), 
                   existing_nullable=False)


def downgrade() -> None:
    """Revert unique constraints naming changes."""
    
    # Revert server defaults
    op.alter_column('operator_presence', 'updated_at',
                   existing_type=sa.DateTime(),
                   server_default=None,
                   existing_nullable=False)
                   
    op.alter_column('operator_presence', 'created_at',
                   existing_type=sa.DateTime(),
                   server_default=None, 
                   existing_nullable=False)
                   
    op.alter_column('handoff_audit', 'created_at',
                   existing_type=sa.DateTime(),
                   server_default=None,
                   existing_nullable=False)
    
    # Revert unique constraints back to unique indexes
    op.drop_constraint('uq_query_embeddings_cache_query_hash', 'query_embeddings_cache', type_='unique')
    op.create_index('ix_query_embeddings_cache_query_hash', 'query_embeddings_cache', ['query_hash'], unique=True)
    
    op.drop_constraint('uq_integration_tokens_token', 'integration_tokens', type_='unique') 
    op.create_index('ix_integration_tokens_token', 'integration_tokens', ['token'], unique=True)
    
    op.drop_constraint('uq_ai_token_pool_token', 'ai_token_pool', type_='unique')
    op.create_index('ix_ai_token_pool_token', 'ai_token_pool', ['token'], unique=True)
    
    # Revert additional tables
    op.drop_constraint('uq_user_balances_user_id', 'user_balances', type_='unique')
    op.create_index('ix_user_balances_user_id', 'user_balances', ['user_id'], unique=True)
    
    op.drop_constraint('uq_telegram_tokens_user_id', 'telegram_tokens', type_='unique')
    op.create_index('ix_telegram_tokens_user_id', 'telegram_tokens', ['user_id'], unique=True)
    
    op.drop_constraint('uq_service_prices_service_type', 'service_prices', type_='unique')
    op.create_index('ix_service_prices_service_type', 'service_prices', ['service_type'], unique=True)
    
    op.drop_constraint('uq_payments_order_id', 'payments', type_='unique')
    op.create_index('ix_payments_order_id', 'payments', ['order_id'], unique=True)
    
    op.drop_constraint('uq_operator_presence_user_id', 'operator_presence', type_='unique')
    op.create_index('ix_operator_presence_user_id', 'operator_presence', ['user_id'], unique=True)
    
    op.drop_constraint('uq_openai_tokens_user_id', 'openai_tokens', type_='unique')
    op.create_index('ix_openai_tokens_user_id', 'openai_tokens', ['user_id'], unique=True)
    
    op.drop_constraint('uq_users_yandex_id', 'users', type_='unique')
    op.create_index('ix_users_yandex_id', 'users', ['yandex_id'], unique=True)
