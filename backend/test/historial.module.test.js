import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { HistorialRepository } from "../src/modules/historial/infrastructure/historial.repository.js";
import { HistorialService } from "../src/modules/historial/application/historial.service.js";
import { historialRoutes } from "../src/modules/historial/web/historial.routes.js";

const datos = { motivoConsulta: "Consulta", observaciones: "Evaluación", diagnostico: null, tratamiento: null, recomendaciones: null };
function repositorio(cita, fallaInsert = false, previo = false) {
  const llamadas = [];
  const client = {
    query: async (sql, params) => {
      llamadas.push([sql, params]);
      if (sql.includes("FROM citas")) return { rows: cita ? [cita] : [] };
      if (sql.startsWith("SELECT id FROM controles")) return { rows: previo ? [{ id: 4 }] : [] };
      if (sql.startsWith("INSERT INTO controles") && fallaInsert) throw new Error("Error de persistencia");
      return { rows: [{ id: 1 }] };
    }, release: () => llamadas.push(["release"])
  };
  return { repo: new HistorialRepository({ connect: async () => client }), llamadas };
}
test("guarda control y estado en una misma transacción", async () => {
  const { repo, llamadas } = repositorio({ paciente_id: 8, estado: "CONFIRMADA", iniciada: true });
  await repo.registrarAtencion(3, 7, datos);
  assert.match(llamadas[1][0], /medico_id=\$2 FOR UPDATE/);
  assert.deepEqual(llamadas[1][1], [3, 7]);
  const insert = llamadas.findIndex(([sql]) => sql.startsWith("INSERT INTO controles"));
  const update = llamadas.findIndex(([sql]) => sql.startsWith("UPDATE citas"));
  assert.ok(insert < update);
  assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["COMMIT", "release"]);
});
for (const [cita, estado] of [[null, 404], [{ estado: "CANCELADA", iniciada: true }, 409], [{ estado: "ATENDIDA", iniciada: true }, 409], [{ estado: "CONFIRMADA", iniciada: false }, 409]]) {
  test(`rechaza atención inválida ${JSON.stringify(cita)}`, async () => {
    const { repo, llamadas } = repositorio(cita);
    await assert.rejects(repo.registrarAtencion(3, 7, datos), { statusCode: estado });
    assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["ROLLBACK", "release"]);
    assert.equal(llamadas.some(([sql]) => sql.startsWith("INSERT")), false);
  });
}
test("no finaliza cita si falla la escritura del control", async () => {
  const { repo, llamadas } = repositorio({ paciente_id: 8, estado: "PROGRAMADA", iniciada: true }, true);
  await assert.rejects(repo.registrarAtencion(3, 7, datos), /persistencia/);
  assert.equal(llamadas.some(([sql]) => sql.startsWith("UPDATE citas")), false);
  assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["ROLLBACK", "release"]);
});
test("rechaza una segunda atención aunque exista un estado inconsistente", async () => {
  const { repo } = repositorio({ estado: "CONFIRMADA", iniciada: true }, false, true);
  await assert.rejects(repo.registrarAtencion(3, 7, datos), { statusCode: 409 });
});
test("servicio normaliza campos y exige contenido", async () => {
  const service = new HistorialService({ historialRepository: { registrarAtencion: async (_c, _m, d) => d } });
  assert.equal((await service.registrarControl(3, 7, { ...datos, motivoConsulta: " Consulta " })).motivoConsulta, "Consulta");
  await assert.rejects(service.registrarControl(3, 7, { ...datos, observaciones: "   " }), { statusCode: 400 });
});
test("rutas usan identidad de sesión y niegan acceso entre roles", async t => {
  const app = Fastify(); t.after(() => app.close());
  let identidad;
  app.decorate("authenticate", async (req, reply) => {
    if (!req.headers.authorization) return reply.code(401).send({});
    req.user = { rol: req.headers.authorization, medicoId: 7, pacienteId: 8 };
  });
  app.decorate("historialRepository", { listarControlesPorPaciente: async id => { identidad = id; return []; } });
  app.decorate("historialService", {
    obtenerPorCita: async (cita, medico) => { identidad = [cita, medico]; return []; },
    registrarControl: async (cita, medico, body) => { identidad = [cita, medico, body]; return { id: 1 }; }
  });
  await app.register(historialRoutes);
  assert.equal((await app.inject("/mio")).statusCode, 401);
  assert.equal((await app.inject({ url: "/mio?pacienteId=99", headers: { authorization: "PACIENTE" } })).statusCode, 200);
  assert.equal(identidad, 8);
  assert.equal((await app.inject({ url: "/citas/3", headers: { authorization: "PACIENTE" } })).statusCode, 403);
  const headers = { authorization: "MEDICO_TERAPISTA" };
  assert.equal((await app.inject({ url: "/citas/3", headers })).statusCode, 200);
  assert.deepEqual(identidad, [3, 7]);
  assert.equal((await app.inject({ method: "POST", url: "/citas/3", headers, payload: { ...datos, medicoId: 99, pacienteId: 99 } })).statusCode, 201);
  assert.deepEqual(identidad, [3, 7, datos]);
  assert.equal((await app.inject({ method: "POST", url: "/citas/3", headers, payload: { ...datos, motivoConsulta: " " } })).statusCode, 400);
});
