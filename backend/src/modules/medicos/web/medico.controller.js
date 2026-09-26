export function crearMedicoController({ medicoService }) {
  return {
    listar: async (request, reply) => reply.send(await medicoService.listarTodos()),
    buscarPorId: async (request, reply) => reply.send(await medicoService.buscarPorId(request.params.id))
  };
}