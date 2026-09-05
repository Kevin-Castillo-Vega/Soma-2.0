import { request, authHeaders } from "./api";

export const getMisCitas = (token) =>
	request("/api/portal/citas", {
		headers: authHeaders(token)
	});

export const getMiHistorialClinico = (token) =>
	request("/api/portal/historial-clinico", {
		headers: authHeaders(token)
	});

export const getMiSaldo = (token) =>
	request("/api/portal/saldo", {
		headers: authHeaders(token)
	});

export const getMisPaquetes = (token) =>
	request("/api/portal/paquetes", {
		headers: authHeaders(token)
	});
