import { test } from "node:test";
import assert from "node:assert/strict";
import { UsuarioFactory } from "./usuario.factory.js";
import { Usuario } from "./usuario.entity.js";

for (const rol of ["ADMINISTRADOR", "MEDICO_TERAPISTA", "AGENDADOR", "PACIENTE"]) {
  test(`crear acepta el rol ${rol} y crea un usuario activo`, () => {
    const datos = { username: "prueba", password: "hash", nombre: "Prueba", email: "prueba@example.com", rol };
    const usuario = UsuarioFactory.crear(datos);
    assert.ok(usuario instanceof Usuario);
    assert.deepEqual({ ...usuario }, { ...datos, id: null, activo: true, medicoId: null, pacienteId: null });
  });
}

for (const rol of ["INVALIDO", "paciente", "", null, undefined]) {
  test(`crear rechaza el rol inválido ${JSON.stringify(rol)}`, () => {
    assert.throws(() => UsuarioFactory.crear({ rol }), { message: `Rol no válido: ${rol}` });
  });
}

test("crear conserva la vinculación con el paciente o médico", () => {
  const paciente = UsuarioFactory.crear({ rol: "PACIENTE", pacienteId: 34 });
  const medico = UsuarioFactory.crear({ rol: "MEDICO_TERAPISTA", medicoId: 12 });
  assert.equal(paciente.pacienteId, 34);
  assert.equal(paciente.medicoId, null);
  assert.equal(medico.medicoId, 12);
  assert.equal(medico.pacienteId, null);
});
