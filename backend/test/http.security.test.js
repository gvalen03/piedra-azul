import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { loadCorsOptions, loadLoginRateLimit } from "../src/shared/security/http-security.config.js";
import { authRoutes } from "../src/modules/auth/web/auth.routes.js";

test("CORS solo permite los orígenes configurados", async t => {
  const app = Fastify();
  t.after(() => app.close());
  await app.register(cors, loadCorsOptions({ CORS_ORIGINS: "https://app.piedra-azul.test" }));
  app.get("/salud", async () => ({ ok: true }));

  const permitido = await app.inject({ url: "/salud", headers: { origin: "https://app.piedra-azul.test" } });
  const rechazado = await app.inject({ url: "/salud", headers: { origin: "https://attacker.example" } });
  assert.equal(permitido.headers["access-control-allow-origin"], "https://app.piedra-azul.test");
  assert.equal(rechazado.headers["access-control-allow-origin"], undefined);
});

test("CORS exige una lista explícita de orígenes en producción", () => {
  assert.throws(() => loadCorsOptions({ NODE_ENV: "production" }), /CORS_ORIGINS es obligatorio/);
  assert.throws(() => loadCorsOptions({ CORS_ORIGINS: "https://app.piedra-azul.test/ruta" }), /sin rutas/);
});

test("login bloquea el sexto intento desde la misma IP", async t => {
  const app = Fastify();
  t.after(() => app.close());
  app.decorate("authProvider", "local");
  app.decorate("loginRateLimit", loadLoginRateLimit({ LOGIN_RATE_LIMIT_MAX: "5", LOGIN_RATE_LIMIT_WINDOW_MS: "60000" }));
  app.decorate("authController", { login: async (_request, reply) => reply.code(401).send({ message: "Credenciales inválidas" }) });
  await app.register(rateLimit, { global: false });
  await app.register(authRoutes);

  const request = { method: "POST", url: "/login", payload: { username: "prueba", password: "incorrecta" }, remoteAddress: "203.0.113.10" };
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await app.inject(request)).statusCode, 401);
  }
  assert.equal((await app.inject(request)).statusCode, 429);
});
