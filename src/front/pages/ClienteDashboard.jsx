import { useEffect, useState } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { getMisCitas, getMiHistorialClinico, getMiSaldo, getMisPaquetes } from "../services/portal";

const formatMoney = (amount) => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2
	}).format(amount || 0);
};

export const ClienteDashboard = () => {
	const { store } = useGlobalReducer();

	const [citas, setCitas] = useState([]);
	const [historial, setHistorial] = useState([]);
	const [saldo, setSaldo] = useState(null);
	const [paquetes, setPaquetes] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const cargarPortal = async () => {
			setCargando(true);
			setError("");

			try {
				const [citasResp, historialResp, saldoResp, paquetesResp] = await Promise.all([
					getMisCitas(store.token),
					getMiHistorialClinico(store.token),
					getMiSaldo(store.token),
					getMisPaquetes(store.token)
				]);

				setCitas(citasResp);
				setHistorial(historialResp);
				setSaldo(saldoResp);
				setPaquetes(paquetesResp);
			} catch (err) {
				setError(err.message);
			} finally {
				setCargando(false);
			}
		};

		cargarPortal();
	}, [store.token]);

	if (store.usuario?.rol !== "cliente") {
		return (
			<div className="mx-auto max-w-6xl px-6 py-10">
				<div className="rounded-sm bg-error-bg px-4 py-3 text-[13.5px] text-error-text">
					No tienes acceso al portal de clientes.
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl px-6 py-10">
			<h1 className="mb-1 text-2xl">Mi portal</h1>
			<p className="mb-8 text-[14.5px] text-ink-soft">
				Hola, {store.usuario?.nombre}. Aquí puedes consultar tu información.
			</p>

			{error ? (
				<div className="mb-5 rounded-sm bg-error-bg px-4 py-3 text-[13.5px] text-error-text">{error}</div>
			) : null}

			{cargando ? (
				<p className="p-6 text-center text-ink-faint">Cargando…</p>
			) : (
				<div className="space-y-8">
					<section>
						<h2 className="mb-4 text-xl">Saldo pendiente</h2>

						<div className="rounded-md border border-ink/[0.08] bg-paper p-6">
							<p className="text-[13px] text-ink-soft">Total pendiente</p>
							<p className="mt-1 text-3xl font-semibold">{formatMoney(saldo?.saldo)}</p>
						</div>
					</section>

					<section>
						<h2 className="mb-4 text-xl">Mis paquetes</h2>

						{paquetes.length === 0 ? (
							<div className="rounded-md border border-ink/[0.08] bg-paper p-6 text-[14px] text-ink-soft">
								No tienes paquetes registrados.
							</div>
						) : (
							<div className="space-y-4">
								{paquetes.map((paquete) => (
									<div key={paquete.id} className="rounded-md border border-ink/[0.08] bg-paper p-5">
										<p className="font-semibold">Paquete {paquete.paquete}</p>

										<p className="mt-1 text-[14px] text-ink-soft">
											Fecha de compra: {new Date(paquete.fecha_compra).toLocaleDateString()}
										</p>

										<p className="mt-1 text-[13px] text-ink-faint">Estado: {paquete.estado}</p>

										<div className="mt-4">
											<p className="text-[13px] font-semibold text-ink-soft">Sesiones pendientes</p>

											{paquete.sesiones_pendientes.length === 0 ? (
												<p className="mt-2 text-[14px] text-ink-faint">No tienes sesiones pendientes.</p>
											) : (
												<ul className="mt-2 space-y-2">
													{paquete.sesiones_pendientes.map((sesion) => (
														<li key={sesion.id} className="text-[14px] text-ink-soft">
															{sesion.servicio?.nombre || "Servicio"}
														</li>
													))}
												</ul>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</section>

					<section>
						<h2 className="mb-4 text-xl">Mis citas</h2>

						{citas.length === 0 ? (
							<div className="rounded-md border border-ink/[0.08] bg-paper p-6 text-[14px] text-ink-soft">
								No tienes citas registradas.
							</div>
						) : (
							<div className="space-y-3">
								{citas.map((cita) => (
									<div key={cita.id} className="rounded-md border border-ink/[0.08] bg-paper p-5">
										<p className="font-semibold">{cita.servicio?.nombre || "Servicio"}</p>

										<p className="mt-1 text-[14px] text-ink-soft">{new Date(cita.fecha_hora).toLocaleString()}</p>

										<p className="mt-1 text-[14px] text-ink-soft">Especialista: {cita.especialista?.nombre}</p>

										<p className="mt-1 text-[13px] text-ink-faint">Estado: {cita.estado}</p>
									</div>
								))}
							</div>
						)}
					</section>

					<section>
						<h2 className="mb-4 text-xl">Historial clínico</h2>

						{historial.length === 0 ? (
							<div className="rounded-md border border-ink/[0.08] bg-paper p-6 text-[14px] text-ink-soft">
								No tienes registros clínicos disponibles.
							</div>
						) : (
							<div className="space-y-4">
								{historial.map((registro) => (
									<div key={registro.id} className="rounded-md border border-ink/[0.08] bg-paper p-5">
										<p className="text-[14px] text-ink-soft">Cita #{registro.cita_id}</p>

										{registro.observaciones ? <p className="mt-3 text-[14px]">{registro.observaciones}</p> : null}

										<div className="mt-4 flex flex-wrap gap-4">
											{registro.foto_antes_url ? (
												<img
													src={registro.foto_antes_url}
													alt="Foto antes del tratamiento"
													className="h-40 w-40 rounded-md object-cover"
												/>
											) : null}

											{registro.foto_despues_url ? (
												<img
													src={registro.foto_despues_url}
													alt="Foto después del tratamiento"
													className="h-40 w-40 rounded-md object-cover"
												/>
											) : null}
										</div>
									</div>
								))}
							</div>
						)}
					</section>
				</div>
			)}
		</div>
	);
};
