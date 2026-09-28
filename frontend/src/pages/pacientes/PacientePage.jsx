import HistorialClinico from "../../components/historial/HistorialClinico.jsx";
import { createSignal, createMemo, For, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useAuth } from "../../stores/auth.store.js";
import { apiFetch } from "../../services/api.js";
import "../../styles/modules/medico.css";
import "../../styles/modules/paciente.css";
const estados = { PROGRAMADA: "Programada", CONFIRMADA: "Confirmada", ATENDIDA: "Atendida", CANCELADA: "Cancelada" };
const fechaTexto = f => new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(`${f.slice(0,10)}T12:00:00`));
const futuro = c => new Date(`${c.fecha.slice(0,10)}T${c.hora_inicio.slice(0,8)}-05:00`) > new Date();
const pendiente = c => ["PROGRAMADA", "CONFIRMADA"].includes(c.estado) && futuro(c);
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
export default function PacientePage() {
  const auth = useAuth(), navigate = useNavigate();
  const [vista, setVista] = createSignal("citas"), [citas, setCitas] = createSignal([]), [perfil, setPerfil] = createSignal(null), [medicos, setMedicos] = createSignal([]);
  const [ocupado, setOcupado] = createSignal(false), [error, setError] = createSignal(""), [mensaje, setMensaje] = createSignal("");
  const [filtro, setFiltro] = createSignal("proximas"), [cancelar, setCancelar] = createSignal(null);
  const [medico, setMedico] = createSignal(""), [fecha, setFecha] = createSignal(""), [franjas, setFranjas] = createSignal([]), [hora, setHora] = createSignal(""), [motivo, setMotivo] = createSignal(""), [consultado, setConsultado] = createSignal(false);
  const [email, setEmail] = createSignal(""), [telefono, setTelefono] = createSignal(""), [direccion, setDireccion] = createSignal("");
  const proximas = createMemo(() => citas().filter(pendiente).sort((a,b) => `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`)));
  const visibles = createMemo(() => filtro() === "proximas" ? proximas() : citas().filter(c => !pendiente(c)));
  const api = async (url, opciones) => {
    const res = await apiFetch(url, opciones); const data = await res.json();
    if (!res.ok) throw new Error(res.status === 401 ? "Tu sesión expiró. Vuelve a iniciar sesión." : data.message || data.error || "No se pudo completar la operación");
    return data;
  };
  const ejecutar = async accion => {
    if (ocupado()) return;
    setOcupado(true); setError(""); setMensaje("");
    try { await accion(); } catch (e) { setError(e.message); } finally { setOcupado(false); }
  };
  const cargarCitas = async () => setCitas((await api("/citas/mis-citas")).citas);
  const asignarPerfil = p => { setPerfil(p); setEmail(p.email || ""); setTelefono(p.telefono || ""); setDireccion(p.direccion || ""); };
  const cargar = () => ejecutar(async () => {
    const resultados = await Promise.allSettled([
      cargarCitas(), api("/pacientes/me").then(asignarPerfil), api("/medicos").then(data => setMedicos(data.filter(m => m.activo)))
    ]);
    const fallos = resultados.filter(r => r.status === "rejected");
    if (fallos.length) throw new Error([...new Set(fallos.map(r => r.reason.message))].join(" · "));
  });
  onMount(cargar);
  const limpiarFranjas = () => { setFranjas([]); setHora(""); setConsultado(false); };
  const cambiarVista = v => { setVista(v); setError(""); setMensaje(""); setCancelar(null); };
  const cambiarEstado = (id, accion) => ejecutar(async () => {
    await api(`/citas/mis-citas/${id}/${accion}`, { method: "PATCH" });
    setCancelar(null); limpiarFranjas(); setMensaje(accion === "cancelar" ? "Cita cancelada. El horario vuelve a estar disponible." : "Tu cita está confirmada.");
    await cargarCitas();
  });
  return <div class="medico-page paciente-page">
    <header class="medico-topbar"><div class="medico-container medico-topbar-inner"><a class="medico-brand" href="/paciente"><span aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" /></svg></span>PiedraAzul</a><div class="medico-account"><span>{auth.user()?.nombre}<small>Portal del paciente</small></span><button class="medico-outline" onClick={() => { auth.cerrarSesion(); navigate("/", { replace: true }); }}>Cerrar sesión</button></div></div></header>
    <main class="medico-container medico-main"><div class="medico-heading"><div><span class="medico-eyebrow">ATENCIÓN Y BIENESTAR</span><h1>Mi espacio de bienestar</h1><p>Organiza cada encuentro, cuida cada detalle.</p></div><span class="medico-label">Estamos para acompañarte</span></div>
      <nav class="medico-tabs" aria-label="Secciones del paciente"><For each={[["citas", "Mis citas"], ["reserva", "Reservar cita"], ["datos", "Mis datos"], ["historial", "Mi historial"]]}>{([key, label]) => <button class="medico-outline" disabled={ocupado()} aria-pressed={vista() === key} onClick={() => cambiarVista(key)}>{label}</button>}</For></nav>
      <Show when={error()}><div class="medico-error" role="alert">{error()}<button class="medico-outline" disabled={ocupado()} onClick={cargar}>Actualizar datos</button></div></Show>
      <Show when={mensaje()}><p class="paciente-success" role="status">{mensaje()}</p></Show>
      <Show when={ocupado()}><p class="paciente-status" role="status">Procesando, espera un momento…</p></Show>
      <Show when={vista() === "citas"}>
        <div class="medico-stats"><div class="medico-stat"><span>Próximas citas</span><strong>{proximas().length}</strong><small>Encuentros por atender</small></div><div class="medico-stat"><span>Confirmadas</span><strong>{proximas().filter(c => c.estado === "CONFIRMADA").length}</strong><small>Tu asistencia confirmada</small></div><div class="medico-stat"><span>Atenciones registradas</span><strong>{citas().filter(c => c.estado === "ATENDIDA").length}</strong><small>Citas marcadas como atendidas</small></div></div>
        <section class="medico-card"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">▦</span><div><h2>Mis encuentros</h2><p>Consulta y organiza tus citas médicas.</p></div></div><div class="paciente-body"><div class="paciente-actions"><label for="paciente-filtro">Ver citas<select id="paciente-filtro" value={filtro()} onChange={e => setFiltro(e.currentTarget.value)}><option value="proximas">Próximas</option><option value="anteriores">Anteriores y canceladas</option></select></label><button class="medico-outline" disabled={ocupado()} onClick={() => ejecutar(cargarCitas)}>Actualizar citas</button></div>
          <Show when={!ocupado() && !visibles().length}><div class="medico-empty"><h3>No hay citas en esta sección</h3><p>Cuando reserves una cita, podrás consultarla aquí.</p><button class="medico-outline" onClick={() => cambiarVista("reserva")}>Reservar una cita</button></div></Show>
          <For each={visibles()}>{c => <article class="paciente-cita"><div><span class={`medico-badge estado-${c.estado.toLowerCase()}`}>{estados[c.estado]}</span><h3>{fechaTexto(c.fecha)} · {c.hora_inicio.slice(0,5)}</h3><p>{c.medico_nombre} {c.medico_apellido}</p><small>Horario: {c.hora_inicio.slice(0,5)} – {c.hora_fin.slice(0,5)} · Hora de Colombia</small><p class="paciente-motivo">{c.motivo || "Sin motivo registrado"}</p></div><Show when={pendiente(c)}><div class="paciente-actions"><Show when={c.estado === "PROGRAMADA"}><button class="btn btn-primary" disabled={ocupado()} onClick={() => cambiarEstado(c.id, "confirmar")}>Confirmar asistencia</button></Show><button class="medico-outline" disabled={ocupado()} onClick={() => setCancelar(c.id)}>Cancelar cita</button></div></Show><Show when={cancelar() === c.id}><div class="paciente-confirm"><p>¿Quieres cancelar esta cita? El horario quedará libre para otras reservas.</p><button class="medico-outline" disabled={ocupado()} onClick={() => cambiarEstado(c.id, "cancelar")}>Sí, cancelar cita</button> <button class="medico-outline" disabled={ocupado()} onClick={() => setCancelar(null)}>Conservar cita</button></div></Show></article>}</For>
        </div></section>
      </Show>
      <Show when={vista() === "reserva"}><div class="medico-grid"><section class="medico-card"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">＋</span><div><h2>Reserva tu próxima cita</h2><p>Elige un médico y una fecha para consultar sus horarios.</p></div></div><div class="paciente-body"><fieldset disabled={ocupado() || !auth.user()?.pacienteId || perfil()?.estado !== "ACTIVO"}>
        <form onSubmit={e => { e.preventDefault(); ejecutar(async () => { limpiarFranjas(); setFranjas(await api(`/disponibilidad/franjas?medicoId=${medico()}&fecha=${fecha()}`)); setConsultado(true); }); }}><label for="reserva-medico">Médico<select id="reserva-medico" required value={medico()} onChange={e => { setMedico(e.currentTarget.value); limpiarFranjas(); }}><option value="">Selecciona un médico</option><For each={medicos()}>{m => <option value={m.id}>{m.nombre} {m.apellido}</option>}</For></select></label><label for="reserva-fecha">Fecha<input id="reserva-fecha" type="date" required min={hoy()} value={fecha()} onInput={e => { setFecha(e.currentTarget.value); limpiarFranjas(); }} /></label><button class="medico-outline">Consultar horarios</button></form>
        <Show when={consultado()}><form onSubmit={e => { e.preventDefault(); ejecutar(async () => {
          try {
            await api("/citas/mis-citas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ medicoId: Number(medico()), fecha: fecha(), horaInicio: hora(), motivo: motivo().trim() || null }) });
          } catch (e) { limpiarFranjas(); throw e; }
          limpiarFranjas(); setMotivo(""); setVista("citas"); setFiltro("proximas"); setMensaje("Tu cita fue reservada. Puedes confirmar tu asistencia en Mis citas."); await cargarCitas();
        }); }}><Show when={franjas().length} fallback={<p class="medico-empty">No hay horarios libres para esta fecha. Prueba otro día.</p>}><label for="reserva-hora">Horario disponible<select id="reserva-hora" required value={hora()} onChange={e => setHora(e.currentTarget.value)}><option value="">Selecciona una hora</option><For each={franjas()}>{f => <option value={f.horaInicio}>{f.horaInicio} – {f.horaFin}</option>}</For></select></label><label for="reserva-motivo">Motivo de consulta (opcional)<textarea id="reserva-motivo" rows="3" maxLength="2000" value={motivo()} onInput={e => setMotivo(e.currentTarget.value)} /></label><button class="btn btn-primary">Reservar cita</button></Show></form></Show>
      </fieldset><Show when={perfil() && perfil().estado !== "ACTIVO"}><p role="alert">Tu registro no está activo. Contacta al administrador para reservar.</p></Show></div></section><aside class="medico-card"><div class="medico-card-header"><h2>Antes de reservar</h2></div><div class="paciente-body paciente-info"><p>Los horarios se muestran en la hora de Colombia.</p><p>Tu reserva queda registrada a tu nombre. Solo se ofrecen franjas disponibles dentro de los horarios de atención del médico.</p><p>Si no puedes asistir, cancela tu cita desde «Mis citas» antes de su inicio.</p></div></aside></div></Show>
      <Show when={vista() === "datos"}><section class="medico-card"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">＋</span><div><h2>Mis datos personales</h2><p>Mantén tu información de contacto actualizada.</p></div></div><Show when={perfil()} fallback={<p class="medico-empty">No se pudieron cargar tus datos. Utiliza «Actualizar datos» para intentar nuevamente.</p>}>{p => <div class="paciente-body"><dl class="paciente-profile"><div><dt>Nombre completo</dt><dd>{p().nombre} {p().apellido}</dd></div><div><dt>Documento</dt><dd>{p().numero_documento}</dd></div><div><dt>Fecha de nacimiento</dt><dd>{p().fecha_nacimiento ? fechaTexto(p().fecha_nacimiento) : "Sin registrar"}</dd></div><div><dt>EPS</dt><dd>{p().eps || "Sin registrar"}</dd></div></dl><p class="paciente-info">Para corregir tus datos de identificación, contacta al administrador.</p><form class="paciente-contacto" onSubmit={e => { e.preventDefault(); ejecutar(async () => { asignarPerfil(await api("/pacientes/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email().trim() || null, telefono: telefono().trim(), direccion: direccion().trim() || null }) })); setMensaje("Tus datos de contacto se actualizaron correctamente."); }); }}><fieldset disabled={ocupado()}><label for="perfil-email">Correo electrónico<input id="perfil-email" type="email" maxLength="150" value={email()} onInput={e => setEmail(e.currentTarget.value)} /></label><label for="perfil-telefono">Teléfono<input id="perfil-telefono" type="tel" required maxLength="50" value={telefono()} onInput={e => setTelefono(e.currentTarget.value)} /></label><label for="perfil-direccion">Dirección<input id="perfil-direccion" maxLength="255" value={direccion()} onInput={e => setDireccion(e.currentTarget.value)} /></label><button class="btn btn-primary">Guardar datos de contacto</button></fieldset></form></div>}</Show></section></Show>
      <Show when={vista() === "historial"}><section class="medico-card"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">▤</span><div><h2>Mi historial clínico</h2><p>Consulta los resultados y recomendaciones de tus atenciones.</p></div></div><div class="paciente-body"><HistorialClinico endpoint="/historial/mio" /></div></section></Show>
      <footer class="medico-footer">PiedraAzul · Atención y bienestar</footer>
    </main>
  </div>;
}
