// Cliente HTTP del Sistema de Invites — ver src/api/invites.py para el contrato real.

import { request, authHeaders } from "./api";

// POST /api/invites -> {invite, link} (requiere admin o asistente)
export const generarInvite = (token, { tipo, pacienteId, email }) =>
	request("/api/invites", {
		method: "POST",
		headers: authHeaders(token),
		body: JSON.stringify({ tipo, paciente_id: pacienteId, email })
	});

// GET /api/invites/:token -> invite (publico, sin auth)
export const verificarInvite = (token) => request(`/api/invites/${token}`, {});

// POST /api/invites/:token/redimir -> {mensaje} (publico, sin auth)
export const redimirInvite = (token, { password, email, nombre }) =>
	request(`/api/invites/${token}/redimir`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ password, email, nombre })
	});
