export async function pacienteRoutes(fastify) {
  fastify.post(
    "/",
    {
      schema: registrarPacienteSchema
    },
    fastify.pacienteController.registrar
  );

  fastify.get(
    "/documento/:documento",
    fastify.pacienteController.buscarPorDocumento
  );
}