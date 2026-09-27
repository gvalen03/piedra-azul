import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { pacienteRoutes } from "../src/modules/pacientes/web/paciente.routes.js";
import { citaRoutes } from "../src/modules/citas/web/cita.routes.js";
import { CitaRepository } from "../src/modules/citas/infrastructure/cita.repository.js";

async function crear(t, user = { rol: "PACIENTE", pacienteId: 7 }) {
  const app = Fastify(); t.after(() => app.close());
  const llamadas = [];
  app.decorate("authenticate", async (req, reply) => {
    if (!user) return reply.code(401).send({});
    req.user = user;
  });
  app.decorate("pacienteRepository", {
    buscarPorId: async id => { llamadas.push(["perfil", id]); return { id, nombre: "Ana", estado: "ACTIVO" }; },
    actualizarContacto: async (id, body) => { llamadas.push(["contacto", id, body]); return { id, ...body }; }
  });
  app.decorate("pacienteController", { registrar: async () => ({}), buscarPorDocumento: async () => ({}) });
  app.decorate("citaRepository", {
    listarPorPaciente: async id => { llamadas.push(["citas", id]); return []; },
    cambiarEstadoPaciente: async (id, pacienteId, estado) => { llamadas.push(["estado", id, pacienteId, estado]); return id === 10 ? { id, estado } : null; }
  });
  app.decorate("citaController", { consultarPorMedicoYFecha: async () => ({}), confirmar: async () => ({}), agendar: async req => { llamadas.push(["reserva", req.body]); return req.body; } });
  await app.register(pacienteRoutes, { prefix: "/pacientes" });
  await app.register(citaRoutes, { prefix: "/citas" });
  return { app, llamadas };
}
test("perfil y citas se consultan exclusivamente con la identidad de la sesión", async t => {
  const { app, llamadas } = await crear(t);
  assert.equal((await app.inject("/pacientes/me?pacienteId=99")).json().id, 7);
  assert.equal((await app.inject("/citas/mis-citas?pacienteId=99")).statusCode, 200);
  assert.deepEqual(llamadas, [["perfil", 7], ["citas", 7]]);
  assert.equal((await app.inject("/pacientes/documento/123")).statusCode, 403);
});
test("reserva propia ignora un paciente enviado por el cliente y bloquea la ruta general", async t => {
  const { app, llamadas } = await crear(t);
  const payload = { pacienteId: 99, medicoId: 3, fecha: "2026-10-05", horaInicio: "08:00", motivo: null };
  const response = await app.inject({ method: "POST", url: "/citas/mis-citas", payload });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().pacienteId, 7);
  assert.equal((await app.inject({ method: "POST", url: "/citas", payload })).statusCode, 403);
  assert.equal(llamadas.filter(c => c[0] === "reserva").length, 1);
});
test("solo modifica contacto, valida teléfono y no acepta cambios de identidad", async t => {
  const { app, llamadas } = await crear(t);
  const payload = { email: "ana@example.com", telefono: "3001234567", direccion: null, id: 99, estado: "INACTIVO" };
  assert.equal((await app.inject({ method: "PATCH", url: "/pacientes/me", payload })).statusCode, 200);
  assert.deepEqual(llamadas[0], ["contacto", 7, { email: "ana@example.com", telefono: "3001234567", direccion: null }]);
  assert.equal((await app.inject({ method: "PATCH", url: "/pacientes/me", payload: { ...payload, telefono: "   " } })).statusCode, 400);
  assert.equal(llamadas.length, 1);
});
test("confirmar y cancelar usan identidad propia y respetan conflictos", async t => {
  const { app, llamadas } = await crear(t);
  assert.equal((await app.inject({ method: "PATCH", url: "/citas/mis-citas/10/confirmar" })).statusCode, 200);
  assert.equal((await app.inject({ method: "PATCH", url: "/citas/mis-citas/99/cancelar" })).statusCode, 409);
  assert.deepEqual(llamadas, [["estado", 10, 7, "CONFIRMADA"], ["estado", 99, 7, "CANCELADA"]]);
  assert.equal((await app.inject({ method: "PATCH", url: "/citas/10/confirmar" })).statusCode, 403);
});
for (const [user, status] of [[null, 401], [{ rol: "AGENDADOR" }, 403], [{ rol: "PACIENTE", pacienteId: null }, 403]]) {
  test(`portal rechaza sesión sin acceso: ${JSON.stringify(user)}`, async t => {
    const { app, llamadas } = await crear(t, user);
    for (const url of ["/pacientes/me", "/citas/mis-citas"]) assert.equal((await app.inject(url)).statusCode, status);
    assert.equal(llamadas.length, 0);
  });
}
test("cambios de estado limitan propietario, fecha y estado de forma atómica", async () => {
  const repo = new CitaRepository({ query: async (sql, params) => {
    assert.match(sql, /paciente_id=\$2/);
    assert.match(sql, /CURRENT_TIMESTAMP AT TIME ZONE 'America\/Bogota'/);
    assert.match(sql, /estado='PROGRAMADA'/);
    assert.match(sql, /estado='CONFIRMADA' AND \$3='CANCELADA'/);
    assert.deepEqual(params, [10, 7, "CANCELADA"]);
    return { rows: [] };
  } });
  assert.equal(await repo.cambiarEstadoPaciente(10, 7, "CANCELADA"), null);
});
