import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { citaRoutes } from "../src/modules/citas/web/cita.routes.js";
import { crearCitaController } from "../src/modules/citas/web/cita.controller.js";
import { CitaService } from "../src/modules/citas/application/cita.service.js";
import { CitaRepository } from "../src/modules/citas/infrastructure/cita.repository.js";

// RF-01 — agenda diaria por médico y fecha (GET /citas)

const CITAS = [
  { id: 1, estado: "PROGRAMADA", hora_inicio: "08:00:00", hora_fin: "08:30:00", paciente_nombre: "Ana" },
  { id: 2, estado: "CANCELADA", hora_inicio: "08:30:00", hora_fin: "09:00:00", paciente_nombre: "Luis" },
  { id: 3, estado: "ATENDIDA", hora_inicio: "09:00:00", hora_fin: "09:30:00", paciente_nombre: "Eva" }
];

async function appPara(t, user, { citas = CITAS, medicoExiste = true } = {}) {
  const app = Fastify();
  t.after(() => app.close());
  const consultas = [];
  const citaService = new CitaService({
    citaRepository: {
      listarAgendaMedico: async (...args) => { consultas.push(args); return citas; }
    },
    disponibilidadService: {},
    eventBus: null,
    medicoRepository: { buscarPorId: async id => (medicoExiste ? { id } : null) }
  });
  app.decorate("authenticate", async req => { req.user = user; });
  app.decorate("citaController", crearCitaController({ citaService }));
  await app.register(citaRoutes);
  return { app, consultas };
}

const url = (medicoId = 3, fecha = "2026-11-02") => `/?medicoId=${medicoId}&fecha=${fecha}`;

test("agendador y administrador reciben listado y cantidad del mismo conjunto, con canceladas y su estado", async t => {
  for (const rol of ["AGENDADOR", "ADMINISTRADOR"]) {
    const { app, consultas } = await appPara(t, { rol, sub: "prueba" });
    const response = await app.inject(url());
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.cantidad, 3);
    assert.equal(body.cantidad, body.citas.length);
    assert.deepEqual(body.citas.map(c => c.estado), ["PROGRAMADA", "CANCELADA", "ATENDIDA"]);
    assert.deepEqual(consultas, [[3, "2026-11-02"]]);
  }
});

test("cero resultados es una respuesta válida", async t => {
  const { app } = await appPara(t, { rol: "AGENDADOR" }, { citas: [] });
  const response = await app.inject(url());
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { cantidad: 0, citas: [] });
});

for (const user of [undefined, { rol: "PACIENTE", pacienteId: 4 }, { rol: "MEDICO_TERAPISTA", medicoId: 3 }]) {
  test(`sin rol permitido no se expone la agenda: ${JSON.stringify(user)}`, async t => {
    const { app, consultas } = await appPara(t, user);
    assert.equal((await app.inject(url())).statusCode, user ? 403 : 401);
    assert.equal(consultas.length, 0);
  });
}

for (const [descripcion, consulta] of [
  ["sin médico", "/?fecha=2026-11-02"],
  ["sin fecha", "/?medicoId=3"],
  ["sin parámetros", "/"],
  ["médico no numérico", url("abc")],
  ["médico 0", url(0)],
  ["médico negativo", url(-2)],
  ["fecha con formato inválido", url(3, "02-11-2026")],
  ["fecha inexistente", url(3, "2026-02-30")],
  ["fecha texto", url(3, "hoy")]
]) {
  test(`rechaza con 400 la consulta ${descripcion}`, async t => {
    const { app, consultas } = await appPara(t, { rol: "AGENDADOR" });
    assert.equal((await app.inject(consulta)).statusCode, 400);
    assert.equal(consultas.length, 0);
  });
}

test("médico inexistente responde 404 y no consulta citas", async t => {
  const { app, consultas } = await appPara(t, { rol: "AGENDADOR" }, { medicoExiste: false });
  const response = await app.inject(url(99));
  assert.equal(response.statusCode, 404);
  assert.match(response.json().error, /Médico no encontrado/);
  assert.equal(consultas.length, 0);
});

test("un fallo inesperado del repositorio responde 500", async t => {
  const app = Fastify();
  t.after(() => app.close());
  const citaService = new CitaService({
    citaRepository: { listarAgendaMedico: async () => { throw new Error("db caída"); } },
    disponibilidadService: {},
    eventBus: null,
    medicoRepository: { buscarPorId: async id => ({ id }) }
  });
  app.decorate("authenticate", async req => { req.user = { rol: "AGENDADOR" }; });
  app.decorate("citaController", crearCitaController({ citaService }));
  await app.register(citaRoutes);
  assert.equal((await app.inject(url())).statusCode, 500);
});

test("repositorio: SQL parametrizado, ordenado por hora y sin excluir canceladas", async () => {
  const consultas = [];
  const repo = new CitaRepository({
    query: async (sql, params) => { consultas.push([sql.replace(/\s+/g, " "), params]); return { rows: CITAS }; }
  });
  const filas = await repo.listarAgendaMedico(3, "2026-11-02");
  const [[sql, params]] = consultas;
  assert.deepEqual(params, [3, "2026-11-02"]);
  assert.match(sql, /WHERE c\.medico_id = \$1 AND c\.fecha = \$2/);
  assert.match(sql, /ORDER BY c\.hora_inicio ASC/);
  assert.doesNotMatch(sql, /estado\s*(<>|!=|=)/i);
  assert.equal(filas.length, 3);
});
