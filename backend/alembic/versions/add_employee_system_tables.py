"""add employee system tables

Revision ID: add_employee_system
Revises: 
Create Date: 2024-12-30 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'add_employee_system'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Создание таблицы employee_invitations
    op.create_table('employee_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('first_name', sa.String(), nullable=True),
        sa.Column('last_name', sa.String(), nullable=True),
        sa.Column('position', sa.String(), nullable=True),
        sa.Column('invitation_token', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invitation_token')
    )
    op.create_index(op.f('ix_employee_invitations_id'), 'employee_invitations', ['id'], unique=False)
    op.create_index(op.f('ix_employee_invitations_email'), 'employee_invitations', ['email'], unique=False)

    # Создание таблицы employees
    op.create_table('employees',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('invitation_id', sa.Integer(), nullable=True),
        sa.Column('position', sa.String(), nullable=True),
        sa.Column('permissions', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['invitation_id'], ['employee_invitations.id'], ),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_employees_id'), 'employees', ['id'], unique=False)

def downgrade():
    # Удаление таблиц в обратном порядке
    op.drop_index(op.f('ix_employees_id'), table_name='employees')
    op.drop_table('employees')
    
    op.drop_index(op.f('ix_employee_invitations_email'), table_name='employee_invitations')
    op.drop_index(op.f('ix_employee_invitations_id'), table_name='employee_invitations')
    op.drop_table('employee_invitations') 