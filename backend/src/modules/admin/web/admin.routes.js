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
}
