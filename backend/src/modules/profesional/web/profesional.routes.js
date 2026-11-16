export async function profesionalRoutes(fastify) {
  fastify.get("/", fastify.profesionalController.listar);
  fastify.get("/:id", fastify.profesionalController.buscarPorId);
}
