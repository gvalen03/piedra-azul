import { Usuario } from "./usuario.entity.js";
import { Rol } from "./rol.js";

export class UsuarioFactory {
  static crear({
    username,
    password,
    nombre,
    email,
    rol,
    pacienteId = null,
    medicoId = null
  }) {
    if (!Object.values(Rol).includes(rol)) {
      throw new Error(`Rol no válido: ${rol}`);
    }

    return new Usuario({
      username,
      password,
      nombre,
      email,
      rol,
      activo: true,
      pacienteId,
      medicoId
    });
  }
}