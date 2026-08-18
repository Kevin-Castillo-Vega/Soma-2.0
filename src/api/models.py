import enum
from datetime import datetime

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


class RolUsuario(str, enum.Enum):
    ADMIN = "admin"
    ASISTENTE = "asistente"
    ESPECIALISTA = "especialista"


class Usuario(db.Model):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[RolUsuario] = mapped_column(Enum(RolUsuario), nullable=False)
    activo: Mapped[bool] = mapped_column(
        Boolean(), default=True, nullable=False)
    debe_cambiar_password: Mapped[bool] = mapped_column(
        Boolean(), default=False, nullable=False)

    reset_token: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reset_token_expira: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def serialize(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "rol": self.rol.value,
            "debe_cambiar_password": self.debe_cambiar_password,
        }


class EspacioTrabajo(db.Model):
    __tablename__ = "espacio_trabajo"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    tipo: Mapped[str] = mapped_column(
        String(50), nullable=False)  # sala / cama / estación

    def serialize(self):
        return {"id": self.id, "nombre": self.nombre, "tipo": self.tipo}


class EstadoCita(str, enum.Enum):
    AGENDADA = "agendada"
    REPROGRAMADA = "reprogramada"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"


class Cita(db.Model):
    __tablename__ = "cita"

    id: Mapped[int] = mapped_column(primary_key=True)

    paciente_id: Mapped[int | None] = mapped_column(
        ForeignKey("paciente.id"), nullable=True)
    paciente: Mapped["Paciente"] = relationship(back_populates="citas")

    servicio_id: Mapped[int | None] = mapped_column(
        ForeignKey("servicio.id"), nullable=True)
    servicio: Mapped["Servicio"] = relationship(foreign_keys=[servicio_id])

    # PaquetePacienteSesion aun no existe en el repo -- se agrega la FK real
    # cuando esa tabla aterrice (ver docs/modelo-datos.md).
    paquete_paciente_sesion_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True)

    especialista_id: Mapped[int] = mapped_column(
        ForeignKey("usuario.id"), nullable=False)
    espacio_id: Mapped[int] = mapped_column(
        ForeignKey("espacio_trabajo.id"), nullable=False)

    fecha_hora: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    estado: Mapped[EstadoCita] = mapped_column(
        Enum(EstadoCita), nullable=False, default=EstadoCita.AGENDADA
    )
    google_event_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True)

    especialista: Mapped["Usuario"] = relationship(
        foreign_keys=[especialista_id])
    espacio: Mapped["EspacioTrabajo"] = relationship(foreign_keys=[espacio_id])

    def serialize(self):
        return {
            "id": self.id,
            "paciente_id": self.paciente_id,
            "servicio_id": self.servicio_id,
            "paquete_paciente_sesion_id": self.paquete_paciente_sesion_id,
            "especialista_id": self.especialista_id,
            "espacio_id": self.espacio_id,
            "fecha_hora": self.fecha_hora.isoformat(),
            "estado": self.estado.value,
            "google_event_id": self.google_event_id,
        }


class Paciente(db.Model):
    __tablename__ = "paciente"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre_completo: Mapped[str] = mapped_column(String(120), nullable=False)
    cedula: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False)
    telefono: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False)
    ocupacion: Mapped[str | None] = mapped_column(
        String(120), nullable=True)
    edad: Mapped[int | None] = mapped_column(Integer, nullable=True)
    firma_consentimiento: Mapped[str | None] = mapped_column(
        String(300), nullable=True)
    fecha_firma_consentimiento: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True)

    alergias: Mapped[str | None] = mapped_column(
        String(250), nullable=True)
    tipo_piel: Mapped[str | None] = mapped_column(
        String(50), nullable=True)

    citas: Mapped[list["Cita"]] = relationship(back_populates="paciente")
    historiales: Mapped[list["HistorialClinico"]] = relationship(
        back_populates="paciente")

    def serialize(self):
        return {
            "id": self.id,
            "nombre_completo": self.nombre_completo,
            "cedula": self.cedula,
            "telefono": self.telefono,
            "ocupacion": self.ocupacion,
            "edad": self.edad,
            "alergias": self.alergias,
            "tipo_piel": self.tipo_piel,
            "firma_consentimiento": self.firma_consentimiento,
            "fecha_firma_consentimiento": (
                self.fecha_firma_consentimiento.isoformat()
                if self.fecha_firma_consentimiento
                else None
            ),
        }


class HistorialClinico(db.Model):
    __tablename__ = "historial_clinico"

    id: Mapped[int] = mapped_column(primary_key=True)
    paciente_id: Mapped[int] = mapped_column(
        ForeignKey("paciente.id"), nullable=False)
    cita_id: Mapped[int] = mapped_column(
        ForeignKey("cita.id"), nullable=False)

    observaciones: Mapped[str | None] = mapped_column(
        String(500), nullable=True)
    foto_antes_url: Mapped[str | None] = mapped_column(
        String(300), nullable=True)
    foto_despues_url: Mapped[str | None] = mapped_column(
        String(300), nullable=True)

    paciente: Mapped["Paciente"] = relationship(
        back_populates="historiales")

    def serialize(self):
        return {
            "id": self.id,
            "paciente_id": self.paciente_id,
            "cita_id": self.cita_id,
            "observaciones": self.observaciones,
            "foto_antes_url": self.foto_antes_url,
            "foto_despues_url": self.foto_despues_url,
        }

# ============================================================
# Servicio - Kevin
# ============================================================


class Servicio(db.Model):
    __tablename__ = "servicio"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    precio: Mapped[float] = mapped_column(Float, nullable=False)
    duracion_min: Mapped[int] = mapped_column(Integer, nullable=False)
    porcentaje_comision: Mapped[float] = mapped_column(
        Float, nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "precio": self.precio,
            "duracion_min": self.duracion_min,
            "porcentaje_comision": self.porcentaje_comision,
        }


# Tabla/entidad paquete paciente instancia de paquete comprado por un paciente

class FormaPagoPaquete(str, enum.Enum):
    CONTADO = "contado"
    PLAZOS = "plazos"


class EstadoPaquete(str, enum.Enum):
    ACTIVO = "activo"
    AGOTADO = "agotado"


class PaquetePaciente(db.Model):
    __tablename__ = "paquete_paciente"

    id: Mapped[int] = mapped_column(primary_key=True)
    paciente_id: Mapped[int] = mapped_column(Integer, nullable=False)
    paquete_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True)
    fecha_compra: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False)
    forma_pago: Mapped[FormaPagoPaquete] = mapped_column(
        Enum(FormaPagoPaquete),
        default=FormaPagoPaquete.CONTADO,
        nullable=False
    )  # de contado o a plazos
    estado: Mapped[EstadoPaquete] = mapped_column(
        Enum(EstadoPaquete),
        default=EstadoPaquete.ACTIVO,
        nullable=False
    )

    def serialize(self):
        return {
            "id": self.id,
            "paciente_id": self.paciente_id,
            "paquete_id": self.paquete_id,
            "fecha_compra": (
                self.fecha_compra.strftime("%Y-%m-%d")
                if self.fecha_compra
                else None
            ),
            "forma_pago": (
                self.forma_pago.value
                if isinstance(self.forma_pago, enum.Enum)
                else self.forma_pago
            ),
            "estado": (
                self.estado.value
                if isinstance(self.estado, enum.Enum)
                else self.estado
            ),
        }


# Tabla/entidad venta
# Transacción realizada a un paciente con cálculo automático
# de abonos y deuda

class Venta(db.Model):
    __tablename__ = "venta"

    id: Mapped[int] = mapped_column(primary_key=True)
    paciente_id: Mapped[int] = mapped_column(Integer, nullable=False)
    cita_id: Mapped[int | None] = mapped_column(
        ForeignKey("cita.id"), nullable=True)
    servicio_id: Mapped[int | None] = mapped_column(
        ForeignKey("servicio.id"), nullable=True)
    paquete_paciente_id: Mapped[int | None] = mapped_column(
        ForeignKey("paquete_paciente.id"), nullable=True)
    monto_total: Mapped[float] = mapped_column(Float, nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False)

    pagos: Mapped[list["Pago"]] = relationship(
        back_populates="venta",
        cascade="all, delete-orphan"
    )

    # utilizo el property para que cada vez que se abone a una deuda
    # no debamos actualizarlo manualmente, python calcula al instante
    # el monto total

    @property
    def monto_abonado(self) -> float:
        # suma de todos los abonos o pagos realizados por la venta
        return sum(pago.monto for pago in self.pagos) if self.pagos else 0.0

    @property
    def deuda_pendiente(self) -> float:
        deuda = self.monto_total - self.monto_abonado
        return max(0.0, round(deuda, 2))

    def serialize(self):
        return {
            "id": self.id,
            "paciente_id": self.paciente_id,
            "cita_id": self.cita_id,
            "servicio_id": self.servicio_id,
            "paquete_paciente_id": self.paquete_paciente_id,
            "monto_total": self.monto_total,
            "monto_abonado": self.monto_abonado,
            "deuda_pendiente": self.deuda_pendiente,
            "fecha": self.fecha.isoformat(),
            "pagos": [pago.serialize() for pago in self.pagos],
        }


# Tabla/entidad pago
# Guarda cada transacción o abono individual de una venta

class Pago(db.Model):
    __tablename__ = "pago"

    id: Mapped[int] = mapped_column(primary_key=True)
    venta_id: Mapped[int] = mapped_column(
        ForeignKey("venta.id"), nullable=False)
    monto: Mapped[float] = mapped_column(Float, nullable=False)
    metodo: Mapped[str] = mapped_column(
        String(50),
        default="efectivo",
        nullable=False
    )  # efectivo, tarjeta o transferencia
    fecha: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False)

    venta: Mapped["Venta"] = relationship(back_populates="pagos")

    def serialize(self):
        return {
            "id": self.id,
            "venta_id": self.venta_id,
            "monto": self.monto,
            "metodo": self.metodo,
            "fecha": self.fecha.isoformat(),
        }


# Tabla/entidad comision
# Registra la comision del especialista por la venta

class Comision(db.Model):
    __tablename__ = "comision"

    id: Mapped[int] = mapped_column(primary_key=True)
    especialista_id: Mapped[int] = mapped_column(
        ForeignKey("usuario.id"), nullable=False)
    venta_id: Mapped[int] = mapped_column(
        ForeignKey("venta.id"), nullable=False)
    monto: Mapped[float] = mapped_column(Float, nullable=False)
    mes: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False)
    pagada: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False)

    especialista: Mapped["Usuario"] = relationship(
        foreign_keys=[especialista_id])
    venta: Mapped["Venta"] = relationship(
        foreign_keys=[venta_id])

    def serialize(self):
        return {
            "id": self.id,
            "especialista_id": self.especialista_id,
            "venta_id": self.venta_id,
            "monto": self.monto,
            "mes": self.mes,
            "pagada": self.pagada,
        }


# Tabla/entidad gasto fijo
# Registro de los costos operativos de SOMA

class GastoFijo(db.Model):
    __tablename__ = "gasto_fijo"

    id: Mapped[int] = mapped_column(primary_key=True)
    concepto: Mapped[str] = mapped_column(String(200), nullable=False)
    monto: Mapped[float] = mapped_column(Float, nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "concepto": self.concepto,
            "monto": self.monto,
            "fecha": self.fecha.isoformat(),
        }
