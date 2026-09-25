import { HistoriaClinica } from "../domain/historia-clinica.entity.js";
import { ControlMedico } from "../domain/control-medico.entity.js";

export class HistorialService {
  constructor({
    historialRepository,
    pacienteRepository,
    citaRepository,
    eventBus
  }) {
    this.historialRepository = historialRepository;
    this.pacienteRepository = pacienteRepository;
    this.citaRepository = citaRepository;
    this.eventBus = eventBus;
  }

  async obtenerHistoriaPorPaciente(pacienteId) {
    const paciente =
      await this.pacienteRepository.buscarPorId(pacienteId);

    if (!paciente) {
      throw new Error("Paciente no encontrado");
    }

    return await this.historialRepository
      .buscarHistoriaPorPaciente(pacienteId);
  }

  async registrarControl({
    pacienteId,
    citaId,
    medicoId,
    motivoConsulta,
    observaciones,
    diagnostico,
    tratamiento,
    recomendaciones
  }) {
    const cita =
      await this.citaRepository.buscarPorId(citaId);

    if (!cita) {
      throw new Error("Cita no encontrada");
    }

    if (cita.pacienteId !== pacienteId) {
      throw new Error("La cita no corresponde al paciente");
    }

    if (cita.medicoId !== medicoId) {
      throw new Error("La cita no corresponde al médico");
    }

    let historia =
      await this.historialRepository
        .buscarHistoriaPorPaciente(pacienteId);

    if (!historia) {
      historia =
        await this.historialRepository.crearHistoria(
          new HistoriaClinica({
            pacienteId
          })
        );
    }

    const control = new ControlMedico({
      historiaClinicaId: historia.id,
      citaId,
      medicoId,
      motivoConsulta,
      observaciones,
      diagnostico,
      tratamiento,
      recomendaciones
    });

    const guardado =
      await this.historialRepository.guardarControl(control);

    this.eventBus.emit("control-medico.creado", guardado);

    return guardado;
  }
}