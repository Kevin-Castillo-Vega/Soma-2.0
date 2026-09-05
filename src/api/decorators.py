from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def rol_requerido(*roles_permitidos):
    """Restringe un endpoint a los roles indicados (valores de RolUsuario, ej. "admin")."""

    def decorador(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("rol") not in roles_permitidos:
                return jsonify(error="no autorizado para este recurso"), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorador


def clinica_id_actual():
    """Clinica del usuario autenticado, extraida del JWT (ver clinica_id en api/auth.py)."""
    verify_jwt_in_request()
    return get_jwt().get("clinica_id")
