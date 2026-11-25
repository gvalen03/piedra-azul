export class AdminService {
  constructor({ repository, passwordService, keycloakClient = null }) { this.repository = repository; this.passwordService = passwordService; this.keycloakClient = keycloakClient; }
  async guardar(tipo, id, body, actor) {
    const datos = Object.fromEntries(Object.entries(body).map(([key,value]) => [key, typeof value === "string" && key !== "password" ? value.trim() : value]));
    if (tipo === "usuarios") {
      if (!id && !datos.password) throw Object.assign(new Error("La contraseña es obligatoria al crear una cuenta"), { statusCode: 400 });
      if (datos.password && Buffer.byteLength(datos.password, "utf8") > 72) throw Object.assign(new Error("La contraseña supera el tamaño permitido; usa una más corta"), { statusCode: 400 });
      if (datos.password) datos.passwordHash = await this.passwordService.hash(datos.password);
      delete datos.password;
      return this.repository.guardarUsuario(id, datos, actor);
    }
    if (tipo === "pacientes" && datos.fechaNacimiento > new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date())) {
      throw Object.assign(new Error("La fecha de nacimiento no puede estar en el futuro"), { statusCode: 400 });
    }
    return this.repository.guardarPerfil(tipo, id, datos, actor);
  }

  async eliminarPerfil(tipo, id, actor) {
    return this.repository.eliminarPerfil(tipo, id, actor);
  }
  async guardarCuentaKeycloakPropia(id, body, actor) {
    if (!this.keycloakClient) throw Object.assign(new Error("La gestión de Keycloak no está configurada"), { statusCode: 503 });
    const datos = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    const cuenta = await this.repository.cuentaKeycloakPropia(id, actor);
    if (datos.rol !== cuenta.rol) throw Object.assign(new Error("No puedes cambiar tu propio rol desde administración"), { statusCode: 403 });
    if (datos.password && (Buffer.byteLength(datos.password, "utf8") < 8 || Buffer.byteLength(datos.password, "utf8") > 72)) throw Object.assign(new Error("La contraseña debe tener entre 8 y 72 bytes"), { statusCode: 400 });
    await this.keycloakClient.actualizarUsuario(cuenta.keycloak_subject, datos);
    return this.repository.actualizarCuentaKeycloakPropia(id, datos, actor);
  }
  async cambiarEstadoPerfil(tipo, id, activo, actor) {
    return this.repository.cambiarEstadoPerfil(tipo, id, activo, actor);
  }
  async cambiarEstadoCuentaKeycloak(id, activo, actor) {
    return this.repository.cambiarEstadoCuentaKeycloak(id, activo, actor);
  }
}
