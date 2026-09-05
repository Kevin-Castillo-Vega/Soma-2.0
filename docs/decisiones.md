# Bitácora de Decisiones

Registro de decisiones tomadas sobre el documento original de journey del usuario, y de lo que sigue abierto. Este archivo manda sobre `journey-usuario.md` en caso de conflicto.

Última actualización: 2026-08-08 (sesión de equipo).

## Resuelto

| Tema | Decisión |
|---|---|
| Roles del sistema | 3 roles con permisos y vistas distintas: **Administrador** (Dueña), **Asistente**, **Especialista** — son personas distintas |
| Identificador de búsqueda de pacientes | **Teléfono** (no nombre — evita ambigüedad por duplicados/typos) |
| Modelo de "Paquete" | Conjunto de sesiones vinculado a un paciente. Puede combinar sesiones de **servicios distintos entre sí** (no necesariamente del mismo tipo repetido) |
| Composición de paquetes | **Predefinidos en el Catálogo** (no se arman libremente al momento de la venta) |
| Quién crea Paquetes | Admin o Asistente, desde Catálogo de Servicios y Paquetes |
| Quién crea Servicios nuevos | Admin o Asistente puede **crear**. Editar/eliminar un servicio existente queda reservado a Admin |
| Comisión sobre paquetes | Se **prorratea por sesión aplicada**, no se paga completa al vender el paquete |
| Pagos a plazos de paquetes | Entra al MVP, pero como feature de **baja prioridad** — de las últimas en construirse dentro de ese milestone |
| Consentimiento informado | **Firma digital** (canvas en tablet), texto **genérico único** para todos los tratamientos |
| Cancelaciones / reprogramaciones | **Sin penalización** — solo se reprograma, no se cobra nada |
| Descuento de insumos | **Automático**, vía receta fija de insumos por servicio. Se miden en **unidades enteras** (no ml), cantidad siempre fija (sin ajuste manual) |
| Recurso de agenda | La clínica tiene **varias especialistas y varios espacios de trabajo**. Una cita requiere especialista + espacio disponibles simultáneamente. Se agrega **Espacio de Trabajo** como vista/entidad de configuración nueva |
| Integración de calendario | **Google Calendar real** (OAuth2 + API), confirmado. **Un solo calendario compartido de la clínica** (no uno por especialista) — eventos etiquetados con especialista y espacio. Se hace real desde el MVP (Milestone 2), no se construye un calendario interno temporal |
| Estructura de repositorio | Monorepo: frontend y backend en el mismo repo |
| Roles de los integrantes del equipo | Asignación por módulo (ownership vertical) — ver [`equipo.md`](equipo.md) |
| Registro de usuarios | No hay auto-registro público. El Admin da de alta a Asistentes/Especialistas capturando su **email real** — esto habilita el flujo de restablecimiento de contraseña (ver issue #26) |
| Restablecimiento de contraseña | Flujo por **email**: el usuario solicita el reset con su email, el sistema genera un token temporal y envía un link; el usuario define nueva contraseña desde ahí (ver issue #27) |
| Cifrado de contraseña | **`werkzeug.security`** (`generate_password_hash` / `check_password_hash`) — ya viene con Flask, no requiere dependencia extra (ver issue #25) |
| Alcance: mono-clínica vs. multi-tenant | **Multi-clínica (revierte la decisión anterior, 2026-08-31, petición del profesor).** Modelo `Clinica` + `clinica_id` en todas las tablas de negocio, con unique compuestos por clínica (`Usuario.email`, `Paciente.telefono`/`cedula`, `Paquete.nombre`). No hay subdominios: el login pide un slug de clínica (`clinica`) junto con email/password, y ese `clinica_id` viaja en el JWT — de ahí lo toma cada endpoint para filtrar. Alta de clínicas nuevas por CLI (`flask seed-admin --clinica-nombre ... --clinica-slug ...`), no hay registro público self-serve todavía. Ver #66 |
| Proveedor de envío de email | **SMTP de Gmail (app password)** — ver `stack.md` (issue #24) |
| Historial clínico del paciente | **Se consolida en un solo modelo `HistorialClinico`** (una fila por visita: fotos antes/después + observaciones), reemplazando 3 de los 4 modelos separados que estaban planeados (`ExpedienteClinico`, `FotoEvolucion`, `BitacoraEvolucion`). Ver `modelo-datos.md` |
| Dónde vive la firma del consentimiento | **En `Paciente`** (`firma_consentimiento`/`fecha_firma_consentimiento`), no en `HistorialClinico` ni como modelo aparte — es una firma **por paciente, una sola vez** (texto genérico único para todos los tratamientos), no una por visita |

## Matriz de permisos por rol (confirmada)

| Módulo | Admin | Asistente | Especialista |
|---|---|---|---|
| Dashboard completo (ingresos, todas las comisiones) | ✅ | ❌ | ❌ |
| Dashboard propio (sus sesiones/comisiones del día) | — | — | ✅ solo lo suyo |
| Agenda (crear/editar citas) | ✅ | ✅ | Ver la suya, puede reagendar |
| Pacientes: alta y datos básicos | ✅ | ✅ | Solo consulta |
| Expediente clínico (anamnesis, bitácora, fotos) | Ver | Ver / captura datos iniciales | Crear/editar — es quien atiende |
| Consentimientos | ✅ generar/verificar | ✅ generar | ✅ verificar firma |
| Ventas y cobros | ✅ | ✅ | ❌ sin acceso |
| Inventario (ver stock) | ✅ editar | ✅ editar | Descuento automático, sin gestión |
| Catálogo → Servicios: crear nuevo | ✅ | ✅ | ❌ |
| Catálogo → Servicios: editar/eliminar existente | ✅ | ❌ | ❌ |
| Catálogo → Paquetes (CRUD completo) | ✅ | ✅ | ❌ |
| Espacios de trabajo (CRUD) | ✅ | ❌ | ❌ |
| Crear usuarios (Asistente/Especialista) | ✅ | ❌ | ❌ |
| Reporte de comisiones de todas las especialistas | ✅ | ❌ | ❌ (solo ve las propias) |
| Cierre de caja | ✅ cierra | Puede registrar el conteo | ❌ |

## Pendiente

Ninguno de los pendientes es bloqueante — planeación cerrada. Cualquier ambigüedad nueva que surja durante el desarrollo se agrega a este archivo conforme aparezca.
