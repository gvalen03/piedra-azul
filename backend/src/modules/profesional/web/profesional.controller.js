export function crearProfesionalController({ profesionalService }) {
  return {
    listar: async (request, reply) => reply.send(await profesionalService.listarTodos()),
    buscarPorId: async (request, reply) => reply.send(await profesionalService.buscarPorId(request.params.id))
  };
}
