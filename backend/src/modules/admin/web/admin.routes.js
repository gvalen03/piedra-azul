import { authorize } from "../../../shared/security/authorize.js";
import { usuarioSchema, medicoSchema, pacienteSchema, idParams } from "../schemas/admin.schema.js";
export async function adminRoutes(app) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", authorize("ADMINISTRADOR"));
  for (const [tipo, body] of [["usuarios", usuarioSchema], ["medicos", medicoSchema], ["pacientes", pacienteSchema]]) {
    app.get(`/${tipo}`, async () => app.adminRepository.listar(tipo));
    app.post(`/${tipo}`, { schema: { body } }, async (request, reply) => {
      const result = await app.adminService.guardar(tipo, null, request.body, request.user.sub);
      return reply.code(201).send(result);
    });
    app.put(`/${tipo}/:id`, { schema: { body, params: idParams } }, request => app.adminService.guardar(tipo, request.params.id, request.body, request.user.sub));
  }

  // ADM-01: flujo explícito de desactivación/reactivación (solo ADMINISTRADOR, por el hook de arriba).
  const sinCuerpo = { type: "object", additionalProperties: false };
  const confirmacion = { type: "object", additionalProperties: false, required: ["cantidadEsperada"],
    properties: { cantidadEsperada: { type: "integer", minimum: 0 } } };
  for (const tipo of ["medicos", "pacientes"]) {
    app.get(`/${tipo}/:id/desactivacion`, { schema: { params: idParams } },
      request => app.adminService.previsualizarDesactivacion(tipo, request.params.id));
    app.post(`/${tipo}/:id/desactivar`, { schema: { params: idParams, body: confirmacion } }, async (request, reply) => {
      try { return await app.adminService.desactivar(tipo, request.params.id, request.body.cantidadEsperada, request.user.sub); }
      catch (error) {
        // Si el conteo cambió se devuelve el valor actual para pedir una nueva confirmación.
        if (error.detalles) return reply.code(error.statusCode).send({ statusCode: error.statusCode, error: "Conflict", message: error.message, ...error.detalles });
        throw error;
      }
    });
    app.post(`/${tipo}/:id/reactivar`, { schema: { params: idParams, body: sinCuerpo } },
      request => app.adminService.reactivar(tipo, request.params.id, request.user.sub));
  }
}
