export class ProfesionalService {
  constructor({ profesionalRepository }) {
    this.profesionalRepository = profesionalRepository;
  }
  async listarTodos() {
    return await this.profesionalRepository.listarTodos();
  }
  async buscarPorId(id) {
    const profesional = await this.profesionalRepository.buscarPorId(id);
    if (!profesional) throw new Error(`No existe un profesional con id: ${id}`);
    return profesional;
  }
}
