import { createSignal, onMount, For, Show } from "solid-js";
import { api } from "./api.js";
const DIAS = ["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];
export default function DisponibilidadForm() {
  const [profesionales, setProfesionales] = createSignal([]), [profesional, setProfesional] = createSignal("");
  const [dia, setDia] = createSignal("LUNES"), [inicio, setInicio] = createSignal("08:00"), [fin, setFin] = createSignal("12:00");
  const [intervalo, setIntervalo] = createSignal(30), [semanas, setSemanas] = createSignal(4);
  const [bloques, setBloques] = createSignal([]), [franjas, setFranjas] = createSignal([]), [fecha, setFecha] = createSignal("");
  const [error, setError] = createSignal(""), [mensaje, setMensaje] = createSignal(""), [ocupado, setOcupado] = createSignal(false), [consultado, setConsultado] = createSignal(false);
  const ejecutar = async tarea => {
    if (ocupado()) return;
    setOcupado(true); setError(""); setMensaje("");
    try { await tarea(); } catch (e) { setError(e.message); } finally { setOcupado(false); }
  };
  const cargar = async () => setBloques(await api(`/disponibilidad?profesionalId=${profesional()}`));
  const cargarProfesionales = () => ejecutar(async () => setProfesionales((await api("/profesionales")).filter(p => p.activo)));
  onMount(cargarProfesionales);
  const guardar = e => {
    e.preventDefault();
    ejecutar(async () => {
      await api("/disponibilidad", { method: "POST", body: JSON.stringify({ profesionalId: Number(profesional()), diaSemana: dia(), horaInicio: inicio(), horaFin: fin(), intervaloMinutos: Number(intervalo()), semanasHabilitadas: Number(semanas()) }) });
      setFranjas([]); setConsultado(false); await cargar(); setMensaje("Horario guardado correctamente.");
    });
  };
  return <>
    <Show when={!localStorage.getItem("token")}><p class="notice">Esta rama requiere una sesión de administrador del módulo de autenticación para guardar y administrar horarios.</p></Show>
    <Show when={error()}><div class="error" role="alert">{error()} <button onClick={() => profesional() ? ejecutar(cargar) : cargarProfesionales()} disabled={ocupado()}>Reintentar consulta</button></div></Show>
    <Show when={mensaje()}><p class="notice" role="status">{mensaje()}</p></Show>
    <section class="selector"><label>Profesional<select value={profesional()} disabled={ocupado()} onChange={e => { setProfesional(e.currentTarget.value); setBloques([]); setFranjas([]); setConsultado(false); if (profesional()) ejecutar(cargar); }}><option value="">Selecciona un profesional</option><For each={profesionales()}>{p => <option value={p.id}>{p.nombre} {p.apellido}</option>}</For></select></label><p>Configura uno o varios bloques por día, sin superponer horarios.</p></section>
    <div class="layout"><section class="card"><div class="card-head"><span class="icon">＋</span><div><h2>Configurar horario</h2><p>Define los días y la duración de cada cita.</p></div></div><form onSubmit={guardar}><fieldset disabled={!profesional() || ocupado()}>
      <label>Día de la semana<select value={dia()} onChange={e => setDia(e.currentTarget.value)}><For each={DIAS}>{d => <option>{d}</option>}</For></select></label>
      <div class="row"><label>Hora de inicio<input type="time" required value={inicio()} onInput={e => setInicio(e.currentTarget.value)} /></label><label>Hora de fin<input type="time" required value={fin()} onInput={e => setFin(e.currentTarget.value)} /></label></div>
      <div class="row"><label>Duración de la cita (min)<input type="number" required min="1" max="1440" value={intervalo()} onInput={e => setIntervalo(e.currentTarget.value)} /></label><label>Semanas disponibles<input type="number" required min="1" value={semanas()} onInput={e => setSemanas(e.currentTarget.value)} /></label></div>
      <p class="hint">Las semanas indican cuántas semanas hacia adelante se pueden reservar, contando desde hoy. Guardar el mismo día y horario actualiza ese bloque.</p><button class="primary" type="submit">{ocupado() ? "Procesando…" : "Guardar horario"}</button>
    </fieldset></form></section>
    <section class="card"><div class="card-head"><span class="icon">☷</span><div><h2>Horarios configurados</h2><p>Bloques activos del profesional seleccionado.</p></div></div><div class="body"><Show when={bloques().length} fallback={<p class="empty">{ocupado() ? "Consultando…" : profesional() ? "No hay bloques cargados." : "Selecciona un profesional para consultar sus horarios."}</p>}><For each={bloques()}>{b => <article><div><strong>{b.dia_semana}</strong><p>{b.hora_inicio.slice(0,5)} – {b.hora_fin.slice(0,5)}</p><small>Citas de {b.intervalo_minutos} min · {b.semanas_habilitadas} semanas</small></div><div class="actions"><button disabled={ocupado()} onClick={() => { setDia(b.dia_semana); setInicio(b.hora_inicio.slice(0,5)); setFin(b.hora_fin.slice(0,5)); setIntervalo(b.intervalo_minutos); setSemanas(b.semanas_habilitadas); }}>Usar valores</button><button disabled={ocupado()} onClick={() => ejecutar(async () => { await api(`/disponibilidad/${b.id}?profesionalId=${profesional()}`, { method: "DELETE" }); setFranjas([]); setConsultado(false); await cargar(); setMensaje("Bloque desactivado. Las citas existentes se conservan."); })}>Desactivar</button></div></article>}</For></Show></div></section></div>
    <section class="card preview"><div class="card-head"><span class="icon">▦</span><div><h2>Consultar horarios disponibles</h2><p>Comprueba qué franjas se pueden reservar en una fecha.</p></div></div><div class="body"><form onSubmit={e => { e.preventDefault(); ejecutar(async () => { setFranjas([]); setConsultado(false); setFranjas(await api(`/disponibilidad/franjas?profesionalId=${profesional()}&fecha=${fecha()}`)); setConsultado(true); }); }}><label>Fecha<input type="date" required value={fecha()} disabled={ocupado()} onInput={e => { setFecha(e.currentTarget.value); setFranjas([]); setConsultado(false); }} /></label><button disabled={!profesional() || ocupado()}>Consultar franjas</button></form><div class="slots"><For each={franjas()}>{f => <span>{f.horaInicio} – {f.horaFin}</span>}</For></div><Show when={consultado() && !franjas().length}><p class="empty">No hay horarios disponibles para esta fecha.</p></Show></div></section>
  </>;
}
