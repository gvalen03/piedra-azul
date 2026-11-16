export class HistorialService {
  constructor({ historialRepository }) { this.historialRepository = historialRepository; }
  async obtenerPorCita(citaId, profesionalId) {
    const pacienteId = await this.historialRepository.pacienteDeCita(citaId, profesionalId);
    return this.historialRepository.listarControlesPorPaciente(pacienteId);
  }
  async registrarControl(citaId, profesionalId, datos) {
    const normalizados = Object.fromEntries(["motivoConsulta", "observaciones", "diagnostico", "tratamiento", "recomendaciones"]
      .map(key => [key, datos[key]?.trim() || null]));
    if (!normalizados.motivoConsulta || !normalizados.observaciones) {
      throw Object.assign(new Error("El motivo de consulta y las observaciones son obligatorios"), { statusCode: 400 });
    }
    return this.historialRepository.registrarAtencion(citaId, profesionalId, normalizados);
  }
}
