import { createSignal, For, onMount, Show } from "solid-js";
import { apiFetch } from "../../services/api.js";
const dias = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
export default function DisponibilidadMedico(props) {
  const [bloques, setBloques] = createSignal([]), [dia, setDia] = createSignal("LUNES");
  const [inicio, setInicio] = createSignal("08:00"), [fin, setFin] = createSignal("12:00");
  const [intervalo, setIntervalo] = createSignal(30), [semanas, setSemanas] = createSignal(4);
  const [ocupado, setOcupado] = createSignal(false), [error, setError] = createSignal(""), [mensaje, setMensaje] = createSignal("");
  const [fecha, setFecha] = createSignal(""), [franjas, setFranjas] = createSignal([]), [consultado, setConsultado] = createSignal(false);
  const [pendiente, setPendiente] = createSignal(null);
  const [editandoId, setEditandoId] = createSignal(null);
  const api = async (path, options) => {
    const res = await apiFetch(path, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "No se pudo completar la operación");
    return data;
  };
  const ejecutar = async accion => {
    if (ocupado()) return;
    setOcupado(true); setError(""); setMensaje("");
    try { await accion(); } catch (e) { setError(e.message); } finally { setOcupado(false); }
  };
  const cargar = async () => setBloques((await api(`/disponibilidad?medicoId=${props.medicoId}`)).sort((a,b) => dias.indexOf(a.dia_semana) - dias.indexOf(b.dia_semana) || a.hora_inicio.localeCompare(b.hora_inicio)));
  const limpiarVista = () => { setFranjas([]); setConsultado(false); };
  const reiniciarFormulario = () => {
    setEditandoId(null); setDia("LUNES"); setInicio("08:00"); setFin("12:00"); setIntervalo(30); setSemanas(4);
  };
  onMount(() => ejecutar(cargar));
  return <section aria-label="Disponibilidad médica">
    <Show when={error()}><p class="medico-error" role="alert">{error()}</p></Show>
    <Show when={mensaje()}><p class="disponibilidad-success" role="status">{mensaje()}</p></Show>
    <div class="medico-grid">
      <section class="medico-card"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">＋</span><div><h2>Horarios de atención</h2><p>Define cuándo pueden reservar una cita con este médico.</p></div></div>
        <form class="disponibilidad-form" onSubmit={e => { e.preventDefault(); ejecutar(async () => {
          const payload = { medicoId: Number(props.medicoId), diaSemana: dia(), horaInicio: inicio(), horaFin: fin(), intervaloMinutos: Number(intervalo()), semanasHabilitadas: Number(semanas()) };
          const editando = editandoId();
          await api(editando ? `/disponibilidad/${editando}` : "/disponibilidad", { method: editando ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          reiniciarFormulario(); limpiarVista(); setMensaje(editando ? "Cambios guardados. Las citas existentes se conservan." : "Horario guardado. Ya se aplica a las nuevas reservas."); await cargar();
        }); }}><fieldset disabled={ocupado() || !props.medicoId}>
          <h3>{editandoId() ? "Editar bloque de atención" : "Nuevo bloque de atención"}</h3>
          <label for="disp-dia">Día de la semana</label><select id="disp-dia" value={dia()} onChange={e => setDia(e.currentTarget.value)}><For each={dias}>{d => <option>{d}</option>}</For></select>
          <div class="disponibilidad-row"><div><label for="disp-inicio">Hora de inicio</label><input id="disp-inicio" type="time" required value={inicio()} onInput={e => setInicio(e.currentTarget.value)} /></div><div><label for="disp-fin">Hora de fin</label><input id="disp-fin" type="time" required value={fin()} onInput={e => setFin(e.currentTarget.value)} /></div></div>
          <div class="disponibilidad-row"><div><label for="disp-intervalo">Duración por cita (min)</label><input id="disp-intervalo" type="number" required min="1" max="1440" value={intervalo()} onInput={e => setIntervalo(e.currentTarget.value)} /></div><div><label for="disp-semanas">Semanas habilitadas</label><input id="disp-semanas" type="number" required min="1" value={semanas()} onInput={e => setSemanas(e.currentTarget.value)} /></div></div>
          <p class="disponibilidad-hint">Las semanas cuentan desde hoy y se renuevan diariamente. Los horarios usan la hora de Colombia.</p>
          <p class="disponibilidad-hint">Al editar, se actualizan el día, la franja, la duración y las semanas del bloque. Las citas ya registradas se conservan.</p>
          <div class="admin-actions"><button class="btn btn-primary" type="submit">{ocupado() ? "Procesando…" : editandoId() ? "Guardar cambios" : "Guardar horario"}</button><Show when={editandoId()}><button class="medico-outline" type="button" disabled={ocupado()} onClick={reiniciarFormulario}>Cancelar edición</button></Show></div>
        </fieldset></form>
      </section>
      <section class="medico-card" aria-busy={ocupado()}><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">☷</span><div><h2>Bloques activos</h2><p>Puedes configurar varios bloques por día.</p></div></div><div class="medico-detail-body">
        <button class="medico-outline" disabled={ocupado()} onClick={() => ejecutar(cargar)}>Actualizar horarios</button>
        <Show when={bloques().length} fallback={<p class="medico-empty">{ocupado() ? "Consultando…" : "Aún no hay horarios cargados."}</p>}><For each={bloques()}>{b => <article class="disponibilidad-block"><strong>{b.dia_semana}</strong><p>{b.hora_inicio.slice(0,5)} – {b.hora_fin.slice(0,5)}</p><small>Citas de {b.intervalo_minutos} min · {b.semanas_habilitadas} semanas</small><div class="disponibilidad-actions"><button class="medico-outline" disabled={ocupado()} onClick={() => { setDia(b.dia_semana); setInicio(b.hora_inicio.slice(0,5)); setFin(b.hora_fin.slice(0,5)); setIntervalo(b.intervalo_minutos); setSemanas(b.semanas_habilitadas); setEditandoId(b.id); document.getElementById("disp-intervalo")?.focus(); }}>Editar bloque</button><button class="medico-outline" disabled={ocupado()} onClick={() => setPendiente(b.id)}>Desactivar</button></div>
          <Show when={pendiente() === b.id}><div class="disponibilidad-confirm"><p>Se retirará este horario de nuevas reservas. Las citas existentes se conservan.</p><button class="medico-outline" disabled={ocupado()} onClick={() => ejecutar(async () => { await api(`/disponibilidad/${b.id}?medicoId=${props.medicoId}`, { method: "DELETE" }); setPendiente(null); limpiarVista(); setMensaje("Bloque desactivado. Las citas existentes se conservan."); await cargar(); })}>Confirmar desactivación</button> <button class="medico-outline" disabled={ocupado()} onClick={() => setPendiente(null)}>Volver</button></div></Show>
        </article>}</For></Show>
      </div></section>
    </div>
    <section class="medico-card disponibilidad-preview"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">▦</span><div><h2>Vista previa de reservas</h2><p>Consulta las franjas libres que verá el agendador.</p></div></div><div class="medico-detail-body"><form class="disponibilidad-actions" onSubmit={e => { e.preventDefault(); ejecutar(async () => { limpiarVista(); setFranjas(await api(`/disponibilidad/franjas?medicoId=${props.medicoId}&fecha=${fecha()}`)); setConsultado(true); }); }}><div><label for="disp-fecha">Fecha</label><input id="disp-fecha" required disabled={ocupado()} type="date" value={fecha()} onInput={e => { setFecha(e.currentTarget.value); limpiarVista(); }} /></div><button class="medico-outline" disabled={ocupado() || !props.medicoId}>Consultar franjas</button></form><div class="disponibilidad-slots"><For each={franjas()}>{f => <span>{f.horaInicio} – {f.horaFin}</span>}</For></div><Show when={consultado() && !franjas().length}><p class="medico-empty">No hay franjas libres para esa fecha. Revisa el día, las semanas habilitadas y las citas de tu agenda.</p></Show></div></section>
  </section>;
}
