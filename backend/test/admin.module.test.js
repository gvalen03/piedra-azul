import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import jwt from "jsonwebtoken";
import { AdminService } from "../src/modules/admin/application/admin.service.js";
import { AdminRepository } from "../src/modules/admin/infrastructure/admin.repository.js";
import { adminRoutes } from "../src/modules/admin/web/admin.routes.js";
import { authPlugin } from "../src/modules/auth/plugins/auth.js";

const usuario = { username: "nuevo", nombre: "Nuevo", email: "nuevo@example.com", rol: "AGENDADOR", activo: true };
test("crear usuarios administrativos exige contraseña y las demás cuentas reciben activación segura", async () => {
  let recibido;
  const service = new AdminService({ repository: { guardarUsuario: async (_id, d) => { recibido = d; return { id: 1 }; } }, passwordService: { hash: async p => { assert.equal(p, "clave-segura"); return "hash"; } } });
  await assert.rejects(service.guardar("usuarios", null, { ...usuario, rol: "ADMINISTRADOR" }, "admin"), { statusCode: 400 });
  await service.guardar("usuarios", null, { ...usuario, password: "clave-segura" }, "admin");
  assert.equal(recibido.passwordHash, "hash"); assert.equal("password" in recibido, false);
  await service.guardar("usuarios", 1, usuario, "admin");
  assert.equal(recibido.passwordHash, undefined);
  await assert.rejects(service.guardar("usuarios", 1, { ...usuario, password: "á".repeat(40) }, "admin"), { statusCode: 400 });
});
test("una cuenta pendiente conserva solo hash del token y queda inactiva", async () => {
  let recibido;
  const service = new AdminService({ repository: { guardarUsuario: async (_id, d) => { recibido = d; return { id: 1 }; } }, passwordService: { hash: async () => "hash-aleatorio" } });
  await service.guardar("usuarios", null, usuario, "admin");
  assert.equal(recibido.activoCuenta, false);
  assert.match(recibido.activationToken, /^[A-Za-z0-9_-]{32,}$/);
  assert.match(recibido.activationTokenHash, /^[a-f0-9]{64}$/);
  assert.equal("password" in recibido, false);
});
test("crear un perfil genera automáticamente la cuenta activa con su rol y vínculo", async () => {
  let recibido;
  const service = new AdminService({ repository: { guardarPerfil: async (_tipo, _id, datos) => { recibido = datos; return { id: 3 }; } }, passwordService: { hash: async password => `hash:${password}` } });
  await service.guardar("medicos", null, { nombre: "Juan", apellido: "Pérez", numeroDocumento: "5678", email: "juanito@gmail.com", password: "clave-inicial", telefono: null, activo: true }, "admin");
  assert.equal(recibido.crearCuenta, true);
  assert.equal(recibido.username, "juanito-5678");
  assert.equal(recibido.activoCuenta, true);
  assert.equal(recibido.passwordHash, "hash:clave-inicial");
  await service.guardar("pacientes", null, { nombre: "Ana", apellido: "G", numeroDocumento: "99", fechaNacimiento: "1990-01-01", email: "ana@example.com", password: "clave-inicial", telefono: "300", genero: "MUJER", estado: "ACTIVO" }, "admin");
  assert.equal(recibido.username, "ana-99");
});
test("respeta el usuario elegido para la cuenta automática del perfil", async () => {
  let recibido;
  const service = new AdminService({ repository: { guardarPerfil: async (_tipo, _id, datos) => { recibido = datos; return { id: 3 }; } }, passwordService: { hash: async () => "hash-aleatorio" } });
  await service.guardar("medicos", null, { nombre: "Juan", apellido: "Pérez", numeroDocumento: "5678", email: "juanito@gmail.com", username: "dr.juan", password: "clave-inicial", telefono: null, activo: true }, "admin");
  assert.equal(recibido.username, "dr.juan");
});
test("no crea un perfil sin correo porque no puede crear una cuenta segura", async () => {
  const service = new AdminService({ repository: {}, passwordService: { hash: async () => "hash" } });
  await assert.rejects(service.guardar("medicos", null, { nombre: "Juan", apellido: "P", numeroDocumento: "1", email: null, password: "clave-inicial", telefono: null, activo: true }, "admin"), { statusCode: 400 });
});
test("activación solo envía hashes al repositorio", async () => {
  let recibido;
  const service = new AdminService({ repository: { consumirActivacion: async (...args) => { recibido = args; return { id: 8 }; } }, passwordService: { hash: async password => `hash:${password}` } });
  await service.activarCuenta("x".repeat(48), "clave-segura");
  assert.match(recibido[0], /^[a-f0-9]{64}$/);
  assert.equal(recibido[1], "hash:clave-segura");
});
function repositorio({
  propio = false,
  ultimo = false,
  vinculado = false,
  falloAuditoria = false,
  dependencias = {},
  perfilExiste = true,
  actorAdmin = true,
  falloFk = false
} = {}) {
  const llamadas = [];
  const client = { query: async (sql, params) => {
    llamadas.push([sql, params]);
    if (sql.startsWith("SELECT id, username")) return { rows: [{ id: 1, username: propio ? "admin" : "otro", rol: "ADMINISTRADOR", activo: true }] };
    if (sql.includes("rol='ADMINISTRADOR' AND activo=TRUE AND id<>")) return { rows: ultimo ? [] : [{ id: 2 }] };
    if (sql.startsWith("SELECT id FROM usuarios WHERE medico_id=")) return { rows: vinculado ? [{ id: 8 }] : [] };
    if (sql.startsWith("SELECT id FROM usuarios WHERE username=")) return { rows: actorAdmin ? [{ id: 1 }] : [] };
    if (sql.includes("FOR UPDATE")) return { rows: perfilExiste ? [{ id: 3, activo: true }] : [] };
    if (/^\s*SELECT\s+EXISTS/.test(sql)) {
      const campos = [...sql.matchAll(/AS (tiene_\w+)/g)].map(([, campo]) => campo);
      return { rows: [Object.fromEntries(campos.map(campo => [campo, Boolean(dependencias[campo])]))] };
    }
    if (sql.startsWith("DELETE FROM")) {
      if (falloFk) throw Object.assign(new Error("foreign key violation"), { code: "23503" });
      return { rows: [{ id: 3 }] };
    }
    if (sql.startsWith("INSERT INTO auditorias") && falloAuditoria) throw new Error("Auditoría no disponible");
    return { rows: [{ id: 1 }] };
  }, release: () => llamadas.push(["release"]) };
  return { repo: new AdminRepository({ connect: async () => client }), llamadas };
}
test("no permite editar la cuenta administradora propia", async () => {
  const { repo, llamadas } = repositorio({ propio: true });
  await assert.rejects(repo.guardarUsuario(1, usuario, "admin"), /propia cuenta/);
  assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["ROLLBACK", "release"]);
});
test("no permite eliminar el último administrador activo", async () => {
  const { repo } = repositorio({ ultimo: true });
  await assert.rejects(repo.guardarUsuario(1, usuario, "admin"), { statusCode: 409 });
});
test("rechaza perfiles faltantes y vinculados a otras cuentas", async () => {
  const { repo } = repositorio({ vinculado: true });
  await assert.rejects(repo.guardarUsuario(null, { ...usuario, rol: "MEDICO_TERAPISTA" }, "admin"), /Selecciona el perfil/);
  await assert.rejects(repo.guardarUsuario(null, { ...usuario, rol: "MEDICO_TERAPISTA", medicoId: 3 }, "admin"), { statusCode: 409 });
});
test("guarda usuario y auditoría juntos sin exponer contraseña", async () => {
  const { repo, llamadas } = repositorio();
  await repo.guardarUsuario(null, { ...usuario, passwordHash: "hash-secreto" }, "admin");
  const insert = llamadas.find(([sql]) => sql.startsWith("INSERT INTO usuarios"));
  assert.ok(!insert[0].split("RETURNING")[1].includes("password"));
  const audit = llamadas.find(([sql]) => sql.startsWith("INSERT INTO auditorias"));
  assert.equal(audit[1].includes("hash-secreto"), false);
  assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["COMMIT", "release"]);
});
test("revierte cambios si falla auditoría", async () => {
  const { repo, llamadas } = repositorio({ falloAuditoria: true });
  await assert.rejects(repo.guardarPerfil("medicos", null, { nombre: "Ana", apellido: "G", numeroDocumento: "1", activo: true }, "admin"), /Auditoría/);
  assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["ROLLBACK", "release"]);
});
for (const [tipo, campos] of [
  ["medicos", ["tiene_citas", "tiene_controles", "tiene_disponibilidades", "tiene_cuenta"]],
  ["pacientes", ["tiene_citas", "tiene_historia", "tiene_controles", "tiene_cuenta"]]
]) {
  for (const campo of campos) {
    test(`bloquea la eliminación de ${tipo} con dependencia ${campo}`, async () => {
      const { repo, llamadas } = repositorio({ dependencias: { [campo]: true } });
      await assert.rejects(repo.eliminarPerfil(tipo, 3, "admin"), {
        statusCode: 409,
        message: /Desactívalo en lugar de eliminarlo/
      });
      const consulta = llamadas.find(([sql]) => /^\s*SELECT\s+EXISTS/.test(sql))[0];
      assert.match(consulta, /FROM citas/);
      assert.doesNotMatch(consulta, /estado\s*=/i);
      assert.equal(llamadas.some(([sql]) => sql.startsWith("DELETE FROM")), false);
      assert.equal(llamadas.some(([sql]) => sql.startsWith("INSERT INTO auditorias")), false);
      assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["ROLLBACK", "release"]);
    });
  }
}
test("elimina perfiles libres y conserva auditoría mínima dentro de la transacción", async () => {
  const { repo, llamadas } = repositorio();
  assert.deepEqual(await repo.eliminarPerfil("medicos", 3, "admin"), { id: 3, tipo: "medicos", eliminado: true });
  const auditoria = llamadas.findIndex(([sql]) => sql.startsWith("INSERT INTO auditorias"));
  const eliminacion = llamadas.findIndex(([sql]) => sql.startsWith("DELETE FROM medicos"));
  assert.ok(auditoria >= 0 && auditoria < eliminacion);
  assert.deepEqual(llamadas[auditoria][1], [
    "MEDICOS_ELIMINADO",
    "Eliminación irreversible de perfil de médico",
    "3",
    "admin",
    '{"tipoEntidad":"medicos"}'
  ]);
  assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["COMMIT", "release"]);
});
test("no elimina si falla la auditoría", async () => {
  const { repo, llamadas } = repositorio({ falloAuditoria: true });
  await assert.rejects(repo.eliminarPerfil("pacientes", 3, "admin"), /Auditoría/);
  assert.equal(llamadas.some(([sql]) => sql.startsWith("DELETE FROM")), false);
  assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["ROLLBACK", "release"]);
});
test("una FK no inventariada también bloquea y revierte la eliminación", async () => {
  const { repo, llamadas } = repositorio({ falloFk: true });
  await assert.rejects(repo.eliminarPerfil("medicos", 3, "admin"), {
    statusCode: 409,
    message: /registros relacionados.*Desactívalo/
  });
  assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["ROLLBACK", "release"]);
});
test("no permite eliminar sin perfil ni con actor sin privilegios", async () => {
  const faltante = repositorio({ perfilExiste: false });
  await assert.rejects(faltante.repo.eliminarPerfil("medicos", 3, "admin"), { statusCode: 404 });
  const sinPermiso = repositorio({ actorAdmin: false });
  await assert.rejects(sinPermiso.repo.eliminarPerfil("pacientes", 3, "admin"), { statusCode: 403 });
});
test("administración requiere sesión vigente de administrador", async t => {
  const previo = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "secreto-solo-pruebas-admin";
  const fecha = "2026-09-27T10:00:00Z";
  let cuenta = { id: 1, username: "admin", rol: "ADMINISTRADOR", activo: true, updated_at: fecha };
  const app = Fastify();
  t.after(async () => { await app.close(); if (previo === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previo; });
  await app.register(authPlugin, { db: { query: async () => ({ rows: [cuenta] }) } });
  app.decorate("adminRepository", { listar: async () => [] });
  const eliminaciones = [];
  app.decorate("adminService", {
    guardar: async () => ({ id: 1 }),
    eliminarPerfil: async (...args) => { eliminaciones.push(args); return { id: 3, eliminado: true }; }
  });
  await app.register(adminRoutes, { prefix: "/admin" });
  const token = rol => ({ authorization: `Bearer ${jwt.sign({ rol, version: Date.parse(fecha) }, process.env.JWT_SECRET, { subject: "admin" })}` });
  assert.equal((await app.inject("/admin/usuarios")).statusCode, 401);
  assert.equal((await app.inject({ url: "/admin/usuarios", headers: token("ADMINISTRADOR") })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: "/admin/medicos", headers: token("ADMINISTRADOR"), payload: { nombre: " ", apellido: "G", numeroDocumento: "1", activo: true } })).statusCode, 400);
  assert.equal((await app.inject({ method: "DELETE", url: "/admin/medicos/3", headers: token("ADMINISTRADOR") })).statusCode, 200);
  assert.deepEqual(eliminaciones, [["medicos", 3, "admin"]]);
  assert.equal((await app.inject({ method: "DELETE", url: "/admin/usuarios/3", headers: token("ADMINISTRADOR") })).statusCode, 404);
  cuenta = { ...cuenta, rol: "AGENDADOR" };
  assert.equal((await app.inject({ url: "/admin/usuarios", headers: token("AGENDADOR") })).statusCode, 403);
  assert.equal((await app.inject({ method: "DELETE", url: "/admin/pacientes/3", headers: token("AGENDADOR") })).statusCode, 403);
  cuenta = { ...cuenta, rol: "ADMINISTRADOR", activo: false };
  assert.equal((await app.inject({ url: "/admin/usuarios", headers: token("ADMINISTRADOR") })).statusCode, 401);
  cuenta = { ...cuenta, activo: true, updated_at: "2026-09-27T10:01:00Z" };
  assert.equal((await app.inject({ url: "/admin/usuarios", headers: token("ADMINISTRADOR") })).statusCode, 401);
});
