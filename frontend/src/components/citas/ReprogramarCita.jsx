import { createSignal, For, Show } from "solid-js";
import { apiJson } from "../../services/api-json.js";
export default function ReprogramarCita(props) {
  const [fecha,setFecha] = createSignal(props.cita.fecha.slice(0,10)), [hora,setHora] = createSignal("");
  const [franjas,setFranjas] = createSignal([]), [consultado,setConsultado] = createSignal(false), [error,setError] = createSignal("");
  const [busy,setBusy] = createSignal(false);
  const ejecutar = async accion => {
    if (busy()) return; setBusy(true); props.onBusy(true); setError("");
    try { await accion(); } catch(e) { setError(e.message); } finally { setBusy(false); props.onBusy(false); }
  };
  return <section class="agendador-reprogramar" aria-label="Reprogramar cita"><h3>Reprogramar cita</h3><p>Se conserva el paciente y el médico. El nuevo horario quedará pendiente de confirmación.</p><form onSubmit={e => { e.preventDefault(); ejecutar(async () => {
    setFranjas([]); setHora(""); setConsultado(false);
    const disponibles = await apiJson(`/citas/${props.cita.id}/franjas?fecha=${fecha()}`);
    setFranjas(disponibles.filter(f => fecha() !== props.cita.fecha.slice(0,10) || f.horaInicio !== props.cita.hora_inicio.slice(0,5)));
    setConsultado(true);
  }); }}><label for={`reprogramar-fecha-${props.cita.id}`}>Nueva fecha<input class="form-input" id={`reprogramar-fecha-${props.cita.id}`} type="date" required value={fecha()} onInput={e => { setFecha(e.currentTarget.value); setFranjas([]); setHora(""); setConsultado(false); }} /></label><button class="btn citas-btn-outline" disabled={busy()}>Consultar horarios</button></form>
    <Show when={consultado() && !franjas().length}><p>No hay otros horarios disponibles para esa fecha.</p></Show>
    <Show when={franjas().length}><form onSubmit={e => { e.preventDefault(); ejecutar(async () => {
      try { await apiJson(`/citas/${props.cita.id}/reprogramar`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ fecha:fecha(), horaInicio:hora() }) }); }
      catch(e) { setFranjas([]); setHora(""); setConsultado(false); throw e; }
      await props.onSaved(`Cita reprogramada para ${fecha()} a las ${hora()}. La cita anterior se liberó.`);
    }); }}><label for={`reprogramar-hora-${props.cita.id}`}>Nuevo horario<select class="form-input" id={`reprogramar-hora-${props.cita.id}`} required value={hora()} onChange={e => setHora(e.currentTarget.value)}><option value="">Selecciona un horario</option><For each={franjas()}>{f => <option value={f.horaInicio}>{f.horaInicio} – {f.horaFin}</option>}</For></select></label><button class="btn btn-primary" disabled={busy()}>Confirmar reprogramación</button></form></Show>
    <Show when={error()}><p class="citas-notice is-error" role="alert">{error()}</p></Show><button class="btn citas-btn-outline" disabled={busy()} onClick={props.onClose}>Volver</button>
  </section>;
}
