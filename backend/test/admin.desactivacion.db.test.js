// ADM-01 — pruebas de integración con PostgreSQL REAL (transacciones, bloqueos,
// concurrencia, rollback y zona horaria America/Bogota).
//
// Se omiten si no hay base de datos. Para ejecutarlas:
//   TEST_DATABASE_URL=postgres://usuario:clave@localhost:5432/postgres npm test
// Cada ejecución crea un esquema propio (adm01_*), carga ahí las migraciones y
// lo elimina al terminar: no toca tablas ni datos existentes.
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { AdminRepository } from "../src/modules/admin/infrastructure/admin.repository.js";
import { CitaRepository } from "../src/modules/citas/infrastructure/cita.repository.js";
import { Cita } from "../src/modules/citas/domain/cita.entity.js";

const URL_DB = process.env.TEST_DATABASE_URL;
const OMITIR = URL_DB ? false : "Define TEST_DATABASE_URL para ejecutar las pruebas con PostgreSQL real";
const MIGRACIONES = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/shared/db/migrations");
const dormir = ms => new Promise(r => setTimeout(r, ms));

describe("ADM-01 con PostgreSQL real", { skip: OMITIR }, () => {
  const esquema = `adm01_${process.pid}_${Date.now()}`;
  let pool, poolTokio, repo, citas, contador = 0;
  const ADMIN = "admin_prueba";

  const q = (sql, params) => pool.query(sql, params);
  const uno = async (sql, params) => (await q(sql, params)).rows[0];

  before(async () => {
    const cliente = new pg.Client({ connectionString: URL_DB });
    await cliente.connect();
    await cliente.query(`CREATE SCHEMA ${esquema}`);
    await cliente.query(`SET search_path TO ${esquema}`);
    for (const archivo of fs.readdirSync(MIGRACIONES).filter(f => f.endsWith(".sql")).sort()) {
      await cliente.query(fs.readFileSync(path.join(MIGRACIONES, archivo), "utf8"));
    }
    await cliente.end();
    pool = new pg.Pool({ connectionString: URL_DB, max: 12, options: `-c search_path=${esquema}` });
    // Misma base pero con la zona horaria de la sesión en el otro lado del mundo.
    poolTokio = new pg.Pool({ connectionString: URL_DB, max: 2, options: `-c search_path=${esquema} -c timezone=Asia/Tokyo` });
    citas = new CitaRepository(pool);
    repo = new AdminRepository(pool, { citaRepository: citas });
    await q(`INSERT INTO usuarios (username,password,nombre,email,rol,activo) VALUES ($1,'x','Admin Prueba','admin@prueba.test','ADMINISTRADOR',TRUE)`, [ADMIN]);
    await q(`INSERT INTO usuarios (username,password,nombre,email,rol,activo) VALUES ('agendador_prueba','x','Agendador','ag@prueba.test','AGENDADOR',TRUE)`);
  });

  after(async () => {
    await pool?.end(); await poolTokio?.end();
    const cliente = new pg.Client({ connectionString: URL_DB });
    await cliente.connect();
    await cliente.query(`DROP SCHEMA IF EXISTS ${esquema} CASCADE`);
    await cliente.end();
  });

  // ---------- datos sintéticos ----------
  const bogota = async () => {
    const r = await uno(`SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date::text AS hoy,
      EXTRACT(HOUR FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')*60 + EXTRACT(MINUTE FROM CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota') AS minutos`);
    return { hoy: r.hoy, minutos: Number(r.minutos) };
  };
  const dia = async n => (await uno(`SELECT ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date + $1::int)::text AS f`, [n])).f;

  async function medico() {
    const n = ++contador;
    const m = await uno(`INSERT INTO medicos (nombre,apellido,numero_documento,email,activo) VALUES ($1,'Prueba',$2,$3,TRUE) RETURNING *`,
      [`Medico${n}`, `M-${esquema}-${n}`, `m${n}@prueba.test`]);
    for (const d of ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]) {
      await q(`INSERT INTO disponibilidades (medico_id,dia_semana,hora_inicio,hora_fin,intervalo_minutos,semanas_habilitadas,activo) VALUES ($1,$2,'08:00','18:00',30,8,TRUE)`, [m.id, d]);
    }
    return m;
  }
  async function paciente() {
    const n = ++contador;
    return uno(`INSERT INTO pacientes (nombre,apellido,numero_documento,fecha_nacimiento,telefono,genero,estado) VALUES ($1,'Prueba',$2,'1990-01-01','3000000000','OTRO','ACTIVO') RETURNING *`,
      [`Paciente${n}`, `P-${esquema}-${n}`]);
  }
  async function cita(m, p, fecha, hora, estado) {
    return uno(`INSERT INTO citas (paciente_id,medico_id,fecha,hora_inicio,hora_fin,estado,motivo) VALUES ($1,$2,$3,$4::time,$4::time + interval '30 minutes',$5,'sintético') RETURNING *`,
      [p.id, m.id, fecha, hora, estado]);
  }
  /** Mezcla: futuras pendientes, canceladas, atendidas, antiguas y (si la hora lo permite) de hoy ya iniciada. */
  async function escenario() {
    const m = await medico(), p = await paciente(), otro = await paciente();
    const manana = await dia(1), pasado = await dia(2), ayer = await dia(-1), { hoy, minutos } = await bogota();
    const c = {
      futuraProgramada: await cita(m, p, manana, "09:00", "PROGRAMADA"),
      futuraConfirmada: await cita(m, otro, manana, "09:30", "CONFIRMADA"),
      futuraOtroDia: await cita(m, p, pasado, "10:00", "PROGRAMADA"),
      futuraCancelada: await cita(m, p, manana, "11:00", "CANCELADA"),
      futuraAtendida: await cita(m, p, manana, "11:30", "ATENDIDA"),
      antigua: await cita(m, p, ayer, "09:00", "PROGRAMADA"),
      antiguaConfirmada: await cita(m, p, ayer, "10:00", "CONFIRMADA")
    };
    if (minutos >= 60) c.hoyYaIniciada = await cita(m, p, hoy, "00:00", "PROGRAMADA");
    if (minutos <= 23 * 60 + 10) c.hoyTarde = await cita(m, p, hoy, "23:15", "PROGRAMADA"); // pendiente: empieza después de ahora
    const pendientes = [c.futuraProgramada, c.futuraConfirmada, c.futuraOtroDia, ...(c.hoyTarde ? [c.hoyTarde] : [])].map(x => String(x.id)).sort();
    return { m, p, otro, c, pendientes };
  }
  const fotoCitas = async () => (await q(`SELECT id::text, estado, updated_at::text FROM citas ORDER BY id`)).rows;
  const ids = filas => filas.map(f => String(f.id)).sort();

  // Reserva real (misma lógica que el sistema): bloquea médico/paciente y revalida disponibilidad.
  const reservar = (m, p, fecha, hora) => {
    const fin = `${String(Math.floor((Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3)) + 30) / 60)).padStart(2, "0")}:${String((Number(hora.slice(3)) + 30) % 60).padStart(2, "0")}`;
    return citas.guardar(new Cita({ pacienteId: p.id, medicoId: m.id, fecha, horaInicio: hora, horaFin: fin, motivo: "reserva" }));
  };

  for (const tipo of ["medicos", "pacientes"]) {
    const sujeto = ({ m, p }) => (tipo === "medicos" ? m : p);
    const estadoDe = async perfil => (await uno(`SELECT * FROM ${tipo} WHERE id=$1`, [perfil.id]));
    const activo = fila => tipo === "medicos" ? fila.activo === true : fila.estado === "ACTIVO";

    describe(`${tipo}`, () => {
      it("vista previa: cuenta exactamente las pendientes futuras en hora de Bogotá, con sus ids", async () => {
        const e = await escenario();
        const previa = await repo.previsualizarDesactivacion(tipo, sujeto(e).id);
        assert.equal(previa.cantidad, previa.citas.length);
        assert.deepEqual(ids(previa.citas), tipo === "medicos" ? e.pendientes
          : e.pendientes.filter(id => [e.c.futuraProgramada, e.c.futuraOtroDia, ...(e.c.hoyTarde ? [e.c.hoyTarde] : [])].map(x => String(x.id)).includes(id)));
        assert.equal(previa.activo, true);
      });

      it("el recuento no depende de la zona horaria de la sesión de la base de datos", async () => {
        const e = await escenario();
        const enBogota = await repo.previsualizarDesactivacion(tipo, sujeto(e).id);
        const enTokio = await new AdminRepository(poolTokio, { citaRepository: citas }).previsualizarDesactivacion(tipo, sujeto(e).id);
        assert.deepEqual(ids(enTokio.citas), ids(enBogota.citas));
      });

      it("desactivar cancela solo las futuras PROGRAMADA/CONFIRMADA y deja todo lo demás intacto", async () => {
        const e = await escenario();
        const perfil = sujeto(e);
        const previa = await repo.previsualizarDesactivacion(tipo, perfil.id);
        const antes = await fotoCitas();
        const res = await repo.desactivarPerfil(tipo, perfil.id, previa.cantidad, ADMIN);
        assert.equal(res.cantidadCanceladas, previa.cantidad);
        assert.equal(activo(await estadoDe(perfil)), false);
        const despues = await fotoCitas();
        const afectadas = new Set(previa.citas.map(c => String(c.id)));
        for (const fila of despues) {
          const previa_ = antes.find(a => a.id === fila.id);
          if (afectadas.has(fila.id)) assert.equal(fila.estado, "CANCELADA");
          else assert.deepEqual(fila, previa_, `la cita ${fila.id} no debía cambiar`);
        }
      });

      it("confirmar con 0 pendientes también desactiva (confirmación explícita)", async () => {
        const perfil = tipo === "medicos" ? await medico() : await paciente();
        const res = await repo.desactivarPerfil(tipo, perfil.id, 0, ADMIN);
        assert.equal(res.cantidadCanceladas, 0);
        assert.equal(activo(await estadoDe(perfil)), false);
      });

      it("si el conteo esperado no coincide responde 409 con el valor actual y no cambia nada", async () => {
        const e = await escenario();
        const perfil = sujeto(e);
        const antes = await fotoCitas();
        await assert.rejects(repo.desactivarPerfil(tipo, perfil.id, 99, ADMIN), err => {
          assert.equal(err.statusCode, 409);
          assert.equal(err.detalles.cantidadEsperada, 99);
          assert.equal(err.detalles.cantidadActual, err.detalles.citas.length);
          return true;
        });
        assert.equal(activo(await estadoDe(perfil)), true);
        assert.deepEqual(await fotoCitas(), antes);
      });

      it("registra el evento de auditoría con actor, perfil, cantidad e ids, dentro de la transacción", async () => {
        const e = await escenario();
        const perfil = sujeto(e);
        const previa = await repo.previsualizarDesactivacion(tipo, perfil.id);
        await repo.desactivarPerfil(tipo, perfil.id, previa.cantidad, ADMIN);
        const ev = await uno(`SELECT * FROM auditorias WHERE entidad_id=$1 AND tipo_evento=$2`, [String(perfil.id), `${tipo.toUpperCase()}_DESACTIVADO`]);
        assert.equal(ev.realizado_por, ADMIN);
        assert.equal(ev.modulo_origen, "ADMINISTRACION");
        assert.equal(ev.datos_adicionales.perfilId, String(perfil.id));
        assert.equal(ev.datos_adicionales.cantidadCanceladas, previa.cantidad);
        assert.deepEqual([...ev.datos_adicionales.citasCanceladas].map(String).sort(), ids(previa.citas));
      });

      it("si falla la auditoría se revierte TODO: perfil activo, citas pendientes y sin evento", async () => {
        const e = await escenario();
        const perfil = sujeto(e);
        const previa = await repo.previsualizarDesactivacion(tipo, perfil.id);
        const antes = await fotoCitas();
        const fallido = new AdminRepository(pool, { citaRepository: citas });
        fallido.auditar = async () => { throw new Error("Auditoría no disponible"); };
        await assert.rejects(fallido.desactivarPerfil(tipo, perfil.id, previa.cantidad, ADMIN), /Auditoría no disponible/);
        assert.equal(activo(await estadoDe(perfil)), true);
        assert.deepEqual(await fotoCitas(), antes);
        assert.equal((await q(`SELECT 1 FROM auditorias WHERE entidad_id=$1 AND tipo_evento=$2`, [String(perfil.id), `${tipo.toUpperCase()}_DESACTIVADO`])).rowCount, 0);
      });

      it("si falla la cancelación de citas también se revierte el cambio de estado", async () => {
        const e = await escenario();
        const perfil = sujeto(e);
        const previa = await repo.previsualizarDesactivacion(tipo, perfil.id);
        const antes = await fotoCitas();
        const fallido = new AdminRepository(pool, { citaRepository: Object.assign(Object.create(citas), {
          cancelarPendientesPorIds: async () => { throw new Error("Fallo al cancelar"); } }) });
        await assert.rejects(fallido.desactivarPerfil(tipo, perfil.id, previa.cantidad, ADMIN), /Fallo al cancelar/);
        assert.equal(activo(await estadoDe(perfil)), true);
        assert.deepEqual(await fotoCitas(), antes);
      });

      it("reactivar solo cambia el estado del perfil: las canceladas siguen CANCELADA y se audita", async () => {
        const e = await escenario();
        const perfil = sujeto(e);
        const previa = await repo.previsualizarDesactivacion(tipo, perfil.id);
        await repo.desactivarPerfil(tipo, perfil.id, previa.cantidad, ADMIN);
        const trasDesactivar = await fotoCitas();
        await repo.reactivarPerfil(tipo, perfil.id, ADMIN);
        assert.equal(activo(await estadoDe(perfil)), true);
        assert.deepEqual(await fotoCitas(), trasDesactivar, "reactivar no debe tocar ninguna cita");
        for (const id of previa.citas.map(c => c.id)) assert.equal((await uno(`SELECT estado FROM citas WHERE id=$1`, [id])).estado, "CANCELADA");
        const ev = await uno(`SELECT * FROM auditorias WHERE entidad_id=$1 AND tipo_evento=$2`, [String(perfil.id), `${tipo.toUpperCase()}_REACTIVADO`]);
        assert.equal(ev.realizado_por, ADMIN);
      });

      it("desactivar un perfil ya inactivo o reactivar uno activo responde 409; inexistente 404", async () => {
        const perfil = tipo === "medicos" ? await medico() : await paciente();
        await assert.rejects(repo.reactivarPerfil(tipo, perfil.id, ADMIN), { statusCode: 409 });
        await repo.desactivarPerfil(tipo, perfil.id, 0, ADMIN);
        await assert.rejects(repo.desactivarPerfil(tipo, perfil.id, 0, ADMIN), { statusCode: 409 });
        await assert.rejects(repo.desactivarPerfil(tipo, 999999, 0, ADMIN), { statusCode: 404 });
        await assert.rejects(repo.previsualizarDesactivacion(tipo, 999999), { statusCode: 404 });
      });

      it("un actor que no es administrador activo no puede desactivar ni reactivar (403) y no cambia nada", async () => {
        const perfil = tipo === "medicos" ? await medico() : await paciente();
        for (const actor of ["agendador_prueba", "no_existe"]) {
          await assert.rejects(repo.desactivarPerfil(tipo, perfil.id, 0, actor), { statusCode: 403 });
        }
        assert.equal(activo(await estadoDe(perfil)), true);
      });

      it("el PUT genérico no puede cambiar el estado, pero sí editar otros campos", async () => {
        const e = await escenario();
        const perfil = sujeto(e);
        const base = tipo === "medicos"
          ? { nombre: "Editado", apellido: "Prueba", numeroDocumento: perfil.numero_documento, email: null, telefono: null, activo: true }
          : { nombre: "Editado", apellido: "Prueba", numeroDocumento: perfil.numero_documento, fechaNacimiento: "1990-01-01", email: null, telefono: "3000000000", direccion: null, eps: null, genero: "OTRO", estado: "ACTIVO" };
        const inactivo = tipo === "medicos" ? { ...base, activo: false } : { ...base, estado: "INACTIVO" };
        await assert.rejects(repo.guardarPerfil(tipo, perfil.id, inactivo, ADMIN), { statusCode: 400 });
        assert.equal(activo(await estadoDe(perfil)), true);
        assert.equal((await estadoDe(perfil)).nombre, perfil.nombre, "no se debe haber editado nada");
        await repo.guardarPerfil(tipo, perfil.id, base, ADMIN);
        assert.equal((await estadoDe(perfil)).nombre, "Editado");
        // y tampoco puede reactivar uno inactivo
        await repo.desactivarPerfil(tipo, perfil.id, (await repo.previsualizarDesactivacion(tipo, perfil.id)).cantidad, ADMIN);
        const activar = tipo === "medicos" ? { ...base, activo: true } : { ...base, estado: "ACTIVO" };
        await assert.rejects(repo.guardarPerfil(tipo, perfil.id, activar, ADMIN), { statusCode: 400 });
        assert.equal(activo(await estadoDe(perfil)), false);
      });

      it("un perfil inactivo no puede generar reservas nuevas (el bloqueo es de la base, no de la UI)", async () => {
        const m = await medico(), p = await paciente(), manana = await dia(1);
        await repo.desactivarPerfil(tipo, (tipo === "medicos" ? m : p).id, 0, ADMIN);
        await assert.rejects(reservar(m, p, manana, "15:00"), /no está disponible/);
        assert.equal((await q(`SELECT 1 FROM citas WHERE medico_id=$1 AND paciente_id=$2`, [m.id, p.id])).rowCount, 0);
      });

      it("una reserva en curso (sin confirmar) obliga a reconfirmar: el conteo se revalida bajo el mismo bloqueo", async () => {
        const e = await escenario();
        const perfil = sujeto(e), manana = await dia(1);
        const previa = await repo.previsualizarDesactivacion(tipo, perfil.id);
        // Otra sesión empieza a reservar (toma el bloqueo del agendamiento) y todavía no confirma.
        const reserva = await pool.connect();
        let desactivacion;
        try {
          await reserva.query("BEGIN");
          const comp = tipo === "medicos" ? await paciente() : await medico();
          if (tipo === "medicos") {
            await reserva.query(`SELECT id FROM medicos WHERE id=$1 AND activo=TRUE FOR UPDATE`, [perfil.id]);
            await reserva.query(`SELECT id FROM pacientes WHERE id=$1 AND estado='ACTIVO' FOR SHARE`, [comp.id]);
          } else {
            await reserva.query(`SELECT id FROM medicos WHERE id=$1 AND activo=TRUE FOR UPDATE`, [comp.id]);
            await reserva.query(`SELECT id FROM pacientes WHERE id=$1 AND estado='ACTIVO' FOR SHARE`, [perfil.id]);
          }
          await reserva.query(`INSERT INTO citas (paciente_id,medico_id,fecha,hora_inicio,hora_fin,estado) VALUES ($1,$2,$3,'16:00','16:30','PROGRAMADA')`,
            tipo === "medicos" ? [comp.id, perfil.id, manana] : [perfil.id, comp.id, manana]);
          let resuelta = false;
          desactivacion = repo.desactivarPerfil(tipo, perfil.id, previa.cantidad, ADMIN).then(v => ({ ok: v }), err => ({ err })).finally(() => { resuelta = true; });
          await dormir(500);
          assert.equal(resuelta, false, "la desactivación debe esperar al bloqueo de la reserva en curso");
          await reserva.query("COMMIT");
        } catch (err) { await reserva.query("ROLLBACK").catch(() => {}); throw err; } finally { reserva.release(); }
        const r = await desactivacion;
        assert.ok(r.err, "debió fallar por conteo distinto");
        assert.equal(r.err.statusCode, 409);
        assert.equal(r.err.detalles.cantidadActual, previa.cantidad + 1);
        assert.equal(activo(await estadoDe(perfil)), true);
        assert.equal((await uno(`SELECT estado FROM citas WHERE hora_inicio='16:00' AND fecha=$1 AND ${tipo === "medicos" ? "medico_id" : "paciente_id"}=$2`, [manana, perfil.id])).estado, "PROGRAMADA");
        // Reconfirmando con el valor actualizado, ahora sí procede y cancela también la nueva.
        const ok = await repo.desactivarPerfil(tipo, perfil.id, previa.cantidad + 1, ADMIN);
        assert.equal(ok.cantidadCanceladas, previa.cantidad + 1);
      });

      it("carrera: desactivar vs. varias reservas simultáneas nunca deja citas pendientes en un perfil inactivo", async () => {
        const manana = await dia(1);
        for (let i = 0; i < 12; i++) {
          const m = await medico(), p = await paciente(), extra = [await paciente(), await paciente(), await paciente()];
          await cita(m, p, manana, "09:00", "PROGRAMADA");
          await cita(m, p, manana, "09:30", "CONFIRMADA");
          const objetivo = tipo === "medicos" ? m : p;
          const intentos = ["12:00", "12:30", "13:00", "13:30"].map((h, k) => dormir(Math.random() * 25).then(() =>
            reservar(m, tipo === "medicos" ? extra[k % 3] : p, manana, h).then(() => "ok", err => err.message)));
          const resultados = await Promise.all([
            dormir(Math.random() * 25).then(() => repo.desactivarPerfil(tipo, objetivo.id, 2, ADMIN).then(() => "ok", err => err)),
            ...intentos
          ]);
          const [des, ...reservas] = resultados;
          const reservasOk = reservas.filter(r => r === "ok").length;
          const desOk = des === "ok";
          // Resultados permitidos: nada inesperado.
          if (!desOk) assert.equal(des.statusCode, 409, `error inesperado: ${des.message}`);
          for (const r of reservas) assert.ok(r === "ok" || /no está disponible|ya se encuentra reservado/.test(r), `reserva con error inesperado: ${r}`);
          // Invariante: o se desactivó con exactamente las 2 vistas (ninguna reserva alcanzó a entrar), o hubo reservas y se exigió reconfirmar.
          assert.ok((desOk && reservasOk === 0) || (!desOk && reservasOk >= 1), `desOk=${desOk} reservasOk=${reservasOk}`);
          const inactivoAhora = !activo(await estadoDe(objetivo));
          const pendientes = (await q(`SELECT 1 FROM citas c WHERE c.${tipo === "medicos" ? "medico_id" : "paciente_id"}=$1 AND ${CitaRepository.PENDIENTE_FUTURA}`, [objetivo.id])).rowCount;
          assert.equal(inactivoAhora, desOk);
          if (inactivoAhora) assert.equal(pendientes, 0, "un perfil inactivo no puede conservar citas pendientes");
        }
      });

      it("dos desactivaciones simultáneas: una procede y la otra recibe 409", async () => {
        const e = await escenario();
        const perfil = sujeto(e);
        const n = (await repo.previsualizarDesactivacion(tipo, perfil.id)).cantidad;
        const res = await Promise.all([1, 2].map(() => repo.desactivarPerfil(tipo, perfil.id, n, ADMIN).then(() => "ok", err => err)));
        assert.equal(res.filter(r => r === "ok").length, 1);
        assert.equal(res.find(r => r !== "ok").statusCode, 409);
        assert.equal((await q(`SELECT 1 FROM auditorias WHERE entidad_id=$1 AND tipo_evento=$2`, [String(perfil.id), `${tipo.toUpperCase()}_DESACTIVADO`])).rowCount, 1);
      });
    });
  }

  it("el historial y los controles médicos asociados se conservan al desactivar", async () => {
    const e = await escenario();
    const h = await uno(`INSERT INTO historias_clinicas (paciente_id) VALUES ($1) RETURNING id`, [e.p.id]);
    await q(`INSERT INTO controles_medicos (historia_clinica_id,cita_id,medico_id,motivo_consulta,observaciones) VALUES ($1,$2,$3,'m','o')`, [h.id, e.c.futuraAtendida.id, e.m.id]);
    await repo.desactivarPerfil("pacientes", e.p.id, (await repo.previsualizarDesactivacion("pacientes", e.p.id)).cantidad, ADMIN);
    assert.equal((await q(`SELECT 1 FROM historias_clinicas WHERE paciente_id=$1`, [e.p.id])).rowCount, 1);
    assert.equal((await q(`SELECT 1 FROM controles_medicos WHERE historia_clinica_id=$1`, [h.id])).rowCount, 1);
    assert.equal((await uno(`SELECT estado FROM citas WHERE id=$1`, [e.c.futuraAtendida.id])).estado, "ATENDIDA");
  });
});
