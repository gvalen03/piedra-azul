export class Cita {
  constructor({
    id = null,
    pacienteId,
    profesionalId,
    fecha,
    horaInicio,
    horaFin,
    estado = "PROGRAMADA",
    motivo = null
  }) {
    this.id = id;
    this.pacienteId = pacienteId;
    this.profesionalId = profesionalId;
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.estado = estado;
    this.motivo = motivo;
  }
}
