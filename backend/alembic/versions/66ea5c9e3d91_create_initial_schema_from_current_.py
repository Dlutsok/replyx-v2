"""create_initial_schema_from_current_models

Revision ID: 66ea5c9e3d91
Revises: 
Create Date: 2025-09-03 20:02:47.913067

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '66ea5c9e3d91'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create initial schema from current models."""
    
    # Install vector extension with autocommit
    with op.get_context().autocommit_block():
        op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')
    
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('yandex_id', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=True, default='user'),
        sa.Column('status', sa.String(), nullable=True, default='active'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('last_activity', sa.DateTime(), nullable=True),
        sa.Column('is_email_confirmed', sa.Boolean(), nullable=True, default=False),
        sa.Column('email_confirmation_code', sa.String(), nullable=True),
        sa.Column('first_name', sa.String(), nullable=True),
        sa.Column('onboarding_completed', sa.Boolean(), nullable=True, default=False),
        sa.Column('onboarding_step', sa.Integer(), nullable=True, default=0),
        sa.Column('onboarding_started_at', sa.DateTime(), nullable=True),
        sa.Column('onboarding_completed_at', sa.DateTime(), nullable=True),
        sa.Column('onboarding_skipped', sa.Boolean(), nullable=True, default=False),
        sa.Column('first_bot_created', sa.Boolean(), nullable=True, default=False),
        sa.Column('first_message_sent', sa.Boolean(), nullable=True, default=False),
        sa.Column('tutorial_tips_shown', sa.Text(), nullable=True),
        sa.Column('welcome_bonus_received', sa.Boolean(), nullable=True, default=False),
        sa.Column('password_reset_token', sa.String(), nullable=True),
        sa.Column('password_reset_expires', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index('ix_users_yandex_id', 'users', ['yandex_id'], unique=True)

    # Create integration_tokens table
    op.create_table('integration_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_integration_tokens_id'), 'integration_tokens', ['id'], unique=False)
    op.create_index('ix_integration_tokens_token', 'integration_tokens', ['token'], unique=True)

    # Create telegram_tokens table
    op.create_table('telegram_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_telegram_tokens_id'), 'telegram_tokens', ['id'], unique=False)
    op.create_index('ix_telegram_tokens_user_id', 'telegram_tokens', ['user_id'], unique=True)

    # Create openai_tokens table
    op.create_table('openai_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_openai_tokens_id'), 'openai_tokens', ['id'], unique=False)
    op.create_index('ix_openai_tokens_user_id', 'openai_tokens', ['user_id'], unique=True)

    # Create documents table
    op.create_table('documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('upload_date', sa.DateTime(), nullable=True),
        sa.Column('doc_hash', sa.String(64), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)

    # Create assistants table
    op.create_table('assistants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=False, default='AI-ассистент'),
        sa.Column('ai_model', sa.String(), nullable=True, default='gpt-4o-mini'),
        sa.Column('system_prompt', sa.Text(), nullable=True, default='Привет! Я ваш AI-помощник. Готов ответить на вопросы и помочь с любыми задачами. Чем могу быть полезен?'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('website_integration_enabled', sa.Boolean(), nullable=True, default=False),
        sa.Column('allowed_domains', sa.Text(), nullable=True),
        sa.Column('knowledge_version', sa.Integer(), nullable=True, default=1),
        sa.Column('operator_name', sa.String(255), nullable=True, default='Поддержка'),
        sa.Column('business_name', sa.String(255), nullable=True, default='Наша компания'),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('widget_theme', sa.String(50), nullable=True, default='blue'),
        sa.Column('widget_settings', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assistants_id'), 'assistants', ['id'], unique=False)

    # Create remaining core tables
    
    # User Knowledge table
    op.create_table('user_knowledge',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('assistant_id', sa.Integer(), nullable=True),
        sa.Column('doc_id', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('type', sa.String(), nullable=True, default='summary'),
        sa.Column('doc_type', sa.String(), nullable=True),
        sa.Column('importance', sa.Integer(), nullable=True, default=10),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ),
        sa.ForeignKeyConstraint(['doc_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Knowledge Embeddings table (with pgvector support)
    op.create_table('knowledge_embeddings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('assistant_id', sa.Integer(), nullable=True),
        sa.Column('doc_id', sa.Integer(), nullable=True),
        sa.Column('qa_id', sa.Integer(), nullable=True),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=False),
        sa.Column('doc_type', sa.String(), nullable=True),
        sa.Column('importance', sa.Integer(), nullable=True, default=10),
        sa.Column('token_count', sa.Integer(), nullable=True),
        sa.Column('chunk_hash', sa.String(64), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ),
        sa.ForeignKeyConstraint(['doc_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_embeddings_id'), 'knowledge_embeddings', ['id'], unique=False)

    # Query Embeddings Cache
    op.create_table('query_embeddings_cache',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('query_hash', sa.String(64), nullable=False),
        sa.Column('query_text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=1),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_query_embeddings_cache_id'), 'query_embeddings_cache', ['id'], unique=False)
    op.create_index('ix_query_embeddings_cache_query_hash', 'query_embeddings_cache', ['query_hash'], unique=True)

    # Dialogs table
    op.create_table('dialogs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('assistant_id', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('ended_at', sa.DateTime(), nullable=True),
        sa.Column('auto_response', sa.Integer(), nullable=True, default=0),
        sa.Column('first_response_time', sa.Float(), nullable=True),
        sa.Column('fallback', sa.Integer(), nullable=True, default=0),
        sa.Column('is_taken_over', sa.Integer(), nullable=True, default=0),
        sa.Column('telegram_chat_id', sa.String(), nullable=True),
        sa.Column('telegram_username', sa.String(), nullable=True),
        sa.Column('first_name', sa.String(), nullable=True),
        sa.Column('last_name', sa.String(), nullable=True),
        sa.Column('guest_id', sa.String(), nullable=True),
        sa.Column('handoff_status', sa.String(), nullable=False, default='none'),
        sa.Column('handoff_requested_at', sa.DateTime(), nullable=True),
        sa.Column('handoff_started_at', sa.DateTime(), nullable=True),
        sa.Column('handoff_resolved_at', sa.DateTime(), nullable=True),
        sa.Column('handoff_reason', sa.String(), nullable=True),
        sa.Column('assigned_manager_id', sa.Integer(), nullable=True),
        sa.Column('request_id', sa.String(36), nullable=True),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ),
        sa.ForeignKeyConstraint(['assigned_manager_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_dialogs_guest_id', 'dialogs', ['guest_id'], unique=False)

    # Dialog Messages table
    op.create_table('dialog_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dialog_id', sa.Integer(), nullable=True),
        sa.Column('sender', sa.String(), nullable=True),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=True),
        sa.Column('delivered', sa.Integer(), nullable=True, default=0),
        sa.Column('message_kind', sa.String(), nullable=False, default='user'),
        sa.Column('system_type', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['dialog_id'], ['dialogs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Billing tables
    op.create_table('user_balances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('balance', sa.NUMERIC(12, 2), nullable=True, default=0.00),
        sa.Column('total_spent', sa.NUMERIC(12, 2), nullable=True, default=0.00),
        sa.Column('total_topped_up', sa.NUMERIC(12, 2), nullable=True, default=0.00),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_balances_id'), 'user_balances', ['id'], unique=False)
    op.create_index('ix_user_balances_user_id', 'user_balances', ['user_id'], unique=True)

    op.create_table('balance_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.NUMERIC(12, 2), nullable=False),
        sa.Column('transaction_type', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('balance_before', sa.NUMERIC(12, 2), nullable=False),
        sa.Column('balance_after', sa.NUMERIC(12, 2), nullable=False),
        sa.Column('related_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_balance_transactions_id'), 'balance_transactions', ['id'], unique=False)

    # Service prices table
    op.create_table('service_prices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('service_type', sa.String(), nullable=False),
        sa.Column('price', sa.NUMERIC(12, 2), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_service_prices_id'), 'service_prices', ['id'], unique=False)
    op.create_index('ix_service_prices_service_type', 'service_prices', ['service_type'], unique=True)

    # Payments table
    op.create_table('payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.String(), nullable=False),
        sa.Column('amount', sa.NUMERIC(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, default='RUB'),
        sa.Column('status', sa.String(), nullable=True, default='pending'),
        sa.Column('payment_method', sa.String(), nullable=True, default='tinkoff'),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('tinkoff_payment_id', sa.String(), nullable=True),
        sa.Column('success_url', sa.String(), nullable=True),
        sa.Column('fail_url', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)
    op.create_index('ix_payments_order_id', 'payments', ['order_id'], unique=True)

    # AI Token management tables
    op.create_table('ai_token_pool',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('model_access', sa.String(), nullable=True, default='gpt-4o,gpt-4o-mini'),
        sa.Column('daily_limit', sa.Integer(), nullable=True, default=10000),
        sa.Column('monthly_limit', sa.Integer(), nullable=True, default=300000),
        sa.Column('current_daily_usage', sa.Integer(), nullable=True, default=0),
        sa.Column('current_monthly_usage', sa.Integer(), nullable=True, default=0),
        sa.Column('last_reset_daily', sa.DateTime(), nullable=True),
        sa.Column('last_reset_monthly', sa.DateTime(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=True, default=1),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.Column('error_count', sa.Integer(), nullable=True, default=0),
        sa.Column('last_error', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_token_pool_id'), 'ai_token_pool', ['id'], unique=False)
    op.create_index('ix_ai_token_pool_token', 'ai_token_pool', ['token'], unique=True)

    # QA Knowledge table - необходимо создать перед knowledge_embeddings FK
    op.create_table('qa_knowledge',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('assistant_id', sa.Integer(), nullable=True),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('answer', sa.Text(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('keywords', sa.String(), nullable=True),
        sa.Column('importance', sa.Integer(), nullable=True, default=10),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_qa_knowledge_id'), 'qa_knowledge', ['id'], unique=False)

    # Add FK to knowledge_embeddings for qa_knowledge
    op.create_foreign_key(
        'fk_knowledge_embeddings_qa_id', 'knowledge_embeddings',
        'qa_knowledge', ['qa_id'], ['id']
    )


def downgrade() -> None:
    """Drop all tables in reverse order to respect FK constraints."""
    # Drop tables in reverse order of creation to avoid FK constraint issues
    op.drop_table('qa_knowledge')
    op.drop_table('ai_token_pool')
    op.drop_table('payments')
    op.drop_table('service_prices')
    op.drop_table('balance_transactions')
    op.drop_table('user_balances')
    op.drop_table('dialog_messages')
    op.drop_table('dialogs')
    op.drop_table('query_embeddings_cache')
    op.drop_table('knowledge_embeddings')
    op.drop_table('user_knowledge')
    op.drop_table('assistants')
    op.drop_table('documents')
    op.drop_table('openai_tokens')
    op.drop_table('telegram_tokens')
    op.drop_table('integration_tokens')
    op.drop_table('users')
    
    # Drop extensions if needed (usually not necessary)
    # op.execute("DROP EXTENSION IF EXISTS pgvector")
