import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { crearAuthController } from "./auth.controller.js";

function crearReply() {
  return {
    code: mock.fn(function () { return this; }),
    send: mock.fn(function () { return this; })
  };
}

test("login responde 200 con la sesión devuelta por el servicio", async () => {
  const sesion = { token: "token", rol: "PACIENTE", nombre: "Paciente", usuarioId: 5, pacienteId: 34, medicoId: null };
  const authService = { login: mock.fn(async () => sesion) };
  const reply = crearReply();
  const resultado = await crearAuthController({ authService }).login({
    body: { username: "prueba", password: "contraseña" }
  }, reply);

  assert.equal(resultado, reply);
  assert.equal(authService.login.mock.callCount(), 1);
  assert.deepEqual(authService.login.mock.calls[0].arguments, ["prueba", "contraseña"]);
  assert.equal(reply.code.mock.callCount(), 1);
  assert.deepEqual(reply.code.mock.calls[0].arguments, [200]);
  assert.equal(reply.send.mock.callCount(), 1);
  assert.deepEqual(reply.send.mock.calls[0].arguments, [sesion]);
});

test("login responde 401 sin exponer detalles del error", async (t) => {
  t.mock.method(console, "error", () => {});
  const authService = { login: async () => { throw new Error("Detalle interno privado"); } };
  const reply = crearReply();
  const resultado = await crearAuthController({ authService }).login({
    body: { username: "prueba", password: "incorrecta" }
  }, reply);

  assert.equal(resultado, reply);
  assert.equal(reply.code.mock.callCount(), 1);
  assert.deepEqual(reply.code.mock.calls[0].arguments, [401]);
  assert.equal(reply.send.mock.callCount(), 1);
  assert.deepEqual(reply.send.mock.calls[0].arguments, [{ message: "Usuario o contraseña incorrectos" }]);
});
