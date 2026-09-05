// Cliente HTTP del módulo de auth — ver src/api/auth.py para el contrato real.

import { request } from "./api";

// POST /api/auth/login -> { access_token, usuario }
export const login = (email, password) =>
	request("/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password })
	});

// POST /api/auth/cambiar-password (autenticado) -> { mensaje }
// Usado en el primer login cuando usuario.debe_cambiar_password === true (#23).
export const cambiarPassword = (token, passwordActual, passwordNueva) =>
	request("/api/auth/cambiar-password", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva })
	});

// POST /api/auth/reset-password/solicitar -> { mensaje } (siempre genérico, exista o no el email -- #24)
export const solicitarResetPassword = (email) =>
	request("/api/auth/reset-password/solicitar", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email })
	});

// POST /api/auth/reset-password/confirmar -> { mensaje } | 400 si el token es inválido/expiró (1h de vigencia)
export const confirmarResetPassword = (token, passwordNueva) =>
	request("/api/auth/reset-password/confirmar", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token, password_nueva: passwordNueva })
	});

// POST /api/auth/google -> { access_token, usuario, tipo }
export const loginGoogle = (credential, inviteToken = null) =>
	request("/api/auth/google", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ credential, invite_token: inviteToken })
	});
