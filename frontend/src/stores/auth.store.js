import { createSignal } from "solid-js";
import { cerrarSesionKeycloak, isKeycloakAuthEnabled, renovarTokenKeycloak } from "../services/keycloak.service.js";

const [user, setUser] = createSignal(null);
const [token, setToken] = createSignal(null);
const INACTIVIDAD_MS = 15 * 60 * 1000;
const eventosActividad = ["pointerdown", "keydown", "scroll", "touchstart"];
const claveUltimaActividad = "piedra-azul.ultima-actividad";
let temporizadorInactividad;
let controlInactividadActivo = false;
let renovandoToken = false;

const limpiarDatosLocales = () => {
  setUser(null);
  setToken(null);
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  sessionStorage.removeItem(claveUltimaActividad);
};

const detenerControlInactividad = () => {
  clearTimeout(temporizadorInactividad);
  temporizadorInactividad = undefined;

  if (!controlInactividadActivo) return;
  eventosActividad.forEach(evento => window.removeEventListener(evento, registrarActividad));
  controlInactividadActivo = false;
};

const cerrarSesionGlobal = () => {
  detenerControlInactividad();
  limpiarDatosLocales();
  if (isKeycloakAuthEnabled()) cerrarSesionKeycloak();
};

const programarCierrePorInactividad = restante => {
  clearTimeout(temporizadorInactividad);
  temporizadorInactividad = window.setTimeout(cerrarSesionGlobal, restante);
};

const registrarActividad = () => {
  if (!token()) return;

  const ultimaActividad = Number(sessionStorage.getItem(claveUltimaActividad));
  if (ultimaActividad && Date.now() - ultimaActividad >= INACTIVIDAD_MS) {
    cerrarSesionGlobal();
    return;
  }

  sessionStorage.setItem(claveUltimaActividad, String(Date.now()));
  programarCierrePorInactividad(INACTIVIDAD_MS);
  void renovarSesionActivaSiHaceFalta();
};

const iniciarControlInactividad = () => {
  if (!token()) return;

  if (!controlInactividadActivo) {
    eventosActividad.forEach(evento => window.addEventListener(evento, registrarActividad, { passive: true }));
    controlInactividadActivo = true;
  }

  const ultimaActividad = Number(sessionStorage.getItem(claveUltimaActividad));
  const restante = ultimaActividad ? INACTIVIDAD_MS - (Date.now() - ultimaActividad) : INACTIVIDAD_MS;

  if (restante <= 0) {
    cerrarSesionGlobal();
    return;
  }

  if (ultimaActividad) programarCierrePorInactividad(restante);
  else registrarActividad();
};

export const actualizarToken = tokenNuevo => {
  if (!tokenNuevo) return;
  setToken(tokenNuevo);
  localStorage.setItem("token", tokenNuevo);
};

export const cerrarSesionPorSeguridad = () => cerrarSesionGlobal();

const tokenExpiraPronto = tokenActual => {
  try {
    const payloadCodificado = tokenActual?.split(".")[1];
    if (!payloadCodificado) return false;
    const base64 = payloadCodificado.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payloadCodificado.length / 4) * 4, "=");
    const { exp } = JSON.parse(atob(base64));
    return Number.isFinite(exp) && exp * 1000 - Date.now() <= 60 * 1000;
  } catch {
    return false;
  }
};

const renovarSesionActivaSiHaceFalta = async () => {
  if (!isKeycloakAuthEnabled() || renovandoToken || !tokenExpiraPronto(token())) return;

  renovandoToken = true;
  try {
    const tokenNuevo = await renovarTokenKeycloak();
    if (!tokenNuevo) {
      cerrarSesionGlobal();
      return;
    }
    actualizarToken(tokenNuevo);
  } catch {
    cerrarSesionGlobal();
  } finally {
    renovandoToken = false;
  }
};

export function useAuth() {
  const iniciarSesion = (data) => {
    const usuario = {
      usuarioId: data.usuarioId,
      nombre: data.nombre,
      rol: data.rol,
      pacienteId: data.pacienteId,
      profesionalId: data.profesionalId
    };

    setUser(usuario);
    actualizarToken(data.token);

    localStorage.setItem(
      "usuario",
      JSON.stringify(usuario)
    );

    iniciarControlInactividad();
  };

  const cerrarSesion = () => {
    cerrarSesionGlobal();
  };

  const restaurarSesion = () => {
    const tokenGuardado =
      localStorage.getItem("token");

    const usuarioGuardado =
      localStorage.getItem("usuario");

    if (
      !tokenGuardado ||
      !usuarioGuardado
    ) {
      return;
    }

    try {
      const usuario = JSON.parse(usuarioGuardado);
      if (!usuario || typeof usuario.rol !== "string") {
        cerrarSesion();
        return;
      }
      setUser(usuario);
      actualizarToken(tokenGuardado);
      iniciarControlInactividad();
    } catch {
      cerrarSesion();
    }
  };

  const estaAutenticado = () => {
    return Boolean(token());
  };

  return {
    user,
    token,
    iniciarSesion,
    cerrarSesion,
    restaurarSesion,
    detenerControlInactividad,
    estaAutenticado
  };
}
