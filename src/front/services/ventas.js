import { request, authHeaders } from "./api";

// GET /api/ventas -> Lista de ventas (acepta filtro opcional paciente_id o con_deuda)
export const listarVentas = (token, params = {}) => {
	const query = new URLSearchParams();
	if (params.paciente_id) query.append("paciente_id", params.paciente_id);
	if (params.con_deuda) query.append("con_deuda", "true");
	const queryString = query.toString() ? `?${query.toString()}` : "";
	return request(`/api/ventas${queryString}`, { headers: authHeaders(token) });
};

// GET /api/ventas/:id -> Detalle de una venta
export const obtenerVenta = (token, id) => request(`/api/ventas/${id}`, { headers: authHeaders(token) });

// GET /api/ventas/:id/recibo -> Datos ya resueltos (nombres) para la vista imprimible
export const obtenerRecibo = (token, id) => request(`/api/ventas/${id}/recibo`, { headers: authHeaders(token) });

// POST /api/ventas -> Registrar una nueva venta (completa o con abono)
export const registrarVenta = (token, datos) =>
	request("/api/ventas", {
		method: "POST",
		headers: authHeaders(token),
		body: JSON.stringify(datos)
	});
