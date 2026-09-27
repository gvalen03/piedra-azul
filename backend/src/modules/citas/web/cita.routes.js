import { authorize }
  from "../../../shared/security/authorize.js";

import {
  consultarCitasSchema,
  agendarCitaSchema,
  confirmarCitaSchema
} from "../schemas/cita.schema.js";

export async function citaRoutes(fastify) {

  fastify.get(
    "/",
    {
      schema: consultarCitasSchema,
      preHandler: [
        fastify.authenticate,
        authorize(
          "AGENDADOR",
          "ADMINISTRADOR"
        )
      ]
    },
    fastify.citaController
      .consultarPorMedicoYFecha
  );

  fastify.post(
    "/",
    {
      schema: agendarCitaSchema,
      preHandler: [
        fastify.authenticate,
        authorize(
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
    fastify.patch(
    "/:id/confirmar",
    {
      schema: confirmarCitaSchema
    },
    fastify.citaController.confirmar
  );
}