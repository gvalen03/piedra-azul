import Fastify from "fastify";
import cors from "@fastify/cors";
import { medicoRoutes } from "./modules/medicos/web/medico.routes.js";
import { MedicoRepository } from "./modules/medicos/infrastructure/medico.repository.js";
import { db } from "./shared/db/database.js";
import { MedicoService } from "./modules/medicos/application/medico.service.js";
import { crearMedicoController } from "./modules/medicos/web/medico.controller.js";
import { disponibilidadRoutes } from "./modules/disponibilidad/web/disponibilidad.routes.js";
import { DisponibilidadRepository } from "./modules/disponibilidad/infrastructure/disponibilidad.repository.js";
import { DisponibilidadService } from "./modules/disponibilidad/application/disponibilidad.service.js";
import { crearDisponibilidadController } from "./modules/disponibilidad/web/disponibilidad.controller.js";
import { CitaRepository } from "./modules/citas/infrastructure/cita.repository.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  const medicoRepository = new MedicoRepository(db);
const medicoService = new MedicoService({ medicoRepository });
app.decorate("medicoController", crearMedicoController({ medicoService }));

const citaRepository = new CitaRepository(db);
const disponibilidadRepository = new DisponibilidadRepository(db);
const disponibilidadService = new DisponibilidadService({ disponibilidadRepository, citaRepository });
app.decorate("disponibilidadController", crearDisponibilidadController({ disponibilidadService }));

  app.decorate("medicoRepository", medicoRepository);

  // =========================
  // Plugins
  // =========================

  await app.register(cors, {
    origin: true
  });

  await app.register(medicoRoutes, {
    prefix: "/api/medicos"
  });
  
  await app.register(disponibilidadRoutes, { 
    prefix: "/api/disponibilidad" 
  });

  // =========================
  // Health
  // =========================

  app.get("/health", async () => {
    return {
      status: "ok",
      message: "Piedra Azul backend funcionando"
    };
  });

  // =========================
  // Database health
  // =========================

  app.get("/health/db", async (request, reply) => {
    try {
      await db.query("SELECT 1");

      return {
        status: "ok",
        database: "PostgreSQL conectado"
      };
    } catch (error) {
      request.log.error(error);

      return reply.code(500).send({
        status: "error",
        database: "No se pudo conectar con PostgreSQL"
      });
    }
  });

  return app;
}