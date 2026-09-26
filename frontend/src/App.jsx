import {
  createSignal,
  onMount,
  Show,
  For
} from "solid-js";

import LoginPage from "./pages/auth/LoginPage.jsx";
import { useAuth } from "./stores/auth.store.js";

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

function App() {
  const auth = useAuth();

  const [medicos, setMedicos] = createSignal([]);
  const [cargando, setCargando] = createSignal(true);
  const [error, setError] = createSignal("");

  const [form, setForm] = createSignal({
    ...initialForm
  });

  const [formError, setFormError] = createSignal("");
  const [formSuccess, setFormSuccess] = createSignal("");
  const [guardando, setGuardando] = createSignal(false);

  onMount(async () => {
    auth.restaurarSesion();

    try {
      const response = await fetch(
        "http://localhost:3000/api/medicos"
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

  const handleChange = (field) => (event) => {
    const value = event.target.value;

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

      const response = await fetch(
        "http://localhost:3000/api/pacientes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response
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

  return (
    <Show
      when={auth.estaAutenticado()}
      fallback={<LoginPage />}
    >
      <main
        style={{
          "font-family": "sans-serif",
          padding: "2rem"
        }}
      >
        <h1>Piedra Azul</h1>

        <p>
          Sistema de gestión de citas médicas
        </p>

        <section
          style={{
            display: "grid",
            gap: "2rem",
            "grid-template-columns":
              "minmax(300px, 500px) 1fr",
            margin: "2rem 0"
          }}
        >
          <div>
            <h2>Registrar paciente</h2>

            <form
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gap: "1rem"
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: "0.5rem"
                }}
              >
                <label for="nombre">
                  Nombre
                </label>

                <input
                  id="nombre"
                  value={form().nombre}
                  onInput={handleChange(
                    "nombre"
                  )}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.5rem"
                }}
              >
                <label for="apellido">
                  Apellido
                </label>

                <input
                  id="apellido"
                  value={form().apellido}
                  onInput={handleChange(
                    "apellido"
                  )}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.5rem"
                }}
              >
                <label for="numeroDocumento">
                  Número de documento
                </label>

                <input
                  id="numeroDocumento"
                  value={
                    form().numeroDocumento
                  }
                  onInput={handleChange(
                    "numeroDocumento"
                  )}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.5rem"
                }}
              >
                <label for="fechaNacimiento">
                  Fecha de nacimiento
                </label>

                <input
                  id="fechaNacimiento"
                  type="date"
                  value={
                    form().fechaNacimiento
                  }
                  onInput={handleChange(
                    "fechaNacimiento"
                  )}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.5rem"
                }}
              >
                <label for="email">
                  Correo electrónico
                </label>

                <input
                  id="email"
                  type="email"
                  value={form().email}
                  onInput={handleChange(
                    "email"
                  )}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.5rem"
                }}
              >
                <label for="telefono">
                  Teléfono
                </label>

                <input
                  id="telefono"
                  value={form().telefono}
                  onInput={handleChange(
                    "telefono"
                  )}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.5rem"
                }}
              >
                <label for="direccion">
                  Dirección
                </label>

                <input
                  id="direccion"
                  value={form().direccion}
                  onInput={handleChange(
                    "direccion"
                  )}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.5rem"
                }}
              >
                <label for="eps">
                  EPS
                </label>

                <input
                  id="eps"
                  value={form().eps}
                  onInput={handleChange(
                    "eps"
                  )}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "0.5rem"
                }}
              >
                <label for="genero">
                  Género
                </label>

                <select
                  id="genero"
                  value={form().genero}
                  onChange={handleChange(
                    "genero"
                  )}
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
                <p
                  style={{
                    color: "#b91c1c",
                    margin: 0
                  }}
                >
                  {formError()}
                </p>
              </Show>

              <Show when={formSuccess()}>
                <p
                  style={{
                    color: "#166534",
                    margin: 0
                  }}
                >
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
                !cargando() &&
                !error()
              }
            >
              <Show
                when={
                  medicos().length > 0
                }
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
    </Show>
  );
}

export default App;