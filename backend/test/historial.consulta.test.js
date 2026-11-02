import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { HistorialRepository } from "../src/modules/historial/infrastructure/historial.repository.js";
import { HistorialService } from "../src/modules/historial/application/historial.service.js";
import { historialRoutes } from "../src/modules/historial/web/historial.routes.js";

const citasSinteticas = [{
  id: 31,
  fecha: "2026-10-26",
  hora_inicio: "09:00:00",
  hora_fin: "09:30:00",
  estado: "ATENDIDA",
  paciente_nombre: "Paciente",
  paciente_apellido: "Prueba",
  paciente_documento: "DOC-123",
  medico_nombre: "Profesional",
  medico_apellido: "Prueba"
}];

test("la consulta por documento usa igualdad parametrizada y solo campos de cita necesarios", async () => {
  let consulta;
  const repo = new HistorialRepository({
    query: async (sql, params) => {
      consulta = { sql, params };
      return { rows: citasSinteticas };
    }
  });

  const citas = await repo.listarCitasPorDocumento("DOC-123");

  assert.deepEqual(citas, citasSinteticas);
  assert.deepEqual(consulta.params, ["DOC-123"]);
  assert.match(consulta.sql, /WHERE p\.numero_documento = \$1/);
  assert.doesNotMatch(consulta.sql, /motivo|diagnostico|tratamiento|observaciones|controles_medicos/);
});

test("el repositorio limita por médico cuando recibe el perfil profesional", async () => {
  let consulta;
  const repo = new HistorialRepository({
    query: async (sql, params) => {
      consulta = { sql, params };
      return { rows: [] };
    }
  });

  await repo.listarCitasPorDocumento("DOC-123", 7);

  assert.deepEqual(consulta.params, ["DOC-123", 7]);
  assert.match(consulta.sql, /AND c\.medico_id = \$2/);
});

test("el servicio recorta el documento antes de la búsqueda exacta", async () => {
  let argumentos;
  const service = new HistorialService({ historialRepository: {
    listarCitasPorDocumento: async (...args) => { argumentos = args; return []; }
  } });

  assert.deepEqual(await service.consultarCitasPorDocumento("  DOC-123  ", 7), []);
  assert.deepEqual(argumentos, ["DOC-123", 7]);
  await assert.rejects(service.consultarCitasPorDocumento("   "), { statusCode: 400 });
});

async function crearApp(t) {
  const app = Fastify();
  const consultas = [];
  app.decorate("authenticate", async (request, reply) => {
    const rol = request.headers.authorization;
    if (!rol) return reply.code(401).send({ error: "Usuario no autenticado" });
    request.user = { rol, medicoId: request.headers["x-medico-id"] ?? 7, pacienteId: 8 };
  });
  app.decorate("historialRepository", {
    listarControlesPorPaciente: async () => [],
    listarCitasPorDocumento: async (...args) => {
      consultas.push(args);
      return args[0] === "SIN-RESULTADOS" ? [] : citasSinteticas;
    }
  });
  app.decorate("historialService", new HistorialService({ historialRepository: app.historialRepository }));
  await app.register(historialRoutes);
  t.after(() => app.close());
  return { app, consultas };
}

test("agendador puede consultar por documento y la respuesta no expone campos clínicos", async t => {
  const { app, consultas } = await crearApp(t);
  const response = await app.inject({ url: "/pacientes/DOC-123/citas", headers: { authorization: "AGENDADOR" } });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(consultas, [["DOC-123", null]]);
  assert.deepEqual(response.json(), { citas: citasSinteticas });
  assert.equal("motivo" in response.json().citas[0], false);
  assert.equal("diagnostico" in response.json().citas[0], false);
});

test("médico solo consulta las citas de su propio perfil", async t => {
  const { app, consultas } = await crearApp(t);
  const response = await app.inject({
    url: "/pacientes/DOC-123/citas",
    headers: { authorization: "MEDICO_TERAPISTA", "x-medico-id": "7" }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(consultas, [["DOC-123", 7]]);
});

test("rechaza pacientes, usuarios sin sesión y médicos sin perfil asociado", async t => {
  const { app, consultas } = await crearApp(t);

  assert.equal((await app.inject("/pacientes/DOC-123/citas")).statusCode, 401);
  assert.equal((await app.inject({ url: "/pacientes/DOC-123/citas", headers: { authorization: "PACIENTE" } })).statusCode, 403);
  assert.equal((await app.inject({ url: "/pacientes/DOC-123/citas", headers: { authorization: "MEDICO_TERAPISTA", "x-medico-id": "0" } })).statusCode, 403);
  assert.deepEqual(consultas, []);
});

test("rechaza documentos vacíos o demasiado largos y no devuelve datos ajenos si no hay coincidencias", async t => {
  const { app, consultas } = await crearApp(t);
  const headers = { authorization: "AGENDADOR" };

  assert.equal((await app.inject({ url: "/pacientes/%20%20%20/citas", headers })).statusCode, 400);
  assert.equal((await app.inject({ url: `/pacientes/${"A".repeat(51)}/citas`, headers })).statusCode, 400);
  const response = await app.inject({ url: "/pacientes/SIN-RESULTADOS/citas", headers });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { citas: [] });
  assert.deepEqual(consultas, [["SIN-RESULTADOS", null]]);
});

test("la búsqueda no interpreta el documento como fragmento SQL", async t => {
  const { app, consultas } = await crearApp(t);
  const injected = "DOC' OR 1=1 --";
  const response = await app.inject({
    url: `/pacientes/${encodeURIComponent(injected)}/citas`,
    headers: { authorization: "AGENDADOR" }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(consultas, [[injected, null]]);
});
