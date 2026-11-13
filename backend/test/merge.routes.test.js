import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { citaRoutes } from "../src/modules/citas/web/cita.routes.js";
import { pacienteRoutes } from "../src/modules/pacientes/web/paciente.routes.js";
import { disponibilidadRoutes } from "../src/modules/disponibilidad/web/disponibilidad.routes.js";

const cases = [
  ["citas", citaRoutes, "citaController", "agendar", {
    pacienteId: 1, profesionalId: 1, fecha: "2026-10-01", horaInicio: "09:00"
  }, ["consultarPorProfesionalYFecha", "confirmar"]],
  ["pacientes", pacienteRoutes, "pacienteController", "registrar", {
    nombre: "Ana", apellido: "Perez", numeroDocumento: "123",
    fechaNacimiento: "1990-01-01", telefono: "123", genero: "MUJER"
  }, ["buscarPorDocumento"]],
  ["disponibilidad", disponibilidadRoutes, "disponibilidadController", "configurar", {
    profesionalId: 1, diaSemana: "LUNES", horaInicio: "09:00", horaFin: "10:00",
    intervaloMinutos: 30, semanasHabilitadas: 1
  }, ["actualizar", "consultarFranjas"]]
];

for (const [name, routes, decorator, method, payload, others] of cases) {
  test(`POST ${name} valida, exige sesión y usa el controlador correcto`, async (t) => {
    const app = Fastify();
    t.after(() => app.close());
    let calls = 0;
    app.decorate("authenticate", async (request, reply) => {
      if (!request.headers.authorization) return reply.code(401).send({});
      request.user = { rol: "ADMINISTRADOR" };
    });
    app.decorate(decorator, {
      ...Object.fromEntries(others.map(key => [key, async () => ({})])),
      [method]: async (request, reply) => {
        calls++;
        assert.deepEqual(request.body, payload);
        return reply.code(201).send({ ok: true });
      }
    });
    await app.register(routes);
    const headers = { authorization: "Bearer test" };
    assert.equal((await app.inject({ method: "POST", url: "/", payload })).statusCode, 401);
    assert.equal((await app.inject({ method: "POST", url: "/", headers, payload: {} })).statusCode, 400);
    assert.equal(calls, 0);
    assert.equal((await app.inject({ method: "POST", url: "/", headers, payload })).statusCode, 201);
    assert.equal(calls, 1);
  });
}
