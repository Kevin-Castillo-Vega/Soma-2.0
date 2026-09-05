# Stack Técnico

## Confirmado

| Capa | Tecnología |
|---|---|
| Frontend | React (Vite) |
| Backend | Flask |
| ORM | SQLAlchemy |
| Base de datos | PostgreSQL |
| Autenticación | JWT |
| Cifrado de contraseña | `werkzeug.security` (`generate_password_hash` / `check_password_hash`) — ya viene con Flask, sin dependencia extra |
| Estructura de repo | Monorepo — plantilla 4Geeks (`src/api` + `src/front`) en el repo `Soma-2.0`, requisito de evaluación del bootcamp |
| Calendario | Google Calendar real (OAuth2 + Google Calendar API). Actualización 2026-09-05: la decisión original era una sola cuenta compartida vía `GOOGLE_REFRESH_TOKEN` global; con el pivote a multi-clínica (issue #71, PR #73) esto cambió a **un calendario por clínica**, cada Admin conecta la cuenta de su propia clínica desde `/app/perfil`, y el `refresh_token` se guarda en `Clinica.google_refresh_token` (DB), no en variable de entorno. Eventos etiquetados con especialista y espacio de trabajo asignados |
| Recursos de agenda | Cada cita requiere **especialista + espacio de trabajo** disponibles simultáneamente (varias especialistas, varios espacios). Vista de calendario construida con `react-big-calendar` (ver sección "Pendiente de definir" abajo, ya resuelto) |
| Autenticación con Google | Google Identity Services (Sign-In) para staff y pacientes, además de email/password. **En progreso, PR #78 (issue #69), aún no mergeada a `main`** — no dar por hecho que ya está en producción |
| Multi-clínica | Modelo `Clinica` + `clinica_id` con scoping por tenant en cada endpoint (issue #66, PR #67). Revierte la decisión original de mono-clínica del 2026-08-08, por petición del profesor (2026-08-31) |
| Sistema de invitaciones | Links de un solo uso para que Clientes/Asistentes/Especialistas obtengan su primer acceso, sin auto-registro público (issue #68, PR #76) |
| Firma de consentimientos | Firma digital (canvas), texto genérico único para todos los tratamientos |
| Inventario | Descuento automático por receta fija de insumos por servicio. Unidades enteras (no ml/volumen) |
| Envío de email | **SMTP de Gmail (app password)** — simple para desarrollo, sin alta en servicio nuevo. Suficiente para el MVP del bootcamp; se puede migrar a un servicio transaccional (Resend/SendGrid) si esto llega a producción real |

## Spike OAuth2 Google Calendar (issue #1) — resultado

Probado con `scripts/spike_google_calendar.py` (`google-auth`, `google-auth-oauthlib`, `google-api-python-client`, flujo `InstalledAppFlow`). Resultado: **funciona** — se autorizó, se creó un evento vía API y se listaron eventos existentes sin problema.

Limitaciones encontradas mientras el proyecto de Google Cloud esté en modo **Testing** (Google Auth Platform → Público → Estado de publicación):
- Solo pueden usarlo las cuentas agregadas explícitamente como **usuario de prueba** (máximo 100).
- El `refresh_token` emitido en modo Testing **expira a los 7 días** — hay que re-autorizar si el token queda viejo. No pasar a modo Production sin necesidad: requiere verificación de Google (puede tardar días/semanas) por el scope de Calendar (sensible).
- Scope usado: `https://www.googleapis.com/auth/calendar` (acceso completo de lectura/escritura).

**Pendiente para el issue #5 (integración real):** el spike se autorizó contra una cuenta de Google personal de prueba. Para producción hay que repetir la autorización con la **cuenta de Google real de la clínica** (la única compartida, ver fila "Calendario" arriba) — no reusar la cuenta personal usada en el spike.

## Roles del sistema

Administrador (Dueña), Asistente, Especialista — 3 roles con vistas y permisos distintos. Matriz completa de permisos: ver `decisiones.md`.

## Pendiente de definir

- **Almacenamiento de fotos y firmas** (antes/después, firma digital de consentimientos): sigue sin confirmarse proveedor. `cloudinary` está en el `Pipfile` como dependencia, pero no se usa en ningún lado de `src/api` todavía (verificado 2026-09-05) — los campos `foto_antes_url`/`foto_despues_url` son texto libre sin mecanismo de subida conectado.

## Resuelto (estaba pendiente de definir)

- **Librería de calendario en frontend:** se eligió `react-big-calendar`, usado en `src/front/pages/Agenda.jsx`.
