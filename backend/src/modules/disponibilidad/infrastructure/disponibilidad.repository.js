export class DisponibilidadRepository {
  constructor(db) {
    this.db = db;
  }

  async guardar(disponibilidad) {
    // INSERT / UPDATE
  }

  async buscarPorMedico(medicoId) {
    // SELECT
  }

  async buscarPorMedicoYDia(medicoId, diaSemana) {
    // SELECT
  }

  async eliminarPorMedico(medicoId) {
    // DELETE / soft delete
  }
}