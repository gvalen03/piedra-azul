import { createSignal, For, Show } from "solid-js";
import { apiJson } from "../../services/api-json.js";
import "../../styles/modules/consulta-citas.css";

const estados = {
  PROGRAMADA: "Programada",
  CONFIRMADA: "Confirmada",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada"
};

const hora = value => value?.slice(0, 5) || "—";

export default function ConsultaCitasPaciente() {
  const [documento, setDocumento] = createSignal("");
  const [resultado, setResultado] = createSignal(null);
  const [cargando, setCargando] = createSignal(false);
  const [error, setError] = createSignal("");

  const consultar = async event => {
    event.preventDefault();
    const exacto = documento().trim();
    setResultado(null);
    setError("");

    if (!exacto) {
      setError("Ingresa el documento del paciente.");
      return;
    }

    setCargando(true);
    try {
      setResultado(await apiJson(`/historial/pacientes/${encodeURIComponent(exacto)}/citas`));
    } catch (err) {
      setError(err.message || "No se pudieron consultar las citas.");
    } finally {
      setCargando(false);
    }
  };

  const limpiarResultado = value => {
    setDocumento(value);
    setResultado(null);
    setError("");
  };

  return (
    <section class="consulta-citas" aria-labelledby="consulta-citas-title">
      <header class="consulta-citas-heading">
        <div class="consulta-citas-icon" aria-hidden="true">⌕</div>
        <div>
          <h2 id="consulta-citas-title">Consultar citas de un paciente</h2>
          <p>Busca por el número exacto del documento. Se muestran fechas pasadas y futuras, sin información clínica.</p>
        </div>
      </header>

      <form class="consulta-citas-form" onSubmit={consultar}>
        <div>
          <label for="consulta-citas-documento">Documento del paciente</label>
          <input
            id="consulta-citas-documento"
            name="documento"
            type="text"
            inputmode="text"
            maxlength="50"
            autocomplete="off"
            required
            value={documento()}
            onInput={event => limpiarResultado(event.currentTarget.value)}
            placeholder="Escribe el número de documento"
          />
        </div>
        <button type="submit" class="consulta-citas-button" disabled={cargando()}>
          {cargando() ? "Consultando…" : "Consultar citas"}
        </button>
      </form>

      <Show when={error()}><p class="consulta-citas-error" role="alert">{error()}</p></Show>
      <Show when={resultado()}>
        <div class="consulta-citas-result" aria-live="polite" aria-busy={cargando()}>
          <Show when={resultado().citas.length} fallback={<p class="consulta-citas-empty" role="status">No se encontraron citas para ese documento.</p>}>
            <div class="consulta-citas-result-heading">
              <div>
                <h3>{resultado().citas[0].paciente_nombre} {resultado().citas[0].paciente_apellido}</h3>
                <p>Documento: {resultado().citas[0].paciente_documento}</p>
              </div>
              <span>{resultado().citas.length} {resultado().citas.length === 1 ? "cita" : "citas"}</span>
            </div>
            <div class="consulta-citas-table-wrap">
              <table>
                <caption>Citas encontradas para el paciente</caption>
                <thead><tr><th scope="col">Fecha</th><th scope="col">Horario</th><th scope="col">Estado</th><th scope="col">Médico / terapista</th></tr></thead>
                <tbody>
                  <For each={resultado().citas}>{cita => (
                    <tr>
                      <td>{cita.fecha}</td>
                      <td>{hora(cita.hora_inicio)}–{hora(cita.hora_fin)}</td>
                      <td><span class={`consulta-citas-status status-${cita.estado.toLowerCase()}`}>{estados[cita.estado] || cita.estado}</span></td>
                      <td>{cita.medico_nombre} {cita.medico_apellido}</td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </Show>
    </section>
  );
}
