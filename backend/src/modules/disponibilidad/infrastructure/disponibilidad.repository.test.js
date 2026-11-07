import { test } from "node:test";
import assert from "node:assert/strict";
import { DisponibilidadRepository } from "./disponibilidad.repository.js";

const dto = {
  medicoId: 12,
  diaSemana: "MARTES",
  horaInicio: "09:00",
  horaFin: "10:30",
  intervaloMinutos: 30,
  semanasHabilitadas: 6
};

test("actualizar mueve el bloque activo sin tocar citas existentes", async () => {
  const consultas = [];
  const actualizada = { id: 7, medico_id: 12, dia_semana: "MARTES", hora_inicio: "09:00", hora_fin: "10:30", activo: true };
  const client = {
    query: async (sql, values) => {
      consultas.push({ sql, values });
      if (sql.includes("FROM medicos")) return { rows: [{ id: 12 }] };
      if (sql.includes("SELECT id FROM disponibilidades WHERE id=$1")) return { rows: [{ id: 7 }] };
      if (sql.includes("SELECT id FROM disponibilidades WHERE medico_id=$1")) return { rows: [] };
      if (sql.includes("UPDATE disponibilidades")) return { rows: [actualizada] };
      return { rows: [] };
    },
    release() { consultas.push({ sql: "release" }); }
  };
  const repository = new DisponibilidadRepository({ connect: async () => client });

  const result = await repository.actualizar(7, dto);

  assert.equal(result, actualizada);
  assert.match(consultas.find(c => c.sql.includes("FROM medicos")).sql, /FOR UPDATE/);
  assert.match(consultas.find(c => c.sql.includes("SELECT id FROM disponibilidades WHERE id=\$1")).sql, /FOR UPDATE/);
  const overlap = consultas.find(c => c.sql.includes("SELECT id FROM disponibilidades WHERE medico_id=$1"));
  assert.match(overlap.sql, /id<>\$5/);
  assert.deepEqual(overlap.values, [12, "MARTES", "09:00", "10:30", 7]);
  assert.ok(consultas.some(c => c.sql.includes("UPDATE disponibilidades")));
  assert.ok(consultas.some(c => c.sql === "COMMIT"));
  assert.equal(consultas.some(c => c.sql.includes("citas")), false);
});

test("actualizar revierte el cambio cuando otro bloque se solapa", async () => {
  const consultas = [];
  const client = {
    query: async sql => {
      consultas.push(sql);
      if (sql.includes("FROM medicos")) return { rows: [{ id: 12 }] };
      if (sql.includes("SELECT id FROM disponibilidades WHERE id=$1")) return { rows: [{ id: 7 }] };
      if (sql.includes("SELECT id FROM disponibilidades WHERE medico_id=$1")) return { rows: [{ id: 8 }] };
      return { rows: [] };
    },
    release() { consultas.push("release"); }
  };
  const repository = new DisponibilidadRepository({ connect: async () => client });

  await assert.rejects(repository.actualizar(7, dto), { statusCode: 409 });
  assert.equal(consultas.some(sql => sql.includes("UPDATE disponibilidades")), false);
  assert.deepEqual(consultas.slice(-2), ["ROLLBACK", "release"]);
});

test("actualizar no edita bloques inexistentes o inactivos", async () => {
  const consultas = [];
  const client = {
    query: async sql => {
      consultas.push(sql);
      if (sql.includes("FROM medicos")) return { rows: [{ id: 12 }] };
      if (sql.includes("SELECT id FROM disponibilidades WHERE id=$1")) return { rows: [] };
      return { rows: [] };
    },
    release() { consultas.push("release"); }
  };
  const repository = new DisponibilidadRepository({ connect: async () => client });

  await assert.rejects(repository.actualizar(404, dto), { statusCode: 404 });
  assert.equal(consultas.some(sql => sql.includes("UPDATE disponibilidades")), false);
  assert.deepEqual(consultas.slice(-2), ["ROLLBACK", "release"]);
});
