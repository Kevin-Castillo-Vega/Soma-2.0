import { NavLink } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

const linkClass = ({ isActive }) =>
	`block rounded-lg px-3 py-2 text-[14px] font-semibold transition-colors ${
		isActive ? "bg-ink text-paper" : "text-ink-soft hover:bg-nude"
	}`;

const grupoClass = "mb-1 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint first:mt-0";

export const Sidebar = () => {
	const { store } = useGlobalReducer();
	const rol = store.usuario?.rol;
	const esStaffOperativo = ["admin", "asistente"].includes(rol);
	const esAdmin = rol === "admin";

	return (
		<aside className="sticky top-16 flex h-[calc(100vh-4rem)] w-60 shrink-0 flex-col overflow-y-auto border-r border-ink/[0.08] bg-paper print:hidden">
			<nav className="flex-1 px-3 py-4">
				<p className={grupoClass}>Operación</p>
				{esAdmin ? (
					<NavLink to="/app/dashboard" className={linkClass}>
						Dashboard
					</NavLink>
				) : null}
				<NavLink to="/app/agenda" className={linkClass}>
					Agenda
				</NavLink>
				<NavLink to="/app/pacientes" className={linkClass}>
					Pacientes
				</NavLink>
				{/* Ventas: matching @rol_requerido("admin", "asistente") en api/ventas.py -- antes se mostraba a todos */}
				{esStaffOperativo ? (
					<NavLink to="/app/ventas" className={linkClass}>
						Ventas
					</NavLink>
				) : null}

				{esStaffOperativo ? (
					<>
						<p className={grupoClass}>Catálogo</p>
						<NavLink to="/app/nuevo-servicio" className={linkClass}>
							Servicios
						</NavLink>
						<NavLink to="/app/paquetes" className={linkClass}>
							Paquetes
						</NavLink>
					</>
				) : null}

				{esStaffOperativo || esAdmin ? (
					<>
						<p className={grupoClass}>Clínica</p>
						{esStaffOperativo ? (
							<NavLink to="/app/invitaciones" className={linkClass}>
								Invitaciones
							</NavLink>
						) : null}
						{esAdmin ? (
							<>
								<NavLink to="/app/espacios" className={linkClass}>
									Espacios
								</NavLink>
								<NavLink to="/app/perfil" className={linkClass}>
									Perfil
								</NavLink>
							</>
						) : null}
					</>
				) : null}
			</nav>
		</aside>
	);
};
