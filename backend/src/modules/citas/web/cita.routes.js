import {
  consultarCitasSchema,
  agendarCitaSchema
} from "../schemas/cita.schema.js";

export async function citaRoutes(fastify) {

  fastify.get(
    "/",
    {
      schema: consultarCitasSchema
    },
    fastify.citaController.consultarPorMedicoYFecha
  );

  fastify.post(
    "/",
    {
      schema: agendarCitaSchema
    },
    fastify.citaController.agendar
  );
}