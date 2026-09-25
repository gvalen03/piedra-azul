export class Disponibilidad {
  constructor({
    id = null,
    medicoId,
    diaSemana,
    horaInicio,
    horaFin,
    intervaloMinutos,
    semanasHabilitadas,
    activo = true
  }) {
    this.id = id;
    this.medicoId = medicoId;
    this.diaSemana = diaSemana;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.intervaloMinutos = intervaloMinutos;
    this.semanasHabilitadas = semanasHabilitadas;
    this.activo = activo;
  }
}