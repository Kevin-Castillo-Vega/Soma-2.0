import { Navigate, Outlet, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

// Guard de /app/* -- requiere sesión.
// Los clientes solo pueden acceder al portal de clientes.
export const ProtectedRoute = () => {
	const { store } = useGlobalReducer();
	const location = useLocation();

	if (!store.token) {
		return <Navigate to="/login" replace state={{ from: location }} />;
	}

	if (store.usuario?.rol === "cliente" && !location.pathname.startsWith("/app/cliente")) {
		return <Navigate to="/app/cliente" replace />;
	}

	return <Outlet />;
};
