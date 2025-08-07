"""add website integration to assistants

Revision ID: add_website_integration
Revises: 
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_website_integration'
down_revision = None  # Replace with actual latest revision
branch_labels = None
depends_on = None


def upgrade():
    # Add website_integration_enabled column to assistants table
    op.add_column('assistants', sa.Column('website_integration_enabled', sa.Boolean(), nullable=True, default=False))
    
    # Set default value for existing records
    op.execute("UPDATE assistants SET website_integration_enabled = false WHERE website_integration_enabled IS NULL")
    
    # Make column non-nullable after setting defaults
    op.alter_column('assistants', 'website_integration_enabled', nullable=False)


def downgrade():
    # Remove website_integration_enabled column from assistants table
    op.drop_column('assistants', 'website_integration_enabled')