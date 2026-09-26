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
    console.log("1. Username recibido:", username);

    const usuario =
      await this.usuarioRepository.buscarPorUsername(username);

    console.log("2. Usuario encontrado:", {
      id: usuario?.id,
      username: usuario?.username,
      activo: usuario?.activo,
      rol: usuario?.rol,
      passwordHash: usuario?.password,
      passwordHashLength: usuario?.password?.length
    });

    if (!usuario || !usuario.activo) {
      throw new Error("Usuario o contraseña incorrectos");
    }

    const passwordValida =
      await this.passwordService.comparar(
        password,
        usuario.password
      );

    console.log("3. Resultado bcrypt:", passwordValida);

    if (!passwordValida) {
      throw new Error("Usuario o contraseña incorrectos");
    }

    console.log("4. Contraseña correcta");

    const token = this.jwtService.generarToken({
      usuarioId: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      pacienteId: usuario.pacienteId,
      medicoId: usuario.medicoId
    });

    console.log("5. Token generado");

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