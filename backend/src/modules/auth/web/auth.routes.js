import { loginSchema } from "../schemas/auth.schema.js";

export async function authRoutes(fastify) {
  if (fastify.authProvider !== "keycloak") {
    fastify.post(
      "/login",
      {
        schema: loginSchema
      },
      fastify.authController.login
    );
  }
  fastify.get("/session", { preHandler: fastify.authenticate }, async request => ({
    usuarioId: request.user.usuarioId,
    username: request.user.username,
    nombre: request.user.nombre,
    rol: request.user.rol,
    pacienteId: request.user.pacienteId,
    medicoId: request.user.medicoId
  }));
}