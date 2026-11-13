import { AdminRepository } from "./modules/admin/infrastructure/admin.repository.js";
import { AdminService } from "./modules/admin/application/admin.service.js";
import { adminRoutes } from "./modules/admin/web/admin.routes.js";
import { HistorialRepository } from "./modules/historial/infrastructure/historial.repository.js";
import { HistorialService } from "./modules/historial/application/historial.service.js";
import { historialRoutes } from "./modules/historial/web/historial.routes.js";
import Fastify from "fastify";
import cors from "@fastify/cors";

import { db } from "./shared/db/database.js";

// =========================
// AUTH
// =========================

import { authPlugin }
  from "./modules/auth/plugins/auth.js";

import { authRoutes }
  from "./modules/auth/web/auth.routes.js";

import { UsuarioRepository }
  from "./modules/auth/infrastructure/usuario.repository.js";

import { AuthService }
  from "./modules/auth/application/auth.service.js";

import { crearAuthController }
  from "./modules/auth/web/auth.controller.js";

import { JwtService }
  from "./shared/security/jwt.service.js";

import { PasswordService }
  from "./shared/security/password.service.js";
import { loadAuthConfig }
  from "./shared/security/auth.config.js";
import { KeycloakAdminClient } from "./shared/security/keycloak-admin.client.js";
import { AprovisionamientoRepository } from "./modules/aprovisionamiento/infrastructure/aprovisionamiento.repository.js";
import { AprovisionamientoService } from "./modules/aprovisionamiento/application/aprovisionamiento.service.js";
import { crearAprovisionamientoController } from "./modules/aprovisionamiento/web/aprovisionamiento.controller.js";

// =========================
// PROFESIONALES
// =========================

import { profesionalRoutes }
  from "./modules/profesional/web/profesional.routes.js";

import { ProfesionalRepository }
  from "./modules/profesional/infrastructure/profesional.repository.js";

import { ProfesionalService }
  from "./modules/profesional/application/profesional.service.js";

import { crearProfesionalController }
  from "./modules/profesional/web/profesional.controller.js";

// =========================
// DISPONIBILIDAD
// =========================

import { disponibilidadRoutes }
  from "./modules/disponibilidad/web/disponibilidad.routes.js";

import { DisponibilidadRepository }
  from "./modules/disponibilidad/infrastructure/disponibilidad.repository.js";

import { DisponibilidadService }
  from "./modules/disponibilidad/application/disponibilidad.service.js";

import { crearDisponibilidadController }
  from "./modules/disponibilidad/web/disponibilidad.controller.js";

// =========================
// CITAS
// =========================

import { citaRoutes }
  from "./modules/citas/web/cita.routes.js";

import { CitaRepository }
  from "./modules/citas/infrastructure/cita.repository.js";

import { CitaService }
  from "./modules/citas/application/cita.service.js";

import { crearCitaController }
  from "./modules/citas/web/cita.controller.js";

// =========================
// PACIENTES
// =========================

import { pacienteRoutes }
  from "./modules/pacientes/web/paciente.routes.js";

import { PacienteRepository }
  from "./modules/pacientes/infrastructure/paciente.repository.js";

import { PacienteService }
  from "./modules/pacientes/application/paciente.service.js";

import { crearPacienteController }
  from "./modules/pacientes/web/paciente.controller.js";

// =========================
// AUDITORIA
// =========================

import { AuditoriaRepository }
  from "./modules/auditoria/infrastructure/auditoria.repository.js";

import { AuditoriaService }
  from "./modules/auditoria/application/auditoria.service.js";

// =========================
// SHARED
// =========================

import { eventBus }
  from "./shared/event-bus.js";


export async function buildApp() {
  const authConfig = loadAuthConfig();
  const app = Fastify({
    logger: true
  });

  // =========================
  // Repositories
  // =========================

  const usuarioRepository =
    new UsuarioRepository(db);

  const profesionalRepository =
    new ProfesionalRepository(db);

  const citaRepository =
    new CitaRepository(db);

  const disponibilidadRepository =
    new DisponibilidadRepository(db);

  const pacienteRepository =
    new PacienteRepository(db);

  const auditoriaRepository =
    new AuditoriaRepository(db);

  // =========================
  // Shared Services
  // =========================

  const jwtService =
    new JwtService({
      secret: authConfig.secret,
      expiresIn: authConfig.expiresIn
    });

  const passwordService =
    new PasswordService();

  // =========================
  // Services
  // =========================

  const auditoriaService =
    new AuditoriaService({
      auditoriaRepository
    });

  const authService =
    new AuthService({
      usuarioRepository,
      jwtService,
      passwordService
    });

  const profesionalService =
    new ProfesionalService({
      profesionalRepository
    });

  app.decorate("disponibilidadRepository", disponibilidadRepository);

  const disponibilidadService =
    new DisponibilidadService({
      disponibilidadRepository,
      citaRepository
    });

  const citaService =
    new CitaService({
      citaRepository,
      disponibilidadService,
      eventBus
    });

  const pacienteService =
    new PacienteService({
      pacienteRepository,
      auditoriaService
    });

  // =========================
  // Controllers
  // =========================

  const authController =
    crearAuthController({
      authService
    });

  const profesionalController =
    crearProfesionalController({
      profesionalService
    });

  const disponibilidadController =
    crearDisponibilidadController({
      disponibilidadService
    });

  const citaController =
    crearCitaController({
      citaService
    });

  const pacienteController =
    crearPacienteController({
      pacienteService
    });

  // =========================
  // Decorators
  // =========================

  app.decorate(
    "authController",
    authController
  );

  app.decorate(
    "profesionalRepository",
    profesionalRepository
  );

  app.decorate(
    "profesionalController",
    profesionalController
  );

  app.decorate(
    "disponibilidadController",
    disponibilidadController
  );

  app.decorate("citaRepository", citaRepository);

  app.decorate(
    "citaController",
    citaController
  );

  app.decorate(
    "pacienteRepository",
    pacienteRepository
  );

  app.decorate(
    "pacienteController",
    pacienteController
  );

  // =========================
  // Plugins
  // =========================

  await app.register(cors, {
    origin: true
  });

  app.decorate("authProvider", authConfig.provider);
  await app.register(authPlugin, { config: authConfig });
  const adminRepository = new AdminRepository(db);
  const aprovisionamientoRepository = new AprovisionamientoRepository(db);
  const keycloakAdminClient = authConfig.provider === "keycloak" && authConfig.provisioner
    ? new KeycloakAdminClient({ issuer: authConfig.issuer, ...authConfig.provisioner })
    : null;
  app.decorate("aprovisionamientoController", crearAprovisionamientoController({
    service: new AprovisionamientoService({ repository: aprovisionamientoRepository, keycloakClient: keycloakAdminClient })
  }));
  app.decorate("adminRepository", adminRepository);
  app.decorate("adminService", new AdminService({ repository: adminRepository, passwordService }));
  await app.register(adminRoutes, { prefix: "/api/admin" });
  const historialRepository = new HistorialRepository(db);
  app.decorate("historialRepository", historialRepository);
  app.decorate("historialService", new HistorialService({ historialRepository }));
  await app.register(historialRoutes, { prefix: "/api/historial" });

  // =========================
  // Routes
  // =========================

  await app.register(authRoutes, {
    prefix: "/api/auth"
  });

  await app.register(profesionalRoutes, {
    prefix: "/api/profesionales"
  });

  await app.register(
    disponibilidadRoutes,
    {
      prefix: "/api/disponibilidad"
    }
  );

  await app.register(citaRoutes, {
    prefix: "/api/citas"
  });

  await app.register(pacienteRoutes, {
    prefix: "/api/pacientes"
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

  app.get(
    "/health/db",
    async (request, reply) => {
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
          database:
            "No se pudo conectar con PostgreSQL"
        });
      }
    }
  );

  return app;
}
