import { Outlet, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const ClienteLayout = () => {
	const { store, dispatch } = useGlobalReducer();
	const navigate = useNavigate();

	const handleLogout = () => {
		dispatch({ type: "logout" });
		navigate("/login", { replace: true });
	};

	return (
		<div className="min-h-screen bg-paper">
			<header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-ink/[0.08] bg-paper px-6">
				<button onClick={() => navigate("/app/cliente")} className="font-display text-lg font-semibold text-ink">
					Soma
				</button>

				<div className="flex items-center gap-3">
					<span className="text-[13.5px] text-ink-soft">{store.usuario?.nombre}</span>
					<button
						onClick={handleLogout}
						className="rounded-full border-[1.5px] border-beige px-4 py-1.5 text-[13.5px] font-semibold text-ink-soft hover:border-cafe hover:text-cafe"
					>
						Cerrar sesión
					</button>
				</div>
			</header>

			<main>
				<Outlet />
			</main>
		</div>
	);
};
