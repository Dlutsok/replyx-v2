"""add vk integration

Revision ID: 2954bb358e92
Revises: 2954bb358e91
Create Date: 2023-11-01

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2954bb358e92'
down_revision = '2954bb358e91'
branch_labels = None
depends_on = None

def upgrade():
    # Создаем таблицу для токенов ВКонтакте
    op.create_table('vk_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('group_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Добавляем поле vk_chat_id в таблицу dialogs
    op.add_column('dialogs', sa.Column('vk_chat_id', sa.String(), nullable=True))
    
def downgrade():
    op.drop_column('dialogs', 'vk_chat_id')
    op.drop_table('vk_tokens') 