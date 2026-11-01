// ADM-01 — textos del diálogo de desactivación (funciones puras, sin DOM).
import test from "node:test";
import assert from "node:assert/strict";
import { mensajeConteoCambiado, mensajeDesactivacion, mensajeExito, mensajeReactivacion, resumenCita, textoCitas } from "../src/components/admin/desactivacion.js";

const base = { tipo: "medicos", nombre: "Ana Pérez" };

test("el mensaje muestra el conteo exacto y qué se cancela", () => {
  const m = mensajeDesactivacion({ ...base, cantidad: 3 });
  assert.equal(m.titulo, "Desactivar médico");
  assert.match(m.resultado, /tiene 3 citas futuras pendientes \(programadas o confirmadas\)/);
  assert.match(m.resultado, /cancelarán esas 3 citas/);
});

test("el mensaje siempre aclara que se conservan citas anteriores, atendidas, canceladas y el historial", () => {
  for (const cantidad of [0, 1, 7]) {
    const m = mensajeDesactivacion({ ...base, cantidad });
    assert.match(m.conservacion, /citas anteriores/);
    assert.match(m.conservacion, /atendidas o canceladas/);
    assert.match(m.conservacion, /historial/);
    assert.match(m.pregunta, /continuar/);
  }
});

test("singular, plural y cero se redactan bien (la confirmación es explícita aunque sea 0)", () => {
  assert.equal(textoCitas(1), "1 cita futura pendiente");
  assert.equal(textoCitas(2), "2 citas futuras pendientes");
  assert.match(mensajeDesactivacion({ ...base, cantidad: 1 }).resultado, /cancelará esa cita\./);
  const cero = mensajeDesactivacion({ ...base, cantidad: 0 });
  assert.match(cero.resultado, /no tiene citas futuras pendientes/);
  assert.match(cero.resultado, /no se cancelará ninguna cita/);
});

test("distingue médico y paciente", () => {
  assert.match(mensajeDesactivacion({ tipo: "pacientes", nombre: "Luis Paz", cantidad: 2 }).resultado, /^Paciente Luis Paz tiene 2/);
  assert.equal(mensajeDesactivacion({ tipo: "pacientes", nombre: "Luis Paz", cantidad: 2 }).titulo, "Desactivar paciente");
});

test("aviso de conteo cambiado: indica el valor anterior y el actual y pide confirmar de nuevo", () => {
  const texto = mensajeConteoCambiado({ anterior: 2, actual: 3 });
  assert.match(texto, /antes eran 2 y ahora son 3/);
  assert.match(texto, /confirma de nuevo/);
});

test("reactivar aclara que las canceladas no se recuperan", () => {
  const m = mensajeReactivacion(base);
  assert.equal(m.titulo, "Reactivar médico");
  assert.match(m.conservacion, /no se recuperan/);
});

test("mensajes de éxito", () => {
  assert.match(mensajeExito({ ...base, accion: "desactivar", cantidad: 0 }), /No tenía citas futuras pendientes/);
  assert.match(mensajeExito({ ...base, accion: "desactivar", cantidad: 1 }), /se canceló 1 cita futura pendiente/);
  assert.match(mensajeExito({ ...base, accion: "desactivar", cantidad: 4 }), /se cancelaron 4 citas futuras pendientes/);
  assert.match(mensajeExito({ ...base, accion: "reactivar" }), /no se restauran/);
});

test("resumenCita formatea fecha, hora y estado", () => {
  assert.equal(resumenCita({ fecha: "2026-11-02", hora_inicio: "09:00:00", hora_fin: "09:30:00", estado: "CONFIRMADA" }), "2026-11-02 · 09:00–09:30 · Confirmada");
});
