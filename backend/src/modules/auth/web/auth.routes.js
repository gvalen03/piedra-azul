import { loginSchema } from "../schemas/auth.schema.js";

export async function authRoutes(fastify) {
  fastify.post(
    "/login",
    {
      schema: loginSchema
    },
    fastify.authController.login
  );
}