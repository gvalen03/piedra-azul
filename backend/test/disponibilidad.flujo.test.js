import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { disponibilidadRoutes } from "../src/modules/disponibilidad/web/disponibilidad.routes.js";
import { crearDisponibilidadController } from "../src/modules/disponibilidad/web/disponibilidad.controller.js";
import { DisponibilidadService } from "../src/modules/disponibilidad/application/disponibilidad.service.js";
import { CitaService } from "../src/modules/citas/application/cita.service.js";
import { DisponibilidadRepository } from "../src/modules/disponibilidad/infrastructure/disponibilidad.repository.js";

test("médico configura, agendador reserva y la franja desaparece", async t => {
  let bloques = [], citas = [];
  const repo = {
    guardar: async d => { bloques = [{ id: 1, medico_id: d.medicoId, dia_semana: d.diaSemana, hora_inicio: d.horaInicio, hora_fin: d.horaFin, intervalo_minutos: d.intervaloMinutos, semanas_habilitadas: d.semanasHabilitadas }]; return bloques[0]; },
    buscarPorMedico: async id => bloques.filter(b => b.medico_id === id),
    buscarPorMedicoYDia: async (id, dia) => bloques.filter(b => b.medico_id === id && b.dia_semana === dia),
    desactivar: async (id, medico) => { const b = bloques.find(b => b.id === id && b.medico_id === medico); if (b) bloques = []; return b; }
  };
  const citaRepo = {
    listarPorMedicoYFecha: async () => citas,
    existeCitaEnHorario: async () => false,
    guardar: async c => { citas.push({ hora_inicio: c.horaInicio, hora_fin: c.horaFin }); return c; }
  };
  const service = new DisponibilidadService({ disponibilidadRepository: repo, citaRepository: citaRepo, ahora: () => new Date("2026-09-27T12:00:00Z") });
  const app = Fastify(); t.after(() => app.close());
  app.decorate("authenticate", async (req, reply) => {
    if (!req.headers.authorization) return reply.code(401).send({});
    req.user = { rol: req.headers.authorization, medicoId: 12 };
  });
  app.decorate("disponibilidadRepository", repo);
  app.decorate("disponibilidadController", crearDisponibilidadController({ disponibilidadService: service }));
  await app.register(disponibilidadRoutes);
  const headers = { authorization: "MEDICO_TERAPISTA" };
  const payload = { medicoId: 99, diaSemana: "LUNES", horaInicio: "08:00", horaFin: "09:00", intervaloMinutos: 30, semanasHabilitadas: 4 };
  assert.equal((await app.inject({ method: "POST", url: "/mia", headers, payload })).statusCode, 201);
  assert.equal(bloques[0].medico_id, 12);
  assert.equal((await app.inject("/mia")).statusCode, 401);
  assert.equal((await app.inject({ url: "/mia", headers: { authorization: "PACIENTE" } })).statusCode, 403);
  const url = "/franjas?medicoId=12&fecha=2026-09-28";
  assert.equal((await app.inject(url)).json().length, 2);
  const citasService = new CitaService({ disponibilidadService: service, citaRepository: citaRepo });
  await citasService.agendar({ medicoId: 12, pacienteId: 1, fecha: "2026-09-28", horaInicio: "08:00" });
  assert.equal((await app.inject(url)).json().length, 1);
  assert.equal((await app.inject({ method: "DELETE", url: "/mia/99", headers })).statusCode, 404);
  assert.equal((await app.inject({ method: "DELETE", url: "/mia/1", headers })).statusCode, 200);
  assert.equal((await app.inject(url)).json().length, 0);
  assert.equal(citas.length, 1);
  assert.equal((await app.inject("/franjas?medicoId=12&fecha=invalida")).statusCode, 400);
});
test("un bloque superpuesto revierte la transacción y libera la conexión", async () => {
  const consultas = [];
  const client = { query: async sql => { consultas.push(sql); return { rows: sql.startsWith("SELECT") ? [{ id: 1 }] : [] }; }, release: () => consultas.push("release") };
  const repo = new DisponibilidadRepository({ connect: async () => client });
  await assert.rejects(repo.guardar({ medicoId: 12, diaSemana: "LUNES", horaInicio: "08:00", horaFin: "09:00" }), { statusCode: 409 });
  assert.match(consultas[1], /FOR UPDATE/);
  assert.deepEqual(consultas.slice(-2), ["ROLLBACK", "release"]);
  assert.equal(consultas.some(sql => sql.includes("INSERT")), false);
});

test("la reserva revalida disponibilidad bajo bloqueo antes de insertar", async () => {
  const { CitaRepository } = await import("../src/modules/citas/infrastructure/cita.repository.js");
  const consultas = [];
  const client = { query: async sql => {
    consultas.push(sql);
    if (sql.includes("FROM medicos")) return { rows: [{ id: 12 }] };
    return { rows: [] };
  }, release: () => consultas.push("release") };
  const repo = new CitaRepository({ connect: async () => client });
  await assert.rejects(repo.guardar({ medicoId: 12, pacienteId: 1, fecha: "2026-09-28", horaInicio: "08:00", horaFin: "08:30" }), /no está disponible/);
  assert.match(consultas[1], /FOR UPDATE/);
  assert.equal(consultas.some(sql => sql.includes("INSERT")), false);
  assert.deepEqual(consultas.slice(-2), ["ROLLBACK", "release"]);
});
