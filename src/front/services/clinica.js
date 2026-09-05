// Cliente HTTP de configuración de Clínica — ver src/api/clinica.py para el contrato real.

import { request, authHeaders } from "./api";

// GET /api/clinica/google-calendar/estado -> {conectado, cuenta_email}
export const estadoGoogleCalendar = (token) =>
	request("/api/clinica/google-calendar/estado", { headers: authHeaders(token) });

// GET /api/clinica/google-calendar/conectar -> {url} — el navegador debe navegar a esa url
export const urlConectarGoogleCalendar = (token) =>
	request("/api/clinica/google-calendar/conectar", { headers: authHeaders(token) });

// DELETE /api/clinica/google-calendar -> {mensaje}
export const desconectarGoogleCalendar = (token) =>
	request("/api/clinica/google-calendar", { method: "DELETE", headers: authHeaders(token) });
