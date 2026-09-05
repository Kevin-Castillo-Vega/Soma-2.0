from datetime import datetime, date, timedelta
from flask import Blueprint, jsonify, request
from flask_cors import CORS
from sqlalchemy import func
from api.decorators import clinica_id_actual, rol_requerido
from api.models import db, Pago, Venta, Cita, EstadoCita, Servicio


dashboard = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")
CORS(dashboard)

# Calcular ingresos del dia
def _obtener_ingresos_periodo(clinica_id, inicio_hoy, fin_hoy):
    stmt = db.select(Pago).where(
        Pago.clinica_id == clinica_id, Pago.fecha >= inicio_hoy, Pago.fecha <= fin_hoy
    )
    pagos_hoy = db.session.scalars(stmt).all()
    return {
        "monto_total": round(sum(p.monto for p in pagos_hoy), 2),
        "transacciones_count": len(pagos_hoy)
    }

  # Calcular servicios mas vendidos por filtro de fecha

def _obtener_servicios_top(clinica_id, inicio_fecha, fin_fecha, limite=5):
    stmt = (
        db.select(
            Venta.servicio_id,
            Servicio.nombre.label("servicio_nombre"),
            func.count(Venta.id).label("conteo"),
            func.sum(Venta.monto_total).label("total_monto")
        )
        .outerjoin(Servicio, Venta.servicio_id == Servicio.id)
        .where(
            Venta.clinica_id == clinica_id,
            Venta.fecha >= inicio_fecha,
            Venta.fecha <= fin_fecha,
            Venta.servicio_id.isnot(None),
        )
        .group_by(Venta.servicio_id, Servicio.nombre)
        .order_by(func.count(Venta.id).desc())
        .limit(limite)
    )
    resultados = db.session.execute(stmt).all()
    return [
        {
            "servicio_id": s_id,
            "nombre": s_nombre or f"Servicio #{s_id}",
            "ventas_count": conteo,
            "monto_total": round(total or 0.0, 2)
        }
        for s_id, s_nombre, conteo, total in resultados
    ]

# Citas pendientes por dia y semana

def _obtener_citas_pendientes(clinica_id, inicio_fecha, fin_fecha):
    stmt = (
        db.select(Cita)
        .where(
            Cita.clinica_id == clinica_id,
            Cita.fecha_hora >= inicio_fecha,
            Cita.fecha_hora <= fin_fecha,
            Cita.estado == EstadoCita.AGENDADA
        )
        .order_by(Cita.fecha_hora.asc())
    )
    citas = db.session.scalars(stmt).all()

    citas_lista = []
    for c in citas:
        c_dict = c.serialize()
        c_dict["especialista_nombre"] = c.especialista.nombre if c.especialista else f"Especialista #{c.especialista_id}"
        c_dict["espacio_nombre"] = c.espacio.nombre if c.espacio else f"Espacio #{c.espacio_id}"
        c_dict["paciente_nombre"] = c.paciente.nombre_completo if c.paciente else ("Paciente no asignado" if not
                                                                                   c.paciente_id else f"Paciente #{c.paciente_id}")
        citas_lista.append(c_dict)

    return {
        "total": len(citas),
        "lista": citas_lista
    }


@dashboard.route("/resumen", methods=["GET"])
@rol_requerido("admin")
def obtener_resumen_admin():
    clinica_id = clinica_id_actual()
    today = date.today()

    desde_str = request.args.get("desde")
    hasta_str = request.args.get("hasta")
    rango = request.args.get("rango")

    try:
        PRESETS = {
            "hoy": today,
            "semana": today - timedelta(days=today.weekday()),
            "mes": date(today.year, today.month, 1),
        }
        d_desde = date.fromisoformat(desde_str) if desde_str else PRESETS.get(rango, today)
        d_hasta = date.fromisoformat(hasta_str) if hasta_str else today
    except ValueError:
        return jsonify(error="Formato de fecha inválido. Usar YYYY-MM-DD"), 400

       # fechas del filtro
    inicio_fecha = datetime.combine(d_desde, datetime.min.time())
    fin_fecha = datetime.combine(d_hasta, datetime.max.time())

    # fechas del dia y la semana

    inicio_hoy = datetime.combine(today, datetime.min.time())
    fin_hoy = datetime.combine(today, datetime.max.time())
    inicio_semana = datetime.combine(today - timedelta(days=today.weekday()), datetime.min.time())
    fin_semana = datetime.combine(today - timedelta(days=today.weekday()) + timedelta(days=6), datetime.max.time())

    return jsonify({
        "rango_filtrado": {
            "desde": d_desde.isoformat(),
            "hasta": d_hasta.isoformat()
        },
        "ingresos": _obtener_ingresos_periodo(clinica_id, inicio_fecha, fin_fecha),
        "servicios_top": _obtener_servicios_top(clinica_id, inicio_fecha, fin_fecha),
        "citas_pendientes_hoy": _obtener_citas_pendientes(clinica_id, inicio_hoy, fin_hoy),
        "citas_pendientes_semana": _obtener_citas_pendientes(clinica_id, inicio_semana, fin_semana)


    }), 200
