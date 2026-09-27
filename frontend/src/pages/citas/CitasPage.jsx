import "../../styles/modules/citas.css";

import { A, useNavigate } from "@solidjs/router";
import { apiFetch } from "../../services/api.js";
import { useAuth } from "../../stores/auth.store.js";
import {
  createSignal,
  onMount,
  For,
  Show
} from "solid-js";

function CitasPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [documentoPaciente, setDocumentoPaciente] =
    createSignal("");

  const [paciente, setPaciente] =
    createSignal(null);

  const [medicos, setMedicos] =
    createSignal([]);

  const [medicoId, setMedicoId] =
    createSignal("");

  const [fecha, setFecha] =
    createSignal("");

  const [franjas, setFranjas] =
    createSignal([]);

  const [horaInicio, setHoraInicio] =
    createSignal("");

  const [motivo, setMotivo] =
    createSignal("");

  const [mensaje, setMensaje] =
    createSignal("");

  const [guardando, setGuardando] =
    createSignal(false);

  const [citas, setCitas] =
    createSignal([]);

  const [cantidadCitas, setCantidadCitas] =
    createSignal(0);

  const [consultandoCitas, setConsultandoCitas] =
    createSignal(false);

  onMount(async () => {
    try {
      const response = await apiFetch(
        "/medicos"
      );

      if (!response.ok) {
        throw new Error(
          "No se pudieron consultar los médicos"
        );
      }

      const data = await response.json();

      setMedicos(data);
    } catch (error) {
      setMensaje(error.message);
    }
  });

  const buscarPaciente = async () => {
    setMensaje("");
    setPaciente(null);

    if (!documentoPaciente().trim()) {
      setMensaje(
        "Ingrese el documento del paciente"
      );
      return;
    }

    try {
      const response = await apiFetch(
        `/pacientes/documento/${documentoPaciente()}`
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Paciente no encontrado"
        );
      }

      setPaciente(data);
    } catch (error) {
      setMensaje(error.message);
    }
  };

  const consultarFranjas = async () => {
    setMensaje("");
    setFranjas([]);
    setHoraInicio("");

    if (!medicoId()) {
      setMensaje(
        "Seleccione un médico"
      );
      return;
    }

    if (!fecha()) {
      setMensaje(
        "Seleccione una fecha"
      );
      return;
    }

    try {
      const response = await apiFetch(
        `/disponibilidad/franjas?medicoId=${medicoId()}&fecha=${fecha()}`
      );

      const data = await response
        .json()
        .catch(() => []);

      if (!response.ok) {
        throw new Error(
          data.error ||
          "No se pudieron consultar las franjas"
        );
      }

      setFranjas(data);

      if (data.length === 0) {
        setMensaje(
          "No hay franjas disponibles para esa fecha"
        );
      }
    } catch (error) {
      setMensaje(error.message);
    }
  };

  const consultarCitas = async () => {
    setMensaje("");

    if (!medicoId()) {
      setMensaje(
        "Seleccione un médico"
      );
      return;
    }

    if (!fecha()) {
      setMensaje(
        "Seleccione una fecha"
      );
      return;
    }

    setConsultandoCitas(true);

    try {
      const response = await apiFetch(
        `/citas?medicoId=${medicoId()}&fecha=${fecha()}`
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          "No se pudieron consultar las citas"
        );
      }

      setCitas(data.citas || []);
      setCantidadCitas(data.cantidad || 0);
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setConsultandoCitas(false);
    }
  };

  const confirmarCita = async (citaId) => {
    setMensaje("");

    try {
      const response = await apiFetch(
        `/citas/${citaId}/confirmar`,
        {
          method: "PATCH"
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          "No se pudo confirmar la cita"
        );
      }

      await consultarCitas();

      setMensaje(
        "Cita confirmada correctamente."
      );
    } catch (error) {
      setMensaje(error.message);
    }
  };

  const agendarCita = async () => {
    setMensaje("");

    if (!paciente()) {
      setMensaje(
        "Primero debe buscar un paciente"
      );
      return;
    }

    if (!medicoId()) {
      setMensaje(
        "Seleccione un médico"
      );
      return;
    }

    if (!fecha()) {
      setMensaje(
        "Seleccione una fecha"
      );
      return;
    }

    if (!horaInicio()) {
      setMensaje(
        "Seleccione un horario disponible"
      );
      return;
    }

    setGuardando(true);

    try {
      const response = await apiFetch(
        "/citas",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            pacienteId: Number(paciente().id),
            medicoId: Number(medicoId()),
            fecha: fecha(),
            horaInicio: horaInicio(),
            motivo: motivo().trim() || null
          })
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          "No se pudo agendar la cita"
        );
      }

      const horaReservada =
        horaInicio();

      setFranjas((actuales) =>
        actuales.filter(
          (franja) =>
            franja.horaInicio !== horaReservada
        )
      );

      setHoraInicio("");
      setMotivo("");

      setMensaje(
        "Cita agendada correctamente."
      );
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setGuardando(false);
    }
  };

  const limpiarSeleccion = () => {
    setFranjas([]);
    setHoraInicio("");
    setCitas([]);
    setCantidadCitas(0);
  };

   const cerrarSesion = () => {
    auth.cerrarSesion();
    navigate("/", { replace: true });
  };

  return (
    <main class="citas-page">
      <header class="citas-header">
        <A
          class="citas-brand"
          href="/citas"
        >
          <span aria-hidden="true">
            ✚
          </span>

          PiedraAzul
        </A>

        <div class="citas-header-actions">
  <span class="citas-area">
    Agenda médica
  </span>

  <button
    type="button"
    class="btn citas-btn-outline"
    onClick={cerrarSesion}
  >
    Cerrar sesión
  </button>
</div>
      </header>

      <div class="citas-content">
        <div class="citas-heading">
          <p class="citas-eyebrow">
            ATENCIÓN Y BIENESTAR
          </p>

          <h1>
            Gestión de citas
          </h1>

          <p>
            Organiza cada encuentro, cuida cada detalle.
          </p>
        </div>

        <Show when={mensaje()}>
          <div
            class="citas-notice"
            role="status"
            aria-live="polite"
          >
            {mensaje()}
          </div>
        </Show>

        <div class="citas-layout">
          <section
            class="citas-card"
            aria-labelledby="nueva-cita"
          >
            <div class="citas-card-heading">
              <span
                class="citas-icon"
                aria-hidden="true"
              >
                ＋
              </span>

              <div>
                <h2 id="nueva-cita">
                  Agendar una cita
                </h2>

                <p>
                  Encuentra al paciente y elige un horario.
                </p>
              </div>
            </div>

            <div class="citas-step">
              <h3>
                <span>01</span>
                Paciente
              </h3>

              <label for="documentoPaciente">
                Documento del paciente
              </label>

              <div class="citas-search">
                <input
                  id="documentoPaciente"
                  class="form-input"
                  placeholder="Número de documento"
                  value={documentoPaciente()}
                  onInput={(event) => {
                    setDocumentoPaciente(
                      event.target.value
                    );
                    setPaciente(null);
                  }}
                />

                <button
                  class="btn citas-btn-outline"
                  type="button"
                  onClick={buscarPaciente}
                >
                  Buscar paciente
                </button>
              </div>

              <Show when={paciente()}>
                <div class="citas-patient">
                  <span aria-hidden="true">
                    ✓
                  </span>

                  <div>
                    <small>
                      Paciente seleccionado
                    </small>

                    <strong>
                      {paciente().nombre}{" "}
                      {paciente().apellido}
                    </strong>
                  </div>
                </div>
              </Show>
            </div>

            <div class="citas-step">
              <h3>
                <span>02</span>
                Fecha y disponibilidad
              </h3>

              <div class="citas-fields">
                <div>
                  <label for="medico">
                    Médico
                  </label>

                  <select
                    id="medico"
                    class="form-input"
                    value={medicoId()}
                    onInput={(event) => {
                      setMedicoId(
                        event.target.value
                      );
                      limpiarSeleccion();
                    }}
                  >
                    <option value="">
                      Selecciona un médico
                    </option>

                    <For each={medicos()}>
                      {(medico) => (
                        <option value={medico.id}>
                          {medico.nombre}{" "}
                          {medico.apellido}
                        </option>
                      )}
                    </For>
                  </select>
                </div>

                <div>
                  <label for="fechaCita">
                    Fecha de la cita
                  </label>

                  <input
                    id="fechaCita"
                    class="form-input"
                    type="date"
                    value={fecha()}
                    onInput={(event) => {
                      setFecha(
                        event.target.value
                      );
                      limpiarSeleccion();
                    }}
                  />
                </div>
              </div>

              <button
                class="btn citas-btn-outline citas-availability"
                type="button"
                onClick={consultarFranjas}
              >
                Consultar horarios disponibles
                <span aria-hidden="true">
                  →
                </span>
              </button>

              <Show when={franjas().length > 0}>
                <fieldset class="citas-slots">
                  <legend>
                    Selecciona un horario
                  </legend>

                  <div>
                    <For each={franjas()}>
                      {(franja) => (
                        <button
                          type="button"
                          class="citas-slot"
                          classList={{
                            "is-selected":
                              horaInicio() ===
                              franja.horaInicio
                          }}
                          aria-pressed={
                            horaInicio() ===
                            franja.horaInicio
                          }
                          onClick={() =>
                            setHoraInicio(
                              franja.horaInicio
                            )
                          }
                        >
                          {franja.horaInicio.slice(
                            0,
                            5
                          )}
                          {" – "}
                          {franja.horaFin.slice(
                            0,
                            5
                          )}
                        </button>
                      )}
                    </For>
                  </div>
                </fieldset>
              </Show>
            </div>

            <div class="citas-step citas-step-last">
              <h3>
                <span>03</span>
                Detalles de la consulta
              </h3>

              <label for="motivo">
                Motivo{" "}
                <span class="citas-optional">
                  (opcional)
                </span>
              </label>

              <textarea
                id="motivo"
                class="form-input"
                rows="3"
                placeholder="Describe brevemente el motivo de la cita…"
                value={motivo()}
                onInput={(event) =>
                  setMotivo(
                    event.target.value
                  )
                }
              />
            </div>

            <div class="citas-submit">
              <p>
                Verifica los datos antes de agendar.
              </p>

              <button
                type="button"
                class="btn btn-primary"
                onClick={agendarCita}
                disabled={guardando()}
              >
                {guardando()
                  ? "Agendando..."
                  : "Agendar cita"}

                <span aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          </section>

          <aside
            class="citas-card citas-agenda"
            aria-labelledby="agenda-title"
          >
            <div class="citas-card-heading">
              <span
                class="citas-icon"
                aria-hidden="true"
              >
                ☷
              </span>

              <div>
                <h2 id="agenda-title">
                  Citas del médico
                </h2>

                <p>
                  Consulta la agenda de la fecha elegida.
                </p>
              </div>
            </div>

            <div class="citas-agenda-body">
              <div class="citas-count">
                <div>
                  <small>
                    CITAS CARGADAS
                  </small>

                  <strong>
                    {cantidadCitas()}
                  </strong>
                </div>

                <span class="citas-date">
                  {fecha()
                    ? new Date(
                        fecha() +
                          "T12:00:00"
                      ).toLocaleDateString(
                        "es-CO",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        }
                      )
                    : "Sin fecha seleccionada"}
                </span>
              </div>

              <button
                type="button"
                class="btn citas-btn-outline citas-query"
                onClick={consultarCitas}
                disabled={consultandoCitas()}
              >
                {consultandoCitas()
                  ? "Consultando..."
                  : "Consultar citas"}
              </button>

              <Show
                when={citas().length > 0}
                fallback={
                  <div class="citas-empty">
                    <span aria-hidden="true">
                      ▦
                    </span>

                    <h3>
                      Tu agenda, en un solo lugar
                    </h3>

                    <p>
                      Selecciona un médico y una fecha.
                      Luego consulta sus citas para
                      verlas aquí.
                    </p>
                  </div>
                }
              >
                <ul class="citas-list">
                  <For each={citas()}>
                    {(cita) => (
                      <li>
                        <div class="citas-item-top">
                          <strong>
                            {cita.hora_inicio?.slice(
                              0,
                              5
                            )}
                            {" – "}
                            {cita.hora_fin?.slice(
                              0,
                              5
                            )}
                          </strong>

                          <span
                            class="citas-badge"
                            classList={{
                              "is-confirmed":
                                cita.estado ===
                                "CONFIRMADA"
                            }}
                          >
                            {cita.estado}
                          </span>
                        </div>

                        <p>
                          {cita.motivo ||
                            "Sin motivo registrado"}
                        </p>

                        <Show
                          when={
                            cita.estado ===
                            "PROGRAMADA"
                          }
                        >
                          <button
                            type="button"
                            class="btn citas-btn-outline"
                            onClick={() =>
                              confirmarCita(
                                cita.id
                              )
                            }
                          >
                            Confirmar cita
                          </button>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>

              <p class="citas-agenda-note">
                La disponibilidad se consulta según el
                médico y la fecha seleccionados.
              </p>
            </div>
          </aside>
        </div>

        <footer class="citas-footer">
          PiedraAzul
          <span>•</span>
          Cuidamos de ti en cada paso.
        </footer>
      </div>
    </main>
  );
}

export default CitasPage;