import secrets
import string

from flask import Blueprint, jsonify, request
from flask_cors import CORS

from api.decorators import clinica_id_actual, rol_requerido
from api.models import RolUsuario, Usuario, db

usuarios = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")
CORS(usuarios)


def _generar_password_temporal(longitud=12):
    alfabeto = string.ascii_letters + string.digits
    return "".join(secrets.choice(alfabeto) for _ in range(longitud))


@usuarios.route("", methods=["GET"])
@rol_requerido("admin", "asistente")
def listar_usuarios():
    """Admin y Asistente listan usuarios -- Asistente lo necesita para asignar
    especialista al agendar una cita (ver docs/decisiones.md, matriz de permisos)."""
    rol = request.args.get("rol")

    query = Usuario.query.filter_by(clinica_id=clinica_id_actual())
    if rol:
        roles_validos = [r.value for r in RolUsuario]
        if rol not in roles_validos:
            return jsonify(error=f"rol invalido, debe ser uno de: {roles_validos}"), 400
        query = query.filter_by(rol=RolUsuario(rol))

    return jsonify([u.serialize() for u in query.all()])


@usuarios.route("", methods=["POST"])
@rol_requerido("admin")
def crear_usuario():
    """Alta de Asistente/Especialista por el Admin -- no hay auto-registro publico (ver docs/decisiones.md)."""
    data = request.get_json(silent=True) or {}
    nombre = data.get("nombre")
    email = data.get("email")
    rol = data.get("rol")

    if not nombre or not email or not rol:
        return jsonify(error="nombre, email y rol son requeridos"), 400

    roles_validos = [r.value for r in RolUsuario]
    if rol not in roles_validos:
        return jsonify(error=f"rol invalido, debe ser uno de: {roles_validos}"), 400

    # email es global y unico (#66), no solo dentro de esta clinica.
    if Usuario.query.filter_by(email=email).first():
        return jsonify(error="ya existe un usuario con ese email"), 409

    password_temporal = _generar_password_temporal()
    usuario = Usuario(
        clinica_id=clinica_id_actual(),
        nombre=nombre,
        email=email,
        rol=RolUsuario(rol),
        debe_cambiar_password=True,
    )
    usuario.set_password(password_temporal)
    db.session.add(usuario)
    db.session.commit()

    # La UI (#23, pendiente) le muestra este password temporal al Admin para que se lo
    # comparta al usuario nuevo -- no se envia por email aqui, eso es el flujo de #24.
    return jsonify(usuario=usuario.serialize(), password_temporal=password_temporal), 201
