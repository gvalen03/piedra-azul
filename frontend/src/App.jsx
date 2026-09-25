import { createSignal, onMount, For, Show } from "solid-js";
import DisponibilidadForm from "./DisponibilidadForm.jsx";

function App() {
  const [medicos, setMedicos] = createSignal([]);
  const [cargando, setCargando] = createSignal(true);
  const [error, setError] = createSignal("");

  onMount(async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/medicos"
      );

      if (!response.ok) {
        throw new Error("Error al consultar los médicos");
      }

      const data = await response.json();
      setMedicos(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo conectar con el backend");
    } finally {
      setCargando(false);
    }
  });

  return (
    <main>
      <h1>Piedra Azul</h1>

      <p>Sistema de gestión de citas médicas</p>

      <h2>Médicos registrados</h2>

      <Show when={cargando()}>
        <p>Cargando médicos...</p>
      </Show>

      <Show when={error()}>
        <p>{error()}</p>
      </Show>

      <Show when={!cargando() && !error()}>
        <Show
          when={medicos().length > 0}
          fallback={<p>No hay médicos registrados.</p>}
        >
          <ul>
            <For each={medicos()}>
              {(medico) => (
                <li>
                  <strong>
                    {medico.nombre} {medico.apellido}
                  </strong>

                  <p>Documento: {medico.numero_documento}</p>
                  <p>Correo: {medico.email}</p>
                  <p>Teléfono: {medico.telefono}</p>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
<DisponibilidadForm />
    </main>
  );
}

export default App;