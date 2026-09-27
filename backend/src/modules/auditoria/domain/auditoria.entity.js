export class Auditoria {
  constructor({
    id = null,
    tipoEvento,
    descripcion,
    entidadId = null,
    realizadoPor,
    moduloOrigen,
    fecha = new Date(),
    datosAdicionales = null
  }) {
    this.id = id;
    this.tipoEvento = tipoEvento;
    this.descripcion = descripcion;
    this.entidadId = entidadId;
    this.realizadoPor = realizadoPor;
    this.moduloOrigen = moduloOrigen;
    this.fecha = fecha;
    this.datosAdicionales = datosAdicionales;
  }
}