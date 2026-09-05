
import click
from api.models import Clinica, RolUsuario, Usuario, db

"""
In this file, you can add as many commands as you want using the @app.cli.command decorator
Flask commands are usefull to run cronjobs or tasks outside of the API but sill in integration
with youy database, for example: Import the price of bitcoin every night as 12am
"""
def setup_commands(app):
    """
    Crea una clinica (si el slug no existe todavia) y su primer usuario Admin
    -- no hay auto-registro público, ver docs/decisiones.md. Reutilizable tanto
    para el primer bootstrap como para dar de alta clinicas nuevas (#66).
    Uso: $ flask seed-admin --clinica-nombre "Clinica X" --clinica-slug clinica-x --email admin@x.com --password "algo" --nombre "Admin"
    """
    @app.cli.command("seed-admin")
    @click.option("--clinica-nombre", prompt="Nombre de la clinica")
    @click.option("--clinica-slug", prompt="Slug de la clinica (identificador interno, ya no se pide en el login)")
    @click.option("--email", prompt=True)
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    @click.option("--nombre", prompt="Nombre del admin")
    def seed_admin(clinica_nombre, clinica_slug, email, password, nombre):
        clinica = Clinica.query.filter_by(slug=clinica_slug).first()
        if not clinica:
            clinica = Clinica(nombre=clinica_nombre, slug=clinica_slug)
            db.session.add(clinica)
            db.session.flush()

        # email es global y unico (#66) -- el login ya no pide clinica aparte.
        if Usuario.query.filter_by(email=email).first():
            print("Ya existe un usuario con ese email.")
            return

        usuario = Usuario(
            clinica_id=clinica.id,
            nombre=nombre,
            email=email,
            rol=RolUsuario.ADMIN,
            activo=True,
        )
        usuario.set_password(password)
        db.session.add(usuario)
        db.session.commit()
        print(f"Clinica '{clinica.nombre}' ({clinica.slug}) y admin '{email}' listos.")
