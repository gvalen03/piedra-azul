export class CitaRepository {
  constructor(db) {
    this.db = db;
  }

  async guardar(cita) {
    // INSERT
  }

  async buscarPorId(id) {
    // SELECT
  }

  async listarPorMedicoYFecha(medicoId, fecha) {
    // SELECT ...
  }

  async existeCitaEnHorario(medicoId, fecha, horaInicio) {
    // SELECT EXISTS ...
  }

  async listarPorPaciente(pacienteId) {
    // SELECT ...
  }

  async actualizarEstado(id, estado) {
    // UPDATE ...
  }
}