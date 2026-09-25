export class AuditoriaRepository {
  constructor(db) {
    this.db = db;
  }

  async guardar(auditoria) {
    // INSERT
  }

  async listarTodos() {
    // SELECT
  }

  async listarPorTipo(tipoEvento) {
    // SELECT
  }

  async listarPorModulo(moduloOrigen) {
    // SELECT
  }

  async listarPorUsuario(realizadoPor) {
    // SELECT
  }

  async listarPorRangoFecha(fechaInicio, fechaFin) {
    // SELECT
  }
}