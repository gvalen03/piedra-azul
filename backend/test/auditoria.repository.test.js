import test from "node:test";
import assert from "node:assert/strict";

import { AuditoriaRepository } from "../src/auditoria/infrastructure/auditoria.repository.js";

test("AuditoriaRepository usa la tabla y columnas reales de auditoria", async () => {
  const calls = [];
  const db = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [{ id: 1 }] };
    }
  };

  const repo = new AuditoriaRepository(db);

  await repo.guardar({
    tipoEvento: "PACIENTE_REGISTRADO",
    descripcion: "Paciente registrado",
    entidadId: "10",
    realizadoPor: "admin",
    moduloOrigen: "PACIENTES",
    datosAdicionales: { ok: true }
  });

  assert.match(calls[0].sql, /INSERT INTO auditorias/i);
  assert.match(calls[0].sql, /fecha/i);
  assert.equal(calls[0].params[0], "PACIENTE_REGISTRADO");
});
