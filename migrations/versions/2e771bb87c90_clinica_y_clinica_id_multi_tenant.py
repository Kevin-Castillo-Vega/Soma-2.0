"""clinica y clinica_id multi-tenant

Revision ID: 2e771bb87c90
Revises: 34725b57b658
Create Date: 2026-08-31 20:29:10.191771

"""
from datetime import datetime

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2e771bb87c90'
down_revision = '34725b57b658'
branch_labels = None
depends_on = None

# Slug de la clinica que absorbe todos los datos que ya existian en main
# antes de que el sistema soportara multi-clinica.
SLUG_CLINICA_SEED = 'clinica-principal'

TABLAS_CON_CLINICA_ID = [
    'cita',
    'comision',
    'espacio_trabajo',
    'gasto_fijo',
    'historial_clinico',
    'paciente',
    'pago',
    'paquete',
    'paquete_paciente',
    'paquete_servicio',
    'servicio',
    'usuario',
    'venta',
]


def upgrade():
    op.create_table(
        'clinica',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('slug', sa.String(length=80), nullable=False),
        sa.Column('fecha_registro', sa.DateTime(), nullable=False),
        sa.Column('activa', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )

    clinica_tabla = sa.table(
        'clinica',
        sa.column('nombre', sa.String),
        sa.column('slug', sa.String),
        sa.column('fecha_registro', sa.DateTime),
        sa.column('activa', sa.Boolean),
    )
    op.bulk_insert(clinica_tabla, [{
        'nombre': 'Clinica Principal',
        'slug': SLUG_CLINICA_SEED,
        'fecha_registro': datetime.utcnow(),
        'activa': True,
    }])

    # clinica_id entra nullable primero porque las tablas ya tienen filas --
    # se backfillea contra la clinica seed y hasta el final se cierra con NOT NULL.
    with op.batch_alter_table('cita', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_cita_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('comision', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_comision_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('espacio_trabajo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_espacio_trabajo_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('gasto_fijo', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_gasto_fijo_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('historial_clinico', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_historial_clinico_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('paciente', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_unique_constraint('uq_paciente_clinica_cedula', ['clinica_id', 'cedula'])
        batch_op.create_unique_constraint('uq_paciente_clinica_telefono', ['clinica_id', 'telefono'])
        batch_op.create_foreign_key('fk_paciente_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('pago', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_pago_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('paquete', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.drop_constraint(batch_op.f('uq_paquete_nombre'), type_='unique')
        batch_op.create_unique_constraint('uq_paquete_clinica_nombre', ['clinica_id', 'nombre'])
        batch_op.create_foreign_key('fk_paquete_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('paquete_paciente', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_paquete_paciente_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('paquete_servicio', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_paquete_servicio_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('servicio', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_servicio_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('usuario', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_unique_constraint('uq_usuario_clinica_email', ['clinica_id', 'email'])
        batch_op.create_foreign_key('fk_usuario_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    with op.batch_alter_table('venta', schema=None) as batch_op:
        batch_op.add_column(sa.Column('clinica_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_venta_clinica_id_clinica', 'clinica', ['clinica_id'], ['id'])

    for tabla in TABLAS_CON_CLINICA_ID:
        op.execute(sa.text(
            f"UPDATE {tabla} SET clinica_id = "
            f"(SELECT id FROM clinica WHERE slug = '{SLUG_CLINICA_SEED}') "
            f"WHERE clinica_id IS NULL"
        ))

    for tabla in TABLAS_CON_CLINICA_ID:
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.alter_column('clinica_id', existing_type=sa.Integer(), nullable=False)


def downgrade():
    for tabla in TABLAS_CON_CLINICA_ID:
        with op.batch_alter_table(tabla, schema=None) as batch_op:
            batch_op.alter_column('clinica_id', existing_type=sa.Integer(), nullable=True)

    with op.batch_alter_table('venta', schema=None) as batch_op:
        batch_op.drop_constraint('fk_venta_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('usuario', schema=None) as batch_op:
        batch_op.drop_constraint('fk_usuario_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_constraint('uq_usuario_clinica_email', type_='unique')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('servicio', schema=None) as batch_op:
        batch_op.drop_constraint('fk_servicio_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('paquete_servicio', schema=None) as batch_op:
        batch_op.drop_constraint('fk_paquete_servicio_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('paquete_paciente', schema=None) as batch_op:
        batch_op.drop_constraint('fk_paquete_paciente_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('paquete', schema=None) as batch_op:
        batch_op.drop_constraint('fk_paquete_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_constraint('uq_paquete_clinica_nombre', type_='unique')
        batch_op.create_unique_constraint(batch_op.f('uq_paquete_nombre'), ['nombre'])
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('pago', schema=None) as batch_op:
        batch_op.drop_constraint('fk_pago_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('paciente', schema=None) as batch_op:
        batch_op.drop_constraint('fk_paciente_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_constraint('uq_paciente_clinica_telefono', type_='unique')
        batch_op.drop_constraint('uq_paciente_clinica_cedula', type_='unique')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('historial_clinico', schema=None) as batch_op:
        batch_op.drop_constraint('fk_historial_clinico_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('gasto_fijo', schema=None) as batch_op:
        batch_op.drop_constraint('fk_gasto_fijo_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('espacio_trabajo', schema=None) as batch_op:
        batch_op.drop_constraint('fk_espacio_trabajo_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('comision', schema=None) as batch_op:
        batch_op.drop_constraint('fk_comision_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    with op.batch_alter_table('cita', schema=None) as batch_op:
        batch_op.drop_constraint('fk_cita_clinica_id_clinica', type_='foreignkey')
        batch_op.drop_column('clinica_id')

    op.drop_table('clinica')
