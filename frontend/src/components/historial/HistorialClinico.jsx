import { createSignal, For, onMount, Show } from "solid-js";
import { apiFetch } from "../../services/api.js";
import "../../styles/modules/historial.css";
export default function HistorialClinico(props) {
  const [controles, setControles] = createSignal([]), [cargando, setCargando] = createSignal(true), [error, setError] = createSignal("");
  const cargar = async () => {
    setCargando(true); setError("");
    try {
      const response = await apiFetch(props.endpoint);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "No se pudo consultar el historial");
      setControles(data.controles);
    } catch (e) { setError(e.message); } finally { setCargando(false); }
  };
  onMount(cargar);
  return <section class="historial-section" aria-label="Historial de atenciones" aria-busy={cargando()}>
    <div class="historial-heading"><h3>Historial de atenciones</h3><button class="medico-outline" disabled={cargando()} onClick={cargar}>Actualizar</button></div>
    <Show when={error()}><p class="medico-error" role="alert">{error()}</p></Show>
    <Show when={!cargando()} fallback={<p role="status">Consultando historial…</p>}><Show when={!error()}>
      <Show when={controles().length} fallback={<p class="medico-empty">No hay atenciones registradas.</p>}><For each={controles()}>{control => <details class="historial-entry"><summary><strong>{control.fecha_cita}</strong><span>{control.medico_nombre} {control.medico_apellido}</span></summary><dl><For each={[["Motivo de consulta", "motivo_consulta"], ["Observaciones", "observaciones"], ["Diagnóstico", "diagnostico"], ["Tratamiento", "tratamiento"], ["Recomendaciones", "recomendaciones"]]}>{([label, key]) => <div><dt>{label}</dt><dd>{control[key] || "No registrado"}</dd></div>}</For></dl></details>}</For></Show>
    </Show></Show>
  </section>;
}
