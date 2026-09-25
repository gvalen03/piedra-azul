import {
  configurarDisponibilidadSchema
} from "../schemas/disponibilidad.schema.js";

export async function disponibilidadRoutes(fastify) {

  fastify.post(
    "/",
    {
      schema: configurarDisponibilidadSchema
    },
    fastify.disponibilidadController.configurar
  );

  fastify.get(
    "/franjas",
    fastify.disponibilidadController.consultarFranjas
  );
}