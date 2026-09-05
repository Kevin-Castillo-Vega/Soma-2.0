"""usuario email global unico

Revision ID: bf20661ebe89
Revises: 2e771bb87c90
Create Date: 2026-08-31 21:09:48.128915

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bf20661ebe89'
down_revision = '2e771bb87c90'
branch_labels = None
depends_on = None


def upgrade():
    # El autogenerate detecto el drop del unique compuesto pero no agrego el
    # global de vuelta -- unique=True en una sola columna no siempre lo capta
    # el autogenerate de Alembic, se agrega a mano.
    with op.batch_alter_table('usuario', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('uq_usuario_clinica_email'), type_='unique')
        batch_op.create_unique_constraint('uq_usuario_email', ['email'])


def downgrade():
    with op.batch_alter_table('usuario', schema=None) as batch_op:
        batch_op.drop_constraint('uq_usuario_email', type_='unique')
        batch_op.create_unique_constraint(batch_op.f('uq_usuario_clinica_email'), ['clinica_id', 'email'])
