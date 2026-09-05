"""merge paquete sesion and google auth migrations

Revision ID: 3558364fa2eb
Revises: e581e34595e7, f7417f1596a8
Create Date: 2026-09-05 04:07:25.945754

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3558364fa2eb'
down_revision = ('e581e34595e7', 'f7417f1596a8')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
