import Fastify from "fastify";
import cors from "@fastify/cors";

import { db }
  from "./shared/db/database.js";

import { authPlugin }
  from "./modules/auth/plugins/auth.js";

import { medicoRoutes }
  from "./modules/medicos/web/medico.routes.js";

import { MedicoRepository }
  from "./modules/medicos/infrastructure/medico.repository.js";

import { MedicoService }
  from "./modules/medicos/application/medico.service.js";

import { crearMedicoController }
  from "./modules/medicos/web/medico.controller.js";

import { pacienteRoutes }
  from "./modules/pacientes/web/paciente.routes.js";

import { PacienteRepository }
  from "./modules/pacientes/infrastructure/paciente.repository.js";

import { PacienteService }
  from "./modules/pacientes/application/paciente.service.js";

import { crearPacienteController }
  from "./modules/pacientes/web/paciente.controller.js";

import { AuditoriaRepository }
  from "./auditoria/infrastructure/auditoria.repository.js";

import { AuditoriaService }
  from "./auditoria/application/auditoria.service.js";

import { disponibilidadRoutes }
  from "./modules/disponibilidad/web/disponibilidad.routes.js";

import { DisponibilidadRepository }
  from "./modules/disponibilidad/infrastructure/disponibilidad.repository.js";

import { DisponibilidadService }
  from "./modules/disponibilidad/application/disponibilidad.service.js";

import { crearDisponibilidadController }
  from "./modules/disponibilidad/web/disponibilidad.controller.js";

import { CitaRepository }
  from "./modules/citas/infrastructure/cita.repository.js";

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  // =========================
  // Médicos
  // =========================

  const medicoRepository =
    new MedicoRepository(db);

  const medicoService =
    new MedicoService({
      medicoRepository
    });

  const medicoController =
    crearMedicoController({
      medicoService
    });

  app.decorate(
    "medicoRepository",
    medicoRepository
  );

  app.decorate(
    "medicoController",
    medicoController
  );

  // =========================
  // Pacientes
  // =========================

  const pacienteRepository =
    new PacienteRepository(db);

  const auditoriaRepository =
    new AuditoriaRepository(db);

  const auditoriaService =
    new AuditoriaService({
      auditoriaRepository
    });

  const pacienteService =
    new PacienteService({
      pacienteRepository,
      auditoriaService
    });

  const pacienteController =
    crearPacienteController({
      pacienteService
    });

  app.decorate(
    "pacienteRepository",
    pacienteRepository
  );

  app.decorate(
    "pacienteController",
    pacienteController
  );

  // =========================
  // Disponibilidad
  // =========================

  const citaRepository =
    new CitaRepository(db);

  const disponibilidadRepository =
    new DisponibilidadRepository(db);

  const disponibilidadService =
    new DisponibilidadService({
      disponibilidadRepository,
      citaRepository
    });

  const disponibilidadController =
    crearDisponibilidadController({
      disponibilidadService
    });

  app.decorate(
    "disponibilidadController",
    disponibilidadController
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

  await app.register(
    disponibilidadRoutes,
    {
      prefix: "/api/disponibilidad"
    }
  );

  await app.register(pacienteRoutes, {
    prefix: "/api/pacientes"
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