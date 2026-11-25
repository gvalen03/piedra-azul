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
  app.decorate("citaRepository", { listarAgendaProfesional: async (...args) => { llamadas.push(args); return [{ id: "7", paciente_nombre: "Ana" }]; } });
  app.decorate("citaController", {
    consultarPorProfesionalYFecha: async () => ({}),
    agendar: async () => ({}),
    confirmar: async () => ({}),
    marcarInasistencia: async request => ({ id: Number(request.params.id), profesionalId: request.profesionalId, estado: "INASISTENCIA" })
  });
  await app.register(citaRoutes);
  return { app, llamadas };
}
test("agenda usa el profesional autenticado y valida fecha", async t => {
  const { app, llamadas } = await appPara(t, { rol: "MEDICO_TERAPISTA", profesionalId: 12 });
  const response = await app.inject("/mi-agenda?fecha=2026-09-27&profesionalId=99");
  assert.equal(response.statusCode, 200);
  assert.deepEqual(llamadas, [[12, "2026-09-27"]]);
  assert.equal(response.json().citas[0].paciente_nombre, "Ana");
  assert.equal((await app.inject("/mi-agenda?fecha=invalida")).statusCode, 400);
  assert.equal(llamadas.length, 1);
});
for (const user of [undefined, { rol: "PACIENTE", profesionalId: 12 }, { rol: "MEDICO_TERAPISTA", profesionalId: null }]) {
  test(`agenda rechaza usuario sin acceso: ${JSON.stringify(user)}`, async t => {
    const { app, llamadas } = await appPara(t, user);
    assert.equal((await app.inject("/mi-agenda?fecha=2026-09-27")).statusCode, user ? 403 : 401);
    assert.equal(llamadas.length, 0);
  });
}
test("repositorio limita la agenda al profesional y fecha con parámetros SQL", async () => {
  const repo = new CitaRepository({ query: async (sql, params) => {
    assert.match(sql, /c\.profesional_id\s*=\s*\$1\s+AND\s+c\.fecha\s*=\s*\$2/);
    assert.match(sql, /JOIN pacientes/);
    assert.deepEqual(params, [12, "2026-09-27"]);
    return { rows: [] };
  } });
  assert.deepEqual(await repo.listarAgendaProfesional(12, "2026-09-27"), []);
});

test("solo el profesional dueño puede marcar una cita como inasistencia", async t => {
  const { app } = await appPara(t, { rol: "MEDICO_TERAPISTA", profesionalId: 12 });
  const respuesta = await app.inject({ method: "PATCH", url: "/mi-agenda/7/inasistencia" });
  assert.equal(respuesta.statusCode, 200, respuesta.body);
  assert.deepEqual(respuesta.json(), { id: 7, profesionalId: 12, estado: "INASISTENCIA" });

  const { app: paciente } = await appPara(t, { rol: "PACIENTE", profesionalId: 12 });
  assert.equal((await paciente.inject({ method: "PATCH", url: "/mi-agenda/7/inasistencia" })).statusCode, 403);
});

test("repositorio impide registrar inasistencia antes del inicio o fuera de la agenda propia", async () => {
  const llamadas = [];
  const client = {
    query: async (sql, params) => {
      llamadas.push([sql, params]);
      if (sql.trimStart().startsWith("UPDATE citas")) return { rows: [] };
      return { rows: [] };
    },
    release: () => llamadas.push(["release"])
  };
  const repo = new CitaRepository({ connect: async () => client });

  await assert.rejects(() => repo.marcarInasistencia(7, 12, "profesional-12"), { statusCode: 409 });
  const [sql, params] = llamadas.find(([query]) => query.trimStart().startsWith("UPDATE citas"));
  assert.match(sql, /profesional_id\s*=\s*\$2/);
  assert.match(sql, /estado IN \('PROGRAMADA', 'CONFIRMADA'\)/);
  assert.match(sql, /America\/Bogota/);
  assert.deepEqual(params, [7, 12]);
  assert.equal(llamadas.at(-2)[0], "ROLLBACK");
  assert.equal(llamadas.at(-1)[0], "release");
});
