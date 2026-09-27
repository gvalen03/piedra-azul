import { authorize }
  from "../../../shared/security/authorize.js";

import {
  consultarCitasSchema,
  agendarCitaSchema,
  confirmarCitaSchema
} from "../schemas/cita.schema.js";

export async function citaRoutes(fastify) {
  fastify.get("/mi-agenda", {
    schema: {
      querystring: {
        type: "object", required: ["fecha"], additionalProperties: false,
        properties: { fecha: { type: "string", format: "date" } }
      }
    },
    preHandler: [fastify.authenticate, authorize("MEDICO_TERAPISTA")]
  }, async (request, reply) => {
    const medicoId = Number(request.user.medicoId);
    if (!Number.isSafeInteger(medicoId) || medicoId <= 0) {
      return reply.code(403).send({ error: "Tu usuario no tiene un médico asociado. Contacta al administrador." });
    }
    const citas = await fastify.citaRepository.listarAgendaMedico(medicoId, request.query.fecha);
    return { citas };
  });

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
      return fastify.citaController.agendar(
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
