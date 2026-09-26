import { UsuarioRepository }
  from "../infrastructure/usuario.repository.js";

import { AuthService }
  from "../application/auth.service.js";

import { crearAuthController }
  from "../web/auth.controller.js";

import { authRoutes }
  from "../web/auth.routes.js";

import { passwordService }
  from "../utils/password.js";

import { jwtService }
  from "../utils/jwt.js";

import { db }
  from "../../../shared/db/database.js";

export async function authPlugin(fastify) {
  const usuarioRepository =
    new UsuarioRepository(db);

  const authService =
    new AuthService({
      usuarioRepository,
      jwtService,
      passwordService
    });

  const authController =
    crearAuthController({
      authService
    });

  fastify.decorate(
    "authController",
    authController
  );

  await fastify.register(authRoutes, {
    prefix: "/api/auth"
  });
}