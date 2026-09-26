import { authorize } from "../../../shared/security/authorize.js";

export async function pacienteRoutes(fastify) {
  fastify.post(
    "/",
    {
      preHandler: [
        fastify.authenticate,
        authorize(
          "MEDICO_TERAPISTA",
          "PACIENTE",
          "AGENDADOR",
          "ADMINISTRADOR"
        )
      ]
    },
    async (request, reply) => {
      return fastify.citaController.crear(
        request,
        reply
      );
    }
  );

  fastify.get(
    "/documento/:documento",
    fastify.pacienteController.buscarPorDocumento
  );
}