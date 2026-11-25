import test from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import pg from "pg";
import { citaRoutes } from "../src/modules/citas/web/cita.routes.js";
import { crearCitaController } from "../src/modules/citas/web/cita.controller.js";
import { CitaService } from "../src/modules/citas/application/cita.service.js";
import { CitaRepository } from "../src/modules/citas/infrastructure/cita.repository.js";
import { DisponibilidadService } from "../src/modules/disponibilidad/application/disponibilidad.service.js";
import { DisponibilidadRepository } from "../src/modules/disponibilidad/infrastructure/disponibilidad.repository.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });
const enabled = process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1";
const config = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME };

const sumarDias = (fecha, dias) => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return resultado.toISOString().slice(0, 10);
};
const diaSemana = fecha => ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"][new Date(`${fecha}T12:00:00Z`).getUTCDay()];

test("integración PostgreSQL: cancelación de citas por paciente y agendador", { skip: !enabled }, async t => {
  const adminPool = new pg.Pool(config);
  const schema = `cancelacion_citas_test_${randomUUID().replaceAll("-", "")}`;
  const quotedSchema = `"${schema}"`;
  let pool;
  let app;
  try {
    await adminPool.query(`CREATE SCHEMA ${quotedSchema}`);
    pool = new pg.Pool({ ...config, options: `-c search_path=${schema}` });
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
    const fechaValida = sumarDias(hoy, 3);
    const fechaCercana = sumarDias(hoy, 1);
    const fechaLimite = sumarDias(hoy, 2);
    const fechaPasada = sumarDias(hoy, -1);
    await pool.query(`
      CREATE TABLE profesionales (id BIGINT PRIMARY KEY, activo BOOLEAN NOT NULL DEFAULT TRUE);
      CREATE TABLE pacientes (id BIGINT PRIMARY KEY, estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO');
      CREATE TABLE disponibilidades (id BIGSERIAL PRIMARY KEY, profesional_id BIGINT NOT NULL REFERENCES profesionales(id), dia_semana VARCHAR(12) NOT NULL, hora_inicio TIME NOT NULL, hora_fin TIME NOT NULL, intervalo_minutos INTEGER NOT NULL, semanas_habilitadas INTEGER NOT NULL, activo BOOLEAN NOT NULL DEFAULT TRUE, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE citas (
        id BIGINT PRIMARY KEY, paciente_id BIGINT NOT NULL REFERENCES pacientes(id), profesional_id BIGINT NOT NULL REFERENCES profesionales(id),
        fecha DATE NOT NULL, hora_inicio TIME NOT NULL, hora_fin TIME NOT NULL, estado VARCHAR(30) NOT NULL, motivo TEXT,
        justificacion_cancelacion TEXT, cancelada_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE auditorias (id BIGSERIAL PRIMARY KEY, tipo_evento TEXT NOT NULL, descripcion TEXT NOT NULL, entidad_id TEXT, realizado_por TEXT NOT NULL, modulo_origen TEXT NOT NULL, datos_adicionales TEXT);
      INSERT INTO profesionales (id) VALUES (1);
      INSERT INTO pacientes (id) VALUES (1), (2);
    `);
    await pool.query("INSERT INTO disponibilidades (profesional_id,dia_semana,hora_inicio,hora_fin,intervalo_minutos,semanas_habilitadas) VALUES (1,$1,'09:00','10:00',30,4)", [diaSemana(fechaValida)]);
    await pool.query(`
      INSERT INTO citas (id,paciente_id,profesional_id,fecha,hora_inicio,hora_fin,estado) VALUES
      (1,1,1,$1,'09:00','09:30','PROGRAMADA'),
      (2,2,1,$1,'09:30','10:00','PROGRAMADA'),
      (3,1,1,$2,'09:00','09:30','PROGRAMADA'),
      (4,1,1,$4,'09:00','09:30','PROGRAMADA'),
      (5,1,1,$1,'09:30','10:00','ATENDIDA'),
      (6,1,1,$1,'11:00','11:30','CONFIRMADA'),
      (7,1,1,$3,'00:00','00:30','PROGRAMADA')
    `, [fechaValida, fechaCercana, fechaLimite, fechaPasada]);

    const citaRepository = new CitaRepository(pool);
    const disponibilidadService = new DisponibilidadService({
      disponibilidadRepository: new DisponibilidadRepository(pool), citaRepository,
      ahora: () => new Date(`${hoy}T12:00:00-05:00`)
    });
    const citaService = new CitaService({ citaRepository, disponibilidadService, eventBus: null, profesionalRepository: {} });
    app = Fastify();
    t.after(() => app.close());
    app.decorate("authenticate", async (request, reply) => {
      const usuarios = {
        "paciente-1": { rol: "PACIENTE", pacienteId: 1, sub: "paciente-1" },
        "paciente-2": { rol: "PACIENTE", pacienteId: 2, sub: "paciente-2" },
        agendador: { rol: "AGENDADOR", sub: "agendador" },
        profesional: { rol: "MEDICO_TERAPISTA", profesionalId: 1, sub: "profesional" }
      };
      const usuario = usuarios[request.headers.authorization];
      if (!usuario) return reply.code(401).send({ error: "Sesión inválida" });
      request.user = usuario;
    });
    app.decorate("citaRepository", citaRepository);
    app.decorate("citaController", crearCitaController({ citaService }));
    app.decorate("pacienteRepository", { buscarPorId: async () => ({ estado: "ACTIVO" }) });
    await app.register(citaRoutes, { prefix: "/citas" });

    const sinJustificacion = await app.inject({ method: "PATCH", url: "/citas/mis-citas/1/cancelar", headers: { authorization: "paciente-1" }, payload: {} });
    assert.equal(sinJustificacion.statusCode, 400);
    const cancelarPropia = await app.inject({ method: "PATCH", url: "/citas/mis-citas/1/cancelar", headers: { authorization: "paciente-1" }, payload: { justificacion: "Viaje imprevisto" } });
    assert.equal(cancelarPropia.statusCode, 200, cancelarPropia.body);
    const persistida = await pool.query("SELECT estado, justificacion_cancelacion, cancelada_at IS NOT NULL AS cancelada FROM citas WHERE id=1");
    assert.deepEqual(persistida.rows[0], { estado: "CANCELADA", justificacion_cancelacion: "Viaje imprevisto", cancelada: true });
    const franjas = await disponibilidadService.obtenerFranjasDisponibles({ profesionalId: 1, fecha: fechaValida });
    assert.ok(franjas.some(franja => franja.horaInicio === "09:00" && franja.horaFin === "09:30"), "la franja cancelada debe quedar disponible");

    const ajena = await app.inject({ method: "PATCH", url: "/citas/mis-citas/2/cancelar", headers: { authorization: "paciente-1" }, payload: { justificacion: "No es mi cita" } });
    assert.equal(ajena.statusCode, 409);
    const cercana = await app.inject({ method: "PATCH", url: "/citas/mis-citas/3/cancelar", headers: { authorization: "paciente-1" }, payload: { justificacion: "No podré asistir" } });
    assert.equal(cercana.statusCode, 409);
    const pasada = await app.inject({ method: "PATCH", url: "/citas/mis-citas/4/cancelar", headers: { authorization: "paciente-1" }, payload: { justificacion: "No podré asistir" } });
    assert.equal(pasada.statusCode, 409);
    const conMenosDe48Horas = await app.inject({ method: "PATCH", url: "/citas/mis-citas/7/cancelar", headers: { authorization: "paciente-1" }, payload: { justificacion: "No podré asistir" } });
    assert.equal(conMenosDe48Horas.statusCode, 409);
    const atendida = await app.inject({ method: "PATCH", url: "/citas/mis-citas/5/cancelar", headers: { authorization: "paciente-1" }, payload: { justificacion: "No podré asistir" } });
    assert.equal(atendida.statusCode, 409);
    const repetida = await app.inject({ method: "PATCH", url: "/citas/mis-citas/1/cancelar", headers: { authorization: "paciente-1" }, payload: { justificacion: "Nueva razón" } });
    assert.equal(repetida.statusCode, 409);
    const inexistente = await app.inject({ method: "PATCH", url: "/citas/mis-citas/999/cancelar", headers: { authorization: "paciente-1" }, payload: { justificacion: "No existe" } });
    assert.equal(inexistente.statusCode, 409);
    const sinPermiso = await app.inject({ method: "PATCH", url: "/citas/mis-citas/6/cancelar", headers: { authorization: "agendador" }, payload: { justificacion: "No aplica" } });
    assert.equal(sinPermiso.statusCode, 403);
    const staff = await app.inject({ method: "PATCH", url: "/citas/6/cancelar", headers: { authorization: "agendador" } });
    assert.equal(staff.statusCode, 200, staff.body);
    assert.equal((await pool.query("SELECT estado FROM citas WHERE id=6")).rows[0].estado, "CANCELADA");
  } finally {
    if (app) await app.close();
    if (pool) await pool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`);
    await adminPool.end();
  }
});
