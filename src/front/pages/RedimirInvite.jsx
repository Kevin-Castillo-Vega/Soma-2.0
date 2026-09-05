import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { redimirInvite, verificarInvite } from "../services/invites";

export const RedimirInvite = () => {
	const { token } = useParams();
	const navigate = useNavigate();

	const [invite, setInvite] = useState(null);
	const [cargando, setCargando] = useState(true);
	const [errorInicial, setErrorInicial] = useState("");

	const [nombre, setNombre] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [enviando, setEnviando] = useState(false);
	const [mensaje, setMensaje] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		const cargar = async () => {
			try {
				setInvite(await verificarInvite(token));
			} catch (err) {
				setErrorInicial(err.message);
			} finally {
				setCargando(false);
			}
		};
		cargar();
	}, [token]);

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError("");
		setEnviando(true);
		try {
			await redimirInvite(token, { password, email, nombre });
			setMensaje("¡Cuenta creada con éxito! Llevándote al login…");
			setTimeout(() => navigate("/login"), 2000);
		} catch (err) {
			setError(err.message);
		} finally {
			setEnviando(false);
		}
	};

	if (cargando) {
		return <div className="p-10 text-center text-ink-faint">Cargando…</div>;
	}

	if (errorInicial) {
		return (
			<div className="mx-auto max-w-md px-6 py-16 text-center">
				<h1 className="mb-2 text-2xl">Link no válido</h1>
				<p className="text-ink-soft">{errorInicial}</p>
			</div>
		);
	}

	const esCliente = invite?.tipo === "cliente";

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6">
			<div className="w-96 rounded-xl border border-beige bg-white p-8 shadow-sm">
				<h1 className="mb-1 text-center font-display text-2xl font-bold text-cafe">Crea tu acceso</h1>
				<p className="mb-6 text-center text-[13.5px] text-ink-soft">
					{esCliente ? (
						<>
							Estás completando el registro de <span className="font-semibold text-ink">{invite.paciente_nombre}</span>
						</>
					) : (
						"Te van a dar de alta como parte del equipo de la clínica"
					)}
				</p>

				{mensaje ? (
					<div className="mb-5 rounded-lg border border-success-bg bg-success-bg p-3 text-center text-[13.5px] text-success-text">
						{mensaje}
					</div>
				) : null}
				{error ? (
					<div className="mb-5 rounded-lg border border-error-bg bg-error-bg p-3 text-center text-[13.5px] text-error-text">
						{error}
					</div>
				) : null}

				{!mensaje ? (
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						{esCliente ? (
							<div className="flex flex-col gap-1.5">
								<label className="text-[13px] font-semibold uppercase tracking-wider text-cafe">Tu correo</label>
								<input
									type="email"
									required
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									className="rounded-lg border border-beige p-3 outline-none focus:border-cafe focus:ring-2 focus:ring-cafe/20"
								/>
							</div>
						) : (
							<div className="flex flex-col gap-1.5">
								<label className="text-[13px] font-semibold uppercase tracking-wider text-cafe">Tu nombre</label>
								<input
									type="text"
									required
									value={nombre}
									onChange={(event) => setNombre(event.target.value)}
									className="rounded-lg border border-beige p-3 outline-none focus:border-cafe focus:ring-2 focus:ring-cafe/20"
								/>
							</div>
						)}

						<div className="flex flex-col gap-1.5">
							<label className="text-[13px] font-semibold uppercase tracking-wider text-cafe">Contraseña</label>
							<input
								type="password"
								required
								minLength={8}
								value={password}
								onChange={(event) => setPassword(event.target.value)}
								className="rounded-lg border border-beige p-3 outline-none focus:border-cafe focus:ring-2 focus:ring-cafe/20"
							/>
						</div>

						<button
							type="submit"
							disabled={enviando}
							className="mt-2 rounded-full bg-ink p-3 font-bold text-paper transition hover:bg-cafe disabled:opacity-60"
						>
							{enviando ? "Guardando…" : "Guardar y entrar"}
						</button>
					</form>
				) : null}
			</div>
		</div>
	);
};
