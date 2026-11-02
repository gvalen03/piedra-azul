import { authorize } from "../../../shared/security/authorize.js";
import {
  configurarDisponibilidadSchema
} from "../schemas/disponibilidad.schema.js";

export async function disponibilidadRoutes(fastify) {
  const propio = async (request, reply) => {
    const id = Number(request.user.medicoId);
    if (!Number.isSafeInteger(id) || id <= 0) return reply.code(403).send({ error: "Tu usuario no tiene un médico asociado" });
    request.medicoId = id;
  };

  const permisos = [fastify.authenticate, authorize("MEDICO_TERAPISTA"), propio];

  const body = { ...configurarDisponibilidadSchema.body,
    required: configurarDisponibilidadSchema.body.required.filter(c => c !== "medicoId"),
    additionalProperties: false,
    properties: { ...configurarDisponibilidadSchema.body.properties }
  };

  delete body.properties.medicoId;

  fastify.get("/mia", { preHandler: permisos }, request => fastify.disponibilidadRepository.buscarPorMedico(request.medicoId));

  fastify.post("/mia", { preHandler: permisos, schema: { body } }, (request, reply) => {
    request.body = { ...request.body, medicoId: request.medicoId };
    return fastify.disponibilidadController.configurar(request, reply);
  });

  fastify.delete("/mia/:id", {
    preHandler: permisos,
    schema: { params: { type: "object", properties: { id: { type: "integer", minimum: 1 } } } }
  }, async (request, reply) => {
    const result = await fastify.disponibilidadRepository.desactivar(request.params.id, request.medicoId);
    if (!result) return reply.code(404).send({ error: "Bloque no encontrado" });
    return { message: "Bloque desactivado. Las citas existentes se conservan." };
  });


  fastify.get(
    "/",
    {
      preHandler: [
        fastify.authenticate,
        authorize("ADMINISTRADOR")
      ],
      schema: {
        querystring: {
          type: "object",
          required: ["medicoId"],
          properties: {
            medicoId: { type: "integer", minimum: 1 }
          }
        }
      }
    },
    request =>
      fastify.disponibilidadRepository.buscarPorMedico(
        request.query.medicoId
      )
  );

  fastify.delete(
    "/:id",
    {
      preHandler: [
        fastify.authenticate,
        authorize("ADMINISTRADOR")
      ],
      schema: {
        params: {
          type: "object",
          properties: {
            id: { type: "integer", minimum: 1 }
          }
        },
        querystring: {
          type: "object",
          required: ["medicoId"],
          properties: {
            medicoId: { type: "integer", minimum: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const result = await fastify.disponibilidadRepository.desactivar(
        request.params.id,
        request.query.medicoId
      );

      if (!result) return reply.code(404).send({ error: "Bloque no encontrado" });

      return { message: "Bloque desactivado. Las citas existentes se conservan." };
    }
  );


  fastify.post(
    "/",
    {
      schema: configurarDisponibilidadSchema,
      preHandler: [
        fastify.authenticate,
        authorize("ADMINISTRADOR")
      ]
    },
    async (request, reply) => {
      return fastify.disponibilidadController.configurar(
        request,
        reply
      );
    }
  );

  fastify.get(
    "/franjas",
    { schema: { querystring: { type: "object", required: ["medicoId", "fecha"], properties: {
      medicoId: { type: "integer", minimum: 1 }, fecha: { type: "string", format: "date" }
    } } } },
    fastify.disponibilidadController.consultarFranjas
  );
}