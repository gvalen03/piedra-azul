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
    disponibilidadRepository: {
      buscarPorMedicoYDia: async () => ({ hora_inicio: "08:00:00", hora_fin: "09:00:00", intervalo_minutos: 30 })
    },
    citaRepository: { listarPorMedicoYFecha: async () => [{ hora_inicio: "08:00:00" }] }
  });
  const franjas = await s.obtenerFranjasDisponibles({ medicoId: 1, fecha: "2026-09-28" });
  assert.equal(franjas.length, 1);
  assert.equal(franjas[0].horaInicio, "08:30");
});