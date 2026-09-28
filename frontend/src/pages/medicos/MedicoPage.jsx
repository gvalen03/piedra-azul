import AtencionMedica from "../../components/medicos/AtencionMedica.jsx";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { apiFetch } from "../../services/api.js";
import { useAuth } from "../../stores/auth.store.js";
import "../../styles/modules/medico.css";
import DisponibilidadMedico from "../../components/medicos/DisponibilidadMedico.jsx";

const hoy = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const estados = { PROGRAMADA: "Programada", CONFIRMADA: "Confirmada", ATENDIDA: "Atendida", CANCELADA: "Cancelada" };
const nombre = (cita) => `${cita.paciente_nombre} ${cita.paciente_apellido}`;
const hora = (valor) => valor?.slice(0, 5) || "—";

function MedicoPage() {
  const [vista, setVista] = createSignal("agenda");
  const [guardandoAtencion, setGuardandoAtencion] = createSignal(false);
  const [aviso, setAviso] = createSignal("");
  const auth = useAuth();
  const navigate = useNavigate();
  const [fecha, setFecha] = createSignal(hoy());
  const [citas, setCitas] = createSignal([]);
  const [estado, setEstado] = createSignal("");
  const [busqueda, setBusqueda] = createSignal("");
  const [seleccion, setSeleccion] = createSignal(null);
  const [cargando, setCargando] = createSignal(false);
  const [error, setError] = createSignal("");
  let solicitud = 0;
  const visibles = createMemo(() => citas().filter(cita =>
    (!estado() || cita.estado === estado()) &&
    `${nombre(cita)} ${cita.paciente_documento}`.toLocaleLowerCase().includes(busqueda().trim().toLocaleLowerCase())
  ));
  const consultar = async () => {
    const actual = ++solicitud;
    setError(""); setCitas([]); setSeleccion(null);
    if (!fecha()) { setCargando(false); setError("Selecciona una fecha para consultar tu agenda."); return; }
    setCargando(true);
    try {
      const response = await apiFetch(`/citas/mi-agenda?fecha=${encodeURIComponent(fecha())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? "Tu sesión expiró. Cierra sesión e ingresa nuevamente." : data.error || "No se pudo cargar la agenda.");
      if (actual === solicitud) setCitas(data.citas);
    } catch (err) {
      if (actual === solicitud) setError(err.message);
    } finally { if (actual === solicitud) setCargando(false); }
  };
  const cambiarFecha = (valor) => { setFecha(valor); consultar(); };
  const moverDia = (dias) => {
    const date = new Date(`${fecha() || hoy()}T12:00:00`);
    date.setDate(date.getDate() + dias);
    cambiarFecha(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`);
  };
  onMount(consultar);

  return (
    <div class="medico-page">
      <header class="medico-topbar"><div class="medico-container medico-topbar-inner">
        <A href="/medico" class="medico-brand"><span aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" /></svg></span>PiedraAzul</A>
        <div class="medico-account"><span>{auth.user()?.nombre}<small>Médico / terapista</small></span><button class="medico-outline" onClick={() => { auth.cerrarSesion(); navigate("/", { replace: true }); }}>Cerrar sesión</button></div>
      </div></header>
      <main class="medico-container medico-main">
        <div class="medico-heading"><div><span class="medico-eyebrow">ATENCIÓN Y BIENESTAR</span><h1>Mi agenda médica</h1><p>Organiza cada encuentro, cuida cada detalle.</p></div><span class="medico-label">Portal del médico</span></div>
        <Show when={aviso()}><p class="disponibilidad-success" role="status">{aviso()}</p></Show>
        <nav class="medico-tabs" aria-label="Secciones del panel">
          <button disabled={guardandoAtencion()} class="medico-outline" aria-pressed={vista() === "agenda"} onClick={() => { setVista("agenda"); consultar(); }}>Mi agenda</button>
          <button disabled={guardandoAtencion()} class="medico-outline" aria-pressed={vista() === "disponibilidad"} onClick={() => setVista("disponibilidad")}>Mi disponibilidad</button>
        </nav>
        <Show when={vista() === "disponibilidad"}><DisponibilidadMedico medicoId={auth.user()?.medicoId} /></Show>
        <Show when={vista() === "agenda"}>
        <section class="medico-toolbar" aria-label="Fecha de la agenda">
          <div><label for="agenda-fecha">Fecha de consulta</label><input disabled={guardandoAtencion()} id="agenda-fecha" type="date" value={fecha()} onInput={e => cambiarFecha(e.currentTarget.value)} /></div>
          <div class="medico-day-controls"><button disabled={guardandoAtencion()} class="medico-outline" aria-label="Día anterior" onClick={() => moverDia(-1)}>←</button><button disabled={guardandoAtencion()} class="medico-outline" onClick={() => cambiarFecha(hoy())}>Hoy</button><button disabled={guardandoAtencion()} class="medico-outline" aria-label="Día siguiente" onClick={() => moverDia(1)}>→</button></div>
          <button class="btn btn-primary medico-refresh" disabled={cargando() || guardandoAtencion()} onClick={consultar}>{cargando() ? "Consultando…" : "Actualizar agenda"}</button>
        </section>
        <div class="medico-stats">
          <For each={[["Citas del día", null], ["Por atender", "pendientes"], ["Atendidas", "ATENDIDA"]]}>{([label, filtro]) => <div class="medico-stat"><span>{label}</span><strong>{cargando() || error() ? "—" : citas().filter(c => !filtro || (filtro === "pendientes" ? ["PROGRAMADA", "CONFIRMADA"].includes(c.estado) : c.estado === filtro)).length}</strong><small>En la fecha seleccionada</small></div>}</For>
        </div>
        <Show when={error()}><div class="medico-error" role="alert">{error()} <button class="medico-outline" onClick={consultar}>Reintentar</button></div></Show>
        <div class="medico-grid">
          <section class="medico-card" aria-labelledby="agenda-title" aria-busy={cargando()}>
            <div class="medico-card-header"><span class="medico-icon" aria-hidden="true">☷</span><div><h2 id="agenda-title">Mis citas</h2><p>Consulta los pacientes y horarios de tu jornada.</p></div></div>
            <div class="medico-filters"><div><label for="agenda-busqueda">Buscar paciente</label><input id="agenda-busqueda" type="search" placeholder="Nombre o documento" value={busqueda()} onInput={e => setBusqueda(e.currentTarget.value)} /></div><div><label for="agenda-estado">Estado</label><select id="agenda-estado" value={estado()} onChange={e => setEstado(e.currentTarget.value)}><option value="">Todos los estados</option><For each={Object.entries(estados)}>{([value, label]) => <option value={value}>{label}</option>}</For></select></div></div>
            <Show when={!cargando()} fallback={<p class="medico-empty" role="status">Cargando tu agenda…</p>}>
              <Show when={!error()}>
                <Show when={visibles().length} fallback={<div class="medico-empty"><span class="medico-icon" aria-hidden="true">▦</span><h3>{citas().length ? "Sin coincidencias" : "Tu agenda tiene espacio"}</h3><p>{citas().length ? "Prueba con otro nombre, documento o estado." : "No tienes citas registradas para esta fecha."}</p></div>}>
                  <ul class="medico-appointments"><For each={visibles()}>{cita => <li><button disabled={guardandoAtencion()} class="medico-appointment" aria-pressed={seleccion()?.id === cita.id} onClick={() => setSeleccion(cita)}><span class="medico-time">{hora(cita.hora_inicio)}<small>{hora(cita.hora_fin)}</small></span><span class="medico-patient"><strong>{nombre(cita)}</strong><small>Documento: {cita.paciente_documento}</small></span><span class={`medico-badge estado-${cita.estado.toLowerCase()}`}>{estados[cita.estado] || cita.estado}</span><span aria-hidden="true">→</span></button></li>}</For></ul>
                </Show>
              </Show>
            </Show>
          </section>
          <aside class="medico-card medico-detail" aria-labelledby="detalle-title">
            <div class="medico-card-header"><span class="medico-icon" aria-hidden="true">＋</span><div><h2 id="detalle-title">Detalle de la cita</h2><p>La información para tu próximo encuentro.</p></div></div>
            <div aria-live="polite"><Show keyed when={seleccion()} fallback={<div class="medico-empty"><span class="medico-icon" aria-hidden="true">▤</span><h3>Cada atención empieza aquí</h3><p>Selecciona una cita de tu agenda para ver la información del paciente.</p></div>}>{cita => <div class="medico-detail-body"><span class="medico-eyebrow">PACIENTE</span><h3>{nombre(cita)}</h3><dl><dt>Documento</dt><dd>{cita.paciente_documento}</dd><dt>Fecha</dt><dd>{new Intl.DateTimeFormat("es-CO", { dateStyle: "long" }).format(new Date(`${fecha()}T12:00:00`))}</dd><dt>Horario</dt><dd>{hora(cita.hora_inicio)} – {hora(cita.hora_fin)}</dd><dt>Estado</dt><dd>{estados[cita.estado] || cita.estado}</dd><dt>Motivo de consulta</dt><dd class="medico-reason">{cita.motivo || "No se registró un motivo de consulta."}</dd></dl><AtencionMedica cita={cita} onBusy={setGuardandoAtencion} onSaved={async () => { setAviso("Atención registrada. La cita quedó marcada como atendida."); await consultar(); }} />
            <button disabled={guardandoAtencion()} class="medico-outline" onClick={() => setSeleccion(null)}>Cerrar detalle</button></div>}</Show></div>
          </aside>
        </div>
        </Show>
        <footer class="medico-footer">PiedraAzul · Atención y bienestar</footer>
      </main>
    </div>
  );
}
export default MedicoPage;
