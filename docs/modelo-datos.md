# Modelo de Datos (ERD inicial)

Última actualización: 2026-09-05, revisado contra `src/api/models.py` real. Este documento describe el diseño inicial (2026-08-05); las notas "Actualización 2026-09-05" en cada tabla marcan dónde el modelo construido terminó siendo distinto.

## Por qué existe este documento

Los 4 módulos (Agenda, Pacientes, Catálogo, Ventas) no son independientes a nivel de base de datos: hay tablas que se referencian entre módulos (foreign keys). Si cada quien modela su parte sin coordinar, terminamos con nombres de campo distintos para lo mismo, o con conflictos de migración (Alembic) al mezclar 4 PRs que tocan el esquema en paralelo.

## Orden de construcción recomendado

1. **`Usuario`** (login/roles) — fundacional, bloquea todo lo demás. Recomendado: la arma Jorge primero, ya que Agenda depende de `Usuario` para especialistas.
2. **`Paciente`** (Jhunalbis) y **`Servicio` / `Paquete`** (Kevin) — deben existir antes de que Agenda y Ventas puedan crear sus propias FKs hacia ellas.
3. El resto de las tablas depende de 1 y 2.

**Regla de migraciones:** antes de mergear cualquier PR que toque modelos, hacer `git pull origin main` y regenerar la migración (`flask db migrate`) para evitar múltiples heads de Alembic.

---

## Actualización 2026-09-05: pivote a multi-clínica

El 2026-08-31, por petición del profesor, se revirtió la decisión original de mono-clínica (issue #66, PR #67). Se agregó una tabla nueva `Clinica` y prácticamente todas las tablas de negocio ganaron una columna `clinica_id` (FK a `Clinica`, `nullable=False`) que no está en las tablas de abajo porque este documento no se actualizó en su momento. Donde aplica, se marca con una nota "Actualización 2026-09-05".

### `Clinica` (nueva, no estaba planeada en el diseño original)

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| nombre | texto |
| slug | texto, único |
| fecha_registro | fecha |
| activa | booleano |
| google_refresh_token | texto, nullable (conexión de Google Calendar de esta clínica, ver `stack.md`) |
| google_cuenta_email | texto, nullable |

Alta de clínicas nuevas por CLI (`flask seed-admin --clinica-nombre ... --clinica-slug ...`), no hay registro público self-serve.

## `Usuario` — fundacional

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| nombre | texto |
| email | texto, único global (no por clínica: el login es solo email + password, sin selector de clínica) |
| password_hash | texto, nullable (Actualización: nullable para cuentas creadas solo con Google Sign-In, issue #69) |
| google_id | texto, único, nullable (Actualización 2026-09-05, issue #69) |
| rol | enum: admin \| asistente \| especialista |
| activo | booleano (Actualización: no estaba en el diseño original) |
| debe_cambiar_password | booleano (Actualización: soporta forzar cambio en el primer login, issue #23) |
| reset_token / reset_token_expira | texto / fecha, nullable (Actualización: restablecimiento de contraseña por email, issue #24) |

## `Paciente` — Jhunalbis

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| nombre_completo | texto |
| telefono | texto, único **por clínica** (identificador de búsqueda — ver `decisiones.md`; dejó de ser único global con el pivote multi-clínica) |
| cedula | texto, único por clínica |
| ocupacion | texto, nullable (Actualización: se había quitado en 2026-08-08, volvió a aparecer en el modelo construido) |
| edad | número |
| tipo_piel | texto |
| alergias | texto |
| email | texto, nullable, único por clínica (Actualización 2026-09-05, issue #68: acceso al portal del paciente, nulo hasta que redime un invite) |
| password_hash | texto, nullable (Actualización 2026-09-05, issue #68) |
| google_id | texto, nullable (Actualización 2026-09-05, issue #69) |
| activo | booleano (Actualización: no estaba en el diseño original) |
| firma_consentimiento | texto (URL/base64), nullable |
| fecha_firma_consentimiento | fecha, nullable |

**Cambios 2026-08-08:** `nombre` → `nombre_completo`. Se agregan `cedula`, `tipo_piel`, `alergias`. `telefono` es el identificador de búsqueda (no `cedula`, aunque ambos sean únicos como dato de identidad).

`firma_consentimiento`/`fecha_firma_consentimiento` reemplazan al modelo `Consentimiento` que se había planeado aparte — van en `Paciente`, no en `HistorialClinico`, porque es **una firma por paciente, una sola vez** ("texto genérico único para todos los tratamientos", ver `decisiones.md`), no una firma por visita.

## `HistorialClinico` — Jhunalbis

Reemplaza a los modelos `ExpedienteClinico`, `Consentimiento`, `FotoEvolucion` y `BitacoraEvolucion` que estaban planeados por separado, se consolidan en una sola tabla, una fila por visita.

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| paciente_id | FK → Paciente |
| cita_id | FK → Cita |
| foto_antes_url | texto, nullable |
| foto_despues_url | texto, nullable |
| observaciones | texto, nullable |

**Cambios 2026-08-08 (consolidación):** esta tabla no tiene campo para los campos clínicos detallados del `ExpedienteClinico` original (`cirugias`, `enfermedades_cronicas`, `medicamentos`, `embarazo_lactancia`, `fototipo`, `sensibilidad`, `tratamientos_previos`) — quedaron fuera del alcance construido, no solo pendientes de decidir. La duda sobre dónde vive la firma del consentimiento (que dejaba abierta esta sección) ya se resolvió: vive en `Paciente`, ver arriba.

**Nota sobre almacenamiento de fotos:** `foto_antes_url`/`foto_despues_url` son campos de texto libres, no hay todavía un mecanismo de subida de archivos conectado (Cloudinary sigue sin confirmarse, ver `stack.md`).

## `Servicio` — Kevin

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| nombre | texto |
| precio | número |
| duracion_min | número |
| porcentaje_comision | número |

## `Paquete` — Kevin

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| nombre | texto, único por clínica |
| precio_total | número |

## `PaqueteServicio` (detalle: qué servicios y cuántas sesiones componen un paquete) — Kevin

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| paquete_id | FK → Paquete |
| servicio_id | FK → Servicio |
| num_sesiones | número |

## `Insumo` / `RecetaServicio` (Inventario) — no se construyeron

Estaban planeadas para el módulo de Kevin ("Catálogo + Inventario") y para el milestone M3 (descuento automático de insumos), pero no existen en `src/api/models.py` ni hay un issue de GitHub que las haya rastreado en algún momento (los issues #12-16 de Kevin fueron solo Servicio y Paquete). El alcance de Inventario parece haberse dejado fuera durante la construcción, no es que siga pendiente activamente. A confirmar con el equipo si se retoma o se da de baja formalmente en `decisiones.md`.

## `EspacioTrabajo` — Jorge

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| nombre | texto |
| tipo | texto (sala/cama/estación) |

## `Cita` — Jorge

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| paciente_id | FK → Paciente, nullable |
| especialista_id | FK → Usuario |
| espacio_id | FK → EspacioTrabajo |
| servicio_id | FK → Servicio, nullable (si es sesión suelta) |
| paquete_paciente_sesion_id | entero, nullable (aún no es FK real: la tabla `PaquetePacienteSesion` de abajo tampoco se ha construido) |
| fecha_hora | fecha/hora |
| estado | enum: agendada \| reprogramada \| completada \| cancelada |
| google_event_id | texto, nullable |

## `PaquetePaciente` (instancia de un paquete comprado por una paciente) — Kevin/Francisco

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| paciente_id | entero (Actualización: en el modelo construido no es FK real a Paciente, es un entero suelto; a confirmar si es intencional) |
| paquete_id | FK → Paquete, nullable |
| fecha_compra | fecha |
| forma_pago | enum: contado \| plazos |
| estado | enum: activo \| agotado |

## `PaquetePacienteSesion` — no se construyó

Seguía planeada (cada sesión individual dentro de un paquete comprado), pero no existe todavía en `src/api/models.py`. `Cita.paquete_paciente_sesion_id` ya tiene el campo reservado como entero suelto para cuando esta tabla se construya (ver comentario en el propio código).

## `Venta` — Francisco

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| paciente_id | entero (mismo caso que en `PaquetePaciente`: no es FK real en el modelo construido) |
| cita_id | FK → Cita, nullable |
| servicio_id | FK → Servicio, nullable |
| paquete_paciente_id | FK → PaquetePaciente, nullable |
| monto_total | número |
| fecha | fecha |

`monto_abonado` y `deuda_pendiente` no son columnas, son propiedades calculadas a partir de los `Pago` asociados (Actualización: no estaba especificado en el diseño original).

## `Pago` (abonos, uno o varios por venta) — Francisco

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| venta_id | FK → Venta |
| monto | número |
| metodo | texto (efectivo \| tarjeta \| transferencia) |
| fecha | fecha |

## `Comision` — Francisco

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| especialista_id | FK → Usuario |
| venta_id | FK → Venta |
| monto | número |
| mes | fecha (año-mes) |
| pagada | booleano |

## `GastoFijo` — Francisco

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica (Actualización 2026-09-05) |
| concepto | texto |
| monto | número |
| fecha | fecha |

## `Invite` (nueva, no estaba planeada en el diseño original) — issue #68

Link de un solo uso para que Clientes, Asistentes o Especialistas obtengan acceso de login, sin auto-registro público.

| Campo | Tipo / Referencia |
|---|---|
| id | PK |
| clinica_id | FK → Clinica |
| tipo | enum: cliente \| asistente \| especialista |
| paciente_id | FK → Paciente, nullable (requerido si tipo=cliente) |
| email | texto, nullable (requerido si tipo=asistente/especialista) |
| token | texto, único |
| usado | booleano |
| expira | fecha |
| creado_por_usuario_id | FK → Usuario |
| fecha_creacion | fecha |
