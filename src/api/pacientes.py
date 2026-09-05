from flask import Blueprint, jsonify, request
from flask_cors import CORS

from api.decorators import clinica_id_actual, rol_requerido
from api.models import Paciente, db

pacientes = Blueprint("pacientes", __name__, url_prefix="/api/pacientes")
CORS(pacientes)


@pacientes.route("", methods=["GET"])
@rol_requerido("admin", "asistente", "especialista")
def listar_pacientes():
    """Los 3 roles consultan pacientes, Especialista solo lectura (ver matriz de
    permisos, docs/decisiones.md). ?telefono= filtra por telefono -- el identificador
    de busqueda acordado (issue #9) -- y es la base de la busqueda inteligente del
    formulario de agendado (issue #7)."""
    telefono = request.args.get("telefono")

    query = Paciente.query.filter_by(clinica_id=clinica_id_actual())
    if telefono:
        query = query.filter_by(telefono=telefono)

    return jsonify([p.serialize() for p in query.all()])


@pacientes.route("/<int:paciente_id>", methods=["GET"])
@rol_requerido("admin", "asistente", "especialista")
def obtener_paciente(paciente_id):
    paciente = Paciente.query.filter_by(id=paciente_id, clinica_id=clinica_id_actual()).first_or_404()
    return jsonify(paciente.serialize())


@pacientes.route("", methods=["POST"])
@rol_requerido("admin", "asistente")
def crear_paciente():
    data = request.get_json(silent=True) or {}
    nombre_completo = data.get("nombre_completo")
    cedula = data.get("cedula")
    telefono = data.get("telefono")

    if not nombre_completo or not cedula or not telefono:
        return jsonify(error="nombre_completo, cedula y telefono son requeridos"), 400

    clinica_id = clinica_id_actual()

    if Paciente.query.filter_by(clinica_id=clinica_id, telefono=telefono).first():
        return jsonify(error="ya existe un paciente con ese telefono"), 409

    if Paciente.query.filter_by(clinica_id=clinica_id, cedula=cedula).first():
        return jsonify(error="ya existe un paciente con esa cedula"), 409

    edad = data.get("edad")
    if edad is not None:
        try:
            edad = int(edad)
        except (TypeError, ValueError):
            return jsonify(error="edad debe ser numerica"), 400

    paciente = Paciente(
        clinica_id=clinica_id,
        nombre_completo=nombre_completo,
        cedula=cedula,
        telefono=telefono,
        ocupacion=data.get("ocupacion"),
        edad=edad,
        alergias=data.get("alergias"),
        tipo_piel=data.get("tipo_piel"),
    )
    db.session.add(paciente)
    db.session.commit()
    return jsonify(paciente.serialize()), 201


@pacientes.route("/<int:paciente_id>", methods=["PUT"])
@rol_requerido("admin", "asistente")
def actualizar_paciente(paciente_id):
    clinica_id = clinica_id_actual()
    paciente = Paciente.query.filter_by(id=paciente_id, clinica_id=clinica_id).first_or_404()
    data = request.get_json(silent=True) or {}

    nuevo_telefono = data.get("telefono", paciente.telefono)
    if nuevo_telefono != paciente.telefono:
        if Paciente.query.filter_by(clinica_id=clinica_id, telefono=nuevo_telefono).first():
            return jsonify(error="ya existe un paciente con ese telefono"), 409

    nueva_cedula = data.get("cedula", paciente.cedula)
    if nueva_cedula != paciente.cedula:
        if Paciente.query.filter_by(clinica_id=clinica_id, cedula=nueva_cedula).first():
            return jsonify(error="ya existe un paciente con esa cedula"), 409

    edad = data.get("edad", paciente.edad)
    if edad is not None:
        try:
            edad = int(edad)
        except (TypeError, ValueError):
            return jsonify(error="edad debe ser numerica"), 400

    paciente.nombre_completo = data.get("nombre_completo", paciente.nombre_completo)
    paciente.cedula = nueva_cedula
    paciente.telefono = nuevo_telefono
    paciente.ocupacion = data.get("ocupacion", paciente.ocupacion)
    paciente.edad = edad
    paciente.alergias = data.get("alergias", paciente.alergias)
    paciente.tipo_piel = data.get("tipo_piel", paciente.tipo_piel)
    db.session.commit()
    return jsonify(paciente.serialize())
