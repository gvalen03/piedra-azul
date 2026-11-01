import { test } from "node:test";
import assert from "node:assert/strict";

import { Paciente } from "./paciente.entity.js";
import { PacienteBuilder } from "./paciente.builder.js";
import { PacienteFactory } from "./paciente.factory.js";

test("Builder: arma el paciente paso a paso con interfaz fluida y estado ACTIVO por defecto", () => {
  const paciente = new PacienteBuilder("Ana", "García", "123", "3010000000", "MUJER")
    .fechaNacimiento("1990-05-12")
    .email("ana@test.com")
    .direccion("Calle 4")
    .eps("Sanitas")
    .build();

  assert.ok(paciente instanceof Paciente);
  assert.deepEqual(paciente, new Paciente({
    nombre: "Ana", apellido: "García", numeroDocumento: "123", telefono: "3010000000",
    genero: "MUJER", fechaNacimiento: "1990-05-12", email: "ana@test.com",
    direccion: "Calle 4", eps: "Sanitas", estado: "ACTIVO"
  }));
});

test("Builder: cada paso devuelve el mismo builder y los opcionales omitidos quedan en null", () => {
  const builder = new PacienteBuilder("Luis", "Paz", "456", "3020000000", "HOMBRE");
  assert.equal(builder.email("l@test.com"), builder);

  const paciente = new PacienteBuilder("Luis", "Paz", "456", "3020000000", "HOMBRE").build();
  assert.equal(paciente.email, null);
  assert.equal(paciente.direccion, null);
  assert.equal(paciente.eps, null);
  assert.equal(paciente.estado, "ACTIVO");
});

test("Builder: permite cambiar el estado", () => {
  const paciente = new PacienteBuilder("A", "B", "1", "2", "MUJER").estado("INACTIVO").build();
  assert.equal(paciente.estado, "INACTIVO");
});

test("Factory: produce exactamente la misma entidad que construirla directamente (DTO completo)", () => {
  const dto = {
    nombre: "Ana", apellido: "García", numeroDocumento: "123", fechaNacimiento: "1990-05-12",
    email: "ana@test.com", telefono: "3010000000", direccion: "Calle 4", eps: "Sanitas", genero: "MUJER"
  };
  assert.deepEqual(PacienteFactory.crearDesdeDTO(dto), new Paciente({ ...dto, estado: "ACTIVO" }));
});

test("Factory: DTO con opcionales ausentes o undefined → null, igual que antes de usar el Builder", () => {
  const dto = {
    nombre: "Luis", apellido: "Paz", numeroDocumento: "456", fechaNacimiento: "1985-01-01",
    telefono: "3020000000", genero: "HOMBRE", email: undefined
  };
  const paciente = PacienteFactory.crearDesdeDTO(dto);
  assert.deepEqual(paciente, new Paciente({
    nombre: "Luis", apellido: "Paz", numeroDocumento: "456", fechaNacimiento: "1985-01-01",
    telefono: "3020000000", genero: "HOMBRE", email: null, direccion: null, eps: null, estado: "ACTIVO"
  }));
});

test("Factory: ignora un estado enviado en el DTO (todo paciente nuevo nace ACTIVO)", () => {
  const paciente = PacienteFactory.crearDesdeDTO({
    nombre: "A", apellido: "B", numeroDocumento: "1", fechaNacimiento: "2000-01-01",
    telefono: "2", genero: "MUJER", estado: "INACTIVO"
  });
  assert.equal(paciente.estado, "ACTIVO");
});
