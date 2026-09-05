import React, { useState, useEffect } from "react";
import { obtenerPacientes } from "../services/pacientes";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const ListaPacientes = () => {
	const { store } = useGlobalReducer();

	// 1. Estados
	const [pacientes, setPacientes] = useState([]);
	const [busqueda, setBusqueda] = useState("");
	const [cargando, setCargando] = useState(true);

	useEffect(() => {
		const cargarPacientes = async () => {
			try {
				const data = await obtenerPacientes(store.token);

				setPacientes(data.pacientes || data || []);
			} catch (error) {
				console.error("Error cargando pacientes:", error);
			} finally {
				setCargando(false);
			}
		};

		cargarPacientes();
	}, [store.token]);

	const pacientesFiltrados = pacientes.filter(
		(p) =>
			p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
			p.cedula.includes(busqueda) ||
			p.telefono.includes(busqueda)
	);

	const puedeCrearPaciente = store.usuario?.rol !== "especialista";

	return (
		<div className="p-8 bg-paper min-h-screen font-body text-ink">
			<div className="max-w-6xl mx-auto">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-3xl font-display font-bold text-cafe">Directorio de Pacientes</h1>
					{puedeCrearPaciente && (
						<Link
							to="/app/pacientes/nuevo"
							className="bg-cafe text-paper px-6 py-2 rounded-full font-medium shadow-soft hover:bg-cafe-soft transition-colors inline-block"
						>
							+ Nuevo Paciente
						</Link>
					)}
				</div>

				<div className="bg-white p-4 rounded-lg shadow-card mb-6">
					<input
						type="text"
						placeholder="Buscar por nombre, cédula o teléfono..."
						className="w-full p-3 rounded-lg border border-nude focus:outline-none focus:border-cafe text-ink font-data"
						value={busqueda}
						onChange={(e) => setBusqueda(e.target.value)}
					/>
				</div>

				<div className="bg-white rounded-lg shadow-card overflow-hidden border border-nude">
					<table className="w-full text-left border-collapse">
						<thead className="bg-nude text-cafe font-display">
							<tr>
								<th className="p-4 border-b border-nude">Nombre</th>
								<th className="p-4 border-b border-nude">Cédula</th>
								<th className="p-4 border-b border-nude">Teléfono</th>
								<th className="p-4 border-b border-nude">Acciones</th>
							</tr>
						</thead>
						<tbody className="font-data">
							{cargando ? (
								<tr>
									<td colSpan="4" className="p-4 text-center text-ink-faint">
										Cargando pacientes...
									</td>
								</tr>
							) : pacientesFiltrados.length === 0 ? (
								<tr>
									<td colSpan="4" className="p-4 text-center text-ink-faint">
										No se encontraron pacientes.
									</td>
								</tr>
							) : (
								pacientesFiltrados.map((paciente) => (
									<tr key={paciente.id} className="hover:bg-paper-alt transition-colors">
										<td className="p-4 border-b border-nude text-ink font-body font-medium">
											{paciente.nombre_completo}
										</td>
										<td className="p-4 border-b border-nude text-ink-soft">{paciente.cedula}</td>
										<td className="p-4 border-b border-nude text-ink-soft">{paciente.telefono}</td>
										<td className="p-4 border-b border-nude">
											<button className="text-cafe hover:text-cafe-soft font-body text-sm underline cursor-pointer">
												Ver Ficha
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
