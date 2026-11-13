import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { AprovisionamientoService } from "./aprovisionamiento.service.js";

const base = rol => ({ username: `usuario-${rol.toLowerCase()}`, password: "clave-segura", nombre: "Ana", apellido: "Prueba", numeroDocumento: `DOC-${rol}`, email: `${rol.toLowerCase()}@example.com`, rol,
  ...(rol === "PACIENTE" ? { fechaNacimiento: "1990-01-01", telefono: "3000000000", genero: "MUJER" } : {}) });

function preparar({ creado = true, fallaFinalizar = false } = {}) {
  const repository = {
    reservar: mock.fn(async () => ({ id: 9 })), registrarCuentaKeycloak: mock.fn(async () => {}),
    finalizar: mock.fn(async (_id, datos, subject) => {
      if (fallaFinalizar) throw Object.assign(new Error("PostgreSQL no disponible"), { statusCode: 500 });
      return { id: 1, username: datos.username, rol: datos.rol, keycloakSubject: subject, activo: true };
    }), compensar: mock.fn(async () => {})
  };
  const keycloakClient = {
    crearOEncontrarUsuario: mock.fn(async () => ({ id: "kc-sub-1", creado })), activarUsuario: mock.fn(async () => {}), asignarRol: mock.fn(async () => {}), eliminarUsuarioCreado: mock.fn(async () => {})
  };
  return { service: new AprovisionamientoService({ repository, keycloakClient }), repository, keycloakClient };
}

for (const rol of ["PACIENTE", "MEDICO_TERAPISTA", "AGENDADOR", "ADMINISTRADOR"]) {
  test(`aprovisiona y vincula ${rol} con el sub real de Keycloak`, async () => {
    const { service, repository, keycloakClient } = preparar();
    const resultado = await service.aprovisionar(base(rol), "admin");
    assert.equal(resultado.keycloakSubject, "kc-sub-1");
    assert.deepEqual(keycloakClient.asignarRol.mock.calls[0].arguments, ["kc-sub-1", rol]);
    assert.deepEqual(repository.finalizar.mock.calls[0].arguments, [9, base(rol), "kc-sub-1"]);
  });
}

test("compensa únicamente la cuenta nueva si falla PostgreSQL", async () => {
  const { service, repository, keycloakClient } = preparar({ fallaFinalizar: true });
  await assert.rejects(() => service.aprovisionar(base("AGENDADOR"), "admin"), /PostgreSQL/);
  assert.equal(keycloakClient.eliminarUsuarioCreado.mock.callCount(), 1);
  assert.deepEqual(repository.compensar.mock.calls[0].arguments.slice(0, 2), [9, "COMPENSADO"]);
});

test("no elimina una cuenta de Keycloak que ya existía si falla el vínculo local", async () => {
  const { service, repository, keycloakClient } = preparar({ creado: false, fallaFinalizar: true });
  await assert.rejects(() => service.aprovisionar(base("AGENDADOR"), "admin"), /PostgreSQL/);
  assert.equal(keycloakClient.eliminarUsuarioCreado.mock.callCount(), 0);
  assert.deepEqual(repository.compensar.mock.calls[0].arguments.slice(0, 2), [9, "REQUIERE_RECUPERACION"]);
});

test("rechaza roles y contraseñas no autorizados antes de contactar Keycloak", async () => {
  const { service, keycloakClient } = preparar();
  await assert.rejects(() => service.aprovisionar({ ...base("AGENDADOR"), rol: "OTRO" }, "admin"), { statusCode: 400 });
  await assert.rejects(() => service.aprovisionar({ ...base("AGENDADOR"), password: "corta" }, "admin"), { statusCode: 400 });
  assert.equal(keycloakClient.crearOEncontrarUsuario.mock.callCount(), 0);
});

test("un duplicado local no contacta Keycloak", async () => {
  const { service, repository, keycloakClient } = preparar();
  repository.reservar.mock.mockImplementation(async () => { throw Object.assign(new Error("Usuario duplicado"), { statusCode: 409 }); });
  await assert.rejects(() => service.aprovisionar(base("AGENDADOR"), "admin"), { statusCode: 409 });
  assert.equal(keycloakClient.crearOEncontrarUsuario.mock.callCount(), 0);
});
