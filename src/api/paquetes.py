from flask import Blueprint, jsonify, request

from api.decorators import clinica_id_actual, rol_requerido
from api.models import Paquete, PaqueteServicio, Servicio, db


paquetes = Blueprint("paquetes", __name__, url_prefix="/api/paquetes")


@paquetes.route("", methods=["GET"])
@rol_requerido("admin", "asistente")
def listar_paquetes():
    lista = Paquete.query.filter_by(clinica_id=clinica_id_actual()).all()
    return jsonify([
        {**paquete.serialize(), "servicios": [detalle.serialize() for detalle in paquete.servicios]}
        for paquete in lista
    ])


@paquetes.route("", methods=["POST"])
@rol_requerido("admin", "asistente")
def crear_paquete():
    data = request.get_json(silent=True) or {}

    nombre = data.get("nombre")
    precio_total = data.get("precio_total")
    servicios = data.get("servicios")

    # Validar campos requeridos
    if not nombre or precio_total is None or servicios is None:
        return jsonify(
            error="nombre, precio_total y servicios son requeridos"
        ), 400

    # Validar que servicios sea una lista
    if not isinstance(servicios, list) or len(servicios) == 0:
        return jsonify(
            error="Debe seleccionar al menos un servicio"
        ), 400

    # Validar precio
    try:
        precio_total = float(precio_total)
    except (TypeError, ValueError):
        return jsonify(
            error="precio_total debe ser numérico"
        ), 400

    if precio_total < 0:
        return jsonify(
            error="El precio total no puede ser negativo"
        ), 400

    clinica_id = clinica_id_actual()

    # Evitar nombres duplicados
    paquete_existente = db.session.scalars(
        db.select(Paquete).where(Paquete.clinica_id == clinica_id, Paquete.nombre == nombre)
    ).first()

    if paquete_existente:
        return jsonify(
            error="Ya existe un paquete con ese nombre"
        ), 409

    # Validar los servicios antes de crear el paquete
    detalles = []

    for detalle in servicios:
        if not isinstance(detalle, dict):
            return jsonify(
                error="Cada servicio debe ser un objeto"
            ), 400

        servicio_id = detalle.get("servicio_id")
        num_sesiones = detalle.get("num_sesiones")

        if servicio_id is None or num_sesiones is None:
            return jsonify(
                error="Cada servicio requiere servicio_id y num_sesiones"
            ), 400

        # Validar servicio_id
        try:
            servicio_id = int(servicio_id)
        except (TypeError, ValueError):
            return jsonify(
                error="servicio_id debe ser numérico"
            ), 400

        # Validar que num_sesiones sea un entero real
        if isinstance(num_sesiones, bool) or not isinstance(num_sesiones, int):
            return jsonify(
                error="num_sesiones debe ser un número entero"
            ), 400

        if num_sesiones <= 0:
            return jsonify(
                error="El número de sesiones debe ser mayor que 0"
            ), 400

        servicio = Servicio.query.filter_by(id=servicio_id, clinica_id=clinica_id).first()

        if servicio is None:
            return jsonify(
                error=f"No existe el servicio con id {servicio_id}"
            ), 404

        detalles.append(
            {
                "servicio_id": servicio_id,
                "num_sesiones": num_sesiones,
            }
        )

    # Evitar repetir el mismo servicio dentro del paquete
    servicio_ids = [detalle["servicio_id"] for detalle in detalles]

    if len(servicio_ids) != len(set(servicio_ids)):
        return jsonify(
            error="No se puede agregar el mismo servicio más de una vez"
        ), 400

    # Crear el paquete
    paquete = Paquete(
        clinica_id=clinica_id,
        nombre=nombre,
        precio_total=precio_total,
    )

    db.session.add(paquete)

    # Crear los detalles del paquete
    for detalle in detalles:
        paquete_servicio = PaqueteServicio(
            clinica_id=clinica_id,
            paquete=paquete,
            servicio_id=detalle["servicio_id"],
            num_sesiones=detalle["num_sesiones"],
        )

        db.session.add(paquete_servicio)

    db.session.commit()

    return jsonify(
        {
            "paquete": paquete.serialize(),
            "servicios": [
                detalle.serialize()
                for detalle in paquete.servicios
            ],
        }
    ), 201
