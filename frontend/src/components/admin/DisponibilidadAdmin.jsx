import { createMemo, createSignal, For, Show } from "solid-js";

import DisponibilidadProfesional from "../profesionales/DisponibilidadProfesional.jsx";

export default function DisponibilidadAdmin(props) {
  const [busqueda, setBusqueda] = createSignal("");
  const [seleccion, setSeleccion] = createSignal(null);

  const coincidencias = createMemo(() => {
    const termino = busqueda().trim().toLocaleLowerCase();

    if (termino.length < 2) return [];

    return props.profesionales
      .filter((profesional) => profesional.activo)
      .filter((profesional) =>
        `${profesional.nombre} ${profesional.apellido}`
          .toLocaleLowerCase()
          .includes(termino)
      )
      .slice(0, 10);
  });

  const seleccionar = (profesional) => {
    setSeleccion(profesional);
    setBusqueda(`${profesional.nombre} ${profesional.apellido}`);
  };

  return (
    <section class="admin-availability" aria-labelledby="disponibilidad-title">
      <div class="medico-card admin-availability-selector">
        <div class="medico-card-header">
          <span class="medico-icon" aria-hidden="true">◷</span>
          <div>
            <h2 id="disponibilidad-title">Disponibilidad de profesionales</h2>
            <p>Configura días, horarios, duración de las citas y semanas habilitadas.</p>
          </div>
        </div>

        <div class="admin-availability-body">
          <label for="admin-buscar-profesional">Buscar profesional</label>
          <input
            id="admin-buscar-profesional"
            type="search"
            autocomplete="off"
            placeholder="Escribe un nombre"
            value={busqueda()}
            onInput={(event) => {
              setBusqueda(event.currentTarget.value);
              setSeleccion(null);
            }}
          />

          <Show when={coincidencias().length > 0 && !seleccion()}>
            <ul class="admin-professional-results" aria-label="Profesionales encontrados">
              <For each={coincidencias()}>
                {(profesional) => (
                  <li>
                    <button type="button" onClick={() => seleccionar(profesional)}>
                      <strong>{profesional.nombre} {profesional.apellido}</strong>
                      <span>Profesional activo</span>
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>

          <Show when={busqueda().trim().length >= 2 && !seleccion() && !coincidencias().length}>
            <p class="admin-help">No se encontraron profesionales activos.</p>
          </Show>

          <Show when={seleccion()}>
            {(profesional) => (
              <div class="admin-professional-selected">
                <div>
                  <small>PROFESIONAL SELECCIONADO</small>
                  <strong>{profesional().nombre} {profesional().apellido}</strong>
                </div>
                <button class="medico-outline" type="button" onClick={() => {
                  setSeleccion(null);
                  setBusqueda("");
                }}>
                  Cambiar profesional
                </button>
              </div>
            )}
          </Show>
        </div>
      </div>

      <Show
        when={seleccion()}
        fallback={
          <div class="medico-card admin-availability-empty">
            <span class="medico-icon" aria-hidden="true">▦</span>
            <h3>Selecciona un profesional</h3>
            <p>Busca por nombre para consultar y administrar sus bloques de atención.</p>
          </div>
        }
      >
        {(profesional) => <DisponibilidadProfesional profesionalId={profesional().id} />}
      </Show>
    </section>
  );
}
