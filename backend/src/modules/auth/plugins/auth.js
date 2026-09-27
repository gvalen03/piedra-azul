import fp from "fastify-plugin";
import jwt from "jsonwebtoken";

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

export const authPlugin = fp(
  async function authPlugin(fastify) {

    fastify.decorate(
      "authenticate",
      async function (request, reply) {
        try {
          const authorization =
            request.headers.authorization;

          if (!authorization) {
            return reply.code(401).send({
              error: "Token requerido"
            });
          }

          const [tipo, token] =
            authorization.split(" ");

          if (
            tipo !== "Bearer" ||
            !token
          ) {
            return reply.code(401).send({
              error: "Formato de token inválido"
            });
          }

          const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
          );

          request.user = payload;

        } catch (error) {
          return reply.code(401).send({
            error: "Token inválido o expirado"
          });
        }
      }
    );
  }
);