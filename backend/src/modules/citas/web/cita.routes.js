import { authorize }
  from "../../../shared/security/authorize.js";

import {
  consultarCitasSchema,
  agendarCitaSchema,
  confirmarCitaSchema
} from "../schemas/cita.schema.js";

export async function citaRoutes(fastify) {
  const pacientePropio = async (request, reply) => {
    const id = Number(request.user.pacienteId);
    if (!Number.isSafeInteger(id) || id <= 0) return reply.code(403).send({ error: "Tu cuenta no tiene un paciente asociado. Contacta al administrador." });
    request.pacienteId = id;
  };
  const permisosPaciente = [fastify.authenticate, authorize("PACIENTE"), pacientePropio];
  fastify.get("/mis-citas", { preHandler: permisosPaciente }, async request => ({ citas: await fastify.citaRepository.listarPorPaciente(request.pacienteId) }));
  const reservaPropia = { ...agendarCitaSchema.body, additionalProperties: false,
    required: agendarCitaSchema.body.required.filter(c => c !== "pacienteId"),
    properties: { ...agendarCitaSchema.body.properties } };
  delete reservaPropia.properties.pacienteId;
  fastify.post("/mis-citas", { preHandler: permisosPaciente, schema: { body: reservaPropia } }, async (request, reply) => {
    const paciente = await fastify.pacienteRepository.buscarPorId(request.pacienteId);
    if (paciente?.estado !== "ACTIVO") return reply.code(403).send({ error: "Tu registro no está activo. Contacta al administrador." });
    request.body = { ...request.body, pacienteId: request.pacienteId };
    return fastify.citaController.agendar(request, reply);
  });
  for (const [accion, estado] of [["confirmar", "CONFIRMADA"], ["cancelar", "CANCELADA"]]) {
    fastify.patch(`/mis-citas/:id/${accion}`, { preHandler: permisosPaciente, schema: confirmarCitaSchema }, async (request, reply) => {
      const cita = await fastify.citaRepository.cambiarEstadoPaciente(request.params.id, request.pacienteId, estado);
      if (!cita) return reply.code(409).send({ error: "La cita no está disponible para esta acción. Actualiza tus citas." });
      return cita;
    });
  }

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
      schema: confirmarCitaSchema,
      preHandler: [fastify.authenticate, authorize("AGENDADOR", "ADMINISTRADOR")]
    },
    fastify.citaController.confirmar
  );
}
