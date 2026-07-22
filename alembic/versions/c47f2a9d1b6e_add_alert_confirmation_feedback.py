"""Add alert confirmation feedback fields

Revision ID: c47f2a9d1b6e
Revises: b5c8018b1b42
Create Date: 2026-07-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c47f2a9d1b6e'
down_revision: Union[str, Sequence[str], None] = 'b5c8018b1b42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('alerts', sa.Column('user_confirmed', sa.Boolean(), nullable=True))
    op.add_column('alerts', sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('alerts', 'confirmed_at')
    op.drop_column('alerts', 'user_confirmed')
