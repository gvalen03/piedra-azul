export class AuthService {
  constructor({
    usuarioRepository,
    jwtService,
    passwordService
  }) {
    this.usuarioRepository = usuarioRepository;
    this.jwtService = jwtService;
    this.passwordService = passwordService;
  }

  async login(username, password) {
    const usuario = await this.usuarioRepository.buscarPorUsername(username);

    if (!usuario || !usuario.activo || usuario.perfilActivo === false) {
      throw new Error("Usuario o contraseña incorrectos");
    }

    const passwordValida =
      await this.passwordService.comparar(
        password,
        usuario.password
      );



    if (!passwordValida) {
      throw new Error("Usuario o contraseña incorrectos");
    }



    const token = this.jwtService.generarToken({
      version: new Date(usuario.updatedAt).getTime(),
      usuarioId: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      pacienteId: usuario.pacienteId,
      medicoId: usuario.medicoId
    });



    return {
      token,
      rol: usuario.rol,
      nombre: usuario.nombre,
      usuarioId: usuario.id,
      pacienteId: usuario.pacienteId,
      medicoId: usuario.medicoId
    };
  }

  async cambiarPassword(username, passwordActual, passwordNueva) {
    if (Buffer.byteLength(passwordNueva, "utf8") > 72) throw Object.assign(new Error("La contraseña supera el tamaño permitido; usa una más corta"), { statusCode: 400 });
    const usuario = await this.usuarioRepository.buscarPorUsername(username);
    if (!usuario || !usuario.activo || usuario.perfilActivo === false) throw Object.assign(new Error("No fue posible cambiar la contraseña"), { statusCode: 400 });
    if (!await this.passwordService.comparar(passwordActual, usuario.password)) throw Object.assign(new Error("La contraseña actual no es correcta"), { statusCode: 400 });
    const actualizado = await this.usuarioRepository.actualizarPassword(username, await this.passwordService.hash(passwordNueva));
    if (!actualizado) throw Object.assign(new Error("No fue posible cambiar la contraseña"), { statusCode: 400 });
  }
}
