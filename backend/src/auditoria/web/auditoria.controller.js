export function crearAuditoriaController({ auditoriaService }) {
  return {
    listarTodos: async (request, reply) => {
      const registros = await auditoriaService.listarTodos();
      return reply.send(registros);
    },

    listarPorTipo: async (request, reply) => {
      const { tipo } = request.query;

      const registros =
        await auditoriaService.listarPorTipo(tipo);

      return reply.send(registros);
    }
  };
}