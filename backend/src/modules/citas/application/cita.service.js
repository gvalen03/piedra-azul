import { Cita } from "../domain/cita.entity.js";
import { EstadoCita } from "../domain/estado-cita.js";
import { serializarCsv } from "../../../shared/csv/csv.js";

const ENCABEZADOS_CSV = [
  "Fecha",
  "Hora inicio",
  "Hora fin",
  "Documento",
  "Paciente",
  "Estado",
  "Motivo"
];

const esFechaValida = (fecha) => {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));

  return fechaUtc.getUTCFullYear() === anio &&
    fechaUtc.getUTCMonth() === mes - 1 &&
    fechaUtc.getUTCDate() === dia;
};

export class CitaService {
  constructor({
    citaRepository,
    disponibilidadService,
    eventBus,
    profesionalRepository
  }) {
    this.citaRepository = citaRepository;
    this.disponibilidadService = disponibilidadService;
    this.eventBus = eventBus;
    this.profesionalRepository = profesionalRepository;
  }

  async consultarPorProfesionalYFecha(profesionalId, fecha) {
    const citas =
      await this.citaRepository.listarAgendaProfesional(
        profesionalId,
        fecha
      );

    return {
      cantidad: citas.length,
      citas
    };
  }

  async exportarCsv(profesionalId, fecha) {
    const id = Number(profesionalId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw Object.assign(new Error("El profesional es obligatorio"), { statusCode: 400 });
    }

    if (!esFechaValida(fecha)) {
      throw Object.assign(new Error("La fecha debe tener el formato AAAA-MM-DD"), { statusCode: 400 });
    }

    const profesional = await this.profesionalRepository.buscarPorId(id);

    if (!profesional) {
      throw Object.assign(new Error("Profesional no encontrado"), { statusCode: 404 });
    }

    const citas = await this.citaRepository.listarAgendaProfesional(id, fecha);
    const filas = citas
      .filter((cita) => cita.estado !== EstadoCita.CANCELADA)
      .map((cita) => [
        cita.fecha,
        String(cita.hora_inicio ?? "").slice(0, 5),
        String(cita.hora_fin ?? "").slice(0, 5),
        cita.paciente_documento,
        `${cita.paciente_nombre ?? ""} ${cita.paciente_apellido ?? ""}`.trim(),
        cita.estado,
        cita.motivo
      ]);

    return {
      nombreArchivo: `citas_profesional-${id}_${fecha}.csv`,
      contenido: serializarCsv(ENCABEZADOS_CSV, filas),
      cantidad: filas.length
    };
  }

  async agendar({
    pacienteId,
    profesionalId,
    fecha,
    horaInicio,
    motivo
  }) {
    const franjasDisponibles =
      await this.disponibilidadService
        .obtenerFranjasDisponibles({
          profesionalId,
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
        profesionalId,
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
      profesionalId,
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

  async cancelar(id, actor) {
    return this.citaRepository.actualizarEstado(id, EstadoCita.CANCELADA, actor);
  }

  async cancelarPorPaciente(id, pacienteId, justificacion) {
    const motivo = justificacion?.trim();
    if (!motivo) throw Object.assign(new Error("La justificación de la cancelación es obligatoria"), { statusCode: 400 });
    const cita = await this.citaRepository.cancelarPorPaciente(id, pacienteId, motivo);
    if (!cita) {
      throw Object.assign(new Error("No puedes cancelar esta cita: debe ser tuya, estar programada o confirmada y faltarle al menos dos días"), { statusCode: 409 });
    }
    return cita;
  }

  async reprogramar(id, datos, actor) {
    return this.citaRepository.reprogramar(id, datos, actor);
  }

  async franjasReprogramacion(id, fecha) {
    const cita = await this.citaRepository.buscarPorId(id);
    if (!cita) throw Object.assign(new Error("Cita no encontrada"), { statusCode: 404 });
    if (!["PROGRAMADA", "CONFIRMADA"].includes(cita.estado)) throw Object.assign(new Error("La cita ya no admite reprogramación"), { statusCode: 409 });
    return this.disponibilidadService.obtenerFranjasDisponibles({ profesionalId: cita.profesional_id, fecha, excluirCitaId: id });
  }

    async confirmar(id, actor) {
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
        EstadoCita.CONFIRMADA,
        actor
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
