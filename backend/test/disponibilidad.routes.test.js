import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { disponibilidadRoutes } from "../src/modules/disponibilidad/web/disponibilidad.routes.js";

test("disponibilidad valida permisos, horarios y parámetros de consulta", async t => {
  const app = Fastify();
  t.after(() => app.close());
  app.decorate("authenticate", async (request, reply) => {
    if (!request.headers.authorization) return reply.code(401).send({});
    request.user = { rol: request.headers.authorization, profesionalId: 1 };
  });
  app.decorate("disponibilidadRepository", { buscarPorProfesional: async () => [], desactivar: async () => null });
  app.decorate("disponibilidadController", { configurar: async () => ({ ok: true }), actualizar: async () => ({ ok: true }), consultarFranjas: async () => [] });
  await app.register(disponibilidadRoutes);
  const payload = { profesionalId: 1, diaSemana: "LUNES", horaInicio: "08:00", horaFin: "12:00", intervaloMinutos: 30, semanasHabilitadas: 4 };
  assert.equal((await app.inject({ method: "POST", url: "/", payload })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/", payload, headers: { authorization: "MEDICO_TERAPISTA" } })).statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url: "/", payload, headers: { authorization: "ADMINISTRADOR" } })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: "/", payload: { ...payload, horaInicio: "25:00" }, headers: { authorization: "ADMINISTRADOR" } })).statusCode, 400);
  assert.equal((await app.inject("/franjas?profesionalId=1&fecha=invalida")).statusCode, 400);
  assert.equal((await app.inject("/?profesionalId=1")).statusCode, 401);
  assert.equal((await app.inject({ method: "DELETE", url: "/1?profesionalId=1", headers: { authorization: "ADMINISTRADOR" } })).statusCode, 404);
});
