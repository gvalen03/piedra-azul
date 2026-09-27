import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { citaRoutes } from "../src/modules/citas/web/cita.routes.js";
import { CitaRepository } from "../src/modules/citas/infrastructure/cita.repository.js";

async function appPara(t, user) {
  const app = Fastify();
  t.after(() => app.close());
  const llamadas = [];
  app.decorate("authenticate", async req => { req.user = user; });
  app.decorate("citaRepository", { listarAgendaMedico: async (...args) => { llamadas.push(args); return [{ id: "7", paciente_nombre: "Ana" }]; } });
  app.decorate("citaController", { consultarPorMedicoYFecha: async () => ({}), agendar: async () => ({}), confirmar: async () => ({}) });
  await app.register(citaRoutes);
  return { app, llamadas };
}
test("agenda usa el médico autenticado y valida fecha", async t => {
  const { app, llamadas } = await appPara(t, { rol: "MEDICO_TERAPISTA", medicoId: 12 });
  const response = await app.inject("/mi-agenda?fecha=2026-09-27&medicoId=99");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(llamadas, [[12, "2026-09-27"]]);
  assert.equal(response.json().citas[0].paciente_nombre, "Ana");
  assert.equal((await app.inject("/mi-agenda?fecha=invalida")).statusCode, 400);
  assert.equal(llamadas.length, 1);
});
for (const user of [undefined, { rol: "PACIENTE", medicoId: 12 }, { rol: "MEDICO_TERAPISTA", medicoId: null }]) {
  test(`agenda rechaza usuario sin acceso: ${JSON.stringify(user)}`, async t => {
    const { app, llamadas } = await appPara(t, user);
    assert.equal((await app.inject("/mi-agenda?fecha=2026-09-27")).statusCode, user ? 403 : 401);
    assert.equal(llamadas.length, 0);
  });
}
test("repositorio limita la agenda al médico y fecha con parámetros SQL", async () => {
  const repo = new CitaRepository({ query: async (sql, params) => {
    assert.match(sql, /c.medico_id = \$1 AND c.fecha = \$2/);
    assert.match(sql, /JOIN pacientes/);
    assert.deepEqual(params, [12, "2026-09-27"]);
    return { rows: [] };
  } });
  assert.deepEqual(await repo.listarAgendaMedico(12, "2026-09-27"), []);
});
