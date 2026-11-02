export class AdminService {
  constructor({ repository, passwordService }) { this.repository = repository; this.passwordService = passwordService; }
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

  // ADM-01 — desactivación/reactivación de médicos y pacientes (rutas separadas del PUT genérico).
  previsualizarDesactivacion(tipo, id) { return this.repository.previsualizarDesactivacion(tipo, id); }
  desactivar(tipo, id, cantidadEsperada, actor) {
    if (!Number.isSafeInteger(cantidadEsperada) || cantidadEsperada < 0) {
      throw Object.assign(new Error("Debes confirmar la cantidad de citas que viste en la vista previa"), { statusCode: 400 });
    }
    return this.repository.desactivarPerfil(tipo, id, cantidadEsperada, actor);
  }
  reactivar(tipo, id, actor) { return this.repository.reactivarPerfil(tipo, id, actor); }
}
