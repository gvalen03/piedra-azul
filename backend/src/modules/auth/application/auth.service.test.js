import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "./auth.service.js";

function preparar(usuario = {}) {
  const datos = usuario === null ? null : {
    id: 5, username: "prueba", password: "hash", nombre: "Usuario de prueba",
    rol: "PACIENTE", activo: true, perfilActivo: true,
    pacienteId: 34, medicoId: null, updatedAt: "2026-09-27T10:00:00Z",
    ...usuario
  };
  const usuarioRepository = { buscarPorUsername: mock.fn(async () => datos) };
  const passwordService = { comparar: mock.fn(async () => true) };
  const jwtService = { generarToken: mock.fn(() => "token-de-prueba") };
  return {
    service: new AuthService({ usuarioRepository, passwordService, jwtService }),
    usuarioRepository, passwordService, jwtService
  };
}

for (const [rol, pacienteId, medicoId] of [
  ["PACIENTE", 34, null], ["MEDICO_TERAPISTA", null, 12],
  ["ADMINISTRADOR", null, null], ["AGENDADOR", null, null]
]) {
  test(`login devuelve la sesión y genera los claims para ${rol}`, async () => {
    const { service, usuarioRepository, passwordService, jwtService } = preparar({ rol, pacienteId, medicoId });
    const resultado = await service.login("prueba", "contraseña");

    assert.deepEqual(resultado, {
      token: "token-de-prueba", rol, nombre: "Usuario de prueba", usuarioId: 5, pacienteId, medicoId
    });
    assert.equal(usuarioRepository.buscarPorUsername.mock.callCount(), 1);
    assert.deepEqual(usuarioRepository.buscarPorUsername.mock.calls[0].arguments, ["prueba"]);
    assert.equal(passwordService.comparar.mock.callCount(), 1);
    assert.deepEqual(passwordService.comparar.mock.calls[0].arguments, ["contraseña", "hash"]);
    assert.equal(jwtService.generarToken.mock.callCount(), 1);
    assert.deepEqual(jwtService.generarToken.mock.calls[0].arguments, [{
      version: Date.parse("2026-09-27T10:00:00Z"), usuarioId: 5,
      username: "prueba", rol, pacienteId, medicoId
    }]);
  });
}

for (const [caso, usuario] of [
  ["usuario inexistente", null], ["cuenta inactiva", { activo: false }],
  ["perfil inactivo", { perfilActivo: false }]
]) {
  test(`login rechaza ${caso} sin comparar contraseñas ni emitir tokens`, async () => {
    const { service, passwordService, jwtService } = preparar(usuario);
    await assert.rejects(() => service.login("prueba", "contraseña"), {
      message: "Usuario o contraseña incorrectos"
    });
    assert.equal(passwordService.comparar.mock.callCount(), 0);
    assert.equal(jwtService.generarToken.mock.callCount(), 0);
  });
}

test("login rechaza una contraseña incorrecta sin emitir un token", async () => {
  const { service, passwordService, jwtService } = preparar();
  passwordService.comparar.mock.mockImplementation(async () => false);
  await assert.rejects(() => service.login("prueba", "incorrecta"), {
    message: "Usuario o contraseña incorrectos"
  });
  assert.equal(jwtService.generarToken.mock.callCount(), 0);
});

test("login permite usuarios sin indicador de perfil activo", async () => {
  const { service } = preparar({ perfilActivo: undefined });
  assert.equal((await service.login("prueba", "contraseña")).token, "token-de-prueba");
});

for (const dependencia of ["repositorio", "contraseña", "token"]) {
  test(`login propaga errores de ${dependencia}`, async () => {
    const { service, usuarioRepository, passwordService, jwtService } = preparar();
    const error = new Error(`Fallo de ${dependencia}`);
    const funcion = {
      repositorio: usuarioRepository.buscarPorUsername,
      contraseña: passwordService.comparar,
      token: jwtService.generarToken
    }[dependencia];
    funcion.mock.mockImplementation(() => { throw error; });
    await assert.rejects(() => service.login("prueba", "contraseña"), (recibido) => recibido === error);
    if (dependencia === "repositorio") assert.equal(passwordService.comparar.mock.callCount(), 0);
    if (dependencia !== "token") assert.equal(jwtService.generarToken.mock.callCount(), 0);
  });
}
