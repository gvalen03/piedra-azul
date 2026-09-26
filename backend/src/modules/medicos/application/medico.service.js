export class MedicoService {
  constructor({ medicoRepository }) {
    this.medicoRepository = medicoRepository;
  }
  async listarTodos() {
    return await this.medicoRepository.listarTodos();
  }
  async buscarPorId(id) {
    const medico = await this.medicoRepository.buscarPorId(id);
    if (!medico) throw new Error(`No existe un médico con id: ${id}`);
    return medico;
  }
}