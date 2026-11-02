import test from "node:test";
import assert from "node:assert/strict";

import { PacienteFactory } from "../src/modules/pacientes/domain/paciente.factory.js";
import { PacienteService } from "../src/modules/pacientes/application/paciente.service.js";

test("PacienteFactory crea la entidad desde DTO con estado activo", () => {
  const paciente = PacienteFactory.crearDesdeDTO({
    nombre: "Ana",
    apellido: "García",
    numeroDocumento: "12345678",
    fechaNacimiento: "1990-05-12",
    email: "ana@test.com",
    telefono: "3010000000",
    direccion: "Calle 4",
    eps: "Sanitas",
    genero: "MUJER"
  });

  assert.equal(paciente.nombre, "Ana");
  assert.equal(paciente.numeroDocumento, "12345678");
  assert.equal(paciente.estado, "ACTIVO");
});

test("PacienteService registra un paciente y audita la acción", async () => {
  const pacienteRepository = {
    existePorDocumento: async () => false,
    existePorEmail: async () => false,
    registrarConAuditoria: async (paciente) => ({
      ...paciente,
      id: 1
    })
  };

  const auditoriaService = {
    registrar: async () => ({ ok: true })
  };

  const service = new PacienteService({
    pacienteRepository,
    auditoriaService
  });

  const paciente = await service.registrar({
    nombre: "Ana",
    apellido: "García",
    numeroDocumento: "12345678",
    fechaNacimiento: "1990-05-12",
    email: "ana@test.com",
    telefono: "3010000000",
    direccion: "Calle 4",
    eps: "Sanitas",
    genero: "MUJER"
  }, "admin");

  assert.equal(paciente.id, 1);
  assert.equal(paciente.email, "ana@test.com");
});

test("registro autónomo crea perfil y cuenta mediante una sola operación", async () => {
  let recibido;
  const service = new PacienteService({
    pacienteRepository: {
      existePorDocumento: async () => false,
      existePorEmail: async () => false,
      registrarConCuentaPropia: async (paciente, cuenta) => { recibido = { paciente, cuenta }; return { ...paciente, id: 7 }; }
    },
    auditoriaService: {},
    passwordService: { hash: async password => `hash:${password}` }
  });
  const creado = await service.registrarAutonomo({
    nombre: "Ana", apellido: "García", numeroDocumento: "987", fechaNacimiento: "1990-05-12", email: "ana@test.com",
    telefono: "3010000000", direccion: null, eps: null, genero: "MUJER", username: "ana.g", password: "clave-segura"
  });
  assert.equal(creado.id, 7);
  assert.equal(recibido.cuenta.username, "ana.g");
  assert.equal(recibido.cuenta.passwordHash, "hash:clave-segura");
  assert.equal("password" in recibido.paciente, false);
});
