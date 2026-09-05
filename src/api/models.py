from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Float, UniqueConstraint
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import enum


db = SQLAlchemy()


class Clinica(db.Model):
    __tablename__ = "clinica"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False)
    activa: Mapped[bool] = mapped_column(
        Boolean(), default=True, nullable=False)

    # Google Calendar (#71) -- refresh_token de la cuenta que el Admin conecto
    # desde su perfil. Reemplaza el GOOGLE_REFRESH_TOKEN global de una sola
    # cuenta compartida (ver api/google_calendar.py).
    google_refresh_token: Mapped[str | None] = mapped_column(
        String(500), nullable=True)
    google_cuenta_email: Mapped[str | None] = mapped_column(
        String(150), nullable=True)

    def serialize(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "slug": self.slug,
            "activa": self.activa,
            "google_calendar_conectado": self.google_refresh_token is not None,
            "google_calendar_cuenta": self.google_cuenta_email,
        }


class RolUsuario(str, enum.Enum):
    ADMIN = "admin"
    ASISTENTE = "asistente"
    ESPECIALISTA = "especialista"


class Usuario(db.Model):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(primary_key=True)
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    # Global, no por clinica -- el login es solo email+password (sin selector de
    # clinica), asi que el email tiene que resolver un Usuario sin ambiguedad.
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    google_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True)
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
        if not self.password_hash:
            return False
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
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
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
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)

    paciente_id: Mapped[int | None] = mapped_column(
        ForeignKey("paciente.id"), nullable=True)
    paciente: Mapped["Paciente"] = relationship(back_populates="citas")

    servicio_id: Mapped[int | None] = mapped_column(
        ForeignKey("servicio.id"), nullable=True)
    servicio: Mapped["Servicio"] = relationship(foreign_keys=[servicio_id])

    paquete_paciente_sesion_id: Mapped[int | None] = mapped_column(
        ForeignKey("paquete_paciente_sesion.id"), nullable=True)

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
    __table_args__ = (
        UniqueConstraint(
            "clinica_id",
            "telefono",
            name="uq_paciente_clinica_telefono"),
        UniqueConstraint(
            "clinica_id",
            "cedula",
            name="uq_paciente_clinica_cedula"),
        UniqueConstraint(
            "clinica_id",
            "email",
            name="uq_paciente_clinica_email"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
    nombre_completo: Mapped[str] = mapped_column(String(120), nullable=False)
    cedula: Mapped[str] = mapped_column(String(50), nullable=False)
    telefono: Mapped[str] = mapped_column(String(20), nullable=False)
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

    # Acceso al portal (#68) -- nulos hasta que el paciente redima un invite.
    # email es unico por clinica (no global, a diferencia de Usuario.email)
    # porque un paciente nunca elige su clinica en el login: entra por un link
    # de invite que ya sabe a que Paciente/clinica pertenece.
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(
        String(255), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    activo: Mapped[bool] = mapped_column(
        Boolean(), default=True, nullable=False, server_default="1")

    citas: Mapped[list["Cita"]] = relationship(back_populates="paciente")
    historiales: Mapped[list["HistorialClinico"]] = relationship(
        back_populates="paciente")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def serialize(self):
        return {
            "id": self.id,
            "nombre_completo": self.nombre_completo,
            "cedula": self.cedula,
            "telefono": self.telefono,
            "email": self.email,
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
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
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
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
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


# ============================================================
# Paquete
# ============================================================

class Paquete(db.Model):
    __tablename__ = "paquete"
    __table_args__ = (
        UniqueConstraint(
            "clinica_id",
            "nombre",
            name="uq_paquete_clinica_nombre"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    precio_total: Mapped[float] = mapped_column(Float, nullable=False)

    servicios: Mapped[list["PaqueteServicio"]] = relationship(
        back_populates="paquete",
        cascade="all, delete-orphan"
    )

    def serialize(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "precio_total": self.precio_total,
        }


# ============================================================
# PaqueteServicio
# Detalle de servicios incluidos en un paquete
# ============================================================

class PaqueteServicio(db.Model):
    __tablename__ = "paquete_servicio"

    id: Mapped[int] = mapped_column(primary_key=True)
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)

    paquete_id: Mapped[int] = mapped_column(
        ForeignKey("paquete.id"), nullable=False)

    servicio_id: Mapped[int] = mapped_column(
        ForeignKey("servicio.id"), nullable=False)

    num_sesiones: Mapped[int] = mapped_column(
        Integer, nullable=False)

    paquete: Mapped["Paquete"] = relationship(
        back_populates="servicios"
    )

    servicio: Mapped["Servicio"] = relationship()

    def serialize(self):
        return {
            "id": self.id,
            "paquete_id": self.paquete_id,
            "servicio_id": self.servicio_id,
            "servicio_nombre": self.servicio.nombre if self.servicio else None,
            "num_sesiones": self.num_sesiones,
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
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
    paciente_id: Mapped[int] = mapped_column(Integer, nullable=False)
    paquete_id: Mapped[int | None] = mapped_column(
        ForeignKey("paquete.id"), nullable=True)
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

    paquete: Mapped["Paquete | None"] = relationship()

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


# ============================================================
# PaquetePacienteSesion
# Sesión individual dentro de un paquete comprado
# ============================================================

class EstadoPaquetePacienteSesion(str, enum.Enum):
    PENDIENTE = "pendiente"
    APLICADA = "aplicada"


class PaquetePacienteSesion(db.Model):
    __tablename__ = "paquete_paciente_sesion"

    id: Mapped[int] = mapped_column(primary_key=True)

    paquete_paciente_id: Mapped[int] = mapped_column(
        ForeignKey("paquete_paciente.id"), nullable=False
    )

    servicio_id: Mapped[int] = mapped_column(
        ForeignKey("servicio.id"), nullable=False
    )

    estado: Mapped[EstadoPaquetePacienteSesion] = mapped_column(
        Enum(EstadoPaquetePacienteSesion),
        default=EstadoPaquetePacienteSesion.PENDIENTE,
        nullable=False
    )

    cita_id: Mapped[int | None] = mapped_column(
        ForeignKey("cita.id"), nullable=True
    )

    servicio: Mapped["Servicio"] = relationship()

    cita: Mapped["Cita | None"] = relationship(
        foreign_keys=[cita_id]
    )

    def serialize(self):
        return {
            "id": self.id,
            "paquete_paciente_id": self.paquete_paciente_id,
            "servicio_id": self.servicio_id,
            "estado": (
                self.estado.value
                if isinstance(self.estado, enum.Enum)
                else self.estado
            ),
            "cita_id": self.cita_id,
        }


# Tabla/entidad venta
# Transacción realizada a un paciente con cálculo automático
# de abonos y deuda

class Venta(db.Model):
    __tablename__ = "venta"

    id: Mapped[int] = mapped_column(primary_key=True)
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
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

    @property
    def monto_abonado(self) -> float:
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
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
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
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
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
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
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


# Tabla/entidad invite (#68) -- link de un solo uso para que Clientes,
# Asistentes o Especialistas obtengan acceso de login. "usado"/"expira" se
# checan en el momento (no hay un estado "expirado" guardado aparte, para no
# depender de un job que lo actualice).

class TipoInvite(str, enum.Enum):
    CLIENTE = "cliente"
    ASISTENTE = "asistente"
    ESPECIALISTA = "especialista"


class Invite(db.Model):
    __tablename__ = "invite"

    id: Mapped[int] = mapped_column(primary_key=True)
    clinica_id: Mapped[int] = mapped_column(
        ForeignKey("clinica.id"), nullable=False)
    tipo: Mapped[TipoInvite] = mapped_column(Enum(TipoInvite), nullable=False)

    # paciente_id requerido si tipo=cliente (el invite siempre es para un
    # paciente que el staff ya registro clinicamente, nunca crea uno nuevo).
    # email requerido si tipo=asistente/especialista (todavia no existe el
    # Usuario, se crea al redimir).
    paciente_id: Mapped[int | None] = mapped_column(
        ForeignKey("paciente.id"), nullable=True)
    email: Mapped[str | None] = mapped_column(String(120), nullable=True)

    token: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False)
    usado: Mapped[bool] = mapped_column(
        Boolean(), default=False, nullable=False)
    expira: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    creado_por_usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuario.id"), nullable=False)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False)

    paciente: Mapped["Paciente"] = relationship()

    @property
    def expirado(self) -> bool:
        return datetime.utcnow() > self.expira

    def serialize(self):
        return {
            "id": self.id,
            "tipo": self.tipo.value,
            "usado": self.usado,
            "expirado": self.expirado,
            "expira": self.expira.isoformat(),
            "paciente_nombre": self.paciente.nombre_completo if self.paciente else None,
        }
