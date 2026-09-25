export class PacienteRepository {
  constructor(db) {
    this.db = db;
  }

  async buscarPorDocumento(numeroDocumento) {
    // query BD
  }

  async buscarPorEmail(email) {
    // query BD
  }

  async buscarPorId(id) {
    // query BD
  }

  async listarTodos() {
    // query BD
  }

  async listarPorEstado(estado) {
    // query BD
  }

  async existePorDocumento(numeroDocumento) {
    // query BD
  }

  async existePorEmail(email) {
    // query BD
  }

  async guardar(paciente) {
    // insert/update
  }
}