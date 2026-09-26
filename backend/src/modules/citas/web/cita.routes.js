import {
  consultarCitasSchema,
  agendarCitaSchema,
  confirmarCitaSchema
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
    fastify.patch(
    "/:id/confirmar",
    {
      schema: confirmarCitaSchema
    },
    fastify.citaController.confirmar
  );
}