import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { reportesRoutes } from "../src/modules/reportes/reportes.routes.js";

async function crearApp(t) {
  const app = Fastify();
  t.after(() => app.close());
  const consultas = [];
  const usuarios = {
    medico: { rol: "MEDICO_TERAPISTA", profesionalId: 18 },
    medico_sin_perfil: { rol: "MEDICO_TERAPISTA" },
    agendador: { rol: "AGENDADOR" },
    admin: { rol: "ADMINISTRADOR" },
    paciente: { rol: "PACIENTE" }
  };

  app.decorate("authenticate", async (request, reply) => {
    const usuario = usuarios[request.headers.authorization];
    if (!usuario) return reply.code(401).send({ error: "Sesión inválida" });
    request.user = usuario;
  });
  app.decorate("citaRepository", {
    obtenerReporteAnual: async (...args) => {
      consultas.push(args);
      return [{
        profesionalId: 18,
        nombre: "Laura",
        apellido: "García",
        citasPorMes: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        totalAnual: 1
      }];
    }
  });

  await app.register(reportesRoutes, { prefix: "/api/reportes" });
  return { app, consultas };
}

test("reporte limita los médicos a su profesional y devuelve los doce meses", async t => {
  const { app, consultas } = await crearApp(t);

  const response = await app.inject({
    url: "/api/reportes/citas?anio=2026&profesionalId=99",
    headers: { authorization: "medico" }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(consultas, [[2026, 18]]);
  assert.deepEqual(response.json().meses, [
    { numero: 1, nombre: "Enero" },
    { numero: 2, nombre: "Febrero" },
    { numero: 3, nombre: "Marzo" },
    { numero: 4, nombre: "Abril" },
    { numero: 5, nombre: "Mayo" },
    { numero: 6, nombre: "Junio" },
    { numero: 7, nombre: "Julio" },
    { numero: 8, nombre: "Agosto" },
    { numero: 9, nombre: "Septiembre" },
    { numero: 10, nombre: "Octubre" },
    { numero: 11, nombre: "Noviembre" },
    { numero: 12, nombre: "Diciembre" }
  ]);
  assert.equal(response.json().anio, 2026);
});

for (const token of ["agendador", "admin"]) {
  test(`el rol ${token} consulta el reporte de todos los profesionales`, async t => {
    const { app, consultas } = await crearApp(t);

    const response = await app.inject({
      url: "/api/reportes/citas?anio=2026",
      headers: { authorization: token }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(consultas, [[2026, null]]);
  });
}

test("rechaza año inválido, parámetros adicionales y roles no autorizados", async t => {
  const { app, consultas } = await crearApp(t);

  assert.equal((await app.inject({
    url: "/api/reportes/citas?anio=1899",
    headers: { authorization: "admin" }
  })).statusCode, 400);
  assert.equal((await app.inject({
    url: "/api/reportes/citas?anio=20a6",
    headers: { authorization: "admin" }
  })).statusCode, 400);
  assert.equal((await app.inject({
    url: "/api/reportes/citas?anio=2026",
    headers: { authorization: "paciente" }
  })).statusCode, 403);
  assert.equal((await app.inject("/api/reportes/citas?anio=2026")).statusCode, 401);
  assert.equal(consultas.length, 0);
});

test("rechaza médicos que no tienen un profesional asociado", async t => {
  const { app, consultas } = await crearApp(t);

  const response = await app.inject({
    url: "/api/reportes/citas?anio=2026",
    headers: { authorization: "medico_sin_perfil" }
  });

  assert.equal(response.statusCode, 403);
  assert.equal(consultas.length, 0);
});
