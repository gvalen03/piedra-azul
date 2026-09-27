import { apiFetch } from "../../services/api.js";
import {
  createSignal,
  onMount,
  For,
  Show
} from "solid-js";

const initialForm = {
  nombre: "",
  apellido: "",
  numeroDocumento: "",
  fechaNacimiento: "",
  email: "",
  telefono: "",
  direccion: "",
  eps: "",
  genero: "HOMBRE"
};

function RegistroPaciente() {
  const [medicos, setMedicos] = createSignal([]);
  const [cargando, setCargando] = createSignal(true);
  const [error, setError] = createSignal("");

  const [form, setForm] = createSignal({
    ...initialForm
  });

  const [formError, setFormError] =
    createSignal("");

  const [formSuccess, setFormSuccess] =
    createSignal("");

  const [guardando, setGuardando] =
    createSignal(false);

  // =========================
  // Consultar médicos
  // =========================

  onMount(async () => {
    try {
      const response = await apiFetch(
        "/medicos"
      );

      if (!response.ok) {
        throw new Error(
          "Error al consultar los médicos"
        );
      }

      const data = await response.json();

      setMedicos(data);
    } catch (err) {
      console.error(err);

      setError(
        "No se pudo conectar con el backend"
      );
    } finally {
      setCargando(false);
    }
  });

  // =========================
  // Formulario
  // =========================

  const handleChange =
    (field) => (event) => {
      const value =
        event.currentTarget.value;

      setForm((prev) => ({
        ...prev,
        [field]: value
      }));

      setFormError("");
      setFormSuccess("");
    };

  const validarFormulario = (datos) => {
    if (!datos.nombre.trim()) {
      return "El nombre es obligatorio.";
    }

    if (!datos.apellido.trim()) {
      return "El apellido es obligatorio.";
    }

    if (!datos.numeroDocumento.trim()) {
      return "El número de documento es obligatorio.";
    }

    if (!datos.fechaNacimiento) {
      return "La fecha de nacimiento es obligatoria.";
    }

    if (!datos.telefono.trim()) {
      return "El teléfono es obligatorio.";
    }

    if (!datos.genero) {
      return "Debe seleccionar un género.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const datos = {
      ...form()
    };

    const errorValidacion =
      validarFormulario(datos);

    if (errorValidacion) {
      setFormError(errorValidacion);
      return;
    }

    setGuardando(true);
    setFormError("");
    setFormSuccess("");

    try {
      const payload = {
        ...datos,
        email:
          datos.email.trim() || null,
        direccion:
          datos.direccion.trim() || null,
        eps:
          datos.eps.trim() || null
      };

      const response = await apiFetch(
        "/pacientes",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          "No se pudo registrar el paciente"
        );
      }

      setFormSuccess(
        `Paciente registrado correctamente: ${data.nombre} ${data.apellido}`
      );

      setForm({
        ...initialForm
      });

    } catch (err) {
      console.error(err);

      setFormError(
        err.message ||
        "Error al registrar el paciente"
      );

    } finally {
      setGuardando(false);
    }
  };

  // =========================
  // Vista
  // =========================

  return (
    <main
      style={{
        "font-family": "sans-serif",
        padding: "2rem"
      }}
    >
      <h1>Gestión de pacientes</h1>

      <section
        style={{
          display: "grid",
          gap: "2rem",
          "grid-template-columns":
            "minmax(300px, 500px) 1fr",
          margin: "2rem 0"
        }}
      >
        {/* REGISTRO DE PACIENTE */}

        <div>
          <h2>Registrar paciente</h2>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: "1rem"
            }}
          >
            <div>
              <label for="nombre">
                Nombre
              </label>

              <input
                id="nombre"
                value={form().nombre}
                onInput={
                  handleChange("nombre")
                }
              />
            </div>

            <div>
              <label for="apellido">
                Apellido
              </label>

              <input
                id="apellido"
                value={form().apellido}
                onInput={
                  handleChange("apellido")
                }
              />
            </div>

            <div>
              <label for="numeroDocumento">
                Número de documento
              </label>

              <input
                id="numeroDocumento"
                value={
                  form().numeroDocumento
                }
                onInput={
                  handleChange(
                    "numeroDocumento"
                  )
                }
              />
            </div>

            <div>
              <label for="fechaNacimiento">
                Fecha de nacimiento
              </label>

              <input
                id="fechaNacimiento"
                type="date"
                value={
                  form().fechaNacimiento
                }
                onInput={
                  handleChange(
                    "fechaNacimiento"
                  )
                }
              />
            </div>

            <div>
              <label for="email">
                Correo electrónico
              </label>

              <input
                id="email"
                type="email"
                value={form().email}
                onInput={
                  handleChange("email")
                }
              />
            </div>

            <div>
              <label for="telefono">
                Teléfono
              </label>

              <input
                id="telefono"
                value={form().telefono}
                onInput={
                  handleChange("telefono")
                }
              />
            </div>

            <div>
              <label for="direccion">
                Dirección
              </label>

              <input
                id="direccion"
                value={form().direccion}
                onInput={
                  handleChange("direccion")
                }
              />
            </div>

            <div>
              <label for="eps">
                EPS
              </label>

              <input
                id="eps"
                value={form().eps}
                onInput={
                  handleChange("eps")
                }
              />
            </div>

            <div>
              <label for="genero">
                Género
              </label>

              <select
                id="genero"
                value={form().genero}
                onChange={
                  handleChange("genero")
                }
              >
                <option value="HOMBRE">
                  Hombre
                </option>

                <option value="MUJER">
                  Mujer
                </option>

                <option value="OTRO">
                  Otro
                </option>
              </select>
            </div>

            <Show when={formError()}>
              <p>
                {formError()}
              </p>
            </Show>

            <Show when={formSuccess()}>
              <p>
                {formSuccess()}
              </p>
            </Show>

            <button
              type="submit"
              disabled={guardando()}
            >
              {guardando()
                ? "Registrando..."
                : "Registrar paciente"}
            </button>
          </form>
        </div>

        {/* LISTADO DE MÉDICOS */}

        <div>
          <h2>Médicos registrados</h2>

          <Show when={cargando()}>
            <p>Cargando médicos...</p>
          </Show>

          <Show when={error()}>
            <p>{error()}</p>
          </Show>

          <Show
            when={
              !cargando() && !error()
            }
          >
            <Show
              when={medicos().length > 0}
              fallback={
                <p>
                  No hay médicos registrados.
                </p>
              }
            >
              <ul>
                <For each={medicos()}>
                  {(medico) => (
                    <li>
                      <strong>
                        {medico.nombre}{" "}
                        {medico.apellido}
                      </strong>

                      <p>
                        Documento:{" "}
                        {
                          medico.numero_documento
                        }
                      </p>

                      <p>
                        Correo:{" "}
                        {medico.email}
                      </p>

                      <p>
                        Teléfono:{" "}
                        {medico.telefono}
                      </p>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </div>
      </section>
    </main>
  );
}

export default RegistroPaciente;