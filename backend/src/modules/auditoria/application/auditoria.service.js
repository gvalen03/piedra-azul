import { Auditoria } from "../domain/auditoria.entity.js";

export class AuditoriaService {
  constructor({ auditoriaRepository }) {
    this.auditoriaRepository = auditoriaRepository;
  }

  async registrar({
    tipoEvento,
    descripcion,
    entidadId = null,
    realizadoPor,
    moduloOrigen,
    datosAdicionales = null
  }) {
    const auditoria = new Auditoria({
      tipoEvento,
      descripcion,
      entidadId,
      realizadoPor,
      moduloOrigen,
      datosAdicionales
    });

    return await this.auditoriaRepository.guardar(auditoria);
  }

  async listarTodos() {
    return await this.auditoriaRepository.listarTodos();
  }

  async listarPorTipo(tipoEvento) {
    return await this.auditoriaRepository.listarPorTipo(tipoEvento);
  }
}