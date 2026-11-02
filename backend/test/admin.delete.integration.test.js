import test from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { AdminRepository } from "../src/modules/admin/infrastructure/admin.repository.js";

const enabled = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";

test("PostgreSQL protects profile deletion, auditing and concurrent references", { skip: !enabled }, async () => {
  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };
  const adminPool = new pg.Pool(config);
  const schema = `admin_delete_test_${randomUUID().replaceAll("-", "")}`;
  const quotedSchema = `"${schema}"`;
  let scopedPool;
  let schemaCreated = false;

  try {
    await adminPool.query(`CREATE SCHEMA ${quotedSchema}`);
    schemaCreated = true;
    scopedPool = new pg.Pool({ ...config, options: `-c search_path=${schema}` });
    await scopedPool.query(`
      CREATE TABLE medicos (id BIGINT PRIMARY KEY);
      CREATE TABLE pacientes (id BIGINT PRIMARY KEY);
      CREATE TABLE usuarios (
        id BIGINT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        rol TEXT NOT NULL,
        activo BOOLEAN NOT NULL,
        medico_id BIGINT REFERENCES medicos(id) ON DELETE SET NULL,
        paciente_id BIGINT REFERENCES pacientes(id) ON DELETE SET NULL
      );
      CREATE TABLE historias_clinicas (
        id BIGINT PRIMARY KEY,
        paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT
      );
      CREATE TABLE citas (
        id BIGINT PRIMARY KEY,
        medico_id BIGINT NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT,
        paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
        estado TEXT NOT NULL
      );
      CREATE TABLE controles_medicos (
        id BIGINT PRIMARY KEY,
        historia_clinica_id BIGINT NOT NULL REFERENCES historias_clinicas(id) ON DELETE RESTRICT,
        cita_id BIGINT NOT NULL REFERENCES citas(id) ON DELETE RESTRICT,
        medico_id BIGINT NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT
      );
      CREATE TABLE disponibilidades (
        id BIGINT PRIMARY KEY,
        medico_id BIGINT NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT
      );
      CREATE TABLE auditorias (
        id BIGSERIAL PRIMARY KEY,
        tipo_evento TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        entidad_id TEXT,
        realizado_por TEXT NOT NULL,
        modulo_origen TEXT NOT NULL,
        datos_adicionales JSONB,
        CHECK (NOT (tipo_evento = 'PACIENTES_ELIMINADO' AND entidad_id = '15'))
      );
      INSERT INTO medicos (id) VALUES (1),(2),(3),(4),(5),(6),(7),(90),(99);
      INSERT INTO pacientes (id) VALUES (10),(11),(12),(13),(14),(15),(99);
      INSERT INTO usuarios (id, username, rol, activo, medico_id, paciente_id)
        VALUES (1, 'admin', 'ADMINISTRADOR', TRUE, NULL, NULL),
               (2, 'medico', 'MEDICO_TERAPISTA', TRUE, 5, NULL),
               (3, 'paciente', 'PACIENTE', TRUE, NULL, 13);
      INSERT INTO disponibilidades (id, medico_id) VALUES (1, 2);
      INSERT INTO historias_clinicas (id, paciente_id) VALUES (1, 12),(2, 14),(3, 99);
      INSERT INTO citas (id, medico_id, paciente_id, estado)
        VALUES (1, 3, 11, 'CANCELADA'),(2, 99, 99, 'ATENDIDA');
      INSERT INTO controles_medicos (id, historia_clinica_id, cita_id, medico_id)
        VALUES (1, 3, 2, 4),(2, 2, 2, 90);
      CREATE TABLE dependencias_futuras (
        id BIGINT PRIMARY KEY,
        medico_id BIGINT NOT NULL REFERENCES medicos(id) ON DELETE RESTRICT
      );
      INSERT INTO dependencias_futuras (id, medico_id) VALUES (1, 6);
    `);

    const repository = new AdminRepository(scopedPool);
    assert.deepEqual(await repository.eliminarPerfil("medicos", 1, "admin"), {
      id: "1",
      tipo: "medicos",
      eliminado: true
    });
    assert.deepEqual(await repository.eliminarPerfil("pacientes", 10, "admin"), {
      id: "10",
      tipo: "pacientes",
      eliminado: true
    });
    const auditRows = await scopedPool.query(
      "SELECT tipo_evento, entidad_id, realizado_por, datos_adicionales FROM auditorias ORDER BY id"
    );
    assert.deepEqual(auditRows.rows, [
      {
        tipo_evento: "MEDICOS_ELIMINADO",
        entidad_id: "1",
        realizado_por: "admin",
        datos_adicionales: { tipoEntidad: "medicos" }
      },
      {
        tipo_evento: "PACIENTES_ELIMINADO",
        entidad_id: "10",
        realizado_por: "admin",
        datos_adicionales: { tipoEntidad: "pacientes" }
      }
    ]);

    for (const id of [2, 3, 4, 5]) {
      await assert.rejects(repository.eliminarPerfil("medicos", id, "admin"), {
        statusCode: 409,
        message: /Desactívalo en lugar de eliminarlo/
      });
      assert.equal((await scopedPool.query("SELECT id FROM medicos WHERE id=$1", [id])).rowCount, 1);
    }
    for (const id of [11, 12, 13, 14]) {
      await assert.rejects(repository.eliminarPerfil("pacientes", id, "admin"), {
        statusCode: 409,
        message: /Desactívalo en lugar de eliminarlo/
      });
      assert.equal((await scopedPool.query("SELECT id FROM pacientes WHERE id=$1", [id])).rowCount, 1);
    }

    await assert.rejects(repository.eliminarPerfil("medicos", 6, "admin"), {
      statusCode: 409,
      message: /registros relacionados.*Desactívalo/
    });
    assert.equal((await scopedPool.query("SELECT id FROM medicos WHERE id=6")).rowCount, 1);
    assert.equal(
      (await scopedPool.query("SELECT id FROM auditorias WHERE tipo_evento='MEDICOS_ELIMINADO' AND entidad_id='6'")).rowCount,
      0
    );

    await assert.rejects(repository.eliminarPerfil("pacientes", 15, "admin"), { code: "23514" });
    assert.equal((await scopedPool.query("SELECT id FROM pacientes WHERE id=15")).rowCount, 1);
    assert.equal(
      (await scopedPool.query("SELECT id FROM auditorias WHERE tipo_evento='PACIENTES_ELIMINADO' AND entidad_id='15'")).rowCount,
      0
    );

    let profileLocked;
    const locked = new Promise(resolve => { profileLocked = resolve; });
    let releaseProfileLock;
    const resumeDelete = new Promise(resolve => { releaseProfileLock = resolve; });
    const lockingRepository = new AdminRepository({
      connect: async () => {
        const client = await scopedPool.connect();
        return {
          query: async (sql, params) => {
            const result = await client.query(sql, params);
            if (sql.includes("FROM medicos WHERE id=$1 FOR UPDATE")) {
              profileLocked();
              await resumeDelete;
            }
            return result;
          },
          release: () => client.release()
        };
      }
    });
    const deletion = lockingRepository.eliminarPerfil("medicos", 7, "admin");
    await locked;
    const referenceClient = await scopedPool.connect();
    let insertionFinished = false;
    const insertReference = referenceClient
      .query("INSERT INTO citas (id, medico_id, paciente_id, estado) VALUES (3, 7, 99, 'PROGRAMADA')")
      .finally(() => {
        insertionFinished = true;
        referenceClient.release();
      });
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(insertionFinished, false, "new FK references must wait for the profile row lock");
    } finally {
      releaseProfileLock();
    }
    await deletion;
    await assert.rejects(insertReference, { code: "23503" });
    assert.equal((await scopedPool.query("SELECT id FROM medicos WHERE id=7")).rowCount, 0);
    assert.equal(
      (await scopedPool.query("SELECT id FROM auditorias WHERE tipo_evento='MEDICOS_ELIMINADO' AND entidad_id='7'")).rowCount,
      1
    );
  } finally {
    if (scopedPool) await scopedPool.end();
    if (schemaCreated) await adminPool.query(`DROP SCHEMA ${quotedSchema} CASCADE`);
    await adminPool.end();
  }
});
