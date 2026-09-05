# Milestones

Meta interna de equipo: **21 de agosto de 2026**. Entrega oficial 4Geeks: **28 de agosto de 2026**.

## M1 — Definición de alcanzables y arquitectura
**Fecha límite: 5 de agosto**

- Documentación base del proyecto (este `/docs`).
- Resolver los pendientes de `decisiones.md`: recurso de agenda, matriz de permisos por rol, composición de paquetes, granularidad de Google Calendar.
- Pendiente de cerrar: roles de los integrantes del equipo (quién programa qué).
- Modelo de datos inicial.

## M2 — MVP
**Fecha límite: lunes 10 de agosto**

- Login con 3 roles (Administrador, Asistente, Especialista) — incluye modelo de Usuario con email real y contraseña cifrada (Werkzeug), alta de usuario por Admin, y restablecimiento de contraseña por email (issues #25, #26, #27).
- Gestión de Pacientes + expediente básico.
- Catálogo de servicios y paquetes (alta de servicios, armado de paquetes predefinidos).
- Espacios de trabajo (configuración) — requerido por Agenda para evitar choques de recursos.
- Agenda con integración real a Google Calendar (un solo calendario compartido, especialista + espacio por cita).
- Ventas: pago completo y abonos.
- Pagos a plazos de paquetes (prioridad baja — última feature del milestone).
- Dashboard básico.

## M3 — Fase 2
**Fecha límite: lunes 17 de agosto**

- Paquetes de sesiones + comisión prorrateada por sesión aplicada.
- Consentimientos informados con firma digital (texto genérico).
- Galería de fotos "Antes y Después".
- Inventario con descuento automático por receta fija de servicio (unidades enteras).

## M4 — Nice to have
**Fecha límite: viernes 21 de agosto (meta interna)**

- Recordatorios por WhatsApp (deep link con mensaje precargado).
- Cierre de caja / conciliación con dinero físico-bancario.
- Reporte automatizado de comisiones de fin de mes.

## Después de M4 (no documentado hasta ahora, 2026-09-05)

El desarrollo continuó después de la meta interna del 21 de agosto y de la entrega oficial de 4Geeks del 28 de agosto, con alcance real que no estaba en ningún milestone de este documento:

- Pivote a multi-clínica (issue #66, PR #67, 2026-08-31).
- Google Calendar por clínica en vez de cuenta compartida global (issue #71, PR #73).
- Sistema de invitaciones para acceso de clientes/asistentes/especialistas (issue #68, PR #76).
- UI de catálogo y paquetes, navbar rediseñado a sidebar (PR #77).
- Login con Google para staff y pacientes (issue #69, PR #78, en revisión al momento de escribir esto).

Falta que el equipo confirme si esto responde a una extensión formal del proyecto, trabajo post-entrega, u otro motivo, y si vale la pena declarar un M5 con alcance propio en vez de dejarlo suelto aquí.

**Inventario (`Insumo`/`RecetaServicio`, prometido en M3) nunca se construyó** y no tiene issue de GitHub que lo haya rastreado — ver `modelo-datos.md`. A confirmar si se retoma o se da de baja del alcance.
