import { PacienteFactory } from "../domain/paciente.factory.js";

export class PacienteService {
  constructor({ pacienteRepository, auditoriaService, passwordService }) {
    this.pacienteRepository = pacienteRepository;
    this.auditoriaService = auditoriaService;
    this.passwordService = passwordService;
  }

  async registrar(dto, origen = "SISTEMA") {
    dto = Object.fromEntries(Object.entries(dto).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
    if (dto.fechaNacimiento > hoy) throw Object.assign(new Error("La fecha de nacimiento no puede estar en el futuro"), { statusCode: 400 });
    const existeDocumento =
      await this.pacienteRepository.existePorDocumento(
        dto.numeroDocumento
      );

    if (existeDocumento) {
      throw new Error(
        `Ya existe un paciente con ese documento: ${dto.numeroDocumento}`
      );
    }

    if (dto.email) {
      const existeEmail =
        await this.pacienteRepository.existePorEmail(dto.email);

      if (existeEmail) {
        throw new Error(
          `Ya existe un paciente con ese email: ${dto.email}`
        );
      }
    }

    const paciente = PacienteFactory.crearDesdeDTO(dto);
    const guardado = await this.pacienteRepository.registrarConAuditoria(paciente, origen);

    return guardado;
  }

  async buscarPorDocumento(documento) {
    const paciente =
      await this.pacienteRepository.buscarPorDocumento(documento);

    if (!paciente) {
      throw new Error("Paciente no encontrado");
    }

    return paciente;
  }

  async registrarAutonomo(dto) {
    const { username, password, ...datosPaciente } = Object.fromEntries(Object.entries(dto).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
    if (Buffer.byteLength(password, "utf8") > 72) throw Object.assign(new Error("La contraseña supera el tamaño permitido; usa una más corta"), { statusCode: 400 });
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
    if (datosPaciente.fechaNacimiento > hoy) throw Object.assign(new Error("La fecha de nacimiento no puede estar en el futuro"), { statusCode: 400 });
    if (await this.pacienteRepository.existePorDocumento(datosPaciente.numeroDocumento)) throw Object.assign(new Error("Ya existe un paciente con ese documento"), { statusCode: 409 });
    if (await this.pacienteRepository.existePorEmail(datosPaciente.email)) throw Object.assign(new Error("Ya existe un paciente con ese email"), { statusCode: 409 });
    const passwordHash = await this.passwordService.hash(password);
    const paciente = PacienteFactory.crearDesdeDTO(datosPaciente);
    return this.pacienteRepository.registrarConCuentaPropia(paciente, { username, passwordHash });
  }
}
