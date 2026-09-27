import { PacienteFactory } from "../domain/paciente.factory.js";

export class PacienteService {
  constructor({ pacienteRepository, auditoriaService }) {
    this.pacienteRepository = pacienteRepository;
    this.auditoriaService = auditoriaService;
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
}