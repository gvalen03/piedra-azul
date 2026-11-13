import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { ProfesionalRepository } from "../src/modules/profesional/infrastructure/profesional.repository.js";
import { ProfesionalService } from "../src/modules/profesional/application/profesional.service.js";
import { crearProfesionalController } from "../src/modules/profesional/web/profesional.controller.js";
import { profesionalRoutes } from "../src/modules/profesional/web/profesional.routes.js";

test("las consultas públicas de profesionales no exponen datos personales", async t => {
  const queries = [];
  const row = { id: 41, nombre: "Médico", apellido: "Sintético", activo: true };
  const repository = new ProfesionalRepository({
    query: async (sql, params) => {
      queries.push({ sql, params });
      return { rows: [row] };
    }
  });
  const app = Fastify({ logger: false });
  app.decorate("profesionalController", crearProfesionalController({
    profesionalService: new ProfesionalService({ profesionalRepository: repository })
  }));
  await app.register(profesionalRoutes, { prefix: "/api/profesionales" });
  t.after(() => app.close());

  const list = await app.inject({ method: "GET", url: "/api/profesionales" });
  const detail = await app.inject({ method: "GET", url: "/api/profesionales/41" });
  assert.equal(list.statusCode, 200);
  assert.equal(detail.statusCode, 200);
  assert.deepEqual(list.json(), [row]);
  assert.deepEqual(detail.json(), row);
  assert.deepEqual(queries[1].params, ["41"]);
  for (const { sql } of queries) {
    assert.match(sql, /SELECT\s+pr\.id,\s*p\.nombre,\s*p\.apellido,\s*pr\.activo/i);
    assert.doesNotMatch(sql, /numero_documento|email|telefono|created_at|updated_at/i);
  }
});
