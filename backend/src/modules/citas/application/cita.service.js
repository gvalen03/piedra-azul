import { Cita } from "../domain/cita.entity.js";
import { EstadoCita } from "../domain/estado-cita.js";

export class CitaService {
  constructor({
    citaRepository,
    disponibilidadService,
    eventBus
  }) {
    this.citaRepository = citaRepository;
    this.disponibilidadService = disponibilidadService;
    this.eventBus = eventBus;
  }

  async consultarPorMedicoYFecha(medicoId, fecha) {
    const citas =
      await this.citaRepository.listarPorMedicoYFecha(
        medicoId,
        fecha
      );

    return {
      cantidad: citas.length,
      citas
    };
  }

  async agendar({
    pacienteId,
    medicoId,
    fecha,
    horaInicio,
    motivo
  }) {
    const franjasDisponibles =
      await this.disponibilidadService
        .obtenerFranjasDisponibles({
          medicoId,
          fecha
        });

    const franjaSeleccionada =
      franjasDisponibles.find(
        (franja) =>
          franja.horaInicio === horaInicio
      );

    if (!franjaSeleccionada) {
      throw new Error(
        "El horario seleccionado no está disponible"
      );
    }

    const ocupada =
      await this.citaRepository.existeCitaEnHorario(
        medicoId,
        fecha,
        horaInicio
      );

    if (ocupada) {
      throw new Error(
        "El horario ya se encuentra reservado"
      );
    }

    const cita = new Cita({
      pacienteId,
      medicoId,
      fecha,
      horaInicio,
      horaFin: franjaSeleccionada.horaFin,
      estado: EstadoCita.PROGRAMADA,
      motivo
    });

    const guardada =
      await this.citaRepository.guardar(cita);

    if (this.eventBus) {
      this.eventBus.emit(
        "cita.creada",
        guardada
      );
    }

    return guardada;
  }

    async confirmar(id) {
    const cita =
      await this.citaRepository.buscarPorId(id);

    if (!cita) {
      throw new Error("Cita no encontrada");
    }

    if (cita.estado === EstadoCita.CONFIRMADA) {
      throw new Error(
        "La cita ya se encuentra confirmada"
      );
    }

    if (cita.estado !== EstadoCita.PROGRAMADA) {
      throw new Error(
        "Solo se pueden confirmar citas programadas"
      );
    }

    const actualizada =
      await this.citaRepository.actualizarEstado(
        id,
        EstadoCita.CONFIRMADA
      );

    if (this.eventBus) {
      this.eventBus.emit(
        "cita.confirmada",
        actualizada
      );
    }

    return actualizada;
  }
}