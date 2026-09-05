import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

import { Layout } from "./pages/Layout";
import { ClienteLayout } from "./pages/ClienteLayout";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { OlvidePassword } from "./pages/OlvidePassword";
import { RestablecerPassword } from "./pages/RestablecerPassword";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import { Espacios } from "./pages/Espacios";
import { Agenda } from "./pages/Agenda";
import { Ventas } from "./pages/Ventas";
import { DashboardAdmin } from "./pages/DashboardAdmin";
import { AppIndexRedirect } from "./components/AppIndexRedirect";
import { NuevoServicio } from "./pages/NuevoServicio";
import { ListaPacientes } from "./pages/ListaPacientes";
import { NuevoPaciente } from "./pages/NuevoPaciente";
import { Perfil } from "./pages/Perfil";
import { GenerarInvite } from "./pages/GenerarInvite";
import { RedimirInvite } from "./pages/RedimirInvite";
import { Paquetes } from "./pages/Paquetes";
import { Recibo } from "./pages/Recibo";
import { ClienteDashboard } from "./pages/ClienteDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter(
	createRoutesFromElements(
		<>
			<Route path="/" element={<Landing />} errorElement={<h1>Not found!</h1>} />

			<Route path="/login" element={<Login />} errorElement={<h1>Not found!</h1>} />

			<Route path="/olvide-password" element={<OlvidePassword />} errorElement={<h1>Not found!</h1>} />

			<Route path="/restablecer-password" element={<RestablecerPassword />} errorElement={<h1>Not found!</h1>} />

			<Route path="/invite/:token" element={<RedimirInvite />} errorElement={<h1>Not found!</h1>} />

			<Route path="/app" element={<ProtectedRoute />} errorElement={<h1>Not found!</h1>}>
				{/* Staff application */}
				<Route element={<Layout />}>
					<Route index element={<AppIndexRedirect />} />
					<Route path="dashboard" element={<DashboardAdmin />} />
					<Route path="single/:theId" element={<Single />} />
					<Route path="demo" element={<Demo />} />
					<Route path="espacios" element={<Espacios />} />
					<Route path="agenda" element={<Agenda />} />
					<Route path="pacientes" element={<ListaPacientes />} />
					<Route path="pacientes/nuevo" element={<NuevoPaciente />} />
					<Route path="nuevo-servicio" element={<NuevoServicio />} />
					<Route path="ventas" element={<Ventas />} />
					<Route path="ventas/:id/recibo" element={<Recibo />} />
					<Route path="perfil" element={<Perfil />} />
					<Route path="invitaciones" element={<GenerarInvite />} />
					<Route path="paquetes" element={<Paquetes />} />
				</Route>

				{/* Client portal */}
				<Route path="cliente" element={<ClienteLayout />}>
					<Route index element={<ClienteDashboard />} />
				</Route>
			</Route>
		</>
	)
);
