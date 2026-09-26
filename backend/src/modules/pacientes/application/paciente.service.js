import { PacienteFactory } from "../domain/paciente.factory.js";

export class PacienteService {
  constructor({ pacienteRepository, auditoriaService }) {
    this.pacienteRepository = pacienteRepository;
    this.auditoriaService = auditoriaService;
  }

  async registrar(dto, origen = "SISTEMA") {
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
    const guardado =
      await this.pacienteRepository.guardar(paciente);

    await this.auditoriaService.registrar({
      tipoEvento: "PACIENTE_REGISTRADO",
      descripcion:
        `Se registró el paciente ${guardado.nombre} ${guardado.apellido}`,
      entidadId: String(guardado.id),
      realizadoPor: origen,
      moduloOrigen: "PACIENTES"
    });

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