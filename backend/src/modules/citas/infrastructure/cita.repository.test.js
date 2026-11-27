import test from "node:test";
import assert from "node:assert/strict";
import { CitaRepository } from "./cita.repository.js";

test("obtiene el reporte anual agrupado y rellena meses sin citas", async () => {
  let consulta;
  const repository = new CitaRepository({
    query: async (sql, params) => {
      consulta = { sql, params };
      return {
        rows: [
          { profesional_id: "3", nombre: "Ana", apellido: "Pérez", mes: 1, cantidad: 2 },
          { profesional_id: "3", nombre: "Ana", apellido: "Pérez", mes: 4, cantidad: 1 },
          { profesional_id: "8", nombre: "Luis", apellido: "Rojas", mes: 12, cantidad: 3 }
        ]
      };
    }
  });

  const resultado = await repository.obtenerReporteAnual(2026);

  assert.deepEqual(consulta.params, [2026, null]);
  assert.match(consulta.sql, /make_date\(\$1::integer, 1, 1\)/);
  assert.match(consulta.sql, /make_date\(\$1::integer \+ 1, 1, 1\)/);
  assert.deepEqual(resultado, [
    {
      profesionalId: 3,
      nombre: "Ana",
      apellido: "Pérez",
      citasPorMes: [2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      totalAnual: 3
    },
    {
      profesionalId: 8,
      nombre: "Luis",
      apellido: "Rojas",
      citasPorMes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      totalAnual: 3
    }
  ]);
});

test("permite limitar el reporte a un profesional", async () => {
  let params;
  const repository = new CitaRepository({
    query: async (_sql, queryParams) => {
      params = queryParams;
      return { rows: [] };
    }
  });

  await repository.obtenerReporteAnual(2026, 12);

  assert.deepEqual(params, [2026, 12]);
});

test("devuelve una lista vacía si no hay citas en el año", async () => {
  const repository = new CitaRepository({
    query: async () => ({ rows: [] })
  });

  assert.deepEqual(await repository.obtenerReporteAnual(2026), []);
});
