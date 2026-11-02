import { loginSchema } from "../schemas/auth.schema.js";

const activationSchema = { body: { type: "object", additionalProperties: false, required: ["token", "password"], properties: {
  token: { type: "string", minLength: 32, maxLength: 200 },
  password: { type: "string", minLength: 8, maxLength: 72 }
} } };
const changePasswordSchema = { body: { type: "object", additionalProperties: false, required: ["passwordActual", "passwordNueva"], properties: {
  passwordActual: { type: "string", minLength: 1, maxLength: 72 },
  passwordNueva: { type: "string", minLength: 8, maxLength: 72 }
} } };

export async function authRoutes(fastify) {
  if (typeof fastify.authController?.cambiarPassword === "function") {
    fastify.post("/change-password", { preHandler: fastify.authenticate, schema: changePasswordSchema }, fastify.authController.cambiarPassword);
  }
  fastify.post("/activate", { schema: activationSchema, config: { rateLimit: fastify.loginRateLimit } }, async (request, reply) => {
    await fastify.adminService.activarCuenta(request.body.token, request.body.password);
    return reply.code(204).send();
  });
  if (fastify.authProvider !== "keycloak") {
    fastify.post(
      "/login",
      {
        schema: loginSchema,
        config: {
          rateLimit: fastify.loginRateLimit
        }
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
