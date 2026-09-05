import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMinutes } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import useGlobalReducer from "../hooks/useGlobalReducer";
import { listarCitas, crearCita, editarCita, cancelarCita } from "../services/citas";
import { listarUsuarios } from "../services/usuarios";
import { listarEspacios } from "../services/espacios";
import { listarServicios } from "../services/servicios";
import { buscarPacientePorTelefono, crearPaciente } from "../services/pacientes";

// Cita todavia no guarda duracion (depende de Servicio.duracion_min, pendiente de Kevin)
// -- mismo default de 60 min que usa el backend para chequear choques (ver src/api/citas.py).
const DURACION_DEFAULT_MIN = 60;

const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek: () => startOfWeek(new Date(), { locale: es }),
	getDay,
	locales: { es }
});

const aInputDatetime = (fecha) => format(fecha, "yyyy-MM-dd'T'HH:mm");

// El backend serializa fecha_hora sin sufijo de zona (ver Cita.serialize() en
// src/api/citas.py) pero los digitos que manda SIEMPRE son UTC -- new Date(str) sin
// "Z" hace que el navegador los interprete como hora LOCAL, desfasando todo por el
// offset de la zona horaria del usuario. Hay que forzar el parseo como UTC.
const parsearFechaHoraUTC = (fechaHoraStr) => new Date(fechaHoraStr.endsWith("Z") ? fechaHoraStr : `${fechaHoraStr}Z`);

const ESTADO_ETIQUETA = {
	agendada: "Agendada",
	reprogramada: "Reprogramada",
	completada: "Completada",
	cancelada: "Cancelada"
};

const colorPorEstado = (estado) => {
	if (estado === "reprogramada") return { backgroundColor: "#F3E4C8", color: "#8A5A18" };
	if (estado === "completada") return { backgroundColor: "#EDE7DF", color: "#4A4038" };
	return { backgroundColor: "#E4E9DC", color: "#4F6142" }; // agendada
};

export const Agenda = () => {
	const { store } = useGlobalReducer();
	const puedeCrear = store.usuario?.rol === "admin" || store.usuario?.rol === "asistente";

	const [citas, setCitas] = useState([]);
	const [especialistas, setEspecialistas] = useState([]);
	const [espacios, setEspacios] = useState([]);
	const [servicios, setServicios] = useState([]);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState("");
	const [modal, setModal] = useState(null); // null | { modo: "crear" | "editar", cita?, fechaHora? }
	const [guardando, setGuardando] = useState(false);
	const [errorModal, setErrorModal] = useState("");
	const [buscandoPaciente, setBuscandoPaciente] = useState(false);

	const cargarTodo = async () => {
		setCargando(true);
		setError("");
		try {
			const promesas = [listarCitas(store.token)];
			// Solo admin/asistente pueden crear citas -- no tiene sentido pedirles el resto a especialista.
			if (puedeCrear) {
				promesas.push(
					listarUsuarios(store.token, "especialista"),
					listarEspacios(store.token),
					listarServicios(store.token)
				);
			}
			const [citasResp, especialistasResp, espaciosResp, serviciosResp] = await Promise.all(promesas);
			setCitas(citasResp);
			if (puedeCrear) {
				setEspecialistas(especialistasResp);
				setEspacios(espaciosResp);
				setServicios(serviciosResp);
			}
		} catch (err) {
			setError(err.message);
		} finally {
			setCargando(false);
		}
	};

	useEffect(() => {
		cargarTodo();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const eventos = useMemo(
		() =>
			citas
				.filter((cita) => cita.estado !== "cancelada")
				.map((cita) => {
					const especialista = especialistas.find((usuario) => usuario.id === cita.especialista_id);
					const espacio = espacios.find((esp) => esp.id === cita.espacio_id);
					const inicio = parsearFechaHoraUTC(cita.fecha_hora);
					return {
						id: cita.id,
						title: [especialista?.nombre, espacio?.nombre].filter(Boolean).join(" · ") || `Cita #${cita.id}`,
						start: inicio,
						end: addMinutes(inicio, DURACION_DEFAULT_MIN),
						resource: cita
					};
				}),
		[citas, especialistas, espacios]
	);

	const abrirCrear = (slotInfo) => {
		if (!puedeCrear) return;
		setErrorModal("");
		setModal({
			modo: "crear",
			especialistaId: especialistas[0]?.id ?? "",
			espacioId: espacios[0]?.id ?? "",
			servicioId: servicios[0]?.id ?? "",
			fechaHora: aInputDatetime(slotInfo.start),
			telefono: "",
			paciente: null,
			mostrarAltaPaciente: false,
			nuevoNombre: "",
			nuevaCedula: ""
		});
	};

	const abrirEditar = (evento) => {
		const cita = evento.resource;
		setErrorModal("");
		setModal({
			modo: "editar",
			cita,
			especialistaId: cita.especialista_id,
			espacioId: cita.espacio_id,
			fechaHora: aInputDatetime(parsearFechaHoraUTC(cita.fecha_hora))
		});
	};

	const cerrarModal = () => setModal(null);

	// Busca el paciente por telefono (identificador acordado en docs/decisiones.md).
	// Si no existe, ofrece el alta rapida sin salir del flujo de agendado (issue #7,
	// camino A del journey) -- ver src/api/pacientes.py, GET /api/pacientes?telefono=.
	const handleBuscarPaciente = async () => {
		if (!modal.telefono) return;
		setErrorModal("");
		setBuscandoPaciente(true);
		try {
			const resultados = await buscarPacientePorTelefono(store.token, modal.telefono);
			if (resultados.length > 0) {
				setModal({ ...modal, paciente: resultados[0], mostrarAltaPaciente: false });
			} else {
				setModal({ ...modal, paciente: null, mostrarAltaPaciente: true });
			}
		} catch (err) {
			setErrorModal(err.message);
		} finally {
			setBuscandoPaciente(false);
		}
	};

	const handleCrearPacienteRapido = async () => {
		if (!modal.nuevoNombre || !modal.nuevaCedula) return;
		setErrorModal("");
		setBuscandoPaciente(true);
		try {
			const paciente = await crearPaciente(store.token, {
				nombreCompleto: modal.nuevoNombre,
				cedula: modal.nuevaCedula,
				telefono: modal.telefono
			});
			setModal({ ...modal, paciente, mostrarAltaPaciente: false });
		} catch (err) {
			setErrorModal(err.message);
		} finally {
			setBuscandoPaciente(false);
		}
	};

	const handleGuardar = async (event) => {
		event.preventDefault();
		setErrorModal("");

		if (modal.modo === "crear" && !modal.paciente) {
			setErrorModal("Busca al paciente por teléfono (o dalo de alta) antes de agendar.");
			return;
		}

		setGuardando(true);
		try {
			const fechaHoraIso = new Date(modal.fechaHora).toISOString();
			if (modal.modo === "crear") {
				await crearCita(store.token, {
					especialistaId: Number(modal.especialistaId),
					espacioId: Number(modal.espacioId),
					fechaHora: fechaHoraIso,
					pacienteId: modal.paciente.id,
					servicioId: modal.servicioId ? Number(modal.servicioId) : null
				});
			} else if (puedeCrear) {
				await editarCita(store.token, modal.cita.id, {
					especialistaId: Number(modal.especialistaId),
					espacioId: Number(modal.espacioId),
					fechaHora: fechaHoraIso
				});
			} else {
				// Especialista reagendando lo suyo: solo la fecha/hora -- ver
				// src/api/citas.py::editar_cita, ignora especialista_id/espacio_id
				// para este rol de todos modos, pero mejor ni mandarlos.
				await editarCita(store.token, modal.cita.id, { fechaHora: fechaHoraIso });
			}
			cerrarModal();
			await cargarTodo();
		} catch (err) {
			setErrorModal(err.message);
		} finally {
			setGuardando(false);
		}
	};

	const handleCancelar = async () => {
		if (!window.confirm("¿Cancelar esta cita? No hay penalización, pero sí se libera el horario.")) return;
		setErrorModal("");
		setGuardando(true);
		try {
			await cancelarCita(store.token, modal.cita.id);
			cerrarModal();
			await cargarTodo();
		} catch (err) {
			setErrorModal(err.message);
		} finally {
			setGuardando(false);
		}
	};

	return (
		<div className="mx-auto max-w-6xl px-6 py-10">
			<h1 className="mb-1 text-2xl">Agenda</h1>
			<p className="mb-6 text-[14.5px] text-ink-soft">
				{puedeCrear
					? "Haz clic en un horario libre para agendar, o en una cita existente para reprogramarla o cancelarla."
					: "Tus citas. Haz clic en una para reprogramarla o cancelarla."}
			</p>

			{error ? (
				<div className="mb-5 rounded-sm bg-error-bg px-4 py-3 text-[13.5px] text-error-text">{error}</div>
			) : null}

			<div className="rounded-md border border-ink/[0.08] bg-paper p-4" style={{ height: "70vh" }}>
				{cargando ? (
					<p className="p-6 text-center text-ink-faint">Cargando…</p>
				) : (
					<Calendar
						localizer={localizer}
						culture="es"
						events={eventos}
						startAccessor="start"
						endAccessor="end"
						selectable={puedeCrear}
						onSelectSlot={abrirCrear}
						onSelectEvent={abrirEditar}
						eventPropGetter={(evento) => ({ style: colorPorEstado(evento.resource.estado) })}
						messages={{
							next: "Sig.",
							previous: "Ant.",
							today: "Hoy",
							month: "Mes",
							week: "Semana",
							day: "Día",
							agenda: "Lista",
							noEventsInRange: "Sin citas en este rango."
						}}
					/>
				)}
			</div>

			{modal ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-6">
					<div className="glass-light w-full max-w-md rounded-lg p-7 shadow-glass">
						<h2 className="mb-5 text-xl">
							{modal.modo === "crear" ? "Nueva cita" : `Cita #${modal.cita.id} · ${ESTADO_ETIQUETA[modal.cita.estado]}`}
						</h2>

						{errorModal ? (
							<div className="mb-4 rounded-sm bg-error-bg px-4 py-3 text-[13.5px] text-error-text">{errorModal}</div>
						) : null}

						<form onSubmit={handleGuardar}>
							{modal.modo === "crear" ? (
								<div className="mb-4">
									<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="telefono-paciente">
										Paciente (buscar por teléfono)
									</label>
									<div className="flex gap-2">
										<input
											id="telefono-paciente"
											type="tel"
											required
											className="w-full rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe focus:ring-4 focus:ring-cafe/[0.14]"
											value={modal.telefono}
											onChange={(event) =>
												setModal({ ...modal, telefono: event.target.value, paciente: null, mostrarAltaPaciente: false })
											}
											placeholder="4421234567"
										/>
										<button
											type="button"
											disabled={buscandoPaciente || !modal.telefono}
											onClick={handleBuscarPaciente}
											className="shrink-0 rounded-sm border-[1.5px] border-beige px-4 py-2.5 text-[14px] font-semibold text-ink-soft hover:border-cafe hover:text-cafe disabled:opacity-60"
										>
											{buscandoPaciente ? "Buscando…" : "Buscar"}
										</button>
									</div>

									{modal.paciente ? (
										<p className="mt-2 text-[13.5px] text-cafe">✓ {modal.paciente.nombre_completo}</p>
									) : null}

									{modal.mostrarAltaPaciente ? (
										<div className="mt-3 rounded-sm border-[1.5px] border-dashed border-beige p-3">
											<p className="mb-2 text-[13px] text-ink-soft">
												No se encontró ningún paciente con ese teléfono. Da de alta uno nuevo:
											</p>
											<input
												type="text"
												className="mb-2 w-full rounded-sm border-[1.5px] border-beige bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-cafe focus:ring-4 focus:ring-cafe/[0.14]"
												placeholder="Nombre completo"
												value={modal.nuevoNombre}
												onChange={(event) => setModal({ ...modal, nuevoNombre: event.target.value })}
											/>
											<input
												type="text"
												className="mb-2 w-full rounded-sm border-[1.5px] border-beige bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-cafe focus:ring-4 focus:ring-cafe/[0.14]"
												placeholder="Cédula"
												value={modal.nuevaCedula}
												onChange={(event) => setModal({ ...modal, nuevaCedula: event.target.value })}
											/>
											<button
												type="button"
												disabled={buscandoPaciente || !modal.nuevoNombre || !modal.nuevaCedula}
												onClick={handleCrearPacienteRapido}
												className="rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-paper hover:bg-cafe disabled:opacity-60"
											>
												{buscandoPaciente ? "Guardando…" : "Crear y continuar"}
											</button>
										</div>
									) : null}
								</div>
							) : null}

							{modal.modo === "crear" ? (
								<div className="mb-4">
									<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="servicio">
										Servicio
									</label>
									<select
										id="servicio"
										className="w-full rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe focus:ring-4 focus:ring-cafe/[0.14]"
										value={modal.servicioId}
										onChange={(event) => setModal({ ...modal, servicioId: event.target.value })}
									>
										<option value="">Sin especificar</option>
										{servicios.map((servicio) => (
											<option key={servicio.id} value={servicio.id}>
												{servicio.nombre} · {servicio.duracion_min} min
											</option>
										))}
									</select>
								</div>
							) : null}

							{puedeCrear ? (
								<>
									<div className="mb-4">
										<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="especialista">
											Especialista
										</label>
										<select
											id="especialista"
											required
											className="w-full rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe focus:ring-4 focus:ring-cafe/[0.14]"
											value={modal.especialistaId}
											onChange={(event) => setModal({ ...modal, especialistaId: event.target.value })}
										>
											{especialistas.map((especialista) => (
												<option key={especialista.id} value={especialista.id}>
													{especialista.nombre}
												</option>
											))}
										</select>
									</div>

									<div className="mb-4">
										<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="espacio">
											Espacio
										</label>
										<select
											id="espacio"
											required
											className="w-full rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe focus:ring-4 focus:ring-cafe/[0.14]"
											value={modal.espacioId}
											onChange={(event) => setModal({ ...modal, espacioId: event.target.value })}
										>
											{espacios.map((espacio) => (
												<option key={espacio.id} value={espacio.id}>
													{espacio.nombre} ({espacio.tipo})
												</option>
											))}
										</select>
									</div>
								</>
							) : (
								// Especialista: no puede reasignar especialista_id/espacio_id (ver
								// src/api/citas.py::editar_cita), y tampoco tiene acceso a listarlos
								// (docs/decisiones.md no le da permiso a GET /api/espacios). Solo reagenda hora.
								<p className="mb-4 text-[13.5px] text-ink-soft">
									Puedes cambiar la fecha y hora. Para mover la cita a otro espacio, pide a Admin o Asistente.
								</p>
							)}

							<div className="mb-6">
								<label className="mb-1.5 block text-[13px] font-semibold text-ink-soft" htmlFor="fecha_hora">
									Fecha y hora
								</label>
								<input
									id="fecha_hora"
									type="datetime-local"
									required
									className="w-full rounded-sm border-[1.5px] border-beige bg-paper px-4 py-2.5 text-[15px] text-ink outline-none focus:border-cafe focus:ring-4 focus:ring-cafe/[0.14]"
									value={modal.fechaHora}
									onChange={(event) => setModal({ ...modal, fechaHora: event.target.value })}
								/>
							</div>

							<div className="flex flex-wrap items-center gap-3">
								<button
									type="submit"
									disabled={guardando}
									className="rounded-full bg-ink px-6 py-2.5 text-[14px] font-bold text-paper hover:bg-cafe disabled:opacity-60"
								>
									{guardando ? "Guardando…" : modal.modo === "crear" ? "Agendar" : "Guardar cambios"}
								</button>

								{modal.modo === "editar" && modal.cita.estado !== "completada" ? (
									<button
										type="button"
										onClick={handleCancelar}
										disabled={guardando}
										className="rounded-full border-[1.5px] border-error-text/40 px-6 py-2.5 text-[14px] font-semibold text-error-text hover:bg-error-bg disabled:opacity-60"
									>
										Cancelar cita
									</button>
								) : null}

								<button
									type="button"
									onClick={cerrarModal}
									className="ml-auto rounded-full border-[1.5px] border-beige px-6 py-2.5 text-[14px] font-semibold text-ink-soft hover:border-cafe hover:text-cafe"
								>
									Cerrar
								</button>
							</div>
						</form>
					</div>
				</div>
			) : null}
		</div>
	);
};
