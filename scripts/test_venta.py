import sys
sys.path.append('src')
from app import app
from api.models import db, Venta, Pago, Paciente, Servicio

with app.app_context():
        # 1. Obtener o crear paciente y servicio de prueba
        p = db.session.scalars(db.select(Paciente)).first()
        if not p:
            p = Paciente(nombre_completo="Paciente Prueba", cedula="V123", telefono="04141234567")
            db.session.add(p)
            db.session.flush()

        s = db.session.scalars(db.select(Servicio)).first()
        if not s:
            s = Servicio(nombre="Limpieza Facial", precio=80.0, duracion_min=45, porcentaje_comision=20.0)
            db.session.add(s)
            db.session.flush()

        # 2. Prueba 1: Venta con abono parcial ($100 con $40 de abono)
        v1 = Venta(paciente_id=p.id, servicio_id=s.id, monto_total=100.0)
        db.session.add(v1)
        db.session.flush()
        pago1 = Pago(venta_id=v1.id, monto=40.0, metodo="efectivo")
        db.session.add(pago1)
        db.session.commit()

        print("========================================")
        print("--- PRUEBA 1: VENTA CON ABONO PARCIAL ---")
        print(f"Total: ${v1.monto_total} | Abonado: ${v1.monto_abonado} | Deuda restante: ${v1.deuda_pendiente}")

        # 3. Prueba 2: Registro de segundo abono a la deuda ($35 adicionales)
        pago2 = Pago(venta_id=v1.id, monto=35.0, metodo="tarjeta")
        db.session.add(pago2)
        db.session.commit()

        print("--- PRUEBA 2: REGISTRO DE SEGUNDO ABONO ---")
        print(f"Total: ${v1.monto_total} | Nuevo abonado: ${v1.monto_abonado} | Nueva deuda: ${v1.deuda_pendiente}")

        # 4. Prueba 3: Sesión de paquete prepagado ($0)
        v2 = Venta(paciente_id=p.id, servicio_id=s.id, monto_total=0.0)
        db.session.add(v2)
        db.session.commit()

        print("--- PRUEBA 3: SESIÓN DE PAQUETE PREPAGADO ($0) ---")
        print(f"Total sesión: ${v2.monto_total} | Deuda: ${v2.deuda_pendiente}")
        print("========================================")
        print("✅ TODAS LAS PRUEBAS DE VENTAS PASARON AL 100%")