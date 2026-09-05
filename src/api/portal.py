from api.models import (
    Cita,
    HistorialClinico,
    PaquetePaciente,
    PaquetePacienteSesion,
    Venta,
)
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask import Blueprint, jsonify

portal = Blueprint("portal", __name__, url_prefix="/api/portal")


def cliente_paciente_id():
    verify_jwt_in_request()

    claims = get_jwt()

    if claims.get("rol") != "cliente":
        return None

    paciente_id = claims.get("paciente_id")

    if paciente_id is None:
        return None

    return int(paciente_id)


@portal.get("/citas")
def mis_citas():
    paciente_id = cliente_paciente_id()

    if paciente_id is None:
        return jsonify(error="no autorizado"), 403

    citas = Cita.query.filter_by(paciente_id=paciente_id).all()

    return jsonify([
        {
            "id": cita.id,
            "fecha_hora": cita.fecha_hora.isoformat(),
            "estado": cita.estado.value,
            "especialista": {
                "id": cita.especialista.id,
                "nombre": cita.especialista.nombre,
            },
            "servicio": (
                {
                    "id": cita.servicio.id,
                    "nombre": cita.servicio.nombre,
                }
                if cita.servicio
                else None
            ),
        }
        for cita in citas
    ]), 200


@portal.get("/historial-clinico")
def mi_historial_clinico():
    paciente_id = cliente_paciente_id()

    if paciente_id is None:
        return jsonify(error="no autorizado"), 403

    historial = HistorialClinico.query.filter_by(
        paciente_id=paciente_id
    ).all()

    return jsonify([
        {
            "id": registro.id,
            "cita_id": registro.cita_id,
            "observaciones": registro.observaciones,
            "foto_antes_url": registro.foto_antes_url,
            "foto_despues_url": registro.foto_despues_url,
        }
        for registro in historial
    ]), 200


@portal.get("/saldo")
def mi_saldo():
    paciente_id = cliente_paciente_id()

    if paciente_id is None:
        return jsonify(error="no autorizado"), 403

    ventas = Venta.query.filter_by(paciente_id=paciente_id).all()

    ventas_pendientes = [
        venta for venta in ventas
        if venta.deuda_pendiente > 0
    ]

    saldo = sum(venta.deuda_pendiente for venta in ventas_pendientes)

    return jsonify({
        "saldo": round(saldo, 2),
        "ventas": [venta.serialize() for venta in ventas_pendientes],
    }), 200


@portal.get("/paquetes")
def mis_paquetes():
    paciente_id = cliente_paciente_id()

    if paciente_id is None:
        return jsonify(error="no autorizado"), 403

    paquetes = PaquetePaciente.query.filter_by(
        paciente_id=paciente_id
    ).all()

    resultado = []

    for paquete_paciente in paquetes:
        sesiones = PaquetePacienteSesion.query.filter_by(
            paquete_paciente_id=paquete_paciente.id
        ).all()

        pendientes = [
            sesion for sesion in sesiones
            if sesion.estado.value == "pendiente"
        ]

        resultado.append({
            "id": paquete_paciente.id,
            "paquete": (
                paquete_paciente.paquete.nombre
                if paquete_paciente.paquete
                else None
            ),
            "fecha_compra": paquete_paciente.fecha_compra.isoformat(),
            "estado": paquete_paciente.estado.value,
            "sesiones_pendientes": [
                {
                    "id": sesion.id,
                    "servicio_id": sesion.servicio_id,
                    "servicio": (
                        {
                            "id": sesion.servicio.id,
                            "nombre": sesion.servicio.nombre,
                        }
                        if sesion.servicio
                        else None
                    ),
                    "estado": sesion.estado.value,
                }
                for sesion in pendientes
            ],
        })

    return jsonify(resultado), 200
