export class HistoriaClinica {
  constructor({
    id = null,
    pacienteId,
    fechaCreacion = new Date(),
    activa = true
  }) {
    this.id = id;
    this.pacienteId = pacienteId;
    this.fechaCreacion = fechaCreacion;
    this.activa = activa;
  }
}