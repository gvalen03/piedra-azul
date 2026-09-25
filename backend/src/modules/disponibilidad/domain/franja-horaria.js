export class FranjaHoraria {
  constructor({
    horaInicio,
    horaFin,
    disponible = true
  }) {
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.disponible = disponible;
  }
}