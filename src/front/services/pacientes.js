// Cliente HTTP del módulo de Pacientes — ver src/api/pacientes.py para el contrato real.

import { request, authHeaders } from "./api";

// GET /api/pacientes?telefono=... -> [paciente] (0 o 1 resultado, telefono es unico)
export const buscarPacientePorTelefono = (token, telefono) =>
	request(`/api/pacientes?telefono=${encodeURIComponent(telefono)}`, { headers: authHeaders(token) });

// POST /api/pacientes -> paciente | 409 si telefono o cedula ya existen
export const crearPaciente = (token, { nombreCompleto, cedula, telefono }) =>
	request("/api/pacientes", {
		method: "POST",
		headers: authHeaders(token),
		body: JSON.stringify({ nombre_completo: nombreCompleto, cedula, telefono })
	});

// GET /api/pacientes -> Trae la lista de todos los pacientes
export const obtenerPacientes = (token) => request("/api/pacientes", { headers: authHeaders(token) });
