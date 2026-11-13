import { authorize } from "../../../shared/security/authorize.js";
import { usuarioSchema, profesionalSchema, pacienteSchema, idParams } from "../schemas/admin.schema.js";
import { aprovisionarUsuarioSchema } from "../../aprovisionamiento/schemas/aprovisionamiento.schema.js";
export async function adminRoutes(app) {
  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", authorize("ADMINISTRADOR"));
  // Las cuentas y roles se gestionan en Keycloak; aquí solo se administran
  // perfiles clínicos cuando ese proveedor está activo.
  const recursos = app.authProvider === "keycloak"
    ? [["profesionales", profesionalSchema], ["pacientes", pacienteSchema]]
    : [["usuarios", usuarioSchema], ["profesionales", profesionalSchema], ["pacientes", pacienteSchema]];
  if (app.authProvider === "keycloak") {
    app.get("/usuarios", async () => app.adminRepository.listarCuentasAcceso());
    app.post("/usuarios", { schema: { body: aprovisionarUsuarioSchema } }, app.aprovisionamientoController.aprovisionar);
  }
  for (const [tipo, body] of recursos) {
    app.get(`/${tipo}`, async () => app.adminRepository.listar(tipo));
    app.post(`/${tipo}`, { schema: { body } }, async (request, reply) => {
      const result = await app.adminService.guardar(tipo, null, request.body, request.user.sub);
      return reply.code(201).send(result);
    });
    app.put(`/${tipo}/:id`, { schema: { body, params: idParams } }, request => app.adminService.guardar(tipo, request.params.id, request.body, request.user.sub));
    if (tipo !== "usuarios") {
      app.delete(`/${tipo}/:id`, { schema: { params: idParams } }, request =>
        app.adminService.eliminarPerfil(tipo, request.params.id, request.user.sub));
    }
  }
}
