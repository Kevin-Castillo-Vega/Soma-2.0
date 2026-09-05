import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { obtenerPacientes } from "../services/pacientes";
import { listarServicios } from "../services/servicios";
import { listarVentas, registrarVenta } from "../services/ventas";

const formatMoney = (amount) => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2
	}).format(amount || 0);
};

export const Ventas = () => {
	const { store } = useGlobalReducer();
	const token = store.token;

	// Datos del catálogo
	const [pacientes, setPacientes] = useState([]);
	const [servicios, setServicios] = useState([]);
	const [ventas, setVentas] = useState([]);

	// Estados del formulario
	const [pacienteId, setPacienteId] = useState("");
	const [tipoItem, setTipoItem] = useState("servicio"); // "servicio"
	const [servicioId, setServicioId] = useState("");
	const [montoTotal, setMontoTotal] = useState("");
	const [tipoPago, setTipoPago] = useState("completo"); // "completo" | "abono"
	const [montoAbono, setMontoAbono] = useState("");
	const [metodoPago, setMetodoPago] = useState("efectivo"); // "efectivo" | "tarjeta" | "transferencia"

	// Estados de control y feedback
	const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState(null);
	const [exito, setExito] = useState(null);
	const [filtroDeuda, setFiltroDeuda] = useState(false);

	// Cargar catálogos iniciales
	const cargarDatos = useCallback(async () => {
		if (!token) return;
		setCargandoCatalogos(true);
		setError(null);
		try {
			const [resPacientes, resServicios, resVentas] = await Promise.all([
				obtenerPacientes(token).catch(() => []),
				listarServicios(token).catch(() => []),
				listarVentas(token, filtroDeuda ? { con_deuda: true } : {}).catch(() => [])
			]);
			setPacientes(Array.isArray(resPacientes) ? resPacientes : []);
			setServicios(Array.isArray(resServicios) ? resServicios : []);
			setVentas(Array.isArray(resVentas) ? resVentas : []);
		} catch (err) {
			setError(err.message || "Error al cargar catálogos.");
		} finally {
			setCargandoCatalogos(false);
		}
	}, [token, filtroDeuda]);

	useEffect(() => {
		cargarDatos();
	}, [cargarDatos]);

	// Auto-completar precio del catálogo al seleccionar servicio
	const handleSeleccionarServicio = (id) => {
		setServicioId(id);
		const servicioEncontrado = servicios.find((s) => String(s.id) === String(id));
		if (servicioEncontrado) {
			const precio = Number(servicioEncontrado.precio || 0);
			setMontoTotal(precio);
			if (tipoPago === "completo") {
				setMontoAbono(precio);
			}
		} else {
			setMontoTotal("");
			setMontoAbono("");
		}
	};

	// Cambiar modo de pago (completo vs abono)
	const handleTipoPagoChange = (tipo) => {
		setTipoPago(tipo);
		if (tipo === "completo") {
			setMontoAbono(montoTotal);
		} else {
			setMontoAbono("");
		}
	};

	// Cálculo del monto a pagar y deuda estimada
	const montoFinalTotal = Number(montoTotal) || 0;
	const montoFinalPago = tipoPago === "completo" ? montoFinalTotal : Number(montoAbono) || 0;
	const deudaEstimada = Math.max(0, montoFinalTotal - montoFinalPago);

	// Enviar formulario
	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		setExito(null);

		if (!pacienteId) {
			setError("Debes seleccionar un paciente.");
			return;
		}

		if (!servicioId) {
			setError("Debes seleccionar un servicio.");
			return;
		}

		if (montoFinalTotal <= 0) {
			setError("El monto total debe ser mayor a 0.");
			return;
		}

		if (montoFinalPago <= 0) {
			setError("El monto a pagar/abonar debe ser mayor a 0.");
			return;
		}

		if (montoFinalPago > montoFinalTotal) {
			setError("El abono no puede ser mayor que el monto total.");
			return;
		}

		setGuardando(true);

		try {
			const payload = {
				paciente_id: Number(pacienteId),
				servicio_id: Number(servicioId),
				monto_total: montoFinalTotal,
				pago_monto: montoFinalPago,
				pago_metodo: metodoPago
			};

			await registrarVenta(token, payload);

			setExito("¡Venta registrada exitosamente!");
			// Limpiar formulario
			setPacienteId("");
			setServicioId("");
			setMontoTotal("");
			setMontoAbono("");
			setTipoPago("completo");
			setMetodoPago("efectivo");

			// Recargar ventas
			const resVentas = await listarVentas(token, filtroDeuda ? { con_deuda: true } : {});
			setVentas(Array.isArray(resVentas) ? resVentas : []);
		} catch (err) {
			setError(err.message || "Error al procesar la venta.");
		} finally {
			setGuardando(false);
		}
	};

	return (
		<div className="mx-auto max-w-6xl px-4 py-8">
			{/* Encabezado */}
			<div className="mb-8">
				<h1 className="font-display text-3xl font-bold text-ink">Ventas y Facturación</h1>
				<p className="mt-1 text-sm text-ink-soft">
					Registra cobros de servicios y paquetes, gestiona abonos y consulta el estado de cuenta.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				{/* Columna Izquierda: Formulario de Nueva Venta */}
				<div className="lg:col-span-5">
					<div className="rounded-2xl border border-ink/[0.08] bg-paper p-6 shadow-sm">
						<h2 className="font-display text-xl font-semibold text-ink mb-4">Nueva Venta / Cobro</h2>

						{error && (
							<div className="mb-4 rounded-xl bg-red-50 p-3.5 text-xs font-medium text-red-700 border border-red-200">
								{error}
							</div>
						)}

						{exito && (
							<div className="mb-4 rounded-xl bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 border border-emerald-200">
								{exito}
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-4">
							{/* 1. Selección de Paciente */}
							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
									Paciente *
								</label>
								<select
									value={pacienteId}
									onChange={(e) => setPacienteId(e.target.value)}
									disabled={cargandoCatalogos}
									required
									className="w-full rounded-xl border border-ink/[0.15] bg-white px-3.5 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
								>
									<option value="">-- Seleccionar Paciente --</option>
									{pacientes.map((p) => (
										<option key={p.id} value={p.id}>
											{p.nombre_completo} {p.telefono ? `(Céd: ${p.telefono})` : ""}
										</option>
									))}
								</select>
							</div>

							{/* 2. Selección de Servicio (Catálogo) */}
							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
									Servicio del Catálogo *
								</label>
								<select
									value={servicioId}
									onChange={(e) => handleSeleccionarServicio(e.target.value)}
									disabled={cargandoCatalogos}
									required
									className="w-full rounded-xl border border-ink/[0.15] bg-white px-3.5 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
								>
									<option value="">-- Seleccionar Servicio --</option>
									{servicios.map((s) => (
										<option key={s.id} value={s.id}>
											{s.nombre} — {formatMoney(s.precio)}
										</option>
									))}
								</select>
							</div>

							{/* 3. Precio Total (Autocompletado) */}
							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
									Precio Total
								</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={montoTotal}
									onChange={(e) => {
										setMontoTotal(e.target.value);
										if (tipoPago === "completo") setMontoAbono(e.target.value);
									}}
									placeholder="0.00"
									required
									className="w-full rounded-xl border border-ink/[0.15] bg-white px-3.5 py-2.5 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
								/>
							</div>

							{/* 4. Modalidad de Pago: Pago Completo o Abono */}
							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
									Modalidad de Pago
								</label>
								<div className="grid grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => handleTipoPagoChange("completo")}
										className={`rounded-xl py-2 text-xs font-semibold transition-all ${
											tipoPago === "completo"
												? "bg-ink text-paper shadow-sm"
												: "border border-ink/[0.15] bg-white text-ink-soft hover:bg-nude"
										}`}
									>
										Pago Completo
									</button>
									<button
										type="button"
										onClick={() => handleTipoPagoChange("abono")}
										className={`rounded-xl py-2 text-xs font-semibold transition-all ${
											tipoPago === "abono"
												? "bg-ink text-paper shadow-sm"
												: "border border-ink/[0.15] bg-white text-ink-soft hover:bg-nude"
										}`}
									>
										Abono / Cuota
									</button>
								</div>
							</div>

							{/* Monto de Abono si seleccionó pago parcial */}
							{tipoPago === "abono" && (
								<div className="rounded-xl bg-nude/40 p-3.5 border border-ink/[0.06]">
									<label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
										Monto a Abonar Hoy *
									</label>
									<input
										type="number"
										step="0.01"
										min="0.01"
										max={montoTotal || undefined}
										value={montoAbono}
										onChange={(e) => setMontoAbono(e.target.value)}
										placeholder="Ingrese monto del abono"
										required
										className="w-full rounded-xl border border-ink/[0.15] bg-white px-3.5 py-2 text-sm font-semibold text-ink focus:border-ink focus:outline-none"
									/>
									<div className="mt-2 flex justify-between text-xs text-ink-soft font-medium">
										<span>Saldo pendiente restante:</span>
										<span className="font-semibold text-amber-800">{formatMoney(deudaEstimada)}</span>
									</div>
								</div>
							)}

							{/* 5. Método de Pago */}
							<div>
								<label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
									Método de Pago
								</label>
								<select
									value={metodoPago}
									onChange={(e) => setMetodoPago(e.target.value)}
									className="w-full rounded-xl border border-ink/[0.15] bg-white px-3.5 py-2.5 text-sm text-ink focus:border-inkfocus:outline-none"
								>
									<option value="efectivo">Efectivo</option>
									<option value="tarjeta">Tarjeta (Débito/Crédito)</option>
									<option value="transferencia">Transferencia Bancaria / SINPE</option>
								</select>
							</div>

							{/* Resumen de cobro */}
							<div className="rounded-xl bg-ink/[0.03] p-3 text-xs space-y-1 text-ink-soft border border-ink/[0.05]">
								<div className="flex justify-between">
									<span>Total a Facturar:</span>
									<span className="font-semibold text-ink">{formatMoney(montoFinalTotal)}</span>
								</div>
								<div className="flex justify-between">
									<span>Cobro a registrar hoy:</span>
									<span className="font-semibold text-emerald-700">{formatMoney(montoFinalPago)}</span>
								</div>
								{deudaEstimada > 0 && (
									<div className="flex justify-between pt-1 border-t border-ink/[0.08]">
										<span className="font-medium text-amber-800">Queda como deuda:</span>
										<span className="font-bold text-amber-800">{formatMoney(deudaEstimada)}</span>
									</div>
								)}
							</div>

							{/* Botón Guardar */}
							<button
								type="submit"
								disabled={guardando || cargandoCatalogos}
								className="w-full rounded-full bg-ink py-3 text-sm font-bold text-paper transition hover:bg-cafe disabled:opacity-50"
							>
								{guardando ? "Procesando venta..." : "Registrar Venta"}
							</button>
						</form>
					</div>
				</div>

				{/* Columna Derecha: Historial de Ventas y Cobros */}
				<div className="lg:col-span-7">
					<div className="rounded-2xl border border-ink/[0.08] bg-paper p-6 shadow-sm">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="font-display text-xl font-semibold text-ink">Historial de Ventas</h2>

							<button
								type="button"
								onClick={() => setFiltroDeuda(!filtroDeuda)}
								className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
									filtroDeuda
										? "bg-amber-600 text-white"
										: "border border-ink/[0.15] bg-white text-ink-soft hover:bg-nude"
								}`}
							>
								{filtroDeuda ? "Mostrando: Con Deuda" : "Filtrar: Solo con Deuda"}
							</button>
						</div>

						{cargandoCatalogos ? (
							<p className="py-8 text-center text-sm text-ink-soft">Cargando registros...</p>
						) : ventas.length === 0 ? (
							<div className="rounded-xl border border-dashed border-ink/[0.15] py-12 text-center text-sm text-ink-soft">
								No hay ventas registradas {filtroDeuda ? "con deuda pendiente" : ""}.
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead>
										<tr className="border-b border-ink/[0.08] text-ink-soft">
											<th className="pb-3 font-semibold uppercase">ID / Fecha</th>
											<th className="pb-3 font-semibold uppercase">Paciente</th>
											<th className="pb-3 font-semibold uppercase">Total</th>
											<th className="pb-3 font-semibold uppercase">Abonado</th>
											<th className="pb-3 font-semibold uppercase">Estado / Deuda</th>
											<th className="pb-3 font-semibold uppercase"></th>
										</tr>
									</thead>
									<tbody className="divide-y divide-ink/[0.05]">
										{ventas.map((v) => {
											const tieneDeuda = (v.deuda_pendiente || 0) > 0;
											const pacienteObj = pacientes.find((p) => p.id === v.paciente_id);
											return (
												<tr key={v.id} className="hover:bg-ink/[0.01]">
													<td className="py-3">
														<span className="font-semibold text-ink">#{v.id}</span>
														<div className="text-[11px] text-ink-soft">
															{v.fecha ? new Date(v.fecha).toLocaleDateString("es-CR") : "-"}
														</div>
													</td>
													<td className="py-3 font-medium text-ink">
														{pacienteObj ? pacienteObj.nombre_completo : `Paciente #${v.paciente_id}`}
													</td>
													<td className="py-3 font-semibold text-ink">{formatMoney(v.monto_total)}</td>
													<td className="py-3 text-emerald-700 font-medium">{formatMoney(v.monto_abonado)}</td>
													<td className="py-3">
														{tieneDeuda ? (
															<span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
																Debe {formatMoney(v.deuda_pendiente)}
															</span>
														) : (
															<span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
																Saldado
															</span>
														)}
													</td>
													<td className="py-3 text-right">
														<Link to={`/app/ventas/${v.id}/recibo`} className="font-semibold text-cafe hover:underline">
															Recibo
														</Link>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
