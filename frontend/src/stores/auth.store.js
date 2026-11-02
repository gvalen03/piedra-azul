import { createSignal } from "solid-js";
import { cerrarSesionKeycloak, isKeycloakAuthEnabled } from "../services/keycloak.service.js";

const INACTIVIDAD_MS = 5 * 60 * 1000;
const eventosActividad = ["pointerdown", "keydown", "scroll", "touchstart"];
const leerSesionGuardada = () => {
  const tokenGuardado = localStorage.getItem("token");
  const usuarioGuardado = localStorage.getItem("usuario");
  if (!tokenGuardado || !usuarioGuardado) return null;
  try {
    const usuario = JSON.parse(usuarioGuardado);
    return usuario && typeof usuario.rol === "string" ? { token: tokenGuardado, usuario } : null;
  } catch { return null; }
};
const sesionGuardada = leerSesionGuardada();
const [user, setUser] = createSignal(sesionGuardada?.usuario ?? null);
const [token, setToken] = createSignal(sesionGuardada?.token ?? null);
let temporizadorInactividad;
let detenerEventosInactividad;

export function useAuth() {
  const iniciarSesion = (data) => {
    const usuario = {
      usuarioId: data.usuarioId,
      nombre: data.nombre,
      rol: data.rol,
      pacienteId: data.pacienteId,
      medicoId: data.medicoId
    };

    setUser(usuario);
    setToken(data.token);

    localStorage.setItem(
      "token",
      data.token
    );

    localStorage.setItem(
      "usuario",
      JSON.stringify(usuario)
    );
    reiniciarInactividad();
  };

  const cerrarSesion = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    clearTimeout(temporizadorInactividad);
    if (isKeycloakAuthEnabled()) cerrarSesionKeycloak();
  };

  const restaurarSesion = () => {
    const sesion = leerSesionGuardada();
    if (!sesion) return;
    setUser(sesion.usuario);
    setToken(sesion.token);
    reiniciarInactividad();
  };

  const estaAutenticado = () => {
    return Boolean(token());
  };

  const reiniciarInactividad = () => {
    clearTimeout(temporizadorInactividad);
    if (!token()) return;
    temporizadorInactividad = setTimeout(() => cerrarSesion(), INACTIVIDAD_MS);
  };

  const iniciarControlInactividad = () => {
    const actividad = () => reiniciarInactividad();
    eventosActividad.forEach(evento => window.addEventListener(evento, actividad, { passive: true }));
    detenerEventosInactividad?.();
    detenerEventosInactividad = () => eventosActividad.forEach(evento => window.removeEventListener(evento, actividad));
    reiniciarInactividad();
    return () => { detenerEventosInactividad?.(); clearTimeout(temporizadorInactividad); };
  };

  return {
    user,
    token,
    iniciarSesion,
    cerrarSesion,
    restaurarSesion,
    iniciarControlInactividad,
    estaAutenticado
  };
}
