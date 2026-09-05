import React, { useState, useEffect, useCallback } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { obtenerResumenDashboard } from "../services/dashboard.js";
import { Navigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";

const formatMoney = (amount) => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2
	}).format(amount || 0);
};

const formatTime = (isoString) => {
	if (!isoString) return "";
	const date = new Date(isoString);
	return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const formatDateShort = (isoString) => {
	if (!isoString) return "";
	const date = new Date(isoString);
	return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
};

export const DashboardAdmin = () => {
	const { store } = useGlobalReducer();
	const token = store.token;
	const usuario = store.usuario;

	const [rango, setRango] = useState("semana");
	const [desde, setDesde] = useState("");
	const [hasta, setHasta] = useState("");
	const [resumen, setResumen] = useState(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState(null);
	const [tabCitas, setTabCitas] = useState("hoy");
	const [mostrarModalFiltro, setMostrarModalFiltro] = useState(false);

	const cargarDashboard = useCallback(async () => {
		if (!token) return;
		setCargando(true);
		setError(null);

		try {
			const params = {};
			if (rango === "personalizado") {
				if (desde) params.desde = desde;
				if (hasta) params.hasta = hasta;
			} else {
				params.rango = rango;
			}

			const data = await obtenerResumenDashboard(token, params);
			setResumen(data);
		} catch (err) {
			setError(err.message || "No se pudieron obtener las métricas del servidor.");
		} finally {
			setCargando(false);
		}
	}, [token, rango, desde, hasta]);

	useEffect(() => {
		cargarDashboard();
	}, [cargarDashboard]);

	const maxMontoTop = resumen?.servicios_top?.length ? Math.max(...resumen.servicios_top.map((s) => s.monto_total)) : 1;

	if (usuario && usuario.rol !== "admin") {
		return <Navigate to="/app/agenda" replace />;
	}

	return (
		<div className="min-h-screen bg-paper px-4 py-8 md:px-8 lg:px-12 font-body text-ink">
			{/* Header del Dashboard */}

			<div className="max-w-7xl mx-auto mb-8">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 mb-1">
							<span className="inline-block w-2.5 h-2.5 rounded-full bg-cafe animate-pulse"></span>
							<span className="text-xs uppercase tracking-widest font-semibold text-cafe-soft font-data">
								Panel de Control Financiero
							</span>
						</div>
						<h1 className="text-3xl lg:text-4xl font-display font-medium text-ink">
							Bienvenida de nuevo, <span className="italic text-cafe">{usuario?.nombre || "Administradora"}</span>
						</h1>
						<p className="text-sm text-ink-soft mt-1">
							Resumen consolidado de ingresos, abonos y agenda de citas en SOMA.
						</p>
					</div>

					{/* Filtros de Rango de Fechas */}

					<div className="flex flex-wrap items-center gap-2 bg-paper-alt p-1.5 rounded-sm border border-nude/40 shadow-card">
						<button
							onClick={() => setRango("hoy")}
							className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-all ${
								rango === "hoy" ? "bg-cafe text-white shadow-soft" : "text-ink-soft hover:text-ink hover:bg-paper"
							}`}
						>
							Hoy
						</button>
						<button
							onClick={() => setRango("semana")}
							className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-all ${
								rango === "semana" ? "bg-cafe text-white shadow-soft" : "text-ink-soft hover:text-ink hover:bg-paper"
							}`}
						>
							Esta Semana
						</button>
						<button
							onClick={() => setRango("mes")}
							className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-all ${
								rango === "mes" ? "bg-cafe text-white shadow-soft" : "text-ink-soft hover:text-ink hover:bg-paper"
							}`}
						>
							Este Mes
						</button>
						<button
							onClick={() => setMostrarModalFiltro(true)}
							className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-all ${
								rango === "personalizado"
									? "bg-cafe text-white shadow-soft"
									: "text-ink-soft hover:text-ink hover:bg-paper"
							}`}
						>
							Fechas
						</button>
						<button onClick={cargarDashboard} disabled={cargando} className="p-1.5 text-ink-soft hover:text-cafe ml-1">
							<RefreshCw className="w-4 h-4" />
						</button>
					</div>
				</div>

				{resumen?.rango_filtrado && (
					<div className="mt-3 flex items-center gap-2 text-xs font-data text-ink-faint">
						<span>Filtrando del:</span>
						<span className="font-semibold text-cafe">{resumen.rango_filtrado.desde}</span>
						<span>al</span>
						<span className="font-semibold text-cafe">{resumen.rango_filtrado.hasta}</span>
					</div>
				)}
			</div>

			{error && (
				<div
					className="max-w-7xl mx-auto mb-6 p-4 rounded-sm bg-error-bg text-error-text border border-error-text/20 flex items-center
  justify-between"
				>
					<span className="text-sm font-medium">{error}</span>
					<button onClick={cargarDashboard} className="text-xs underline font-semibold">
						Reintentar
					</button>
				</div>
			)}

			{/* Tarjetas KPI */}
			<div className="max-w-7xl mx-auto space-y-8">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
					<div className="bg-white p-6 rounded-md shadow-card border border-nude/30">
						<span className="text-xs uppercase tracking-wider font-semibold font-data text-ink-faint block mb-2">
							Ingresos Recaudados
						</span>
						{cargando ? (
							<div className="h-8 bg-paper-alt animate-pulse rounded w-3/4 mb-2"></div>
						) : (
							<div className="text-2xl lg:text-3xl font-display font-semibold text-ink">
								{formatMoney(resumen?.ingresos?.monto_total)}
							</div>
						)}
						<p className="text-xs text-ink-soft mt-2 font-data">
							{cargando ? "..." : resumen?.ingresos?.transacciones_count || 0} abonos registrados
						</p>
					</div>

					<div className="bg-white p-6 rounded-md shadow-card border border-nude/30">
						<span className="text-xs uppercase tracking-wider font-semibold font-data text-ink-faint block mb-2">
							Citas Agendadas Hoy
						</span>
						{cargando ? (
							<div className="h-8 bg-paper-alt animate-pulse rounded w-1/2 mb-2"></div>
						) : (
							<div className="text-2xl lg:text-3xl font-display font-semibold text-ink">
								{resumen?.citas_pendientes_hoy?.total || 0}
							</div>
						)}
						<p className="text-xs text-ink-soft mt-2 font-data">Atenciones agendadas para hoy</p>
					</div>

					<div className="bg-white p-6 rounded-md shadow-card border border-nude/30">
						<span className="text-xs uppercase tracking-wider font-semibold font-data text-ink-faint block mb-2">
							Citas de la Semana
						</span>
						{cargando ? (
							<div className="h-8 bg-paper-alt animate-pulse rounded w-1/2 mb-2"></div>
						) : (
							<div className="text-2xl lg:text-3xl font-display font-semibold text-ink">
								{resumen?.citas_pendientes_semana?.total || 0}
							</div>
						)}
						<p className="text-xs text-ink-soft mt-2 font-data">Agenda acumulada semanal</p>
					</div>

					<div className="bg-white p-6 rounded-md shadow-card border border-nude/30">
						<span className="text-xs uppercase tracking-wider font-semibold font-data text-ink-faint block mb-2">
							Servicios Top Vendidos
						</span>
						{cargando ? (
							<div className="h-8 bg-paper-alt animate-pulse rounded w-1/2 mb-2"></div>
						) : (
							<div className="text-2xl lg:text-3xl font-display font-semibold text-ink">
								{resumen?.servicios_top?.length || 0}
							</div>
						)}
						<p className="text-xs text-ink-soft mt-2 font-data">Tratamientos con mayor demanda</p>
					</div>
				</div>

				{/* Servicios Top y Citas */}
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
					<div className="lg:col-span-5 bg-white p-6 rounded-md shadow-card border border-nude/30">
						<h2 className="text-xl font-display font-medium text-ink mb-1">Tratamientos Más Vendidos</h2>
						<p className="text-xs text-ink-soft mb-6">Top 5 servicios en el periodo</p>

						{cargando ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<div key={i} className="h-12 bg-paper-alt animate-pulse rounded-xs"></div>
								))}
							</div>
						) : !resumen?.servicios_top?.length ? (
							<div className="text-center py-8 text-ink-faint text-sm">No hay ventas en este rango de fechas.</div>
						) : (
							<div className="space-y-4">
								{resumen.servicios_top.map((item, index) => {
									const porcentaje = Math.round((item.monto_total / maxMontoTop) * 100);
									return (
										<div key={item.servicio_id} className="space-y-1">
											<div className="flex items-center justify-between text-sm">
												<span className="font-medium text-ink">
													#{index + 1} {item.nombre}
												</span>
												<span className="font-semibold text-ink font-data">
													{formatMoney(item.monto_total)} ({item.ventas_count})
												</span>
											</div>
											<div className="w-full h-2 bg-paper-alt rounded-full overflow-hidden">
												<div
													className="h-full bg-cafe rounded-full transition-all duration-500"
													style={{ width: `${porcentaje}%` }}
												></div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					<div className="lg:col-span-7 bg-white p-6 rounded-md shadow-card border border-nude/30">
						<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-3 border-b border-paper-alt">
							<div>
								<h2 className="text-xl font-display font-medium text-ink">Citas Pendientes</h2>
								<p className="text-xs text-ink-soft">Atenciones agendadas</p>
							</div>
							<div className="flex items-center bg-paper-alt p-1 rounded-xs">
								<button
									onClick={() => setTabCitas("hoy")}
									className={`px-3 py-1 text-xs font-semibold rounded-xs transition-all ${
										tabCitas === "hoy" ? "bg-white text-ink shadow-card" : "text-ink-soft"
									}`}
								>
									Hoy ({resumen?.citas_pendientes_hoy?.total || 0})
								</button>
								<button
									onClick={() => setTabCitas("semana")}
									className={`px-3 py-1 text-xs font-semibold rounded-xs transition-all ${
										tabCitas === "semana" ? "bg-white text-ink shadow-card" : "text-ink-soft"
									}`}
								>
									Esta Semana ({resumen?.citas_pendientes_semana?.total || 0})
								</button>
							</div>
						</div>

						{cargando ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<div key={i} className="h-14 bg-paper-alt animate-pulse rounded-xs"></div>
								))}
							</div>
						) : (
							(() => {
								const citas =
									tabCitas === "hoy"
										? resumen?.citas_pendientes_hoy?.lista || []
										: resumen?.citas_pendientes_semana?.lista || [];

								if (!citas.length) {
									return <div className="text-center py-8 text-ink-faint text-sm">No hay citas agendadas.</div>;
								}

								return (
									<div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
										{citas.map((c) => (
											<div
												key={c.id}
												className="p-3 rounded-xs bg-paper/50 border border-nude/30 flex items-center justify-between
  text-sm"
											>
												<div>
													<h4 className="font-semibold text-ink">{c.paciente_nombre}</h4>
													<p className="text-xs text-ink-soft">
														Esp.: {c.especialista_nombre} | {c.espacio_nombre}
													</p>
												</div>
												<div className="text-right">
													<div className="font-data font-semibold text-ink text-xs">{formatTime(c.fecha_hora)}</div>
													<div className="text-[11px] text-ink-faint">{formatDateShort(c.fecha_hora)}</div>
												</div>
											</div>
										))}
									</div>
								);
							})()
						)}
					</div>
				</div>
			</div>

			{/* Modal de Fechas */}
			{mostrarModalFiltro && (
				<div className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
					<div className="bg-white rounded-md shadow-glass max-w-sm w-full p-6">
						<h3 className="text-lg font-display font-medium text-ink mb-4">Filtrar Fechas</h3>
						<div className="space-y-3">
							<div>
								<label className="block text-xs font-semibold text-ink-soft mb-1">Desde</label>
								<input
									type="date"
									value={desde}
									onChange={(e) => setDesde(e.target.value)}
									className="w-full p-2 border border-nude rounded-xs text-sm"
								/>
							</div>
							<div>
								<label className="block text-xs font-semibold text-ink-soft mb-1">Hasta</label>
								<input
									type="date"
									value={hasta}
									onChange={(e) => setHasta(e.target.value)}
									className="w-full p-2 border border-nude rounded-xs text-sm"
								/>
							</div>
						</div>
						<div className="mt-6 flex justify-end gap-2">
							<button
								onClick={() => setMostrarModalFiltro(false)}
								className="px-3 py-1.5 text-xs font-semibold text-ink-soft"
							>
								Cancelar
							</button>
							<button
								onClick={() => {
									setRango("personalizado");
									setMostrarModalFiltro(false);
								}}
								className="px-4 py-1.5 text-xs font-semibold bg-cafe text-white rounded-xs"
							>
								Aplicar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
