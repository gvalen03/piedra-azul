import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { adminRoutes } from "../src/modules/admin/web/admin.routes.js";

const payload = { username: "ana", password: "clave-segura", nombre: "Ana", apellido: "Prueba", numeroDocumento: "123", email: "ana@example.com", rol: "AGENDADOR" };

test("solo un administrador puede aprovisionar usuarios de Keycloak", async t => {
  const app = Fastify();
  t.after(() => app.close());
  app.decorate("authProvider", "keycloak");
  app.decorate("authenticate", async (request, reply) => {
    if (!request.headers.authorization) return reply.code(401).send({});
    request.user = { rol: request.headers.authorization, sub: "admin" };
  });
  app.decorate("adminRepository", { listar: async () => [], listarCuentasAcceso: async () => [{ username: "paciente1", rol: "PACIENTE", activo: true }] });
  app.decorate("adminService", {});
  const llamadas = [];
  app.decorate("aprovisionamientoController", { aprovisionar: async request => { llamadas.push(request.body); return { id: 1 }; } });
  await app.register(adminRoutes, { prefix: "/admin" });
  const listado = await app.inject({ method: "GET", url: "/admin/usuarios", headers: { authorization: "ADMINISTRADOR" } });
  assert.deepEqual(listado.json(), [{ username: "paciente1", rol: "PACIENTE", activo: true }]);
  assert.equal((await app.inject({ method: "POST", url: "/admin/usuarios", payload })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/admin/usuarios", headers: { authorization: "AGENDADOR" }, payload })).statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url: "/admin/usuarios", headers: { authorization: "ADMINISTRADOR" }, payload })).statusCode, 200);
  assert.deepEqual(llamadas, [payload]);
});
