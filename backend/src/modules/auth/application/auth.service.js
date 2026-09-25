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
    const usuario =
      await this.usuarioRepository.buscarPorUsername(username);

    if (!usuario || !usuario.activo) {
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
}