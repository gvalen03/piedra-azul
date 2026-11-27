import { authorize } from "../../shared/security/authorize.js";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

const reporteAnualSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    required: ["anio"],
    properties: {
      anio: {
        type: "string",
        pattern: "^(19|[2-9][0-9])[0-9]{2}$"
      }
    }
  }
};

export async function reportesRoutes(fastify) {
  fastify.get("/citas", {
    schema: reporteAnualSchema,
    preHandler: [
      fastify.authenticate,
      authorize("MEDICO_TERAPISTA", "AGENDADOR", "ADMINISTRADOR")
    ]
  }, async (request, reply) => {
    const anio = Number(request.query.anio);
    let profesionalId = null;

    if (request.user.rol === "MEDICO_TERAPISTA") {
      profesionalId = Number(request.user.profesionalId);
      if (!Number.isSafeInteger(profesionalId) || profesionalId <= 0) {
        return reply.code(403).send({
          error: "Tu usuario no tiene un profesional asociado. Contacta al administrador."
        });
      }
    }

    const profesionales = await fastify.citaRepository.obtenerReporteAnual(anio, profesionalId);

    return {
      anio,
      meses: MESES.map((nombre, indice) => ({ numero: indice + 1, nombre })),
      profesionales
    };
  });
}
