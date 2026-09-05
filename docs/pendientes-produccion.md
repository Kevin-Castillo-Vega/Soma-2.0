# Pendientes para producción

Cosas que hay que resolver antes (o al momento) de desplegar a Render — encontradas mientras se construía identidad/Tailwind/login. No son features, son configuración que falta.

## Variables de entorno faltantes en `render.yaml`

Hoy solo están: `VITE_BASENAME`, `FLASK_APP`, `FLASK_DEBUG`, `FLASK_APP_KEY`, `PYTHON_VERSION`, `DATABASE_URL`. Faltan:

- [ ] `JWT_SECRET_KEY` — default en código es `'dev'` (`src/app.py`). Inseguro en prod.
- [ ] `FRONTEND_URL` — sigue faltando en `render.yaml` (confirmado 2026-09-05), y ahora pesa más que antes: además de romper el link del correo de "restablecer contraseña" (issue #24, PR #36), la PR #78 condicionó el CORS de producción a esta misma variable (`CORS(app, origins=origenes_permitidos)`). Sin `FRONTEND_URL` en Render, `origenes_permitidos` cae al default `http://localhost:3000` y el frontend real quedaría bloqueado por CORS en producción.
- [ ] `MAIL_SERVER` / `MAIL_PORT` / `MAIL_USE_TLS` / `MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_DEFAULT_SENDER` — sin esto, el email de reset de password falla en silencio (`_enviar_email_reset` solo loguea el error, el usuario nunca sabe que no llegó).
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — issue #1 (OAuth2 Google Calendar). Actualización 2026-09-05: `GOOGLE_REFRESH_TOKEN` ya no aplica como variable global, el pivote a multi-clínica (issue #71) lo movió a `Clinica.google_refresh_token` en la base de datos, uno por clínica.
- [ ] `GOOGLE_AUTH_CLIENT_ID` / `VITE_GOOGLE_AUTH_CLIENT_ID` — nuevas, para el login con Google (issue #69, PR #78, todavía sin mergear). Separadas a propósito de las credenciales de Calendar para evitar colisiones.
- [ ] `FLASK_APP_KEY` tiene el valor placeholder `"any key works"` en `render.yaml` — cambiar por un secret real antes de deployar.

## Confirmar, no encontré problema pero vale la pena revisar

- [ ] Hay `requirements.txt` **y** `Pipfile`/`Pipfile.lock` — `render_build.sh` usa `pipenv install`. Confirmar que `requirements.txt` no está desactualizado / no se usa en ningún lado más (CI, docs de setup).
- [ ] `dist/` está versionado en git (no en `.gitignore`) — el build de Render lo regenera (`render_build.sh` corre `npm run build`), pero si alguien corre `npm run build` local y comitea el resultado por error, puede ensuciar PRs. Ya pasó en esta sesión (se revirtió a mano cada vez).

## Ya resuelto

- [x] `npm run lint` estaba completamente roto — reparado (PR #35).
- [x] `package-lock.json` sincronizado con las dependencias de Tailwind.
- [x] Migraciones sí corren en el build (`pipenv run upgrade` → `flask db upgrade`, confirmado en `Pipfile`).
