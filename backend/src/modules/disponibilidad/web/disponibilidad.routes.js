import { authorize } from "../../../shared/security/authorize.js";
import {
  configurarDisponibilidadSchema
} from "../schemas/disponibilidad.schema.js";

export async function disponibilidadRoutes(fastify) {

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
    fastify.disponibilidadController.consultarFranjas
  );
}