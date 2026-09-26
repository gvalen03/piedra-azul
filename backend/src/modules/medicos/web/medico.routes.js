export async function medicoRoutes(fastify) {
  fastify.get("/", fastify.medicoController.listar);
  fastify.get("/:id", fastify.medicoController.buscarPorId);
}