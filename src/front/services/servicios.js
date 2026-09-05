// Cliente HTTP del módulo de Servicios (Catálogo) — ver src/api/servicios.py para el contrato real.

import { request, authHeaders } from "./api";

// GET /api/servicios -> [servicio]
export const listarServicios = (token) => request("/api/servicios", { headers: authHeaders(token) });
