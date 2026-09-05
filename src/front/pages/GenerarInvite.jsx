import { useState } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { buscarPacientePorTelefono } from "../services/pacientes";
import { generarInvite } from "../services/invites";

const TIPOS = [
	{ value: "cliente", label: "Cliente (paciente ya registrado)" },
	{ value: "asistente", label: "Asistente" },
	{ value: "especialista", label: "Especialista" }
];

export const GenerarInvite = () => {
	const { store } = useGlobalReducer();
	const [tipo, setTipo] = useState("cliente");
	const [telefono, setTelefono] = useState("");
	const [pacienteEncontrado, setPacienteEncontrado] = useState(null);
	const [buscando, setBuscando] = useState(false);
	const [email, setEmail] = useState("");
	const [generando, setGenerando] = useState(false);
	const [link, setLink] = useState("");
	const [error, setError] = useState("");

	const handleBuscarPaciente = async () => {
		setError("");
		setPacienteEncontrado(null);
		if (!telefono) return;
		setBuscando(true);
		try {
			const resultados = await buscarPacientePorTelefono(store.token, telefono);
			const encontrado = Array.isArray(resultados) ? resultados[0] : null;
			if (!encontrado) {
				setError("No se encontró ningún paciente con ese teléfono.");
			} else {
				setPacienteEncontrado(encontrado);
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setBuscando(false);
		}
	};

	const handleGenerar = async (event) => {
		event.preventDefault();
		setError("");
		setLink("");

		if (tipo === "cliente" && !pacienteEncontrado) {
			setError("Busca y selecciona un paciente primero.");
			return;
		}
		if (tipo !== "cliente" && !email) {
			setError("El email es requerido.");
			return;
		}

		setGenerando(true);
		try {
			const { link: linkGenerado } = await generarInvite(store.token, {
				tipo,
				pacienteId: tipo === "cliente" ? pacienteEncontrado.id : undefined,
				email: tipo !== "cliente" ? email : undefined
			});
			setLink(linkGenerado);
		} catch (err) {
			setError(err.message);
		} finally {
			setGenerando(false);
		}
	};

	if (!["admin", "asistente"].includes(store.usuario?.rol)) {
		return (
			<div className="mx-auto max-w-3xl px-6 py-16 text-center">
				<h1 className="mb-2 text-2xl">No autorizado</h1>
				<p className="text-ink-soft">Generar invites solo lo pueden hacer Admin y Asistente.</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl px-6 py-10">
			<h1 className="mb-1 text-2xl">Invitar a la clínica</h1>
			<p className="mb-8 text-[14.5px] text-ink-soft">
				Genera un link de un solo uso para que un cliente, asistente o especialista cree su acceso.
			</p>

			{error ? (
				<div className="mb-5 rounded-sm bg-error-bg px-4 py-3 text-[13.5px] text-error-text">{error}</div>
			) : null}

			<form onSubmit={handleGenerar} className="rounded-md border border-ink/[0.08] bg-paper-alt p-6">
				<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="tipo">
					Tipo de invite
				</label>
				<select
					id="tipo"
					className="mb-5 w-full rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe"
					value={tipo}
					onChange={(event) => {
						setTipo(event.target.value);
						setPacienteEncontrado(null);
						setLink("");
					}}
				>
					{TIPOS.map((t) => (
						<option key={t.value} value={t.value}>
							{t.label}
						</option>
					))}
				</select>

				{tipo === "cliente" ? (
					<div className="mb-5">
						<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="telefono">
							Teléfono del paciente
						</label>
						<div className="flex gap-2">
							<input
								id="telefono"
								type="tel"
								className="flex-1 rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe"
								value={telefono}
								onChange={(event) => setTelefono(event.target.value)}
							/>
							<button
								type="button"
								onClick={handleBuscarPaciente}
								disabled={buscando}
								className="rounded-full border-[1.5px] border-beige px-5 text-[14px] font-semibold text-ink-soft hover:border-cafe hover:text-cafe disabled:opacity-60"
							>
								{buscando ? "Buscando…" : "Buscar"}
							</button>
						</div>
						{pacienteEncontrado ? (
							<p className="mt-2 text-[13.5px] text-success-text">
								Encontrado: <span className="font-semibold">{pacienteEncontrado.nombre_completo}</span>
							</p>
						) : null}
					</div>
				) : (
					<div className="mb-5">
						<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="email">
							Email
						</label>
						<input
							id="email"
							type="email"
							className="w-full rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</div>
				)}

				<button
					type="submit"
					disabled={generando}
					className="w-full rounded-full bg-ink px-6 py-2.5 text-[14px] font-bold text-paper hover:bg-cafe disabled:opacity-60"
				>
					{generando ? "Generando…" : "Generar link de invite"}
				</button>
			</form>

			{link ? (
				<div className="mt-6 rounded-md border border-ink/[0.08] bg-paper-alt p-5">
					<p className="mb-2 text-[13px] font-semibold text-ink-soft">
						Comparte este link (vence en 7 días, un solo uso):
					</p>
					<textarea
						readOnly
						rows={2}
						className="w-full resize-none rounded-sm border-[1.5px] border-beige bg-paper px-3 py-2 text-[13.5px] text-cafe outline-none"
						value={link}
						onFocus={(event) => event.target.select()}
					/>
				</div>
			) : null}
		</div>
	);
};
