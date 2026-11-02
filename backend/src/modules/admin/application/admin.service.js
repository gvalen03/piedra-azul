import { createHash, randomBytes } from "node:crypto";

export class AdminService {
  constructor({ repository, passwordService }) { this.repository = repository; this.passwordService = passwordService; }
  async guardar(tipo, id, body, actor) {
    const datos = Object.fromEntries(Object.entries(body).map(([key,value]) => [key, typeof value === "string" && key !== "password" ? value.trim() : value]));
    if (tipo === "usuarios") {
      if (!id && !datos.password && datos.rol === "ADMINISTRADOR") throw Object.assign(new Error("La contraseña es obligatoria al crear una cuenta administradora"), { statusCode: 400 });
      if (datos.password && Buffer.byteLength(datos.password, "utf8") > 72) throw Object.assign(new Error("La contraseña supera el tamaño permitido; usa una más corta"), { statusCode: 400 });
      if (datos.password) datos.passwordHash = await this.passwordService.hash(datos.password);
      if (!id && !datos.password) Object.assign(datos, await this.crearActivacionPendiente());
      delete datos.password;
      return this.repository.guardarUsuario(id, datos, actor);
    }
    if (tipo === "pacientes" && datos.fechaNacimiento > new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date())) {
      throw Object.assign(new Error("La fecha de nacimiento no puede estar en el futuro"), { statusCode: 400 });
    }
    if (!id) {
      if (!datos.activo && tipo === "medicos") throw Object.assign(new Error("Activa el perfil antes de crear su cuenta"), { statusCode: 400 });
      if (datos.estado === "INACTIVO" && tipo === "pacientes") throw Object.assign(new Error("Activa el perfil antes de crear su cuenta"), { statusCode: 400 });
      if (!datos.email) throw Object.assign(new Error("El correo electrónico es obligatorio para crear la cuenta de acceso"), { statusCode: 400 });
      if (!datos.password) throw Object.assign(new Error("La contraseña inicial es obligatoria para crear la cuenta"), { statusCode: 400 });
      if (Buffer.byteLength(datos.password, "utf8") > 72) throw Object.assign(new Error("La contraseña supera el tamaño permitido; usa una más corta"), { statusCode: 400 });
      datos.passwordHash = await this.passwordService.hash(datos.password);
      delete datos.password;
      Object.assign(datos, {
        crearCuenta: true,
        username: datos.username || this.crearUsernameAutomatico(datos),
        activoCuenta: true
      });
    }
    return this.repository.guardarPerfil(tipo, id, datos, actor);
  }

  crearUsernameAutomatico({ email, numeroDocumento }) {
    const local = email.split("@", 1)[0]
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    const documento = String(numeroDocumento).toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${local || "usuario"}-${documento || "perfil"}`.slice(0, 100);
  }

  async crearActivacionPendiente() {
    const activationToken = randomBytes(32).toString("base64url");
    const passwordHash = await this.passwordService.hash(randomBytes(48).toString("base64url"));
    return {
      activoCuenta: false,
      passwordHash,
      activationToken,
      activationTokenHash: createHash("sha256").update(activationToken).digest("hex")
    };
  }

  async activarCuenta(token, password) {
    if (Buffer.byteLength(password, "utf8") > 72) throw Object.assign(new Error("La contraseña supera el tamaño permitido; usa una más corta"), { statusCode: 400 });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const passwordHash = await this.passwordService.hash(password);
    return this.repository.consumirActivacion(tokenHash, passwordHash);
  }

  async eliminarPerfil(tipo, id, actor) {
    return this.repository.eliminarPerfil(tipo, id, actor);
  }
}
