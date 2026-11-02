import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { MedicoRepository } from "../src/modules/medicos/infrastructure/medico.repository.js";
import { MedicoService } from "../src/modules/medicos/application/medico.service.js";
import { crearMedicoController } from "../src/modules/medicos/web/medico.controller.js";
import { medicoRoutes } from "../src/modules/medicos/web/medico.routes.js";

test("las consultas públicas de médicos no exponen datos personales", async t => {
  const queries = [];
  const row = { id: 41, nombre: "Médico", apellido: "Sintético", activo: true };
  const repository = new MedicoRepository({
    query: async (sql, params) => {
      queries.push({ sql, params });
      return { rows: [row] };
    }
  });
  const app = Fastify({ logger: false });
  app.decorate("medicoController", crearMedicoController({
    medicoService: new MedicoService({ medicoRepository: repository })
  }));
  await app.register(medicoRoutes, { prefix: "/api/medicos" });
  t.after(() => app.close());

  const list = await app.inject({ method: "GET", url: "/api/medicos" });
  const detail = await app.inject({ method: "GET", url: "/api/medicos/41" });
  assert.equal(list.statusCode, 200);
  assert.equal(detail.statusCode, 200);
  assert.deepEqual(list.json(), [row]);
  assert.deepEqual(detail.json(), row);
  assert.deepEqual(queries[1].params, ["41"]);
  for (const { sql } of queries) {
    assert.match(sql, /SELECT\s+id,\s*nombre,\s*apellido,\s*activo/i);
    assert.doesNotMatch(sql, /numero_documento|email|telefono|created_at|updated_at/i);
  }
});
