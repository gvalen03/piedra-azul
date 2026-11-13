export class Disponibilidad {
  constructor({
    id = null,
    profesionalId,
    diaSemana,
    horaInicio,
    horaFin,
    intervaloMinutos,
    semanasHabilitadas,
    activo = true
  }) {
    this.id = id;
    this.profesionalId = profesionalId;
    this.diaSemana = diaSemana;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.intervaloMinutos = intervaloMinutos;
    this.semanasHabilitadas = semanasHabilitadas;
    this.activo = activo;
  }
}
