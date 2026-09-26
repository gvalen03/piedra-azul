import {
  createSignal,
  onMount,
  For,
  Show
} from "solid-js";

function CitasForm() {
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

  onMount(async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/medicos"
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
      const response = await fetch(
        `http://localhost:3000/api/pacientes/documento/${documentoPaciente()}`
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
      const response = await fetch(
        `http://localhost:3000/api/disponibilidad/franjas?medicoId=${medicoId()}&fecha=${fecha()}`
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
      const response = await fetch(
        "http://localhost:3000/api/citas",
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

  return (
    <section>
      <h2>Gestión de citas</h2>

      <div>
        <label for="documentoPaciente">
          Documento del paciente
        </label>

        <input
          id="documentoPaciente"
          value={documentoPaciente()}
          onInput={(event) =>
            setDocumentoPaciente(
              event.target.value
            )
          }
        />

        <button
          type="button"
          onClick={buscarPaciente}
        >
          Buscar paciente
        </button>
      </div>

      <Show when={paciente()}>
        <p>
          Paciente:{" "}
          <strong>
            {paciente().nombre}{" "}
            {paciente().apellido}
          </strong>
        </p>
      </Show>

      <div>
        <label for="medico">
          Médico
        </label>

        <select
          id="medico"
          value={medicoId()}
          onInput={(event) => {
            setMedicoId(event.target.value);
            setFranjas([]);
            setHoraInicio("");
          }}
        >
          <option value="">
            Seleccione...
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
          Fecha
        </label>

        <input
          id="fechaCita"
          type="date"
          value={fecha()}
          onInput={(event) => {
            setFecha(event.target.value);
            setFranjas([]);
            setHoraInicio("");
          }}
        />

        <button
          type="button"
          onClick={consultarFranjas}
        >
          Consultar franjas
        </button>
      </div>

      <Show when={franjas().length > 0}>
        <div>
          <label for="horaInicio">
            Horario disponible
          </label>

          <select
            id="horaInicio"
            value={horaInicio()}
            onInput={(event) =>
              setHoraInicio(
                event.target.value
              )
            }
          >
            <option value="">
              Seleccione...
            </option>

            <For each={franjas()}>
              {(franja) => (
                <option
                  value={franja.horaInicio}
                >
                  {franja.horaInicio}
                  {" - "}
                  {franja.horaFin}
                </option>
              )}
            </For>
          </select>
        </div>
      </Show>

      <div>
        <label for="motivo">
          Motivo
        </label>

        <input
          id="motivo"
          value={motivo()}
          onInput={(event) =>
            setMotivo(event.target.value)
          }
        />
      </div>

      <button
        type="button"
        onClick={agendarCita}
        disabled={guardando()}
      >
        {guardando()
          ? "Agendando..."
          : "Agendar cita"}
      </button>

      <Show when={mensaje()}>
        <p>{mensaje()}</p>
      </Show>
    </section>
  );
}

export default CitasForm;