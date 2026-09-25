export async function medicoRoutes(fastify) {
  fastify.get("/", async (request, reply) => {
    try {
      const medicos = await fastify.medicoRepository.listarTodos();

      return medicos;
    } catch (error) {
      request.log.error(error);

      return reply.code(500).send({
        error: "No se pudieron consultar los médicos"
      });
    }
  });
}