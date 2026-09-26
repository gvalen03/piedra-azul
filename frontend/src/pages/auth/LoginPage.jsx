import { createSignal } from "solid-js";

import { login } from "../../services/auth.service.js";
import { useAuth } from "../../stores/auth.store.js";

import "../../styles/modules/auth.css";

function LoginPage() {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const auth = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!username().trim() || !password()) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    try {
      setLoading(true);

      const data = await login({
        username: username().trim(),
        password: password()
      });

      auth.iniciarSesion(data);

      console.log("Inicio de sesión correcto");
      console.log("Usuario:", data.nombre);
      console.log("Rol:", data.rol);

      // Más adelante aquí haremos la redirección
      // según el rol del usuario.

    } catch (error) {
      setError(error.message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <main class="login-page">
      <section class="login-card">

        <div class="login-header">
          <h1 class="login-title">
            PiedraAzul
          </h1>

          <p class="login-subtitle">
            Inicia sesión para continuar
          </p>
        </div>

        <form
          class="login-form"
          onSubmit={handleSubmit}
        >

          <div class="form-group">
            <label
              class="form-label"
              for="username"
            >
              Usuario
            </label>

            <input
              id="username"
              name="username"
              type="text"
              class="form-input"
              placeholder="Ingresa tu usuario"
              value={username()}
              onInput={(event) =>
                setUsername(
                  event.currentTarget.value
                )
              }
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label
              class="form-label"
              for="password"
            >
              Contraseña
            </label>

            <input
              id="password"
              name="password"
              type="password"
              class="form-input"
              placeholder="Ingresa tu contraseña"
              value={password()}
              onInput={(event) =>
                setPassword(
                  event.currentTarget.value
                )
              }
              autocomplete="current-password"
            />
          </div>

          {error() && (
            <p
              class="form-error"
              role="alert"
            >
              {error()}
            </p>
          )}

          <button
            type="submit"
            class="btn btn-primary login-button"
            disabled={loading()}
          >
            {loading()
              ? "Iniciando sesión..."
              : "Iniciar sesión"}
          </button>

        </form>

      </section>
    </main>
  );
}

export default LoginPage;