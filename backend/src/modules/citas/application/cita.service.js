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

const hhmm = (hora) => String(hora ?? "").slice(0, 5);

function esFechaValida(fecha) {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    date.getUTCFullYear() === anio &&
    date.getUTCMonth() === mes - 1 &&
    date.getUTCDate() === dia
  );
}

export class CitaService {
  constructor({
    citaRepository,
    disponibilidadService,
    eventBus,
    medicoRepository
  }) {
    this.citaRepository = citaRepository;
    this.disponibilidadService = disponibilidadService;
    this.eventBus = eventBus;
    this.medicoRepository = medicoRepository;
  }

  /**
   * RF-01: agenda de un médico en una fecha.
   * Semántica: el listado incluye TODAS las citas del día, también las
   * CANCELADA (se muestran con su estado). `cantidad` es el tamaño de ese
   * mismo listado, por lo que resultado y conteo siempre coinciden.
   */
  async consultarPorMedicoYFecha(medicoId, fecha) {
    const id = Number(medicoId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw Object.assign(
        new Error("El médico es obligatorio"),
        { statusCode: 400 }
      );
    }

    if (!esFechaValida(fecha)) {
      throw Object.assign(
        new Error("La fecha debe tener el formato AAAA-MM-DD"),
        { statusCode: 400 }
      );
    }

    const medico =
      await this.medicoRepository.buscarPorId(id);

    if (!medico) {
      throw Object.assign(
        new Error("Médico no encontrado"),
        { statusCode: 404 }
      );
    }

    const citas =
      await this.citaRepository.listarAgendaMedico(
        id,
        fecha
      );

    return {
      cantidad: citas.length,
      citas
    };
  }

  /**
   * RF-04: exportación CSV de la jornada de un médico en una fecha.
   * Reutiliza las validaciones de RF-01 (400 / 404). Conjunto exportado:
   * las citas de ese médico y fecha EXCEPTO las CANCELADA (es el listado de
   * la jornada de atención); incluye PROGRAMADA, CONFIRMADA y ATENDIDA.
   * Cero citas produce un CSV válido con solo los encabezados.
   */
  async exportarCsv(medicoId, fecha) {
    const { citas } =
      await this.consultarPorMedicoYFecha(medicoId, fecha);

    const filas = citas
      .filter((cita) => cita.estado !== EstadoCita.CANCELADA)
      .map((cita) => [
        cita.fecha,
        hhmm(cita.hora_inicio),
        hhmm(cita.hora_fin),
        cita.paciente_documento,
        `${cita.paciente_nombre ?? ""} ${cita.paciente_apellido ?? ""}`.trim(),
        cita.estado,
        cita.motivo
      ]);

    return {
      nombreArchivo: `citas_medico-${Number(medicoId)}_${fecha}.csv`,
      contenido: serializarCsv(ENCABEZADOS_CSV, filas),
      cantidad: filas.length
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

  async cancelar(id, actor) {
    return this.citaRepository.actualizarEstado(id, EstadoCita.CANCELADA, actor);
  }

  async reprogramar(id, datos, actor) {
    return this.citaRepository.reprogramar(id, datos, actor);
  }

  async franjasReprogramacion(id, fecha) {
    const cita = await this.citaRepository.buscarPorId(id);
    if (!cita) throw Object.assign(new Error("Cita no encontrada"), { statusCode: 404 });
    if (!["PROGRAMADA", "CONFIRMADA"].includes(cita.estado)) throw Object.assign(new Error("La cita ya no admite reprogramación"), { statusCode: 409 });
    return this.disponibilidadService.obtenerFranjasDisponibles({ medicoId: cita.medico_id, fecha, excluirCitaId: id });
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