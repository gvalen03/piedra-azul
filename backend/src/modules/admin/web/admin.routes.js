import { authorize } from "../../../shared/security/authorize.js";
import { usuarioSchema, editarCuentaKeycloakSchema, profesionalSchema, pacienteSchema, estadoSchema, idParams } from "../schemas/admin.schema.js";
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
    app.put("/usuarios/:id", { schema: { body: editarCuentaKeycloakSchema, params: idParams } }, request =>
      app.adminService.guardarCuentaKeycloakPropia(request.params.id, request.body, request.user.sub));
    app.patch("/usuarios/:id/estado", { schema: { body: estadoSchema, params: idParams } }, request =>
      app.adminService.cambiarEstadoCuentaKeycloak(request.params.id, request.body.activo, request.user.sub));
  }
  for (const [tipo, body] of recursos) {
    app.get(`/${tipo}`, async () => app.adminRepository.listar(tipo));
    app.post(`/${tipo}`, { schema: { body } }, async (request, reply) => {
      const result = await app.adminService.guardar(tipo, null, request.body, request.user.sub);
      return reply.code(201).send(result);
    });
    app.put(`/${tipo}/:id`, { schema: { body, params: idParams } }, request => app.adminService.guardar(tipo, request.params.id, request.body, request.user.sub));
    app.patch(`/${tipo}/:id/estado`, { schema: { body: estadoSchema, params: idParams } }, request =>
      app.adminService.cambiarEstadoPerfil(tipo, request.params.id, request.body.activo, request.user.sub));
    if (tipo !== "usuarios") {
      app.delete(`/${tipo}/:id`, { schema: { params: idParams } }, request =>
        app.adminService.eliminarPerfil(tipo, request.params.id, request.user.sub));
    }
  }
}
