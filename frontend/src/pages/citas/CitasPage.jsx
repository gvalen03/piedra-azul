import "../../styles/modules/citas.css";

import { A, useNavigate } from "@solidjs/router";
import { createSignal, onMount, For, Show } from "solid-js";

import { useAuth } from "../../stores/auth.store.js";
import { apiJson } from "../../services/api-json.js";

import RegistroPaciente
  from "../../components/pacientes/RegistroPaciente.jsx";

import ReprogramarCita
  from "../../components/citas/ReprogramarCita.jsx";

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

  const [horariosConsultados, setHorariosConsultados] =
    createSignal(false);

  const [mensaje, setMensaje] =
    createSignal("");

  const [esError, setEsError] =
    createSignal(false);

  const [ocupado, setOcupado] =
    createSignal(false);

  const [guardando, setGuardando] =
    createSignal(false);

  const [consultandoCitas, setConsultandoCitas] =
    createSignal(false);

  const [citas, setCitas] =
    createSignal([]);

  const [cantidadCitas, setCantidadCitas] =
    createSignal(0);

  const [vista, setVista] =
    createSignal("citas");

  const [cancelarId, setCancelarId] =
    createSignal(null);

  const [reprogramarId, setReprogramarId] =
    createSignal(null);

  // =========================
  // Utilidades
  // =========================

  const pendiente = (cita) => {
    return (
      ["PROGRAMADA", "CONFIRMADA"].includes(cita.estado) &&
      new Date(
        `${cita.fecha.slice(0, 10)}T${cita.hora_inicio.slice(0, 8)}-05:00`
      ) > new Date()
    );
  };

  const ejecutar = async (accion) => {
    if (ocupado()) return;

    setOcupado(true);
    setMensaje("");
    setEsError(false);

    try {
      await accion();
    } catch (error) {
      setEsError(true);
      setMensaje(
        error.message ||
        "Ocurrió un error inesperado."
      );
    } finally {
      setOcupado(false);
    }
  };

  // =========================
  // Médicos
  // =========================

  const cargarMedicos = async () => {
    const data = await apiJson("/medicos");

    setMedicos(
      data.filter((medico) => medico.activo)
    );
  };

  onMount(() => {
    ejecutar(cargarMedicos);
  });

  // =========================
  // Validaciones
  // =========================

  const validarSeleccion = () => {
    if (!medicoId() || !fecha()) {
      throw new Error(
        "Selecciona un médico y una fecha."
      );
    }
  };

  // =========================
  // Citas
  // =========================

  const cargarCitas = async () => {
    validarSeleccion();

    setConsultandoCitas(true);
    setCitas([]);
    setCantidadCitas(0);

    try {
      const data = await apiJson(
        `/citas?medicoId=${medicoId()}&fecha=${fecha()}`
      );

      setCitas(data.citas);
      setCantidadCitas(data.cantidad);
    } finally {
      setConsultandoCitas(false);
    }
  };

  const limpiarFranjas = () => {
    setFranjas([]);
    setHoraInicio("");
    setHorariosConsultados(false);
  };

  const limpiarSeleccion = () => {
    limpiarFranjas();
    setCitas([]);
    setCantidadCitas(0);
    setCancelarId(null);
    setReprogramarId(null);
  };

  // =========================
  // Paciente
  // =========================

  const buscarPaciente = () =>
    ejecutar(async () => {
      setPaciente(null);

      const documento =
        documentoPaciente().trim();

      if (!documento) {
        throw new Error(
          "Ingresa el documento del paciente."
        );
      }

      const data = await apiJson(
        `/pacientes/documento/${encodeURIComponent(documento)}`
      );

      if (data.estado !== "ACTIVO") {
        throw new Error(
          "El paciente está inactivo. Contacta al administrador."
        );
      }

      setPaciente(data);
    });

  // =========================
  // Disponibilidad
  // =========================

  const consultarFranjas = () =>
    ejecutar(async () => {
      limpiarFranjas();
      validarSeleccion();

      const data = await apiJson(
        `/disponibilidad/franjas?medicoId=${medicoId()}&fecha=${fecha()}`
      );

      setFranjas(data);
      setHorariosConsultados(true);
    });

  const consultarCitas = () =>
    ejecutar(cargarCitas);

  // =========================
  // Actualizar agenda
  // =========================

  const refrescarTrasCambio = async (texto) => {
    limpiarFranjas();

    setCancelarId(null);
    setReprogramarId(null);

    setMensaje(texto);
    setEsError(false);

    try {
      await cargarCitas();
    } catch (error) {
      setEsError(true);

      setMensaje(
        `${texto} No se pudo actualizar la agenda: ${error.message}`
      );
    }
  };

  // =========================
  // Confirmar cita
  // =========================

  const confirmarCita = (id) =>
    ejecutar(async () => {
      await apiJson(
        `/citas/${id}/confirmar`,
        {
          method: "PATCH"
        }
      );

      await refrescarTrasCambio(
        "Cita confirmada correctamente."
      );
    });

  // =========================
  // Cancelar cita
  // =========================

  const cancelarCita = (id) =>
    ejecutar(async () => {
      await apiJson(
        `/citas/${id}/cancelar`,
        {
          method: "PATCH"
        }
      );

      await refrescarTrasCambio(
        "Cita cancelada. El horario vuelve a estar disponible."
      );
    });

  // =========================
  // Agendar cita
  // =========================

  const agendarCita = () =>
    ejecutar(async () => {
      validarSeleccion();

      if (!paciente()) {
        throw new Error(
          "Busca o registra primero al paciente."
        );
      }

      if (!horaInicio()) {
        throw new Error(
          "Selecciona un horario disponible."
        );
      }

      setGuardando(true);

      try {
        await apiJson(
          "/citas",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              pacienteId: Number(
                paciente().id
              ),
              medicoId: Number(
                medicoId()
              ),
              fecha: fecha(),
              horaInicio: horaInicio(),
              motivo:
                motivo().trim() || null
            })
          }
        );

        setMotivo("");

        await refrescarTrasCambio(
          "Cita agendada correctamente."
        );
      } catch (error) {
        limpiarFranjas();
        throw error;
      } finally {
        setGuardando(false);
      }
    });

  // =========================
  // Sesión
  // =========================

  const cerrarSesion = () => {
    auth.cerrarSesion();

    navigate("/", {
      replace: true
    });
  };

  // =========================
  // Vista
  // =========================

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
            disabled={ocupado()}
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

        <nav class="agendador-tabs" aria-label="Secciones del agendador">
          <button class="btn citas-btn-outline" disabled={ocupado()} aria-pressed={vista() === "citas"} onClick={() => setVista("citas")}>Gestión de citas</button>
          <button class="btn citas-btn-outline" disabled={ocupado()} aria-pressed={vista() === "pacientes"} onClick={() => setVista("pacientes")}>Registrar paciente</button>
        </nav>
        <Show when={mensaje()}>
          <div
            class="citas-notice"
            classList={{ "is-error": esError() }}
            role={esError() ? "alert" : "status"}
            aria-live="polite"
          >
            {mensaje()}
          </div>
        </Show>

        <Show when={esError()}><button class="btn citas-btn-outline" disabled={ocupado()} onClick={() => ejecutar(async () => { await cargarMedicos(); if (medicoId() && fecha()) await cargarCitas(); })}>Actualizar datos</button></Show>
        <Show when={ocupado()}><p role="status">Procesando…</p></Show>
        <Show when={vista() === "pacientes"}><RegistroPaciente documento={documentoPaciente()} onBusy={setOcupado} onCancel={() => setVista("citas")} onRegistered={p => { setPaciente(p); setDocumentoPaciente(p.numero_documento); setVista("citas"); setEsError(false); setMensaje("Paciente registrado y seleccionado. Ya puedes agendar su cita."); }} /></Show>
        <Show when={vista() === "citas"}>
          <fieldset class="agendador-workspace" disabled={ocupado()}>
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

                  <button class="btn citas-btn-outline agendador-register" type="button" onClick={() => setVista("pacientes")}>Registrar un nuevo paciente</button>
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

                  <Show when={horariosConsultados() && franjas().length === 0}>
                    <p class="citas-notice" role="status">No hay horarios disponibles para este médico en la fecha seleccionada. Prueba con otra fecha o con otro médico.</p>
                  </Show>
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

                            <p><strong>{cita.paciente_nombre} {cita.paciente_apellido}</strong><br />Documento: {cita.paciente_documento}</p>
                            <p>
                              {cita.motivo ||
                                "Sin motivo registrado"}
                            </p>

                            <Show
                              when={
                                cita.estado === "PROGRAMADA" && pendiente(cita)
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
                            <Show when={pendiente(cita)}><div class="agendador-actions"><button class="btn citas-btn-outline" type="button" onClick={() => { setReprogramarId(cita.id); setCancelarId(null); }}>Reprogramar</button><button class="btn citas-btn-outline" type="button" onClick={() => { setCancelarId(cita.id); setReprogramarId(null); }}>Cancelar cita</button></div></Show>
                            <Show when={cancelarId() === cita.id}><div class="agendador-reprogramar"><p>¿Cancelar la cita de {cita.paciente_nombre}? El horario quedará libre.</p><button class="btn citas-btn-outline" onClick={() => cancelarCita(cita.id)}>Sí, cancelar cita</button> <button class="btn citas-btn-outline" onClick={() => setCancelarId(null)}>Conservar cita</button></div></Show>
                            <Show when={reprogramarId() === cita.id}><ReprogramarCita cita={cita} onBusy={setOcupado} onClose={() => setReprogramarId(null)} onSaved={refrescarTrasCambio} /></Show>
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

          </fieldset>
        </Show>
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
