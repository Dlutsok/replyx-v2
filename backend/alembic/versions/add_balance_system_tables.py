"""Add balance system tables

Revision ID: add_balance_system_tables
Revises: cleanup_unused_tables
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_balance_system_tables'
down_revision = 'cleanup_unused_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Создаем таблицу промокодов
    op.create_table('promo_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('min_amount', sa.Float(), nullable=True),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('used_count', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code')
    )
    op.create_index(op.f('ix_promo_codes_code'), 'promo_codes', ['code'], unique=False)
    op.create_index(op.f('ix_promo_codes_id'), 'promo_codes', ['id'], unique=False)

    # Создаем таблицу использования промокодов
    op.create_table('promo_code_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('promo_code_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount_before', sa.Float(), nullable=False),
        sa.Column('discount_amount', sa.Float(), nullable=False),
        sa.Column('amount_after', sa.Float(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['promo_code_id'], ['promo_codes.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_promo_code_usage_id'), 'promo_code_usage', ['id'], unique=False)

    # Создаем таблицу реферальных кодов
    op.create_table('referral_codes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('referrals_count', sa.Integer(), nullable=True),
        sa.Column('total_earned', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_referral_codes_code'), 'referral_codes', ['code'], unique=False)
    op.create_index(op.f('ix_referral_codes_id'), 'referral_codes', ['id'], unique=False)

    # Создаем таблицу рефералов
    op.create_table('referrals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('referrer_id', sa.Integer(), nullable=False),
        sa.Column('referred_id', sa.Integer(), nullable=False),
        sa.Column('referral_code_id', sa.Integer(), nullable=False),
        sa.Column('bonus_amount', sa.Float(), nullable=True),
        sa.Column('referred_bonus', sa.Float(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['referral_code_id'], ['referral_codes.id'], ),
        sa.ForeignKeyConstraint(['referred_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['referrer_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_referrals_id'), 'referrals', ['id'], unique=False)

    # Добавляем default значения для существующих столбцов
    op.alter_column('promo_codes', 'min_amount', server_default='0.0')
    op.alter_column('promo_codes', 'used_count', server_default='0')
    op.alter_column('promo_codes', 'is_active', server_default='true')
    op.alter_column('referral_codes', 'referrals_count', server_default='0')
    op.alter_column('referral_codes', 'total_earned', server_default='0.0')
    op.alter_column('referrals', 'bonus_amount', server_default='0.0')
    op.alter_column('referrals', 'referred_bonus', server_default='0.0')
    op.alter_column('referrals', 'status', server_default='pending')


def downgrade():
    # Удаляем таблицы в обратном порядке
    op.drop_index(op.f('ix_referrals_id'), table_name='referrals')
    op.drop_table('referrals')
    
    op.drop_index(op.f('ix_referral_codes_id'), table_name='referral_codes')
    op.drop_index(op.f('ix_referral_codes_code'), table_name='referral_codes')
    op.drop_table('referral_codes')
    
    op.drop_index(op.f('ix_promo_code_usage_id'), table_name='promo_code_usage')
    op.drop_table('promo_code_usage')
    
    op.drop_index(op.f('ix_promo_codes_id'), table_name='promo_codes')
    op.drop_index(op.f('ix_promo_codes_code'), table_name='promo_codes')
    op.drop_table('promo_codes') 