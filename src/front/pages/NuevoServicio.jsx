import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

const backendUrl = () => {
	const url = import.meta.env.VITE_BACKEND_URL;
	if (!url) throw new Error("VITE_BACKEND_URL no está definida en .env");
	return url;
};

export const NuevoServicio = () => {
	const { store } = useGlobalReducer();
	const navigate = useNavigate();

	const [nombre, setNombre] = useState("");
	const [precio, setPrecio] = useState("");
	const [duracionMin, setDuracionMin] = useState("");
	const [porcentajeComision, setPorcentajeComision] = useState("");
	const [error, setError] = useState("");
	const [mensaje, setMensaje] = useState("");
	const [cargando, setCargando] = useState(false);

	const rol = store.usuario?.rol;

	if (rol !== "admin" && rol !== "asistente") {
		return (
			<div className="container py-5">
				<h1 className="text-2xl font-bold">No autorizado</h1>
				<p className="mt-2">No tienes permisos para crear servicios.</p>
			</div>
		);
	}

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError("");
		setMensaje("");
		setCargando(true);

		try {
			const response = await fetch(`${backendUrl()}/api/servicios`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${store.token}`
				},
				body: JSON.stringify({
					nombre,
					precio: Number(precio),
					duracion_min: Number(duracionMin),
					porcentaje_comision: Number(porcentajeComision)
				})
			});

			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(data.error || data.msg || "No se pudo crear el servicio.");
			}

			setMensaje("Servicio creado correctamente.");

			setNombre("");
			setPrecio("");
			setDuracionMin("");
			setPorcentajeComision("");
		} catch (err) {
			setError(err.message);
		} finally {
			setCargando(false);
		}
	};

	return (
		<div className="container py-5">
			<div className="mx-auto max-w-xl">
				<h1 className="mb-2 text-3xl font-bold">Nuevo servicio</h1>

				<p className="mb-6 text-ink-soft">Registra un nuevo servicio para la clínica.</p>

				{error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">{error}</div>}

				{mensaje && <div className="mb-4 rounded-lg bg-green-100 p-3 text-green-700">{mensaje}</div>}

				<form onSubmit={handleSubmit}>
					<div className="mb-4">
						<label className="mb-2 block font-semibold" htmlFor="nombre">
							Nombre
						</label>

						<input
							id="nombre"
							type="text"
							required
							value={nombre}
							onChange={(event) => setNombre(event.target.value)}
							className="w-full rounded-lg border p-3"
							placeholder="Ej. Limpieza facial"
						/>
					</div>

					<div className="mb-4">
						<label className="mb-2 block font-semibold" htmlFor="precio">
							Precio
						</label>

						<input
							id="precio"
							type="number"
							min="0"
							step="0.01"
							required
							value={precio}
							onChange={(event) => setPrecio(event.target.value)}
							className="w-full rounded-lg border p-3"
							placeholder="25000"
						/>
					</div>

					<div className="mb-4">
						<label className="mb-2 block font-semibold" htmlFor="duracion">
							Duración (minutos)
						</label>

						<input
							id="duracion"
							type="number"
							min="1"
							required
							value={duracionMin}
							onChange={(event) => setDuracionMin(event.target.value)}
							className="w-full rounded-lg border p-3"
							placeholder="60"
						/>
					</div>

					<div className="mb-6">
						<label className="mb-2 block font-semibold" htmlFor="porcentaje-comision">
							% Comisión
						</label>

						<input
							id="porcentaje-comision"
							type="number"
							min="0"
							max="100"
							step="0.01"
							required
							value={porcentajeComision}
							onChange={(event) => setPorcentajeComision(event.target.value)}
							className="w-full rounded-lg border p-3"
							placeholder="10"
						/>
					</div>

					<div className="flex gap-3">
						<button
							type="submit"
							disabled={cargando}
							className="rounded-full bg-ink px-6 py-3 font-bold text-paper hover:bg-cafe disabled:opacity-60"
						>
							{cargando ? "Guardando..." : "Crear servicio"}
						</button>

						<button type="button" onClick={() => navigate("/app")} className="rounded-full border px-6 py-3 font-bold">
							Cancelar
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
