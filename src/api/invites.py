"""Sistema de invites (#68) -- links de un solo uso para dar acceso de login
a Clientes, Asistentes o Especialistas, generados por Admin o Asistente.
"""
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import get_jwt_identity

from api.decorators import clinica_id_actual, rol_requerido
from api.models import Invite, Paciente, RolUsuario, TipoInvite, Usuario, db

invites = Blueprint("invites", __name__, url_prefix="/api/invites")
CORS(invites)

VIGENCIA_DIAS = 7
PASSWORD_MIN_LARGO = 8


@invites.route("", methods=["POST"])
@rol_requerido("admin", "asistente")
def generar_invite():
    data = request.get_json(silent=True) or {}
    tipo_str = data.get("tipo")
    clinica_id = clinica_id_actual()

    try:
        tipo = TipoInvite(tipo_str)
    except ValueError:
        return jsonify(error=f"tipo invalido, debe ser uno de: {[t.value for t in TipoInvite]}"), 400

    invite = Invite(
        clinica_id=clinica_id,
        tipo=tipo,
        token=secrets.token_urlsafe(32),
        expira=datetime.utcnow() + timedelta(days=VIGENCIA_DIAS),
        creado_por_usuario_id=int(get_jwt_identity()),
    )

    if tipo == TipoInvite.CLIENTE:
        paciente_id = data.get("paciente_id")
        if not paciente_id:
            return jsonify(error="paciente_id es requerido para invites de cliente"), 400
        # Scoping por clinica (#66): un invite nunca puede apuntar a un paciente de otra clinica.
        paciente = Paciente.query.filter_by(id=paciente_id, clinica_id=clinica_id).first()
        if not paciente:
            return jsonify(error="el paciente especificado no existe en esta clinica"), 404
        if paciente.password_hash or paciente.google_id:
            return jsonify(error="este paciente ya tiene acceso de portal"), 409
        invite.paciente_id = paciente_id
    else:
        email = data.get("email")
        if not email:
            return jsonify(error="email es requerido para invites de asistente/especialista"), 400
        if Usuario.query.filter_by(email=email).first():
            return jsonify(error="ya existe un usuario con ese email"), 409
        invite.email = email

    db.session.add(invite)
    db.session.commit()

    frontend_url = current_app.config.get("FRONTEND_URL", "http://localhost:5173")
    return jsonify(
        invite=invite.serialize(),
        link=f"{frontend_url}/invite/{invite.token}",
    ), 201


@invites.route("/<token>", methods=["GET"])
def verificar_invite(token):
    invite = Invite.query.filter_by(token=token).first()
    if not invite:
        return jsonify(error="el invite no existe"), 404
    if invite.usado:
        return jsonify(error="este invite ya fue usado"), 400
    if invite.expirado:
        return jsonify(error="este invite ya expiro"), 400

    return jsonify(invite.serialize())


@invites.route("/<token>/redimir", methods=["POST"])
def redimir_invite(token):
    invite = Invite.query.filter_by(token=token).first()
    if not invite:
        return jsonify(error="el invite no existe"), 404
    if invite.usado:
        return jsonify(error="este invite ya fue usado"), 400
    if invite.expirado:
        return jsonify(error="este invite ya expiro"), 400

    data = request.get_json(silent=True) or {}
    password = data.get("password")
    if not password or len(password) < PASSWORD_MIN_LARGO:
        return jsonify(error=f"password debe tener al menos {PASSWORD_MIN_LARGO} caracteres"), 400

    if invite.tipo == TipoInvite.CLIENTE:
        email = data.get("email")
        if not email:
            return jsonify(error="email es requerido"), 400

        paciente = Paciente.query.get(invite.paciente_id)
        if not paciente:
            return jsonify(error="el paciente de este invite ya no existe"), 404

        ya_en_uso = Paciente.query.filter(
            Paciente.clinica_id == invite.clinica_id,
            Paciente.email == email,
            Paciente.id != paciente.id,
        ).first()
        if ya_en_uso:
            return jsonify(error="ya existe un paciente con ese email en esta clinica"), 409

        paciente.email = email
        paciente.set_password(password)
        paciente.activo = True
    else:
        nombre = data.get("nombre")
        if not nombre:
            return jsonify(error="nombre es requerido"), 400
        if Usuario.query.filter_by(email=invite.email).first():
            return jsonify(error="ya existe un usuario con ese email"), 409

        usuario = Usuario(
            clinica_id=invite.clinica_id,
            nombre=nombre,
            email=invite.email,
            rol=RolUsuario(invite.tipo.value),
            activo=True,
        )
        usuario.set_password(password)
        db.session.add(usuario)

    invite.usado = True
    db.session.commit()

    return jsonify(mensaje="cuenta creada con exito, ya puedes iniciar sesion")
