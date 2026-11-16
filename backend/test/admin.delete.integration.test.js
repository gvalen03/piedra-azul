import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { AdminRepository } from "../src/modules/admin/infrastructure/admin.repository.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });
const enabled = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";

test("PostgreSQL protege perfiles profesionales refactorizados y sus referencias", { skip: !enabled }, async () => {
  const config = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME };
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
      CREATE TABLE personas (id BIGINT PRIMARY KEY);
      CREATE TABLE profesionales (id BIGINT PRIMARY KEY, persona_id BIGINT NOT NULL UNIQUE REFERENCES personas(id));
      CREATE TABLE pacientes (id BIGINT PRIMARY KEY, persona_id BIGINT NOT NULL UNIQUE REFERENCES personas(id));
      CREATE TABLE usuarios (id BIGINT PRIMARY KEY, username TEXT NOT NULL UNIQUE, persona_id BIGINT NOT NULL REFERENCES personas(id), activo BOOLEAN NOT NULL);
      CREATE TABLE historias_clinicas (id BIGINT PRIMARY KEY, paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT);
      CREATE TABLE citas (id BIGINT PRIMARY KEY, profesional_id BIGINT NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT, paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT);
      CREATE TABLE controles_clinicos (id BIGINT PRIMARY KEY, paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT, profesional_id BIGINT NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT);
      CREATE TABLE disponibilidades (id BIGINT PRIMARY KEY, profesional_id BIGINT NOT NULL REFERENCES profesionales(id) ON DELETE RESTRICT);
      CREATE TABLE auditorias (id BIGSERIAL PRIMARY KEY, tipo_evento TEXT NOT NULL, descripcion TEXT NOT NULL, entidad_id TEXT, realizado_por TEXT NOT NULL, modulo_origen TEXT NOT NULL);
      INSERT INTO personas (id) VALUES (100),(101),(102),(103),(104),(105),(106),(201),(202),(203),(204),(205);
      INSERT INTO profesionales (id, persona_id) VALUES (1,101),(2,102),(3,103),(4,104),(5,105),(6,106);
      INSERT INTO pacientes (id, persona_id) VALUES (10,201),(11,202),(12,203),(13,204),(14,205);
      INSERT INTO usuarios (id, username, persona_id, activo) VALUES (1,'admin',100,TRUE),(2,'vinculado',105,TRUE),(3,'paciente-vinculado',205,TRUE);
      INSERT INTO citas (id, profesional_id, paciente_id) VALUES (1,2,11);
      INSERT INTO historias_clinicas (id, paciente_id) VALUES (1,12);
      INSERT INTO controles_clinicos (id, paciente_id, profesional_id) VALUES (1,13,4);
      INSERT INTO disponibilidades (id, profesional_id) VALUES (1,3);
    `);
    const repository = new AdminRepository(scopedPool);
    assert.deepEqual(await repository.eliminarPerfil("profesionales", 1, "admin"), { id: 1, tipo: "profesionales", eliminado: true });
    assert.deepEqual(await repository.eliminarPerfil("pacientes", 10, "admin"), { id: 10, tipo: "pacientes", eliminado: true });
    assert.deepEqual((await scopedPool.query("SELECT tipo_evento, entidad_id FROM auditorias ORDER BY id")).rows, [
      { tipo_evento: "PROFESIONALES_ELIMINADO", entidad_id: "1" },
      { tipo_evento: "PACIENTES_ELIMINADO", entidad_id: "10" }
    ]);
    for (const id of [2, 3, 4, 5]) {
      await assert.rejects(repository.eliminarPerfil("profesionales", id, "admin"), { statusCode: 409 });
      assert.equal((await scopedPool.query("SELECT id FROM profesionales WHERE id=$1", [id])).rowCount, 1);
    }
    for (const id of [11, 12, 13, 14]) {
      await assert.rejects(repository.eliminarPerfil("pacientes", id, "admin"), { statusCode: 409 });
      assert.equal((await scopedPool.query("SELECT id FROM pacientes WHERE id=$1", [id])).rowCount, 1);
    }
    let profileLocked;
    const locked = new Promise(resolve => { profileLocked = resolve; });
    let releaseProfileLock;
    const resumeDelete = new Promise(resolve => { releaseProfileLock = resolve; });
    const lockingRepository = new AdminRepository({ connect: async () => {
      const client = await scopedPool.connect();
      return { query: async (sql, params) => {
        const result = await client.query(sql, params);
        if (sql.includes("FROM profesionales WHERE id=$1 FOR UPDATE")) { profileLocked(); await resumeDelete; }
        return result;
      }, release: () => client.release() };
    }});
    const deletion = lockingRepository.eliminarPerfil("profesionales", 6, "admin");
    await locked;
    const referenceClient = await scopedPool.connect();
    let insertionFinished = false;
    const insertReference = referenceClient.query("INSERT INTO citas (id, profesional_id, paciente_id) VALUES (2, 6, 11)")
      .finally(() => { insertionFinished = true; referenceClient.release(); });
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(insertionFinished, false, "una nueva referencia debe esperar el bloqueo del perfil");
    } finally { releaseProfileLock(); }
    await deletion;
    await assert.rejects(insertReference, { code: "23503" });
    assert.equal((await scopedPool.query("SELECT id FROM profesionales WHERE id=6")).rowCount, 0);
  } finally {
    if (scopedPool) await scopedPool.end();
    if (schemaCreated) await adminPool.query(`DROP SCHEMA ${quotedSchema} CASCADE`);
    await adminPool.end();
  }
});
