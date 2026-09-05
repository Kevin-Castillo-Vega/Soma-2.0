import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { AuthLayout, inputClass, labelClass, ErrorBanner, SuccessBanner } from "../components/AuthLayout";
import {
	login as loginRequest,
	loginGoogle as loginGoogleRequest,
	cambiarPassword as cambiarPasswordRequest
} from "../services/auth";
import { GoogleLoginButton } from "../components/GoogleLoginButton";

export const Login = () => {
	const { dispatch } = useGlobalReducer();
	const navigate = useNavigate();
	const location = useLocation();
	const destino = location.state?.from?.pathname || "/app";
	const mensajeExito = location.state?.mensaje || "";

	// "login" -> formulario normal | "cambiar-password" -> forzado por debe_cambiar_password (#23)
	const [paso, setPaso] = useState("login");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordNueva, setPasswordNueva] = useState("");
	const [passwordConfirmar, setPasswordConfirmar] = useState("");
	const [error, setError] = useState("");
	const [cargando, setCargando] = useState(false);
	const [sesionTemporal, setSesionTemporal] = useState(null);

	const handleGoogleSuccess = async (credential) => {
		setError("");
		setCargando(true);
		try {
			const { access_token, usuario, tipo } = await loginGoogleRequest(credential);
			dispatch({ type: "set_auth", payload: { token: access_token, usuario, tipo } });

			// Si es paciente lo llevamos a su portal, si es staff a /app (o su destino previo)
			if (tipo === "paciente") {
				navigate("/portal-paciente", { replace: true });
			} else {
				navigate(destino, { replace: true });
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setCargando(false);
		}
	};

	const handleLogin = async (event) => {
		event.preventDefault();
		setError("");
		setCargando(true);
		try {
			const { access_token, usuario } = await loginRequest(email, password);
			if (usuario.debe_cambiar_password) {
				setSesionTemporal({ token: access_token, usuario });
				setPaso("cambiar-password");
			} else {
				dispatch({ type: "set_auth", payload: { token: access_token, usuario } });
				navigate(destino, { replace: true });
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setCargando(false);
		}
	};

	const handleCambiarPassword = async (event) => {
		event.preventDefault();
		setError("");
		if (passwordNueva !== passwordConfirmar) {
			setError("Las contraseñas no coinciden.");
			return;
		}
		setCargando(true);
		try {
			await cambiarPasswordRequest(sesionTemporal.token, password, passwordNueva);
			const usuarioActualizado = { ...sesionTemporal.usuario, debe_cambiar_password: false };
			dispatch({ type: "set_auth", payload: { token: sesionTemporal.token, usuario: usuarioActualizado } });
			navigate(destino, { replace: true });
		} catch (err) {
			setError(err.message);
		} finally {
			setCargando(false);
		}
	};

	return (
		<AuthLayout>
			{paso === "login" ? (
				<form onSubmit={handleLogin}>
					<h1 className="mb-1 text-2xl">Inicia sesión</h1>
					<p className="mb-7 text-[14.5px] text-ink-soft">Agenda, expedientes e inventario, en un solo lugar.</p>

					<SuccessBanner mensaje={mensajeExito} />
					<ErrorBanner mensaje={error} />

					<div className="mb-4">
						<label className={labelClass} htmlFor="email">
							Correo
						</label>
						<input
							id="email"
							type="email"
							autoComplete="email"
							required
							className={inputClass}
							value={email}
							onChange={(event) => setEmail(event.target.value)}
						/>
					</div>

					<div className="mb-2">
						<label className={labelClass} htmlFor="password">
							Contraseña
						</label>
						<input
							id="password"
							type="password"
							autoComplete="current-password"
							required
							className={inputClass}
							value={password}
							onChange={(event) => setPassword(event.target.value)}
						/>
					</div>

					<Link to="/olvide-password" className="mb-6 block text-right text-[13px] font-semibold text-cafe">
						¿Olvidaste tu contraseña?
					</Link>

					<button
						type="submit"
						disabled={cargando}
						className="w-full rounded-full bg-ink py-3.5 text-[15px] font-bold text-paper hover:bg-cafe
disabled:opacity-60"
					>
						{cargando ? "Ingresando…" : "Iniciar sesión"}
					</button>

					<div className="my-5 flex items-center">
						<div className="flex-grow border-t border-beige" />
						<span className="mx-3 text-[12px] font-medium uppercase tracking-wider text-ink-soft">o continúa con</span>
						<div className="flex-grow border-t border-beige" />
					</div>

					<GoogleLoginButton onSuccess={handleGoogleSuccess} onError={(msg) => setError(msg)} disabled={cargando} />
				</form>
			) : (
				<form onSubmit={handleCambiarPassword}>
					<h1 className="mb-1 text-2xl">Actualiza tu contraseña</h1>
					<p className="mb-7 text-[14.5px] text-ink-soft">
						Es tu primer ingreso — define una contraseña nueva antes de continuar.
					</p>

					<ErrorBanner mensaje={error} />

					<div className="mb-4">
						<label className={labelClass} htmlFor="password-nueva">
							Contraseña nueva
						</label>
						<input
							id="password-nueva"
							type="password"
							autoComplete="new-password"
							required
							minLength={8}
							className={inputClass}
							value={passwordNueva}
							onChange={(event) => setPasswordNueva(event.target.value)}
						/>
					</div>

					<div className="mb-6">
						<label className={labelClass} htmlFor="password-confirmar">
							Confirma la contraseña nueva
						</label>
						<input
							id="password-confirmar"
							type="password"
							autoComplete="new-password"
							required
							minLength={8}
							className={inputClass}
							value={passwordConfirmar}
							onChange={(event) => setPasswordConfirmar(event.target.value)}
						/>
					</div>

					<button
						type="submit"
						disabled={cargando}
						className="w-full rounded-full bg-ink py-3.5 text-[15px] font-bold text-paper hover:bg-cafe disabled:opacity-60"
					>
						{cargando ? "Guardando…" : "Guardar y continuar"}
					</button>
				</form>
			)}
		</AuthLayout>
	);
};
