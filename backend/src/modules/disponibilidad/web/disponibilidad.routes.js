import { authorize } from "../../../shared/security/authorize.js";
import { configurarDisponibilidadSchema } from "../schemas/disponibilidad.schema.js";

export async function disponibilidadRoutes(fastify) {
  const propio = async (request, reply) => {
    const id = Number(request.user.profesionalId);
    if (!Number.isSafeInteger(id) || id <= 0) return reply.code(403).send({ error: "Tu usuario no tiene un profesional asociado" });
    request.profesionalId = id;
  };
  const permisos = [fastify.authenticate, authorize("MEDICO_TERAPISTA"), propio];
  const bodyPropio = { ...configurarDisponibilidadSchema.body, required: configurarDisponibilidadSchema.body.required.filter(c => c !== "profesionalId"), additionalProperties: false, properties: { ...configurarDisponibilidadSchema.body.properties } };
  delete bodyPropio.properties.profesionalId;
  const queryProfesional = { type: "object", required: ["profesionalId"], additionalProperties: false, properties: { profesionalId: { type: "integer", minimum: 1 } } };

  fastify.get("/mia", { preHandler: permisos }, request => fastify.disponibilidadRepository.buscarPorProfesional(request.profesionalId));
  fastify.post("/mia", { preHandler: permisos, schema: { body: bodyPropio } }, (request, reply) => {
    request.body = { ...request.body, profesionalId: request.profesionalId };
    return fastify.disponibilidadController.configurar(request, reply);
  });
  fastify.delete("/mia/:id", { preHandler: permisos, schema: { params: { type: "object", required: ["id"], properties: { id: { type: "integer", minimum: 1 } } } } }, async (request, reply) => {
    const result = await fastify.disponibilidadRepository.desactivar(request.params.id, request.profesionalId);
    if (!result) return reply.code(404).send({ error: "Bloque no encontrado" });
    return { message: "Bloque desactivado. Las citas existentes se conservan." };
  });
  fastify.get("/", { preHandler: [fastify.authenticate, authorize("ADMINISTRADOR")], schema: { querystring: queryProfesional } }, request => fastify.disponibilidadRepository.buscarPorProfesional(request.query.profesionalId));
  fastify.delete("/:id", { preHandler: [fastify.authenticate, authorize("ADMINISTRADOR")], schema: { params: { type: "object", required: ["id"], additionalProperties: false, properties: { id: { type: "integer", minimum: 1 } } }, querystring: queryProfesional } }, async (request, reply) => {
    const result = await fastify.disponibilidadRepository.desactivar(request.params.id, request.query.profesionalId);
    if (!result) return reply.code(404).send({ error: "Bloque no encontrado" });
    return { message: "Bloque desactivado. Las citas existentes se conservan." };
  });
  fastify.put("/:id", { schema: { params: { type: "object", required: ["id"], additionalProperties: false, properties: { id: { type: "integer", minimum: 1 } } }, body: configurarDisponibilidadSchema.body }, preHandler: [fastify.authenticate, authorize("ADMINISTRADOR")] }, fastify.disponibilidadController.actualizar);
  fastify.post("/", { schema: configurarDisponibilidadSchema, preHandler: [fastify.authenticate, authorize("ADMINISTRADOR")] }, (request, reply) => fastify.disponibilidadController.configurar(request, reply));
  fastify.get("/franjas", { schema: { querystring: { type: "object", required: ["profesionalId", "fecha"], additionalProperties: false, properties: { profesionalId: { type: "integer", minimum: 1 }, fecha: { type: "string", format: "date" } } } } }, fastify.disponibilidadController.consultarFranjas);
}
