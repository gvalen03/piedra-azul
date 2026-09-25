export class Cita {
  constructor({
    id = null,
    pacienteId,
    medicoId,
    fecha,
    horaInicio,
    horaFin,
    estado = "PROGRAMADA",
    motivo = null
  }) {
    this.id = id;
    this.pacienteId = pacienteId;
    this.medicoId = medicoId;
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.estado = estado;
    this.motivo = motivo;
  }
}