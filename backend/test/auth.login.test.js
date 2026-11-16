import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { UsuarioRepository } from "../src/modules/auth/infrastructure/usuario.repository.js";
import { AuthService } from "../src/modules/auth/application/auth.service.js";
import { crearAuthController } from "../src/modules/auth/web/auth.controller.js";
import { authRoutes } from "../src/modules/auth/web/auth.routes.js";
import { JwtService } from "../src/shared/security/jwt.service.js";

for (const [rol, profesionalId, pacienteId] of [
  ["MEDICO_TERAPISTA", "12", null],
  ["PACIENTE", null, "34"],
  ["AGENDADOR", null, null]
]) {
  test(`login serializa identificadores BIGINT para ${rol}`, async (t) => {
    const usuarioRepository = new UsuarioRepository({
      query: async () => ({ rows: [{
        id: "5", username: "prueba", password: "hash-de-prueba",
        nombre: "Usuario de prueba", rol, activo: true, updated_at: "2026-09-27T10:00:00Z",
        profesional_id: profesionalId, paciente_id: pacienteId
      }] })
    });
    const jwtService = new JwtService({ secret: "secreto-solo-para-pruebas" });
    const authService = new AuthService({
      usuarioRepository, jwtService,
      passwordService: { comparar: async () => true }
    });
    const app = Fastify();
    t.after(() => app.close());
    app.decorate("authController", crearAuthController({ authService }));
    await app.register(authRoutes, { prefix: "/api/auth" });

    const response = await app.inject({
      method: "POST", url: "/api/auth/login",
      payload: { username: "prueba", password: "prueba" }
    });
    assert.equal(response.statusCode, 200, response.body);
    const body = response.json();
    assert.equal(body.usuarioId, 5);
    assert.equal(body.profesionalId, profesionalId === null ? null : Number(profesionalId));
    assert.equal(body.pacienteId, pacienteId === null ? null : Number(pacienteId));
    const claims = jwtService.validar(body.token);
    assert.equal(claims.version, Date.parse("2026-09-27T10:00:00Z"));
    assert.equal(claims.profesionalId, body.profesionalId);
    assert.equal(claims.pacienteId, body.pacienteId);
  });
}
