from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from api import google_calendar
from api.decorators import clinica_id_actual, rol_requerido
from api.models import Cita, EspacioTrabajo, EstadoCita, Paciente, Servicio, Usuario, db

citas = Blueprint("citas", __name__, url_prefix="/api/citas")
CORS(citas)

# Cita todavia no guarda duracion (depende de Servicio.duracion_min, issue #12 -- Kevin).
# Mientras tanto se asume un slot fijo para el chequeo de choques.
DURACION_DEFAULT_MIN = 60


def buscar_choque(campo, valor, fecha_hora, clinica_id, excluir_cita_id=None):
    if valor is None:
        return None

    # La aritmetica va del lado de Python (no "Cita.fecha_hora + timedelta(...)" en el
    # filtro) a proposito: SQLite no soporta sumar un intervalo a una columna dentro del
    # SQL -- esa expresion nunca matcheaba nada ahi, aunque en Postgres si funcionaba.
    fin = fecha_hora + timedelta(minutes=DURACION_DEFAULT_MIN)
    inicio_choque = fecha_hora - timedelta(minutes=DURACION_DEFAULT_MIN)
    query = Cita.query.filter(
        Cita.clinica_id == clinica_id,
        Cita.estado != EstadoCita.CANCELADA,
        getattr(Cita, campo) == valor,
        Cita.fecha_hora < fin,
        Cita.fecha_hora > inicio_choque,
    )
    if excluir_cita_id is not None:
        query = query.filter(Cita.id != excluir_cita_id)

    return query.first()


def _parsear_fecha_hora(valor):
    try:
        return datetime.fromisoformat(valor)
    except (TypeError, ValueError):
        return None


@citas.route("", methods=["GET"])
def listar_citas():
    verify_jwt_in_request()
    claims = get_jwt()

    query = Cita.query.filter(Cita.clinica_id == clinica_id_actual())
    if claims.get("rol") == "especialista":
        query = query.filter(Cita.especialista_id == int(get_jwt_identity()))

    return jsonify([c.serialize() for c in query.all()])


@citas.route("/<int:cita_id>", methods=["GET"])
def obtener_cita(cita_id):
    verify_jwt_in_request()
    claims = get_jwt()

    cita = Cita.query.filter_by(id=cita_id, clinica_id=clinica_id_actual()).first_or_404()
    if claims.get("rol") == "especialista" and cita.especialista_id != int(get_jwt_identity()):
        return jsonify(error="no autorizado para este recurso"), 403

    return jsonify(cita.serialize())


@citas.route("", methods=["POST"])
@rol_requerido("admin", "asistente")
def crear_cita():
    data = request.get_json(silent=True) or {}
    clinica_id = clinica_id_actual()

    especialista_id = data.get("especialista_id")
    espacio_id = data.get("espacio_id")
    paciente_id = data.get("paciente_id")
    servicio_id = data.get("servicio_id")
    fecha_hora = _parsear_fecha_hora(data.get("fecha_hora"))

    if not especialista_id or not espacio_id or not fecha_hora:
        return jsonify(error="especialista_id, espacio_id y fecha_hora son requeridos"), 400

    # Los ids llegan del cliente y ya no son suficientes por si solos para saber que le
    # pertenecen a esta clinica (los ids son globales) -- se valida la pertenencia aqui.
    if not Usuario.query.filter_by(id=especialista_id, clinica_id=clinica_id).first():
        return jsonify(error="especialista_id no existe en esta clinica"), 404
    if not EspacioTrabajo.query.filter_by(id=espacio_id, clinica_id=clinica_id).first():
        return jsonify(error="espacio_id no existe en esta clinica"), 404
    if paciente_id and not Paciente.query.filter_by(id=paciente_id, clinica_id=clinica_id).first():
        return jsonify(error="paciente_id no existe en esta clinica"), 404
    if servicio_id and not Servicio.query.filter_by(id=servicio_id, clinica_id=clinica_id).first():
        return jsonify(error="servicio_id no existe en esta clinica"), 404

    if buscar_choque("especialista_id", especialista_id, fecha_hora, clinica_id):
        return jsonify(error="la especialista ya tiene otra cita en ese horario"), 409
    if buscar_choque("espacio_id", espacio_id, fecha_hora, clinica_id):
        return jsonify(error="el espacio ya esta ocupado en ese horario"), 409

    cita = Cita(
        clinica_id=clinica_id,
        especialista_id=especialista_id,
        espacio_id=espacio_id,
        fecha_hora=fecha_hora,
        paciente_id=paciente_id,
        servicio_id=servicio_id,
        estado=EstadoCita.AGENDADA,
    )
    db.session.add(cita)
    db.session.commit()

    cita.google_event_id = google_calendar.crear_evento(cita)
    db.session.commit()

    return jsonify(cita.serialize()), 201


@citas.route("/<int:cita_id>", methods=["PUT"])
def editar_cita(cita_id):
    verify_jwt_in_request()
    claims = get_jwt()
    clinica_id = clinica_id_actual()
    cita = Cita.query.filter_by(id=cita_id, clinica_id=clinica_id).first_or_404()

    es_propia = cita.especialista_id == int(get_jwt_identity())
    if claims.get("rol") == "especialista" and not es_propia:
        return jsonify(error="no autorizado para este recurso"), 403
    if claims.get("rol") not in ("admin", "asistente", "especialista"):
        return jsonify(error="no autorizado para este recurso"), 403

    data = request.get_json(silent=True) or {}

    nueva_fecha_hora = _parsear_fecha_hora(data.get("fecha_hora")) if "fecha_hora" in data else cita.fecha_hora
    nuevo_espacio_id = data.get("espacio_id", cita.espacio_id)
    # Un especialista solo puede reagendar la suya (fecha_hora/espacio), no reasignarla a otra especialista.
    nuevo_especialista_id = cita.especialista_id if claims.get("rol") == "especialista" else data.get("especialista_id", cita.especialista_id)

    if nueva_fecha_hora is None:
        return jsonify(error="fecha_hora invalida"), 400

    if nuevo_espacio_id != cita.espacio_id and not EspacioTrabajo.query.filter_by(id=nuevo_espacio_id, clinica_id=clinica_id).first():
        return jsonify(error="espacio_id no existe en esta clinica"), 404
    if nuevo_especialista_id != cita.especialista_id and not Usuario.query.filter_by(id=nuevo_especialista_id, clinica_id=clinica_id).first():
        return jsonify(error="especialista_id no existe en esta clinica"), 404

    reprograma = nueva_fecha_hora != cita.fecha_hora or nuevo_espacio_id != cita.espacio_id or nuevo_especialista_id != cita.especialista_id

    if reprograma:
        if buscar_choque("especialista_id", nuevo_especialista_id, nueva_fecha_hora, clinica_id, excluir_cita_id=cita.id):
            return jsonify(error="la especialista ya tiene otra cita en ese horario"), 409
        if buscar_choque("espacio_id", nuevo_espacio_id, nueva_fecha_hora, clinica_id, excluir_cita_id=cita.id):
            return jsonify(error="el espacio ya esta ocupado en ese horario"), 409

    cita.fecha_hora = nueva_fecha_hora
    cita.espacio_id = nuevo_espacio_id
    cita.especialista_id = nuevo_especialista_id
    if reprograma and cita.estado == EstadoCita.AGENDADA:
        cita.estado = EstadoCita.REPROGRAMADA

    db.session.commit()

    if reprograma:
        google_calendar.actualizar_evento(cita)

    return jsonify(cita.serialize())


@citas.route("/<int:cita_id>/cancelar", methods=["POST"])
def cancelar_cita(cita_id):
    verify_jwt_in_request()
    claims = get_jwt()
    cita = Cita.query.filter_by(id=cita_id, clinica_id=clinica_id_actual()).first_or_404()

    es_propia = cita.especialista_id == int(get_jwt_identity())
    if claims.get("rol") == "especialista" and not es_propia:
        return jsonify(error="no autorizado para este recurso"), 403

    google_calendar.eliminar_evento(cita)

    # Sin penalizacion ni cobro -- solo cambia el estado (ver docs/decisiones.md).
    cita.estado = EstadoCita.CANCELADA
    cita.google_event_id = None
    db.session.commit()
    return jsonify(cita.serialize())
