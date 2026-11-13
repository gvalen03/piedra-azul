const roles = new Set(["PACIENTE", "MEDICO_TERAPISTA", "AGENDADOR", "ADMINISTRADOR"]);
const fallo = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

export class AprovisionamientoService {
  constructor({ repository, keycloakClient }) { this.repository = repository; this.keycloakClient = keycloakClient; }
  validar(datos) {
    if (!roles.has(datos.rol)) throw fallo("Rol no autorizado");
    for (const campo of ["username", "nombre", "apellido", "numeroDocumento", "email", "password"]) if (!datos[campo]?.trim?.()) throw fallo(`El campo ${campo} es obligatorio`);
    if (!/^[a-zA-Z0-9._-]{1,100}$/.test(datos.username)) throw fallo("El usuario contiene caracteres no permitidos");
    if (Buffer.byteLength(datos.password, "utf8") < 8 || Buffer.byteLength(datos.password, "utf8") > 72) throw fallo("La contraseña inicial debe tener entre 8 y 72 bytes");
    if (datos.rol === "PACIENTE" && !datos.pacienteId && (!datos.fechaNacimiento || !datos.telefono || !datos.genero)) throw fallo("El paciente requiere fecha de nacimiento, teléfono y género");
  }
  async aprovisionar(datos, actor) {
    datos = Object.fromEntries(Object.entries(datos).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    this.validar(datos);
    if (!this.keycloakClient) throw fallo("El aprovisionador de Keycloak no está configurado", 503);
    const reserva = await this.repository.reservar(datos, actor);
    let remoto;
    try {
      remoto = await this.keycloakClient.crearOEncontrarUsuario(datos);
      await this.keycloakClient.activarUsuario(remoto.id);
      await this.keycloakClient.asignarRol(remoto.id, datos.rol);
      await this.repository.registrarCuentaKeycloak(reserva.id, remoto.id);
      return await this.repository.finalizar(reserva.id, datos, remoto.id);
    } catch (error) {
      let estado = "REQUIERE_RECUPERACION";
      if (remoto?.creado) {
        try { await this.keycloakClient.eliminarUsuarioCreado(remoto.id); estado = "COMPENSADO"; }
        catch { estado = "REQUIERE_RECUPERACION"; }
      }
      await this.repository.compensar(reserva.id, estado, error.message).catch(() => {});
      throw error;
    }
  }
}
