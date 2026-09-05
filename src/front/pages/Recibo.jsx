import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { obtenerRecibo } from "../services/ventas";

const formatMoney = (amount) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount || 0);

const formatFecha = (fecha) => (fecha ? new Date(fecha).toLocaleDateString("es-CR") : "-");

const METODOS = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };

export const Recibo = () => {
	const { id } = useParams();
	const { store } = useGlobalReducer();
	const [datos, setDatos] = useState(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const cargar = async () => {
			setCargando(true);
			setError("");
			try {
				setDatos(await obtenerRecibo(store.token, id));
			} catch (err) {
				setError(err.message);
			} finally {
				setCargando(false);
			}
		};
		cargar();
	}, [id, store.token]);

	if (cargando) return <div className="p-10 text-center text-ink-faint">Cargando…</div>;

	if (error || !datos) {
		return (
			<div className="mx-auto max-w-md px-6 py-16 text-center">
				<h1 className="mb-2 text-2xl">No se pudo cargar el recibo</h1>
				<p className="text-ink-soft">{error}</p>
				<Link to="/app/ventas" className="mt-4 inline-block text-cafe hover:underline">
					← Volver a Ventas
				</Link>
			</div>
		);
	}

	const { venta, concepto, clinica_nombre, paciente_nombre, paciente_telefono } = datos;

	return (
		<div className="mx-auto max-w-2xl px-6 py-10 print:max-w-full print:p-0">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
				<Link to="/app/ventas" className="text-[13.5px] text-ink-soft hover:text-cafe hover:underline">
					← Volver a Ventas
				</Link>
				<button
					onClick={() => window.print()}
					className="shrink-0 rounded-full bg-ink px-6 py-2.5 text-[14px] font-bold text-paper hover:bg-cafe"
				>
					Imprimir / Guardar como PDF
				</button>
			</div>

			<div className="rounded-xl border border-ink/[0.08] bg-white p-8 print:rounded-none print:border-0 print:p-0">
				<div className="mb-6 flex items-start justify-between border-b border-ink/[0.08] pb-6">
					<div>
						<h1 className="font-display text-2xl font-bold text-ink">{clinica_nombre || "Soma"}</h1>
						<p className="text-[13px] text-ink-soft">Recibo de pago</p>
					</div>
					<div className="text-right text-[13.5px] text-ink-soft">
						<p className="font-semibold text-ink">Recibo #{venta.id}</p>
						<p>{formatFecha(venta.fecha)}</p>
					</div>
				</div>

				<div className="mb-6">
					<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Cliente</p>
					<p className="text-[15px] font-medium text-ink">{paciente_nombre}</p>
					{paciente_telefono ? <p className="text-[13.5px] text-ink-soft">{paciente_telefono}</p> : null}
				</div>

				<table className="mb-6 w-full text-left text-[14px]">
					<thead>
						<tr className="border-b border-ink/[0.08] text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
							<th className="pb-2">Concepto</th>
							<th className="pb-2 text-right">Monto</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td className="py-2 text-ink">{concepto}</td>
							<td className="py-2 text-right font-medium text-ink">{formatMoney(venta.monto_total)}</td>
						</tr>
					</tbody>
				</table>

				{venta.pagos && venta.pagos.length > 0 ? (
					<div className="mb-6">
						<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Abonos registrados</p>
						<table className="w-full text-left text-[13.5px]">
							<tbody className="divide-y divide-ink/[0.06]">
								{venta.pagos.map((pago) => (
									<tr key={pago.id}>
										<td className="py-1.5 text-ink-soft">{formatFecha(pago.fecha)}</td>
										<td className="py-1.5 text-ink-soft">{METODOS[pago.metodo] || pago.metodo}</td>
										<td className="py-1.5 text-right text-ink">{formatMoney(pago.monto)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}

				<div className="space-y-1.5 border-t border-ink/[0.08] pt-4 text-[14px]">
					<div className="flex justify-between text-ink-soft">
						<span>Total</span>
						<span>{formatMoney(venta.monto_total)}</span>
					</div>
					<div className="flex justify-between text-ink-soft">
						<span>Abonado</span>
						<span>{formatMoney(venta.monto_abonado)}</span>
					</div>
					<div className="flex justify-between text-[15px] font-bold text-ink">
						<span>Saldo pendiente</span>
						<span>{formatMoney(venta.deuda_pendiente)}</span>
					</div>
				</div>
			</div>
		</div>
	);
};
