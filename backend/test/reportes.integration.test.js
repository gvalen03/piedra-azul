import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import pg from "pg";
import { CitaRepository } from "../src/modules/citas/infrastructure/cita.repository.js";
import { CitaService } from "../src/modules/citas/application/cita.service.js";
import { reportesRoutes } from "../src/modules/reportes/reportes.routes.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const enabled = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";
const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

test("integración PostgreSQL: reporte anual de citas y permisos por rol", { skip: !enabled }, async () => {
  if (!config.database) throw new Error("DB_NAME es obligatorio para la prueba de integración");

  const adminPool = new pg.Pool(config);
  const schema = `reporte_citas_test_${randomUUID().replaceAll("-", "")}`;
  const quotedSchema = `"${schema}"`;
  let pool;
  let app;

  try {
    await adminPool.query(`CREATE SCHEMA ${quotedSchema}`);
    pool = new pg.Pool({ ...config, options: `-c search_path=${schema}` });

    await pool.query(`
      CREATE TABLE personas (
        id BIGINT PRIMARY KEY,
        nombre TEXT NOT NULL,
        apellido TEXT NOT NULL
      );
      CREATE TABLE profesionales (
        id BIGINT PRIMARY KEY,
        persona_id BIGINT NOT NULL REFERENCES personas(id)
      );
      CREATE TABLE citas (
        id BIGINT PRIMARY KEY,
        profesional_id BIGINT NOT NULL REFERENCES profesionales(id),
        fecha DATE NOT NULL,
        estado TEXT NOT NULL
      );
      INSERT INTO personas (id, nombre, apellido) VALUES
        (101, 'Laura', 'García'),
        (102, 'Mateo', 'Ruiz');
      INSERT INTO profesionales (id, persona_id) VALUES (1, 101), (2, 102);
      INSERT INTO citas (id, profesional_id, fecha, estado) VALUES
        (1, 1, '2026-01-10', 'PROGRAMADA'),
        (2, 1, '2026-01-20', 'CANCELADA'),
        (3, 1, '2026-12-05', 'ATENDIDA'),
        (4, 2, '2026-04-15', 'CONFIRMADA'),
        (5, 2, '2025-04-15', 'PROGRAMADA');
    `);

    const citaRepository = new CitaRepository(pool);
    const citaService = new CitaService({
      citaRepository,
      disponibilidadService: {},
      eventBus: null
    });

    app = Fastify();
    app.decorate("authenticate", async (request, reply) => {
      const users = {
        medico1: { rol: "MEDICO_TERAPISTA", profesionalId: 1 },
        medico2: { rol: "MEDICO_TERAPISTA", profesionalId: 2 },
        medicoSinPerfil: { rol: "MEDICO_TERAPISTA" },
        agendador: { rol: "AGENDADOR" },
        administrador: { rol: "ADMINISTRADOR" },
        paciente: { rol: "PACIENTE" }
      };
      const user = users[request.headers.authorization];
      if (!user) return reply.code(401).send({ error: "Sesión inválida" });
      request.user = user;
    });
    app.decorate("citaService", citaService);
    await app.register(reportesRoutes, { prefix: "/api/reportes" });

    const allProfessionals = await app.inject({
      url: "/api/reportes/citas?anio=2026",
      headers: { authorization: "agendador" }
    });
    assert.equal(allProfessionals.statusCode, 200, allProfessionals.body);
    const allReport = allProfessionals.json();
    assert.equal(allReport.anio, 2026);
    assert.equal(allReport.meses.length, 12);
    assert.deepEqual(allReport.profesionales, [
      {
        profesionalId: 1,
        nombre: "Laura",
        apellido: "García",
        citasPorMes: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        totalAnual: 3
      },
      {
        profesionalId: 2,
        nombre: "Mateo",
        apellido: "Ruiz",
        citasPorMes: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        totalAnual: 1
      }
    ]);

    const ownReport = await app.inject({
      url: "/api/reportes/citas?anio=2026",
      headers: { authorization: "medico1" }
    });
    assert.equal(ownReport.statusCode, 200, ownReport.body);
    assert.deepEqual(ownReport.json().profesionales.map(({ profesionalId }) => profesionalId), [1]);

    const administratorReport = await app.inject({
      url: "/api/reportes/citas?anio=2026",
      headers: { authorization: "administrador" }
    });
    assert.equal(administratorReport.statusCode, 200, administratorReport.body);
    assert.equal(administratorReport.json().profesionales.length, 2);

    const emptyReport = await app.inject({
      url: "/api/reportes/citas?anio=2027",
      headers: { authorization: "agendador" }
    });
    assert.equal(emptyReport.statusCode, 200, emptyReport.body);
    assert.deepEqual(emptyReport.json().profesionales, []);

    assert.equal((await app.inject({
      url: "/api/reportes/citas?anio=2026",
      headers: { authorization: "paciente" }
    })).statusCode, 403);
    assert.equal((await app.inject({
      url: "/api/reportes/citas?anio=2026",
      headers: { authorization: "medicoSinPerfil" }
    })).statusCode, 403);
    const attemptedOverride = await app.inject({
      url: "/api/reportes/citas?anio=2026&profesionalId=2",
      headers: { authorization: "medico1" }
    });
    assert.equal(attemptedOverride.statusCode, 200, attemptedOverride.body);
    assert.deepEqual(
      attemptedOverride.json().profesionales.map(({ profesionalId }) => profesionalId),
      [1]
    );
    assert.equal((await app.inject({
      url: "/api/reportes/citas?anio=20x6",
      headers: { authorization: "agendador" }
    })).statusCode, 400);
    assert.equal((await app.inject("/api/reportes/citas?anio=2026")).statusCode, 401);
  } finally {
    if (app) await app.close();
    if (pool) await pool.end();
    try {
      await adminPool.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
    } finally {
      await adminPool.end();
    }
  }
});
