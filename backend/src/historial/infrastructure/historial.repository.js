export class HistorialRepository {
  constructor(db) {
    this.db = db;
  }

  async buscarHistoriaPorPaciente(pacienteId) {
    // SELECT
  }

  async crearHistoria(historiaClinica) {
    // INSERT
  }

  async guardarControl(controlMedico) {
    // INSERT
  }

  async listarControlesPorPaciente(pacienteId) {
    // SELECT
  }

  async listarControlesPorHistoria(historiaClinicaId) {
    // SELECT
  }

  async buscarControlPorId(id) {
    // SELECT
  }
}