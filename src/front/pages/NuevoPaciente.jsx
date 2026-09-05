import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { crearPaciente } from "../services/pacientes";

export const NuevoPaciente = () => {
	const [formData, setFormData] = useState({
		nombreCompleto: "",
		cedula: "",
		telefono: ""
	});

	const [status, setStatus] = useState({ error: null, loading: false });
	const navigate = useNavigate();

	const handleChange = ({ target: { name, value } }) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
		if (status.error) setStatus((prev) => ({ ...prev, error: null }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setStatus({ error: null, loading: true });

		try {
			const token = localStorage.getItem("soma_token");
			if (!token) throw new Error("Sesión no válida o expirada.");

			await crearPaciente(token, formData);
			navigate("/app/pacientes");
		} catch (error) {
			setStatus({ error: error.message || "No se pudo registrar el paciente", loading: false });
		}
	};

	return (
		<div className="p-8">
			<h1 className="text-3xl text-cafe font-display mb-6">Alta de Paciente</h1>

			<div className="bg-paper p-8 rounded-2xl shadow-sm border border-beige max-w-lg">
				{status.error && (
					<div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-data">
						⚠️ {status.error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="flex flex-col gap-5">
					<div className="flex flex-col gap-2">
						<label className="text-cafe font-data font-semibold text-sm uppercase tracking-wider">
							Nombre Completo
						</label>
						<input
							type="text"
							name="nombreCompleto"
							value={formData.nombreCompleto}
							onChange={handleChange}
							placeholder="Ej. Ana García"
							className="w-full p-3 rounded-lg border border-beige focus:outline-none focus:ring-2 focus:ring-cafe/20 focus:border-cafe text-ink font-data bg-white transition-all"
							required
							disabled={status.loading}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label className="text-cafe font-data font-semibold text-sm uppercase tracking-wider">
							Cédula de Identidad
						</label>
						<input
							type="text"
							name="cedula"
							value={formData.cedula}
							onChange={handleChange}
							placeholder="Ej. V-12345678"
							className="w-full p-3 rounded-lg border border-beige focus:outline-none focus:ring-2 focus:ring-cafe/20 focus:border-cafe text-ink font-data bg-white transition-all"
							required
							disabled={status.loading}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label className="text-cafe font-data font-semibold text-sm uppercase tracking-wider">Teléfono</label>
						<input
							type="tel"
							name="telefono"
							value={formData.telefono}
							onChange={handleChange}
							placeholder="Ej. 0414-1234567"
							className="w-full p-3 rounded-lg border border-beige focus:outline-none focus:ring-2 focus:ring-cafe/20 focus:border-cafe text-ink font-data bg-white transition-all"
							required
							disabled={status.loading}
						/>
					</div>

					<div className="flex gap-4 mt-6 pt-4 border-t border-beige/50">
						<button
							type="submit"
							disabled={status.loading}
							className="px-8 py-3 bg-ink text-paper rounded-full hover:bg-cafe transition-colors font-data font-semibold disabled:opacity-50"
						>
							{status.loading ? "Guardando..." : "Registrar Paciente"}
						</button>

						<Link
							to="/app/pacientes"
							className="px-8 py-3 bg-nude text-ink rounded-full hover:bg-beige transition-colors font-data font-semibold flex items-center justify-center"
						>
							Cancelar
						</Link>
					</div>
				</form>
			</div>
		</div>
	);
};
