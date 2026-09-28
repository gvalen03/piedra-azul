import { createSignal } from "solid-js";

import { login } from "../../services/auth.service.js";
import { useAuth } from "../../stores/auth.store.js";
import { A, useNavigate } from "@solidjs/router";

import "../../styles/modules/auth.css";


function LoginPage() {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [showPassword, setShowPassword] = createSignal(false);
  const [showContact, setShowContact] = createSignal(false);
  const adminEmail = (import.meta.env.VITE_ADMIN_CONTACT_EMAIL || "administrador@piedraAzul.com").trim();
  const contactHref = `mailto:${encodeURIComponent(adminEmail)}?subject=${encodeURIComponent("Ayuda para ingresar a PiedraAzul")}&body=${encodeURIComponent("Hola, necesito ayuda para ingresar a PiedraAzul.\n\nMi nombre es:\nEl problema que tengo es:\n")}`;
  const navigate = useNavigate();

  const auth = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading()) return;

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

      //no olvidarse de quitar lo console.log
      console.log("Inicio de sesión correcto");
      console.log("Usuario:", data.nombre);
      console.log("Rol:", data.rol);

      switch (data.rol) {
        case "PACIENTE":
          navigate("/paciente");
          break;

        case "MEDICO_TERAPISTA":
          navigate("/medico");
          break;

        case "AGENDADOR":
          navigate("/citas");
          break;

        case "ADMINISTRADOR":
          navigate("/admin");
          break;

        default:
          setError("Rol no reconocido");
      }

    } catch (error) {
      setError(error.message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="login-page" tabIndex={0} role="region" aria-label="Acceso a PiedraAzul, contenido desplazable">
      <header class="login-topbar">
        <div class="login-topbar-inner">
          <A class="login-brand" href="/" aria-label="PiedraAzul, inicio">
            <span class="login-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" />
              </svg>
            </span>
            PiedraAzul
          </A>
          <span class="login-topbar-label">Agenda médica</span>
        </div>
      </header>
      <main class="login-content">
        <div class="login-intro">
          <span class="login-eyebrow">ATENCIÓN Y BIENESTAR</span>
          <h1>Bienvenido a PiedraAzul</h1>
          <p>Organiza cada encuentro, cuida cada detalle.</p>
        </div>
        <section class="login-card" aria-labelledby="login-title">
          <div class="login-header">
            <span class="login-section-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
              </svg>
            </span>
            <div>
              <h2 id="login-title" class="login-title">Iniciar sesión</h2>
              <p class="login-subtitle">Ingresa a tu espacio de atención y bienestar.</p>
            </div>
          </div>
          <div class="login-card-body">
            <form class="login-form" onSubmit={handleSubmit} aria-busy={loading()}>
              <div class="form-group">
                <label class="form-label" for="username">Usuario</label>
                <input
                  id="username" name="username" type="text" class="form-input"
                  placeholder="Ingresa tu usuario" value={username()}
                  onInput={(event) => setUsername(event.currentTarget.value)}
                  autocomplete="username" autocapitalize="none" spellcheck={false}
                  required disabled={loading()}
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="password">Contraseña</label>
                <div class="login-password-field">
                  <input
                    id="password" name="password" type={showPassword() ? "text" : "password"}
                    class="form-input" placeholder="Ingresa tu contraseña" value={password()}
                    onInput={(event) => setPassword(event.currentTarget.value)}
                    autocomplete="current-password" required disabled={loading()}
                  />
                  <button
                    class="login-password-toggle" type="button"
                    onClick={() => setShowPassword(!showPassword())}
                    aria-label={showPassword() ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-controls="password" aria-pressed={showPassword()}
                  >
                    {showPassword() ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {error() && <p class="form-error login-error" role="alert">{error()}</p>}

              <button type="submit" class="btn btn-primary login-button" disabled={loading()}>
                <span>{loading() ? "Iniciando sesión…" : "Iniciar sesión"}</span>
                <span class={loading() ? "login-spinner" : "login-arrow"} aria-hidden="true">
                  {loading() ? "" : "→"}
                </span>
              </button>
              <span class="login-status" role="status">{loading() ? "Iniciando sesión, espera un momento." : ""}</span>
            </form>

            <div class="login-help">
              <button
                type="button"
                class="login-help-icon"
                aria-label="Contactar al administrador"
                aria-expanded={showContact()}
                aria-controls="login-contact"
                onClick={() => setShowContact(!showContact())}
              >?</button>
              <p>¿Necesitas ayuda para ingresar?<br /><span>Contacta al administrador de PiedraAzul.</span></p>
            </div>
            <section id="login-contact" class="login-contact" hidden={!showContact()} aria-labelledby="login-contact-title">
              <h3 id="login-contact-title">Contacto del administrador</h3>
              {adminEmail ? (
                <>
                  <p>Cuéntanos qué sucede al intentar ingresar. No incluyas tu contraseña.</p>
                  <a class="login-contact-email" href={contactHref}>{adminEmail}</a>
                  <a class="btn btn-primary login-contact-action" href={contactHref}>Escribir un correo <span aria-hidden="true">↗</span></a>
                  <p class="login-contact-note">Se abrirá tu aplicación de correo con el asunto preparado. También puedes usar la dirección en tu correo web.</p>
                </>
              ) : (
                <p>El correo de soporte aún no está disponible. Solicita ayuda al personal de atención de PiedraAzul.</p>
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
