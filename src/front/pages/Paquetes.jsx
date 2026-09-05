import { useEffect, useState } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { listarServicios } from "../services/servicios";
import { listarPaquetes, crearPaquete } from "../services/paquetes";

const detalleVacio = { servicioId: "", numSesiones: "" };

export const Paquetes = () => {
	const { store } = useGlobalReducer();
	const [servicios, setServicios] = useState([]);
	const [paquetes, setPaquetes] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState("");

	const [nombre, setNombre] = useState("");
	const [precioTotal, setPrecioTotal] = useState("");
	const [detalleActual, setDetalleActual] = useState(detalleVacio);
	const [detalles, setDetalles] = useState([]);
	const [guardando, setGuardando] = useState(false);

	const cargarDatos = async () => {
		setCargando(true);
		setError("");
		try {
			const [listaServicios, listaPaquetes] = await Promise.all([
				listarServicios(store.token),
				listarPaquetes(store.token)
			]);
			setServicios(listaServicios);
			setPaquetes(listaPaquetes);
		} catch (err) {
			setError(err.message);
		} finally {
			setCargando(false);
		}
	};

	useEffect(() => {
		cargarDatos();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleAgregarDetalle = () => {
		if (!detalleActual.servicioId || !detalleActual.numSesiones) return;
		if (detalles.some((d) => d.servicioId === detalleActual.servicioId)) {
			setError("Ese servicio ya está agregado al paquete.");
			return;
		}
		setError("");
		setDetalles([...detalles, detalleActual]);
		setDetalleActual(detalleVacio);
	};

	const handleQuitarDetalle = (servicioId) => {
		setDetalles(detalles.filter((d) => d.servicioId !== servicioId));
	};

	const nombreServicio = (servicioId) => servicios.find((s) => s.id === Number(servicioId))?.nombre || "";

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError("");

		if (detalles.length === 0) {
			setError("Agrega al menos un servicio al paquete.");
			return;
		}

		setGuardando(true);
		try {
			await crearPaquete(store.token, {
				nombre,
				precioTotal: Number(precioTotal),
				servicios: detalles.map((d) => ({
					servicio_id: Number(d.servicioId),
					num_sesiones: Number(d.numSesiones)
				}))
			});
			setNombre("");
			setPrecioTotal("");
			setDetalles([]);
			await cargarDatos();
		} catch (err) {
			setError(err.message);
		} finally {
			setGuardando(false);
		}
	};

	if (!["admin", "asistente"].includes(store.usuario?.rol)) {
		return (
			<div className="mx-auto max-w-3xl px-6 py-16 text-center">
				<h1 className="mb-2 text-2xl">No autorizado</h1>
				<p className="text-ink-soft">Paquetes solo lo pueden administrar Admin y Asistente.</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-3xl px-6 py-10">
			<h1 className="mb-1 text-2xl">Paquetes</h1>
			<p className="mb-8 text-[14.5px] text-ink-soft">
				Combos de sesiones de uno o varios servicios, predefinidos en el catálogo.
			</p>

			{error ? (
				<div className="mb-5 rounded-sm bg-error-bg px-4 py-3 text-[13.5px] text-error-text">{error}</div>
			) : null}

			<form
				onSubmit={handleSubmit}
				className="mb-8 flex flex-col gap-4 rounded-md border border-ink/[0.08] bg-paper-alt p-5"
			>
				<div className="flex flex-wrap gap-3">
					<div className="min-w-[220px] flex-1">
						<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="nombre">
							Nombre del paquete
						</label>
						<input
							id="nombre"
							type="text"
							required
							placeholder="Paquete Rejuvenecimiento x5"
							className="w-full rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe focus:ring-4 focus:ring-cafe/[0.14]"
							value={nombre}
							onChange={(event) => setNombre(event.target.value)}
						/>
					</div>
					<div className="w-40">
						<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="precio">
							Precio total
						</label>
						<input
							id="precio"
							type="number"
							min="0"
							step="0.01"
							required
							className="w-full rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe focus:ring-4 focus:ring-cafe/[0.14]"
							value={precioTotal}
							onChange={(event) => setPrecioTotal(event.target.value)}
						/>
					</div>
				</div>

				<div className="rounded-sm border border-beige bg-paper p-4">
					<p className="mb-3 text-[13px] font-semibold text-ink-soft">Servicios incluidos</p>

					<div className="mb-3 flex flex-wrap items-end gap-2">
						<select
							className="min-w-[180px] flex-1 rounded-sm border-[1.5px] border-beige px-3 py-2 text-[14px] outline-none focus:border-cafe"
							value={detalleActual.servicioId}
							onChange={(event) => setDetalleActual({ ...detalleActual, servicioId: event.target.value })}
						>
							<option value="">Selecciona un servicio…</option>
							{servicios.map((s) => (
								<option key={s.id} value={s.id}>
									{s.nombre}
								</option>
							))}
						</select>
						<input
							type="number"
							min="1"
							placeholder="Sesiones"
							className="w-28 rounded-sm border-[1.5px] border-beige px-3 py-2 text-[14px] outline-none focus:border-cafe"
							value={detalleActual.numSesiones}
							onChange={(event) => setDetalleActual({ ...detalleActual, numSesiones: event.target.value })}
						/>
						<button
							type="button"
							onClick={handleAgregarDetalle}
							className="rounded-full border-[1.5px] border-beige px-4 py-2 text-[13.5px] font-semibold text-ink-soft hover:border-cafe hover:text-cafe"
						>
							+ Agregar
						</button>
					</div>

					{detalles.length === 0 ? (
						<p className="text-[13px] text-ink-faint">Todavía no agregas ningún servicio.</p>
					) : (
						<ul className="flex flex-col gap-1.5">
							{detalles.map((d) => (
								<li
									key={d.servicioId}
									className="flex items-center justify-between rounded-sm bg-paper-alt px-3 py-1.5 text-[13.5px]"
								>
									<span>
										{nombreServicio(d.servicioId)} · {d.numSesiones} sesiones
									</span>
									<button
										type="button"
										onClick={() => handleQuitarDetalle(d.servicioId)}
										className="text-error-text hover:underline"
									>
										Quitar
									</button>
								</li>
							))}
						</ul>
					)}
				</div>

				<button
					type="submit"
					disabled={guardando}
					className="self-start rounded-full bg-ink px-6 py-2.5 text-[14px] font-bold text-paper hover:bg-cafe disabled:opacity-60"
				>
					{guardando ? "Guardando…" : "+ Crear paquete"}
				</button>
			</form>

			<div className="overflow-hidden rounded-md border border-ink/[0.08]">
				<table className="w-full text-left text-[14.5px]">
					<thead className="bg-paper-alt text-[13px] font-semibold text-ink-soft">
						<tr>
							<th className="px-5 py-3">Nombre</th>
							<th className="px-5 py-3">Servicios incluidos</th>
							<th className="px-5 py-3 text-right">Precio</th>
						</tr>
					</thead>
					<tbody>
						{cargando ? (
							<tr>
								<td colSpan={3} className="px-5 py-6 text-center text-ink-faint">
									Cargando…
								</td>
							</tr>
						) : paquetes.length === 0 ? (
							<tr>
								<td colSpan={3} className="px-5 py-6 text-center text-ink-faint">
									Todavía no hay paquetes registrados.
								</td>
							</tr>
						) : (
							paquetes.map((paquete) => (
								<tr key={paquete.id} className="border-t border-ink/[0.06]">
									<td className="px-5 py-3 font-medium">{paquete.nombre}</td>
									<td className="px-5 py-3 text-ink-soft">
										{paquete.servicios.map((s) => `${s.servicio_nombre} (${s.num_sesiones})`).join(", ")}
									</td>
									<td className="px-5 py-3 text-right">${paquete.precio_total.toFixed(2)}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};
