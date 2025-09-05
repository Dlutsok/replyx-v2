"""add_production_performance_indexes

Revision ID: 165e5d314eaf
Revises: 66ea5c9e3d91
Create Date: 2025-09-03 20:04:46.194029

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '165e5d314eaf'
down_revision: Union[str, Sequence[str], None] = '66ea5c9e3d91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add production performance indexes for critical queries."""
    
    # Dialog performance indexes
    op.create_index('idx_dialogs_user_started', 'dialogs', ['user_id', 'started_at'])
    op.create_index('idx_dialogs_handoff_status', 'dialogs', ['handoff_status', 'handoff_requested_at'])
    op.create_index('idx_dialogs_assistant_created', 'dialogs', ['assistant_id', 'started_at'])
    
    # Dialog messages performance indexes
    op.create_index('idx_dialog_messages_dialog_timestamp', 'dialog_messages', ['dialog_id', 'timestamp'])
    op.create_index('idx_dialog_messages_kind_timestamp', 'dialog_messages', ['message_kind', 'timestamp'])
    op.create_index('idx_dialog_messages_sender_timestamp', 'dialog_messages', ['sender', 'timestamp'])
    
    # Document indexes
    op.create_index('idx_documents_user_upload', 'documents', ['user_id', 'upload_date'])
    op.create_index('idx_documents_hash', 'documents', ['doc_hash'])
    
    # Embeddings performance indexes
    op.create_index('idx_knowledge_embeddings_user_doc', 'knowledge_embeddings', ['user_id', 'doc_id'])
    op.create_index('idx_knowledge_embeddings_assistant_importance', 'knowledge_embeddings', ['assistant_id', 'importance'])
    op.create_index('idx_knowledge_embeddings_source_created', 'knowledge_embeddings', ['source', 'created_at'])
    op.create_index('idx_knowledge_embeddings_chunk_hash', 'knowledge_embeddings', ['chunk_hash'])
    
    # User knowledge indexes
    op.create_index('idx_user_knowledge_user_assistant', 'user_knowledge', ['user_id', 'assistant_id'])
    op.create_index('idx_user_knowledge_doc_type', 'user_knowledge', ['doc_type', 'importance'])
    op.create_index('idx_user_knowledge_last_used', 'user_knowledge', ['last_used'])
    
    # Balance and payment indexes
    op.create_index('idx_balance_transactions_user_created', 'balance_transactions', ['user_id', 'created_at'])
    op.create_index('idx_balance_transactions_type_created', 'balance_transactions', ['transaction_type', 'created_at'])
    op.create_index('idx_payments_user_created', 'payments', ['user_id', 'created_at'])
    op.create_index('idx_payments_status_created', 'payments', ['status', 'created_at'])
    
    # AI token usage tracking
    op.create_table('ai_token_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('assistant_id', sa.Integer(), nullable=True),
        sa.Column('model_used', sa.String(), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True, default=0),
        sa.Column('completion_tokens', sa.Integer(), nullable=True, default=0),
        sa.Column('total_tokens', sa.Integer(), nullable=True, default=0),
        sa.Column('request_type', sa.String(), nullable=True, default='chat'),
        sa.Column('response_time', sa.Float(), nullable=True, default=0.0),
        sa.Column('success', sa.Boolean(), nullable=True, default=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ),
        sa.ForeignKeyConstraint(['token_id'], ['ai_token_pool.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_token_usage_id'), 'ai_token_usage', ['id'], unique=False)
    op.create_index('idx_ai_token_usage_token_created', 'ai_token_usage', ['token_id', 'created_at'])
    op.create_index('idx_ai_token_usage_user_model', 'ai_token_usage', ['user_id', 'model_used'])
    
    # Additional missing tables from models.py
    
    # Start page events for analytics
    op.create_table('start_page_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.String(64), nullable=False),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('step_id', sa.Integer(), nullable=True),
        sa.Column('action_type', sa.String(50), nullable=True),
        sa.Column('event_metadata', sa.Text(), nullable=True),
        sa.Column('user_agent', sa.String(512), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_start_page_events_id'), 'start_page_events', ['id'], unique=False)
    op.create_index('ix_start_page_events_created_at', 'start_page_events', ['created_at'])
    op.create_index('idx_start_events_user_created', 'start_page_events', ['user_id', 'created_at'])
    op.create_index('idx_start_events_session_created', 'start_page_events', ['session_id', 'created_at'])
    op.create_index('idx_start_events_type_created', 'start_page_events', ['event_type', 'created_at'])
    op.create_index('idx_start_events_step_created', 'start_page_events', ['step_id', 'created_at'])
    
    # Bot instances
    op.create_table('bot_instances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('assistant_id', sa.Integer(), nullable=True),
        sa.Column('platform', sa.String(), nullable=False, default='telegram'),
        sa.Column('bot_token', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # System settings
    op.create_table('system_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('data_type', sa.String(20), nullable=True, default='string'),
        sa.Column('is_sensitive', sa.Boolean(), nullable=True, default=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('default_value', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_system_settings_category_key', 'system_settings', ['category', 'key'], unique=True)
    
    # Operator presence and handoff audit tables
    op.create_table('operator_presence',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='offline'),
        sa.Column('last_heartbeat', sa.DateTime(), nullable=True),
        sa.Column('max_active_chats_web', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('max_active_chats_telegram', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('active_chats', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_operator_presence_user_id', 'operator_presence', ['user_id'], unique=True)
    
    op.create_table('handoff_audit',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dialog_id', sa.Integer(), nullable=False),
        sa.Column('from_status', sa.String(), nullable=True),
        sa.Column('to_status', sa.String(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('reason', sa.String(), nullable=True),
        sa.Column('request_id', sa.String(36), nullable=True),
        sa.Column('seq', sa.Integer(), nullable=False),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['dialog_id'], ['dialogs.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Remove production performance indexes and additional tables."""
    # Drop additional tables first
    op.drop_table('handoff_audit')
    op.drop_table('operator_presence')  
    op.drop_table('system_settings')
    op.drop_table('bot_instances')
    op.drop_table('start_page_events')
    op.drop_table('ai_token_usage')
    
    # Drop performance indexes
    op.drop_index('idx_payments_status_created', table_name='payments')
    op.drop_index('idx_payments_user_created', table_name='payments')
    op.drop_index('idx_balance_transactions_type_created', table_name='balance_transactions')
    op.drop_index('idx_balance_transactions_user_created', table_name='balance_transactions')
    op.drop_index('idx_user_knowledge_last_used', table_name='user_knowledge')
    op.drop_index('idx_user_knowledge_doc_type', table_name='user_knowledge')
    op.drop_index('idx_user_knowledge_user_assistant', table_name='user_knowledge')
    op.drop_index('idx_knowledge_embeddings_chunk_hash', table_name='knowledge_embeddings')
    op.drop_index('idx_knowledge_embeddings_source_created', table_name='knowledge_embeddings')
    op.drop_index('idx_knowledge_embeddings_assistant_importance', table_name='knowledge_embeddings')
    op.drop_index('idx_knowledge_embeddings_user_doc', table_name='knowledge_embeddings')
    op.drop_index('idx_documents_hash', table_name='documents')
    op.drop_index('idx_documents_user_upload', table_name='documents')
    op.drop_index('idx_dialog_messages_sender_timestamp', table_name='dialog_messages')
    op.drop_index('idx_dialog_messages_kind_timestamp', table_name='dialog_messages')
    op.drop_index('idx_dialog_messages_dialog_timestamp', table_name='dialog_messages')
    op.drop_index('idx_dialogs_assistant_created', table_name='dialogs')
    op.drop_index('idx_dialogs_handoff_status', table_name='dialogs')
    op.drop_index('idx_dialogs_user_started', table_name='dialogs')
