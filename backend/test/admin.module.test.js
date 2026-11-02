import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import jwt from "jsonwebtoken";
import { AdminService } from "../src/modules/admin/application/admin.service.js";
import { AdminRepository } from "../src/modules/admin/infrastructure/admin.repository.js";
import { adminRoutes } from "../src/modules/admin/web/admin.routes.js";
import { authPlugin } from "../src/modules/auth/plugins/auth.js";

const usuario = { username: "nuevo", nombre: "Nuevo", email: "nuevo@example.com", rol: "AGENDADOR", activo: true };
test("crear usuario exige contraseña y solo entrega su hash al repositorio", async () => {
  let recibido;
  const service = new AdminService({ repository: { guardarUsuario: async (_id, d) => { recibido = d; return { id: 1 }; } }, passwordService: { hash: async p => { assert.equal(p, "clave-segura"); return "hash"; } } });
  await assert.rejects(service.guardar("usuarios", null, usuario, "admin"), { statusCode: 400 });
  await service.guardar("usuarios", null, { ...usuario, password: "clave-segura" }, "admin");
  assert.equal(recibido.passwordHash, "hash"); assert.equal("password" in recibido, false);
  await service.guardar("usuarios", 1, usuario, "admin");
  assert.equal(recibido.passwordHash, undefined);
  await assert.rejects(service.guardar("usuarios", 1, { ...usuario, password: "á".repeat(40) }, "admin"), { statusCode: 400 });
});
function repositorio({ propio = false, ultimo = false, vinculado = false, falloAuditoria = false } = {}) {
  const llamadas = [];
  const client = { query: async (sql, params) => {
    llamadas.push([sql, params]);
    if (sql.startsWith("SELECT id, username")) return { rows: [{ id: 1, username: propio ? "admin" : "otro", rol: "ADMINISTRADOR", activo: true }] };
    if (sql.includes("rol='ADMINISTRADOR' AND activo=TRUE AND id<>")) return { rows: ultimo ? [] : [{ id: 2 }] };
    if (sql.includes("FROM usuarios WHERE medico_id=")) return { rows: vinculado ? [{ id: 8 }] : [] };
    if (sql.includes("FROM medicos")) return { rows: [{ id: 3, activo: true }] };
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
test("administración requiere sesión vigente de administrador", async t => {
  const previo = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "secreto-solo-pruebas-admin";
  const fecha = "2026-09-27T10:00:00Z";
  let cuenta = { id: 1, username: "admin", rol: "ADMINISTRADOR", activo: true, updated_at: fecha };
  const app = Fastify();
  t.after(async () => { await app.close(); if (previo === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previo; });
  await app.register(authPlugin, { db: { query: async () => ({ rows: [cuenta] }) } });
  app.decorate("adminRepository", { listar: async () => [] });
  app.decorate("adminService", { guardar: async () => ({ id: 1 }) });
  await app.register(adminRoutes, { prefix: "/admin" });
  const token = rol => ({ authorization: `Bearer ${jwt.sign({ rol, version: Date.parse(fecha) }, process.env.JWT_SECRET, { subject: "admin" })}` });
  assert.equal((await app.inject("/admin/usuarios")).statusCode, 401);
  assert.equal((await app.inject({ url: "/admin/usuarios", headers: token("ADMINISTRADOR") })).statusCode, 200);
  assert.equal((await app.inject({ method: "POST", url: "/admin/medicos", headers: token("ADMINISTRADOR"), payload: { nombre: " ", apellido: "G", numeroDocumento: "1", activo: true } })).statusCode, 400);
  cuenta = { ...cuenta, rol: "AGENDADOR" };
  assert.equal((await app.inject({ url: "/admin/usuarios", headers: token("AGENDADOR") })).statusCode, 403);
  cuenta = { ...cuenta, rol: "ADMINISTRADOR", activo: false };
  assert.equal((await app.inject({ url: "/admin/usuarios", headers: token("ADMINISTRADOR") })).statusCode, 401);
  cuenta = { ...cuenta, activo: true, updated_at: "2026-09-27T10:01:00Z" };
  assert.equal((await app.inject({ url: "/admin/usuarios", headers: token("ADMINISTRADOR") })).statusCode, 401);
});
