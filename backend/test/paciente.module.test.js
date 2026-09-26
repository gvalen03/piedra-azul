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
    guardar: async (paciente) => ({
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
