// Cliente HTTP del módulo de Paquetes (Catálogo) — ver src/api/paquetes.py para el contrato real.

import { request, authHeaders } from "./api";

// GET /api/paquetes -> [{...paquete, servicios: [{servicio_id, servicio_nombre, num_sesiones}]}]
export const listarPaquetes = (token) => request("/api/paquetes", { headers: authHeaders(token) });

// POST /api/paquetes -> {paquete, servicios}
export const crearPaquete = (token, { nombre, precioTotal, servicios }) =>
	request("/api/paquetes", {
		method: "POST",
		headers: authHeaders(token),
		body: JSON.stringify({ nombre, precio_total: precioTotal, servicios })
	});
