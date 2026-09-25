export async function auditoriaRoutes(fastify) {
  fastify.get(
    "/",
    fastify.auditoriaController.listarTodos
  );

  fastify.get(
    "/tipo",
    fastify.auditoriaController.listarPorTipo
  );
}