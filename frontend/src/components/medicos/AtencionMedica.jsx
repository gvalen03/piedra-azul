import { createSignal, For, Show } from "solid-js";
import { apiFetch } from "../../services/api.js";
import HistorialClinico from "../historial/HistorialClinico.jsx";
export default function AtencionMedica(props) {
  const [abierto, setAbierto] = createSignal(false), [guardando, setGuardando] = createSignal(false), [error, setError] = createSignal("");
  const [datos, setDatos] = createSignal({ motivoConsulta: props.cita.motivo || "", observaciones: "", diagnostico: "", tratamiento: "", recomendaciones: "" });
  const campos = [["motivoConsulta", "Motivo de consulta", true, 5000], ["observaciones", "Observaciones", true, 10000], ["diagnostico", "Diagnóstico", false, 10000], ["tratamiento", "Tratamiento", false, 10000], ["recomendaciones", "Recomendaciones", false, 10000]];
  const guardar = async e => {
    e.preventDefault(); if (guardando()) return;
    setGuardando(true); props.onBusy(true); setError("");
    try {
      const response = await apiFetch(`/historial/citas/${props.cita.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos()) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "No se pudo registrar la atención");
      await props.onSaved();
    } catch (e) { setError(e.message); } finally { setGuardando(false); props.onBusy(false); }
  };
  return <div class="atencion-medica">
    <Show when={["PROGRAMADA", "CONFIRMADA"].includes(props.cita.estado)}>
      <button class="btn btn-primary" disabled={guardando()} aria-expanded={abierto()} onClick={() => setAbierto(!abierto())}>{abierto() ? "Ocultar formulario" : "Registrar atención"}</button>
      <Show when={abierto()}><form onSubmit={guardar}><p class="historial-note">Al guardar, la cita quedará atendida. Revisa la información antes de finalizar. Solo se permite guardar desde la hora de inicio de la cita.</p><fieldset disabled={guardando()}><For each={campos}>{([key, label, required, max]) => <label for={`atencion-${key}`}>{label}{required ? " *" : " (opcional)"}<textarea id={`atencion-${key}`} rows="3" required={required} maxLength={max} value={datos()[key]} onInput={e => setDatos({ ...datos(), [key]: e.currentTarget.value })} /></label>}</For><Show when={error()}><p class="medico-error" role="alert">{error()}</p></Show><button class="btn btn-primary" type="submit">{guardando() ? "Guardando…" : "Guardar y finalizar atención"}</button></fieldset></form></Show>
    </Show>
    <HistorialClinico endpoint={`/historial/citas/${props.cita.id}`} />
  </div>;
}
