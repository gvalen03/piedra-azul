export class UsuarioRepository {
  constructor(db) {
    this.db = db;
  }

  async buscarPorUsername(username) {
    // consulta BD
  }

  async listarPorRol(rol) {
    // consulta BD
  }

  async existePorUsername(username) {
    // consulta BD
  }

  async existePorEmail(email) {
    // consulta BD
  }

  async buscarPorPacienteId(pacienteId) {
    // consulta BD
  }

  async existePorPacienteId(pacienteId) {
    // consulta BD
  }

  async buscarPorId(id) {
    // consulta BD
  }

  async guardar(usuario) {
    // insert/update
  }
}