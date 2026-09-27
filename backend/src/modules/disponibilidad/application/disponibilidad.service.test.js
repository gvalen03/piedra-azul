import { test } from "node:test";
import assert from "node:assert/strict";
import { DisponibilidadService } from "./disponibilidad.service.js";

test("generarFranjas produce franjas correctas", () => {
  const s = new DisponibilidadService({ disponibilidadRepository: {}, citaRepository: {} });
  const franjas = s.generarFranjas({ hora_inicio: "08:00:00", hora_fin: "09:00:00", intervalo_minutos: 30 });
  assert.equal(franjas.length, 2);
  assert.equal(franjas[0].horaInicio, "08:00");
  assert.equal(franjas[1].horaFin, "09:00");
});

test("obtenerDiaSemana calcula el día correcto", () => {
  const s = new DisponibilidadService({ disponibilidadRepository: {}, citaRepository: {} });
  assert.equal(s.obtenerDiaSemana("2026-09-28"), "LUNES");
});

test("configurar rechaza intervalo <= 0", async () => {
  const s = new DisponibilidadService({ disponibilidadRepository: { guardar: async () => ({}) }, citaRepository: {} });
  await assert.rejects(() => s.configurar({ horaInicio: "08:00", horaFin: "09:00", intervaloMinutos: 0, semanasHabilitadas: 4 }));
});

test("obtenerFranjasDisponibles descarta franjas ocupadas", async () => {
  const s = new DisponibilidadService({
    ahora: () => new Date("2026-09-27T12:00:00Z"),
    disponibilidadRepository: {
      buscarPorMedicoYDia: async () => ([{ hora_inicio: "08:00:00", hora_fin: "09:00:00", intervalo_minutos: 30, semanas_habilitadas: 4 }])
    },
    citaRepository: { listarPorMedicoYFecha: async () => [{ hora_inicio: "08:00:00", hora_fin: "08:30:00" }] }
  });
  const franjas = await s.obtenerFranjasDisponibles({ medicoId: 1, fecha: "2026-09-28" });
  assert.equal(franjas.length, 1);
  assert.equal(franjas[0].horaInicio, "08:30");
});

test("varios bloques, cruces parciales, horizonte y horas pasadas", async () => {
  const s = new DisponibilidadService({
    ahora: () => new Date("2026-09-28T13:10:00Z"),
    disponibilidadRepository: { buscarPorMedicoYDia: async () => [
      { hora_inicio: "08:00", hora_fin: "09:00", intervalo_minutos: 30, semanas_habilitadas: 1 },
      { hora_inicio: "14:00", hora_fin: "15:00", intervalo_minutos: 30, semanas_habilitadas: 1 }
    ] },
    citaRepository: { listarPorMedicoYFecha: async () => [{ hora_inicio: "14:15", hora_fin: "14:45" }] }
  });
  assert.deepEqual((await s.obtenerFranjasDisponibles({ medicoId: 1, fecha: "2026-09-28" })).map(f => f.horaInicio), ["08:30"]);
  assert.deepEqual(await s.obtenerFranjasDisponibles({ medicoId: 1, fecha: "2026-09-27" }), []);
  assert.deepEqual(await s.obtenerFranjasDisponibles({ medicoId: 1, fecha: "2026-10-05" }), []);
});
test("validación de horario y duración antes de guardar", async () => {
  const s = new DisponibilidadService({ disponibilidadRepository: { guardar: async d => d } });
  const dto = { horaInicio: "08:00", horaFin: "09:00", intervaloMinutos: 30, semanasHabilitadas: 4 };
  for (const cambio of [{ horaInicio: "25:00" }, { horaFin: "07:00" }, { intervaloMinutos: 90 }, { semanasHabilitadas: 0 }]) {
    await assert.rejects(s.configurar({ ...dto, ...cambio }), { statusCode: 400 });
  }
  assert.equal((await s.configurar(dto)).intervaloMinutos, 30);
});
