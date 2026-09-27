
import { registrarPacienteSchema } from "../schemas/paciente.schema.js";
import { authorize } from "../../../shared/security/authorize.js";

export async function pacienteRoutes(fastify) {
  fastify.post(
    "/",
    {
      schema: registrarPacienteSchema,
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
      return fastify.pacienteController.registrar(
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