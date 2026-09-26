import Fastify from "fastify";
import cors from "@fastify/cors";

import { medicoRoutes }
  from "./modules/medicos/web/medico.routes.js";

import { MedicoRepository }
  from "./modules/medicos/infrastructure/medico.repository.js";

import { authPlugin }
  from "./modules/auth/plugins/auth.js";

import { db }
  from "./shared/db/database.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  const medicoRepository =
    new MedicoRepository(db);

  app.decorate(
    "medicoRepository",
    medicoRepository
  );

  // =========================
  // Plugins
  // =========================

  await app.register(cors, {
    origin: true
  });

  await app.register(authPlugin);

  // =========================
  // Routes
  // =========================

  await app.register(medicoRoutes, {
    prefix: "/api/medicos"
  });

  // =========================
  // Health
  // =========================

  app.get("/health", async () => {
    return {
      status: "ok",
      message:
        "Piedra Azul backend funcionando"
    };
  });

  // =========================
  // Database health
  // =========================

  app.get(
    "/health/db",
    async (request, reply) => {
      try {
        await db.query("SELECT 1");

        return {
          status: "ok",
          database:
            "PostgreSQL conectado"
        };

      } catch (error) {
        request.log.error(error);

        return reply
          .code(500)
          .send({
            status: "error",
            database:
              "No se pudo conectar con PostgreSQL"
          });
      }
    }
  );

  return app;
}