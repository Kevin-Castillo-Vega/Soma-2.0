import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { estadoGoogleCalendar, urlConectarGoogleCalendar, desconectarGoogleCalendar } from "../services/clinica";

export const Perfil = () => {
	const { store } = useGlobalReducer();
	const [searchParams, setSearchParams] = useSearchParams();
	const [estado, setEstado] = useState(null);
	const [cargando, setCargando] = useState(true);
	const [procesando, setProcesando] = useState(false);
	const [error, setError] = useState("");

	const resultadoCallback = searchParams.get("google_calendar");

	const cargarEstado = async () => {
		setCargando(true);
		setError("");
		try {
			setEstado(await estadoGoogleCalendar(store.token));
		} catch (err) {
			setError(err.message);
		} finally {
			setCargando(false);
		}
	};

	useEffect(() => {
		cargarEstado();
		if (resultadoCallback) {
			// Limpia el query param del callback (#71) despues de leerlo, para que
			// un refresh de la pagina no vuelva a mostrar el banner.
			searchParams.delete("google_calendar");
			setSearchParams(searchParams, { replace: true });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleConectar = async () => {
		setProcesando(true);
		setError("");
		try {
			const { url } = await urlConectarGoogleCalendar(store.token);
			window.location.href = url;
		} catch (err) {
			setError(err.message);
			setProcesando(false);
		}
	};

	const handleDesconectar = async () => {
		if (!window.confirm("¿Desconectar Google Calendar? Las citas nuevas dejarán de sincronizarse.")) return;
		setProcesando(true);
		setError("");
		try {
			await desconectarGoogleCalendar(store.token);
			await cargarEstado();
		} catch (err) {
			setError(err.message);
		} finally {
			setProcesando(false);
		}
	};

	if (store.usuario?.rol !== "admin") {
		return (
			<div className="mx-auto max-w-3xl px-6 py-16 text-center">
				<h1 className="mb-2 text-2xl">No autorizado</h1>
				<p className="text-ink-soft">El perfil de la clínica solo lo puede administrar el Admin.</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-3xl px-6 py-10">
			<h1 className="mb-1 text-2xl">Perfil de la clínica</h1>
			<p className="mb-8 text-[14.5px] text-ink-soft">
				Conecta el Google Calendar que va a recibir las citas de tu clínica.
			</p>

			{resultadoCallback === "conectado" ? (
				<div className="mb-5 rounded-sm bg-success-bg px-4 py-3 text-[13.5px] text-success-text">
					Google Calendar conectado correctamente.
				</div>
			) : null}
			{resultadoCallback === "error" ? (
				<div className="mb-5 rounded-sm bg-error-bg px-4 py-3 text-[13.5px] text-error-text">
					No se pudo conectar Google Calendar. Intenta de nuevo.
				</div>
			) : null}
			{error ? (
				<div className="mb-5 rounded-sm bg-error-bg px-4 py-3 text-[13.5px] text-error-text">{error}</div>
			) : null}

			<div className="rounded-md border border-ink/[0.08] bg-paper-alt p-6">
				<h2 className="mb-1 text-[15px] font-semibold text-ink">Google Calendar</h2>

				{cargando ? (
					<p className="text-[14px] text-ink-faint">Cargando…</p>
				) : estado?.conectado ? (
					<>
						<p className="mb-4 text-[14px] text-ink-soft">
							Conectado como <span className="font-semibold text-ink">{estado.cuenta_email}</span>. Las citas de esta
							clínica se sincronizan a ese calendario, y cada especialista recibe notificación solo de sus propias
							citas.
						</p>
						<button
							onClick={handleDesconectar}
							disabled={procesando}
							className="rounded-full border-[1.5px] border-beige px-6 py-2.5 text-[14px] font-semibold text-error-text hover:border-error-text disabled:opacity-60"
						>
							{procesando ? "Desconectando…" : "Desconectar"}
						</button>
					</>
				) : (
					<>
						<p className="mb-4 text-[14px] text-ink-soft">
							Todavía no has conectado un calendario — las citas se van a seguir creando en Soma normalmente, solo no
							aparecerán en Google Calendar hasta que conectes una cuenta.
						</p>
						<button
							onClick={handleConectar}
							disabled={procesando}
							className="rounded-full bg-ink px-6 py-2.5 text-[14px] font-bold text-paper hover:bg-cafe disabled:opacity-60"
						>
							{procesando ? "Redirigiendo…" : "Conectar Google Calendar"}
						</button>
					</>
				)}
			</div>
		</div>
	);
};
