// ADM-01 — pruebas sin base de datos (stubs): rutas, roles, validación de cuerpo,
// orden de operaciones de la transacción y reintento ante deadlock.
// Las pruebas con PostgreSQL real están en admin.desactivacion.db.test.js.
import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { AdminService } from "../src/modules/admin/application/admin.service.js";
import { AdminRepository } from "../src/modules/admin/infrastructure/admin.repository.js";
import { CitaRepository } from "../src/modules/citas/infrastructure/cita.repository.js";
import { adminRoutes } from "../src/modules/admin/web/admin.routes.js";

// ---------- rutas y roles ----------

async function appPara(t, user, servicio = {}) {
  const app = Fastify();
  t.after(() => app.close());
  const llamadas = [];
  app.decorate("authenticate", async (req, reply) => {
    if (!user) return reply.code(401).send({ error: "Token requerido" });
    req.user = user;
  });
  const registrar = nombre => async (...args) => { llamadas.push([nombre, ...args]); return servicio[nombre] ? servicio[nombre](...args) : { ok: true }; };
  app.decorate("adminRepository", { listar: async () => [] });
  app.decorate("adminService", { guardar: registrar("guardar"), previsualizarDesactivacion: registrar("previsualizarDesactivacion"),
    desactivar: registrar("desactivar"), reactivar: registrar("reactivar") });
  await app.register(adminRoutes, { prefix: "/api/admin" });
  return { app, llamadas };
}
const ADMIN = { rol: "ADMINISTRADOR", sub: "admin1" };
const post = (app, url, payload) => app.inject({ method: "POST", url, payload, headers: { "content-type": "application/json" } });

for (const tipo of ["medicos", "pacientes"]) {
  for (const user of [undefined, { rol: "AGENDADOR" }, { rol: "MEDICO_TERAPISTA", medicoId: 1 }, { rol: "PACIENTE", pacienteId: 1 }]) {
    test(`${tipo}: solo ADMINISTRADOR accede a vista previa, desactivar y reactivar (${user?.rol ?? "sin sesión"})`, async t => {
      const { app, llamadas } = await appPara(t, user);
      const esperado = user ? 403 : 401;
      assert.equal((await app.inject(`/api/admin/${tipo}/7/desactivacion`)).statusCode, esperado);
      assert.equal((await post(app, `/api/admin/${tipo}/7/desactivar`, { cantidadEsperada: 0 })).statusCode, esperado);
      assert.equal((await post(app, `/api/admin/${tipo}/7/reactivar`, {})).statusCode, esperado);
      assert.equal(llamadas.length, 0);
    });
  }

  test(`${tipo}: el administrador llama al servicio con el tipo, el id, la cantidad confirmada y el actor del token`, async t => {
    const { app, llamadas } = await appPara(t, ADMIN);
    assert.equal((await app.inject(`/api/admin/${tipo}/7/desactivacion`)).statusCode, 200);
    assert.equal((await post(app, `/api/admin/${tipo}/7/desactivar`, { cantidadEsperada: 3 })).statusCode, 200);
    assert.equal((await post(app, `/api/admin/${tipo}/7/reactivar`, {})).statusCode, 200);
    assert.deepEqual(llamadas, [
      ["previsualizarDesactivacion", tipo, 7],
      ["desactivar", tipo, 7, 3, "admin1"],
      ["reactivar", tipo, 7, "admin1"]
    ]);
  });

  for (const [descripcion, cuerpo] of [
    ["sin cantidadEsperada", {}], ["cantidad negativa", { cantidadEsperada: -1 }], ["cantidad decimal", { cantidadEsperada: 1.5 }],
    ["cantidad no numérica", { cantidadEsperada: "dos" }], ["cantidad booleana", { cantidadEsperada: [1, 2] }]
  ]) {
    test(`${tipo}: desactivar rechaza ${descripcion} con 400 sin llamar al servicio`, async t => {
      const { app, llamadas } = await appPara(t, ADMIN);
      assert.equal((await post(app, `/api/admin/${tipo}/7/desactivar`, cuerpo)).statusCode, 400);
      assert.equal(llamadas.length, 0);
    });
  }

  test(`${tipo}: id inválido responde 400 sin llamar al servicio`, async t => {
    const { app, llamadas } = await appPara(t, ADMIN);
    for (const id of ["abc", "0", "-3", "1.5"]) {
      assert.equal((await app.inject(`/api/admin/${tipo}/${id}/desactivacion`)).statusCode, 400, id);
      assert.equal((await post(app, `/api/admin/${tipo}/${id}/desactivar`, { cantidadEsperada: 0 })).statusCode, 400, id);
      assert.equal((await post(app, `/api/admin/${tipo}/${id}/reactivar`, {})).statusCode, 400, id);
    }
    assert.equal(llamadas.length, 0);
  });

  // Fastify (Ajv) coacciona "2" → 2 y descarta campos no declarados: el servicio solo ve la cantidad entera.
  test(`${tipo}: un texto numérico se coacciona y los campos extra se descartan antes de llegar al servicio`, async t => {
    const { app, llamadas } = await appPara(t, ADMIN);
    assert.equal((await post(app, `/api/admin/${tipo}/7/desactivar`, { cantidadEsperada: "2", activo: false, estado: "INACTIVO" })).statusCode, 200);
    assert.equal((await post(app, `/api/admin/${tipo}/7/reactivar`, { estado: "ACTIVO", cantidadEsperada: 1 })).statusCode, 200);
    assert.deepEqual(llamadas, [["desactivar", tipo, 7, 2, "admin1"], ["reactivar", tipo, 7, "admin1"]]);
    assert.equal(typeof llamadas[0][3], "number");
    // Ajv también coacciona null → 0. Es inofensivo: con citas pendientes el recuento bajo bloqueo
    // responde 409 (ver pruebas del repositorio), así que nunca se cancelan citas "no vistas".
    assert.equal((await post(app, `/api/admin/${tipo}/7/desactivar`, { cantidadEsperada: null })).statusCode, 200);
    assert.equal(llamadas.at(-1)[3], 0);
  });

  test(`${tipo}: si el conteo cambió, la respuesta 409 incluye la cantidad actual y las citas para reconfirmar`, async t => {
    const detalles = { cantidadEsperada: 2, cantidadActual: 3, citas: [{ id: "1" }, { id: "2" }, { id: "3" }] };
    const { app } = await appPara(t, ADMIN, {
      desactivar: async () => { throw Object.assign(new Error("La cantidad de citas pendientes cambió (ahora 3)."), { statusCode: 409, detalles }); }
    });
    const r = await post(app, `/api/admin/${tipo}/7/desactivar`, { cantidadEsperada: 2 });
    assert.equal(r.statusCode, 409);
    assert.match(r.json().message, /cambió/);
    assert.equal(r.json().cantidadActual, 3);
    assert.equal(r.json().cantidadEsperada, 2);
    assert.equal(r.json().citas.length, 3);
  });
}

test("usuarios no tienen rutas de desactivación (solo médicos y pacientes)", async t => {
  const { app } = await appPara(t, ADMIN);
  assert.equal((await app.inject("/api/admin/usuarios/7/desactivacion")).statusCode, 404);
  assert.equal((await post(app, "/api/admin/usuarios/7/desactivar", { cantidadEsperada: 0 })).statusCode, 404);
});

// ---------- servicio ----------

test("servicio: exige la cantidad confirmada como entero >= 0 antes de tocar el repositorio", async () => {
  let llamado = false;
  const service = new AdminService({ repository: { desactivarPerfil: async () => { llamado = true; return {}; } }, passwordService: {} });
  for (const valor of [undefined, null, -1, 1.5, "2", NaN]) {
    assert.throws(() => service.desactivar("medicos", 1, valor, "admin"), { statusCode: 400 });
  }
  assert.equal(llamado, false);
  await service.desactivar("medicos", 1, 0, "admin");
  assert.equal(llamado, true);
});

// ---------- repositorio con cliente simulado ----------

function bd({ pendientes = [{ id: "11" }, { id: "12" }], activo = true, existe = true, esAdmin = true, fallos = {} } = {}) {
  const registro = [];
  let conexiones = 0;
  const client = {
    query: async (sql, params) => {
      const s = sql.replace(/\s+/g, " ").trim();
      registro.push([s, params]);
      for (const [fragmento, error] of Object.entries(fallos)) if (s.includes(fragmento)) { delete fallos[fragmento]; throw error; }
      if (s.includes("FROM usuarios WHERE username=$1 AND rol='ADMINISTRADOR'")) return { rows: esAdmin ? [{ id: 1 }] : [] };
      if (s.startsWith("SELECT * FROM") && s.endsWith("FOR UPDATE")) return { rows: existe ? [{ id: 5, nombre: "N", apellido: "A", activo, estado: activo ? "ACTIVO" : "INACTIVO" }] : [] };
      if (s.includes("FROM citas c")) return { rows: pendientes };
      if (s.startsWith("UPDATE citas")) return { rows: params[0].map(id => ({ id })) };
      if (s.startsWith("UPDATE medicos") || s.startsWith("UPDATE pacientes")) return { rows: [{ id: 5 }] };
      return { rows: [] };
    },
    release: () => registro.push(["release"])
  };
  const db = { connect: async () => { conexiones++; return client; }, query: client.query };
  const citas = new CitaRepository(db);
  return { repo: new AdminRepository(db, { citaRepository: citas }), registro, conexiones: () => conexiones };
}
const sqls = registro => registro.map(([s]) => s);

test("repositorio: orden de la transacción — actor, bloqueo del perfil, recuento bloqueado, estado, cancelación, auditoría y COMMIT", async () => {
  const { repo, registro } = bd();
  const r = await repo.desactivarPerfil("medicos", 5, 2, "admin1");
  assert.equal(r.cantidadCanceladas, 2);
  const s = sqls(registro);
  const pos = fragmento => s.findIndex(x => x.includes(fragmento));
  assert.equal(s[0], "BEGIN");
  assert.ok(pos("rol='ADMINISTRADOR'") < pos("SELECT * FROM medicos WHERE id=$1 FOR UPDATE"));
  assert.ok(pos("SELECT * FROM medicos WHERE id=$1 FOR UPDATE") < pos("FOR UPDATE OF c"));
  assert.ok(pos("FOR UPDATE OF c") < pos("UPDATE medicos SET activo=FALSE"));
  assert.ok(pos("UPDATE medicos SET activo=FALSE") < pos("UPDATE citas c SET estado = 'CANCELADA'"));
  assert.ok(pos("UPDATE citas c SET estado = 'CANCELADA'") < pos("INSERT INTO auditorias"));
  assert.deepEqual(s.slice(-2), ["COMMIT", "release"]);
  const auditoria = registro.find(([x]) => x.includes("INSERT INTO auditorias"))[1];
  assert.equal(auditoria[0], "MEDICOS_DESACTIVADO");
  assert.equal(auditoria[3], "admin1");
  assert.deepEqual(auditoria[4], { tipoPerfil: "MÉDICO", perfilId: "5", cantidadCanceladas: 2, citasCanceladas: ["11", "12"] });
});

test("repositorio: pacientes usa el mismo bloqueo y cambia estado a INACTIVO", async () => {
  const { repo, registro } = bd();
  await repo.desactivarPerfil("pacientes", 5, 2, "admin1");
  assert.ok(sqls(registro).some(x => x === "UPDATE pacientes SET estado='INACTIVO', updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *"));
  assert.ok(sqls(registro).some(x => x.includes("c.paciente_id = $1")));
});

test("repositorio: conteo distinto → 409 con la cantidad actual, sin UPDATE y con ROLLBACK", async () => {
  const { repo, registro } = bd({ pendientes: [{ id: "1" }, { id: "2" }, { id: "3" }] });
  await assert.rejects(repo.desactivarPerfil("medicos", 5, 2, "admin1"), err => {
    assert.equal(err.statusCode, 409);
    assert.equal(err.detalles.cantidadActual, 3);
    assert.equal(err.detalles.cantidadEsperada, 2);
    return true;
  });
  assert.equal(sqls(registro).some(x => x.startsWith("UPDATE")), false);
  assert.deepEqual(sqls(registro).slice(-2), ["ROLLBACK", "release"]);
});

test("repositorio: confirmar con 0 y 0 pendientes desactiva sin ejecutar cancelación", async () => {
  const { repo, registro } = bd({ pendientes: [] });
  const r = await repo.desactivarPerfil("medicos", 5, 0, "admin1");
  assert.equal(r.cantidadCanceladas, 0);
  assert.equal(sqls(registro).some(x => x.startsWith("UPDATE citas")), false);
  assert.ok(sqls(registro).some(x => x.startsWith("UPDATE medicos")));
});

test("repositorio: falla de auditoría → ROLLBACK (todo o nada)", async () => {
  const { repo, registro } = bd({ fallos: { "INSERT INTO auditorias": new Error("Auditoría no disponible") } });
  await assert.rejects(repo.desactivarPerfil("medicos", 5, 2, "admin1"), /Auditoría no disponible/);
  assert.deepEqual(sqls(registro).slice(-2), ["ROLLBACK", "release"]);
  assert.equal(sqls(registro).includes("COMMIT"), false);
});

test("repositorio: perfil ya inactivo / inexistente / actor sin permisos", async () => {
  await assert.rejects(bd({ activo: false }).repo.desactivarPerfil("medicos", 5, 0, "admin1"), { statusCode: 409 });
  await assert.rejects(bd({ existe: false }).repo.desactivarPerfil("medicos", 5, 0, "admin1"), { statusCode: 404 });
  const { repo, registro } = bd({ esAdmin: false });
  await assert.rejects(repo.desactivarPerfil("medicos", 5, 0, "agendador"), { statusCode: 403 });
  assert.equal(sqls(registro).some(x => x.startsWith("UPDATE")), false);
});

test("repositorio: solo médicos y pacientes se pueden desactivar", async () => {
  const { repo } = bd();
  await assert.rejects(repo.desactivarPerfil("usuarios", 5, 0, "admin1"), { statusCode: 400 });
  await assert.rejects(repo.previsualizarDesactivacion("citas", 5), { statusCode: 400 });
});

test("repositorio: reactivar solo cambia el perfil (ninguna operación sobre citas) y audita", async () => {
  const { repo, registro } = bd({ activo: false });
  await repo.reactivarPerfil("pacientes", 5, "admin1");
  const s = sqls(registro);
  assert.ok(s.includes("UPDATE pacientes SET estado='ACTIVO', updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *"));
  assert.equal(s.some(x => /citas/.test(x)), false, "reactivar no debe tocar la tabla citas");
  assert.equal(registro.find(([x]) => x.includes("INSERT INTO auditorias"))[1][0], "PACIENTES_REACTIVADO");
  await assert.rejects(bd({ activo: true }).repo.reactivarPerfil("pacientes", 5, "admin1"), { statusCode: 409 });
});

test("repositorio: ante deadlock reintenta una vez desde cero y si persiste responde 409", async () => {
  const deadlock = () => Object.assign(new Error("deadlock detected"), { code: "40P01" });
  const una = bd({ fallos: { "FOR UPDATE OF c": deadlock() } });
  const r = await una.repo.desactivarPerfil("medicos", 5, 2, "admin1");
  assert.equal(r.cantidadCanceladas, 2);
  assert.equal(una.conexiones(), 2);

  const siempre = bd();
  const original = siempre.repo.citas.listarPendientesDePerfil.bind(siempre.repo.citas);
  siempre.repo.citas.listarPendientesDePerfil = async () => { throw deadlock(); };
  await assert.rejects(siempre.repo.desactivarPerfil("medicos", 5, 2, "admin1"), err => err.statusCode === 409 && /cambio simultáneo/.test(err.message));
  assert.equal(siempre.conexiones(), 2);
  assert.ok(original);
});

test("repositorio: la edición normal (PUT) bloquea el cambio de estado antes de actualizar", async () => {
  const { repo, registro } = bd({ activo: true });
  const base = { nombre: "N", apellido: "A", numeroDocumento: "1", email: null, telefono: null };
  await assert.rejects(repo.guardarPerfil("medicos", 5, { ...base, activo: false }, "admin1"), { statusCode: 400 });
  assert.equal(sqls(registro).some(x => x.startsWith("UPDATE medicos")), false);
  await repo.guardarPerfil("medicos", 5, { ...base, activo: true }, "admin1");
  assert.ok(sqls(registro).some(x => x.startsWith("UPDATE medicos SET")));
});

// ---------- consultas de citas ----------

test("citas: la consulta de pendientes usa estados, ventana America/Bogota y parámetros; bloquea solo si se pide", async () => {
  const consultas = [];
  const ejecutor = { query: async (sql, params) => { consultas.push([sql.replace(/\s+/g, " "), params]); return { rows: [] }; } };
  const citas = new CitaRepository(ejecutor);
  await citas.listarPendientesDePerfil(ejecutor, "medicos", 9);
  await citas.listarPendientesDePerfil(ejecutor, "pacientes", 9, { bloquear: true });
  const [[sql1, p1], [sql2, p2]] = consultas;
  assert.match(sql1, /c\.medico_id = \$1/);
  assert.match(sql1, /c\.estado IN \('PROGRAMADA', 'CONFIRMADA'\)/);
  assert.match(sql1, /AT TIME ZONE 'America\/Bogota'/);
  assert.doesNotMatch(sql1, /FOR UPDATE/);
  assert.match(sql2, /c\.paciente_id = \$1/);
  assert.match(sql2, /FOR UPDATE OF c/);
  assert.deepEqual([p1, p2], [[9], [9]]);
  await assert.rejects(citas.listarPendientesDePerfil(ejecutor, "usuarios; DROP TABLE citas", 9), { statusCode: 400 });
});

test("citas: cancelar solo toca pendientes y exige que se cancelen todas las indicadas", async () => {
  const llamadas = [];
  const ejecutor = { query: async (sql, params) => { llamadas.push([sql.replace(/\s+/g, " "), params]); return { rows: [{ id: "1" }] }; } };
  const citas = new CitaRepository(ejecutor);
  assert.deepEqual(await citas.cancelarPendientesPorIds(ejecutor, []), []);
  assert.equal(llamadas.length, 0);
  assert.deepEqual(await citas.cancelarPendientesPorIds(ejecutor, ["1"]), ["1"]);
  assert.match(llamadas[0][0], /c\.estado IN \('PROGRAMADA', 'CONFIRMADA'\)/);
  await assert.rejects(citas.cancelarPendientesPorIds(ejecutor, ["1", "2"]), { statusCode: 409 });
});
