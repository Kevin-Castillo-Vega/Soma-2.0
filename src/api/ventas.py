from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_cors import CORS
from api.decorators import clinica_id_actual, rol_requerido
from api.models import (
    db, Venta, Pago, Paciente, Servicio, Cita,
    PaquetePaciente, FormaPagoPaquete, Clinica, Paquete
)

ventas = Blueprint("ventas", __name__, url_prefix="/api/ventas")
CORS(ventas)

@ventas.route("", methods=["GET"])
@rol_requerido("admin", "asistente")
# Lista las ventas con soporte de filtros (paciente_id y con_deuda)
def listar_ventas():
    paciente_id = request.args.get("paciente_id", type=int)
    con_deuda = request.args.get("con_deuda", "").lower() in ("true", "1", "yes")

    stmt = db.select(Venta).where(Venta.clinica_id == clinica_id_actual()).order_by(Venta.fecha.desc())
    if paciente_id:
        stmt = stmt.where(Venta.paciente_id == paciente_id)

    todas_ventas = db.session.scalars(stmt).all()

    if con_deuda:
        todas_ventas = [v for v in todas_ventas if v.deuda_pendiente > 0]
    return jsonify([v.serialize() for v in todas_ventas]), 200


@ventas.route("/<int:venta_id>", methods=["GET"])
@rol_requerido("admin", "asistente")
# Obtener el detalle de una venta y el historial de pagos
def obtener_venta(venta_id):
    venta = Venta.query.filter_by(id=venta_id, clinica_id=clinica_id_actual()).first()
    if not venta:
        return jsonify(error="Venta no encontrada"), 404
    return jsonify(venta.serialize()), 200


@ventas.route("/<int:venta_id>/recibo", methods=["GET"])
@rol_requerido("admin", "asistente")
# Datos para la vista imprimible del recibo -- el PDF se genera del lado del
# navegador (window.print() -> "Guardar como PDF"), este endpoint solo arma
# los datos ya resueltos (nombres, no ids) para que el frontend no tenga que
# cruzar varios catalogos.
def obtener_recibo_venta(venta_id):
    clinica_id = clinica_id_actual()
    venta = Venta.query.filter_by(id=venta_id, clinica_id=clinica_id).first()
    if not venta:
        return jsonify(error="Venta no encontrada"), 404

    clinica = Clinica.query.get(clinica_id)
    paciente = Paciente.query.get(venta.paciente_id)

    concepto = None
    if venta.servicio_id:
        servicio = Servicio.query.get(venta.servicio_id)
        concepto = servicio.nombre if servicio else None
    elif venta.paquete_paciente_id:
        paquete_pac = PaquetePaciente.query.get(venta.paquete_paciente_id)
        paquete = Paquete.query.get(paquete_pac.paquete_id) if paquete_pac and paquete_pac.paquete_id else None
        concepto = paquete.nombre if paquete else None

    return jsonify({
        "venta": venta.serialize(),
        "concepto": concepto or "Servicio",
        "clinica_nombre": clinica.nombre if clinica else None,
        "paciente_nombre": paciente.nombre_completo if paciente else f"Paciente #{venta.paciente_id}",
        "paciente_telefono": paciente.telefono if paciente else None,
    }), 200


@ventas.route("", methods=["POST"])
@rol_requerido("admin", "asistente")
# Registra una venta con pago completo o abono parcial.
# Si es sesión de paquete de contado: monto es $0.
# Si es sesión de paquete a plazos: permite registrar la cuota.
# Si es servicio suelto: permite pago total o abono parcial.
def registrar_venta():
    data = request.get_json(silent=True) or {}
    clinica_id = clinica_id_actual()

    paciente_id = data.get("paciente_id")
    if not paciente_id:
        return jsonify(error="paciente_id es requerido"), 400

    paciente = Paciente.query.filter_by(id=paciente_id, clinica_id=clinica_id).first()
    if not paciente:
        return jsonify(error="El paciente especificado no existe"), 404

    cita_id = data.get("cita_id")
    servicio_id = data.get("servicio_id")
    paquete_paciente_id = data.get("paquete_paciente_id")
    es_sesion_paquete = data.get("es_sesion_paquete", False)

    # Validar cita si viene en el payload
    if cita_id and not Cita.query.filter_by(id=cita_id, clinica_id=clinica_id).first():
        return jsonify(error="La cita especificada no existe"), 404

    # Validar servicio si viene en el payload
    if servicio_id and not Servicio.query.filter_by(id=servicio_id, clinica_id=clinica_id).first():
        return jsonify(error="El servicio especificado no existe"), 404

    # 1. Determinar monto total y pago según tipo de venta
    if es_sesion_paquete or paquete_paciente_id:
        paquete_pac = (
            PaquetePaciente.query.filter_by(id=paquete_paciente_id, clinica_id=clinica_id).first()
            if paquete_paciente_id
            else None
        )

        pago_cuota = float(data.get("pago_monto", 0.0) or 0.0)

        # Si el paquete fue de contado, la sesión individual cuesta $0
        if paquete_pac and paquete_pac.forma_pago == FormaPagoPaquete.CONTADO:
            monto_total = 0.0
            pago_monto = 0.0
        else:
            # Paquete a plazos: se registra la cuota que el paciente paga en la sesión
            monto_total = float(data.get("monto_total", pago_cuota) or 0.0)
            pago_monto = pago_cuota
    else:
        # Venta regular de servicio suelto
        if "monto_total" not in data:
            if servicio_id:
                serv = Servicio.query.filter_by(id=servicio_id, clinica_id=clinica_id).first()
                monto_total = serv.precio if serv else 0.0
            else:
                return jsonify(error="monto_total es requerido para servicios sueltos"), 400
        else:
            try:
                monto_total = float(data.get("monto_total", 0.0))
            except (TypeError, ValueError):
                return jsonify(error="monto_total debe ser numérico"), 400

        try:
            pago_monto = float(data.get("pago_monto", 0.0) or 0.0)
        except (TypeError, ValueError):
            return jsonify(error="pago_monto debe ser numérico"), 400

    if monto_total < 0:
        return jsonify(error="El monto total no puede ser negativo"), 400

    if pago_monto < 0:
        return jsonify(error="El monto del pago no puede ser negativo"), 400

    if pago_monto > monto_total:
        return jsonify(error="El pago no puede exceder el monto total de la venta"), 400

    # 2. Crear la Venta
    nueva_venta = Venta(
        clinica_id=clinica_id,
        paciente_id=paciente_id,
        cita_id=cita_id,
        servicio_id=servicio_id,
        paquete_paciente_id=paquete_paciente_id,
        monto_total=round(monto_total, 2),
        fecha=datetime.utcnow()
    )
    db.session.add(nueva_venta)
    db.session.flush()

    # 3. Registrar el Pago inicial si aplica
    if pago_monto > 0:
        metodo_pago = data.get("pago_metodo", "efectivo")
        if metodo_pago not in ("efectivo", "tarjeta", "transferencia"):
            metodo_pago = "efectivo"

        nuevo_pago = Pago(
            clinica_id=clinica_id,
            venta_id=nueva_venta.id,
            monto=round(pago_monto, 2),
            metodo=metodo_pago,
            fecha=datetime.utcnow()
        )
        db.session.add(nuevo_pago)

    db.session.commit()

    return jsonify(nueva_venta.serialize()), 201
