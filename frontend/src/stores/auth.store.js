import { createSignal } from "solid-js";

const [user, setUser] = createSignal(null);
const [token, setToken] = createSignal(null);

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
  };

  const cerrarSesion = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
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

    setToken(tokenGuardado);
    setUser(
      JSON.parse(usuarioGuardado)
    );
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
    estaAutenticado
  };
}