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
  const cargar = async () => setBloques((await api("/disponibilidad/mia")).sort((a,b) => dias.indexOf(a.dia_semana) - dias.indexOf(b.dia_semana) || a.hora_inicio.localeCompare(b.hora_inicio)));
  const limpiarVista = () => { setFranjas([]); setConsultado(false); };
  onMount(() => ejecutar(cargar));
  return <section aria-label="Mi disponibilidad">
    <Show when={error()}><p class="medico-error" role="alert">{error()}</p></Show>
    <Show when={mensaje()}><p class="disponibilidad-success" role="status">{mensaje()}</p></Show>
    <div class="medico-grid">
      <section class="medico-card"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">＋</span><div><h2>Mis horarios de atención</h2><p>Define cuándo pueden reservar una cita contigo.</p></div></div>
        <form class="disponibilidad-form" onSubmit={e => { e.preventDefault(); ejecutar(async () => {
          await api("/disponibilidad/mia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ diaSemana: dia(), horaInicio: inicio(), horaFin: fin(), intervaloMinutos: Number(intervalo()), semanasHabilitadas: Number(semanas()) }) });
          limpiarVista(); setMensaje("Horario guardado. Ya se aplica a las nuevas reservas."); await cargar();
        }); }}><fieldset disabled={ocupado() || !props.medicoId}>
          <label for="disp-dia">Día de la semana</label><select id="disp-dia" value={dia()} onChange={e => setDia(e.currentTarget.value)}><For each={dias}>{d => <option>{d}</option>}</For></select>
          <div class="disponibilidad-row"><div><label for="disp-inicio">Hora de inicio</label><input id="disp-inicio" type="time" required value={inicio()} onInput={e => setInicio(e.currentTarget.value)} /></div><div><label for="disp-fin">Hora de fin</label><input id="disp-fin" type="time" required value={fin()} onInput={e => setFin(e.currentTarget.value)} /></div></div>
          <div class="disponibilidad-row"><div><label for="disp-intervalo">Duración por cita (min)</label><input id="disp-intervalo" type="number" required min="1" max="1440" value={intervalo()} onInput={e => setIntervalo(e.currentTarget.value)} /></div><div><label for="disp-semanas">Semanas habilitadas</label><input id="disp-semanas" type="number" required min="1" value={semanas()} onInput={e => setSemanas(e.currentTarget.value)} /></div></div>
          <p class="disponibilidad-hint">Las semanas cuentan desde hoy y se renuevan diariamente. Los horarios usan la hora de Colombia.</p>
          <p class="disponibilidad-hint">Guardar el mismo día y horario actualiza su duración y semanas. Para cambiar las horas, desactiva el bloque anterior y crea uno nuevo.</p>
          <button class="btn btn-primary" type="submit">{ocupado() ? "Procesando…" : "Guardar horario"}</button>
        </fieldset></form>
      </section>
      <section class="medico-card" aria-busy={ocupado()}><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">☷</span><div><h2>Bloques activos</h2><p>Puedes configurar varios bloques por día.</p></div></div><div class="medico-detail-body">
        <button class="medico-outline" disabled={ocupado()} onClick={() => ejecutar(cargar)}>Actualizar horarios</button>
        <Show when={bloques().length} fallback={<p class="medico-empty">{ocupado() ? "Consultando…" : "Aún no hay horarios cargados."}</p>}><For each={bloques()}>{b => <article class="disponibilidad-block"><strong>{b.dia_semana}</strong><p>{b.hora_inicio.slice(0,5)} – {b.hora_fin.slice(0,5)}</p><small>Citas de {b.intervalo_minutos} min · {b.semanas_habilitadas} semanas</small><div class="disponibilidad-actions"><button class="medico-outline" disabled={ocupado()} onClick={() => { setDia(b.dia_semana); setInicio(b.hora_inicio.slice(0,5)); setFin(b.hora_fin.slice(0,5)); setIntervalo(b.intervalo_minutos); setSemanas(b.semanas_habilitadas); document.getElementById("disp-intervalo")?.focus(); }}>Editar duración</button><button class="medico-outline" disabled={ocupado()} onClick={() => setPendiente(b.id)}>Desactivar</button></div>
          <Show when={pendiente() === b.id}><div class="disponibilidad-confirm"><p>Se retirará este horario de nuevas reservas. Las citas existentes se conservan.</p><button class="medico-outline" disabled={ocupado()} onClick={() => ejecutar(async () => { await api(`/disponibilidad/mia/${b.id}`, { method: "DELETE" }); setPendiente(null); limpiarVista(); setMensaje("Bloque desactivado. Las citas existentes se conservan."); await cargar(); })}>Confirmar desactivación</button> <button class="medico-outline" disabled={ocupado()} onClick={() => setPendiente(null)}>Volver</button></div></Show>
        </article>}</For></Show>
      </div></section>
    </div>
    <section class="medico-card disponibilidad-preview"><div class="medico-card-header"><span class="medico-icon" aria-hidden="true">▦</span><div><h2>Vista previa de reservas</h2><p>Consulta las franjas libres que verá el agendador.</p></div></div><div class="medico-detail-body"><form class="disponibilidad-actions" onSubmit={e => { e.preventDefault(); ejecutar(async () => { limpiarVista(); setFranjas(await api(`/disponibilidad/franjas?medicoId=${props.medicoId}&fecha=${fecha()}`)); setConsultado(true); }); }}><div><label for="disp-fecha">Fecha</label><input id="disp-fecha" required disabled={ocupado()} type="date" value={fecha()} onInput={e => { setFecha(e.currentTarget.value); limpiarVista(); }} /></div><button class="medico-outline" disabled={ocupado() || !props.medicoId}>Consultar franjas</button></form><div class="disponibilidad-slots"><For each={franjas()}>{f => <span>{f.horaInicio} – {f.horaFin}</span>}</For></div><Show when={consultado() && !franjas().length}><p class="medico-empty">No hay franjas libres para esa fecha. Revisa el día, las semanas habilitadas y las citas de tu agenda.</p></Show></div></section>
  </section>;
}
