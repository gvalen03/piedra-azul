
import { registrarPacienteSchema } from "../schemas/paciente.schema.js";
import { authorize } from "../../../shared/security/authorize.js";

export async function pacienteRoutes(fastify) {
  const propio = async (request, reply) => {
    const id = Number(request.user.pacienteId);
    if (!Number.isSafeInteger(id) || id <= 0) return reply.code(403).send({ error: "Tu cuenta no tiene un paciente asociado. Contacta al administrador." });
    request.pacienteId = id;
  };
  const permisos = [fastify.authenticate, authorize("PACIENTE"), propio];
  fastify.get("/me", { preHandler: permisos }, async (request, reply) => {
    const paciente = await fastify.pacienteRepository.buscarPorId(request.pacienteId);
    if (!paciente) return reply.code(404).send({ error: "Paciente no encontrado" });
    return paciente;
  });
  fastify.patch("/me", { preHandler: permisos, schema: { body: {
    type: "object", additionalProperties: false, required: ["email", "telefono", "direccion"],
    properties: {
      email: { type: ["string", "null"], format: "email", maxLength: 150 },
      telefono: { type: "string", pattern: "\\S", minLength: 1, maxLength: 50 },
      direccion: { type: ["string", "null"], maxLength: 255 }
    }
  } } }, async (request, reply) => {
    try {
      const paciente = await fastify.pacienteRepository.actualizarContacto(request.pacienteId, request.body);
      if (!paciente) return reply.code(404).send({ error: "Paciente no encontrado" });
      return paciente;
    } catch (error) {
      if (error.code === "23505") return reply.code(409).send({ error: "Este correo ya está registrado" });
      throw error;
    }
  });

  fastify.post(
    "/",
    {
      schema: registrarPacienteSchema,
      preHandler: [
        fastify.authenticate,
        authorize(
          "MEDICO_TERAPISTA",
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
    { preHandler: [fastify.authenticate, authorize("AGENDADOR", "ADMINISTRADOR", "MEDICO_TERAPISTA")] },
    fastify.pacienteController.buscarPorDocumento
  );
}