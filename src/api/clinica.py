"""Configuracion de la Clinica desde el perfil del Admin (issue #71)."""
import os

from flask import Blueprint, jsonify, request
from flask_cors import CORS

from api import google_calendar
from api.decorators import clinica_id_actual, rol_requerido
from api.models import Clinica, db

# "clinica_config" y no "clinica" -- Flask-Admin (api/admin.py) ya registra un
# blueprint interno llamado "clinica" para el ModelView del modelo Clinica.
clinica = Blueprint("clinica_config", __name__, url_prefix="/api/clinica")
CORS(clinica)


@clinica.route("/google-calendar/estado", methods=["GET"])
@rol_requerido("admin")
def estado_google_calendar():
    clinica_obj = Clinica.query.get_or_404(clinica_id_actual())
    return jsonify(
        conectado=clinica_obj.google_refresh_token is not None,
        cuenta_email=clinica_obj.google_cuenta_email,
    )


@clinica.route("/google-calendar/conectar", methods=["GET"])
@rol_requerido("admin")
def conectar_google_calendar():
    """Devuelve la URL de Google a la que el frontend debe redirigir al Admin.

    El 'state' es el propio JWT de la sesion -- el callback (api/auth.py, ruta
    publica que Google visita directo) lo decodifica para saber a que
    clinica_id conectar el refresh_token, sin inventar un mecanismo de firma
    aparte.
    """
    token_actual = request.headers.get("Authorization", "").replace("Bearer ", "", 1).strip()
    redirect_uri = os.environ.get("GOOGLE_REDIRECT_URI")
    if not redirect_uri:
        return jsonify(error="GOOGLE_REDIRECT_URI no esta configurado"), 500

    url = google_calendar.generar_url_autorizacion(state=token_actual, redirect_uri=redirect_uri)
    return jsonify(url=url)


@clinica.route("/google-calendar", methods=["DELETE"])
@rol_requerido("admin")
def desconectar_google_calendar():
    clinica_obj = Clinica.query.get_or_404(clinica_id_actual())
    clinica_obj.google_refresh_token = None
    clinica_obj.google_cuenta_email = None
    db.session.commit()
    return jsonify(mensaje="Google Calendar desconectado")
