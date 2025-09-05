"""complete_unique_constraints_fix

Revision ID: c4132f66258f
Revises: 6d3478c239ce
Create Date: 2025-09-03 20:33:57.559934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4132f66258f'
down_revision: Union[str, Sequence[str], None] = '6d3478c239ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Complete the unique constraints fix for remaining tables."""
    
    # Fix remaining unique indexes -> unique constraints
    
    # openai_tokens table
    op.drop_index('ix_openai_tokens_user_id', table_name='openai_tokens')
    op.create_unique_constraint('uq_openai_tokens_user_id', 'openai_tokens', ['user_id'])
    
    # operator_presence table  
    op.drop_index('ix_operator_presence_user_id', table_name='operator_presence')
    op.create_unique_constraint('uq_operator_presence_user_id', 'operator_presence', ['user_id'])
    
    # payments table
    op.drop_index('ix_payments_order_id', table_name='payments')
    op.create_unique_constraint('uq_payments_order_id', 'payments', ['order_id'])
    
    # service_prices table
    op.drop_index('ix_service_prices_service_type', table_name='service_prices')
    op.create_unique_constraint('uq_service_prices_service_type', 'service_prices', ['service_type'])
    
    # telegram_tokens table
    op.drop_index('ix_telegram_tokens_user_id', table_name='telegram_tokens')
    op.create_unique_constraint('uq_telegram_tokens_user_id', 'telegram_tokens', ['user_id'])
    
    # user_balances table
    op.drop_index('ix_user_balances_user_id', table_name='user_balances')
    op.create_unique_constraint('uq_user_balances_user_id', 'user_balances', ['user_id'])
    
    # users table - email field (yandex_id already fixed in previous migration)
    op.drop_index('ix_users_email', table_name='users')
    op.create_unique_constraint('uq_users_email', 'users', ['email'])
    
    # system_settings table - composite unique constraint
    op.drop_index('ix_system_settings_category_key', table_name='system_settings') 
    op.create_unique_constraint('uq_system_settings_category_key', 'system_settings', ['category', 'key'])


def downgrade() -> None:
    """Revert unique constraints back to unique indexes."""
    
    # Revert in reverse order
    op.drop_constraint('uq_system_settings_category_key', 'system_settings', type_='unique')
    op.create_index('ix_system_settings_category_key', 'system_settings', ['category', 'key'], unique=True)
    
    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    
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
