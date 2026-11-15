import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";

import { BOM_UTF8, serializarCsv } from "../src/shared/csv/csv.js";
import { CitaService } from "../src/modules/citas/application/cita.service.js";
import { crearCitaController } from "../src/modules/citas/web/cita.controller.js";
import { citaRoutes } from "../src/modules/citas/web/cita.routes.js";

const ENCABEZADO = "Fecha,Hora inicio,Hora fin,Documento,Paciente,Estado,Motivo";
const citas = [
  {
    fecha: "2026-11-15",
    hora_inicio: "08:00:00",
    hora_fin: "08:30:00",
    paciente_documento: "1001",
    paciente_nombre: "Ana",
    paciente_apellido: "Pérez",
    estado: "PROGRAMADA",
    motivo: "Control"
  },
  {
    fecha: "2026-11-15",
    hora_inicio: "08:30:00",
    hora_fin: "09:00:00",
    paciente_documento: "1002",
    paciente_nombre: "Luis",
    paciente_apellido: "Ríos",
    estado: "CANCELADA",
    motivo: "No asistirá"
  }
];

function crearServicio({ agenda = citas, profesional = { id: 3 } } = {}) {
  return new CitaService({
    citaRepository: { listarAgendaProfesional: async () => agenda },
    disponibilidadService: {},
    eventBus: null,
    profesionalRepository: { buscarPorId: async () => profesional }
  });
}

test("serializa CSV con BOM, CRLF y neutraliza fórmulas", () => {
  const csv = serializarCsv(["Nombre", "Motivo"], [["Ana, Pérez", "=SUMA(A1:A2)"]]);

  assert.equal(csv, `${BOM_UTF8}Nombre,Motivo\r\n"Ana, Pérez",'=SUMA(A1:A2)\r\n`);
});

test("exporta la agenda de un profesional sin citas canceladas", async () => {
  const resultado = await crearServicio().exportarCsv(3, "2026-11-15");

  assert.equal(resultado.nombreArchivo, "citas_profesional-3_2026-11-15.csv");
  assert.equal(resultado.cantidad, 1);
  assert.equal(
    resultado.contenido,
    `${BOM_UTF8}${ENCABEZADO}\r\n2026-11-15,08:00,08:30,1001,Ana Pérez,PROGRAMADA,Control\r\n`
  );
});

test("devuelve un CSV válido con encabezados cuando la agenda está vacía", async () => {
  const resultado = await crearServicio({ agenda: [] }).exportarCsv(3, "2026-11-15");

  assert.equal(resultado.cantidad, 0);
  assert.equal(resultado.contenido, `${BOM_UTF8}${ENCABEZADO}\r\n`);
});

test("valida profesional y fecha antes de exportar", async () => {
  await assert.rejects(
    crearServicio().exportarCsv(0, "2026-11-15"),
    { statusCode: 400 }
  );
  await assert.rejects(
    crearServicio().exportarCsv(3, "2026-02-30"),
    { statusCode: 400 }
  );
  await assert.rejects(
    crearServicio({ profesional: null }).exportarCsv(9, "2026-11-15"),
    { statusCode: 404 }
  );
});

async function crearApp(t, user) {
  const app = Fastify();
  t.after(() => app.close());
  app.decorate("authenticate", async (request, reply) => {
    if (!user) return reply.code(401).send({ error: "Token requerido" });
    request.user = user;
  });
  app.decorate("citaController", crearCitaController({
    citaService: crearServicio()
  }));
  await app.register(citaRoutes);
  return app;
}

test("un agendador descarga el CSV con cabeceras seguras", async (t) => {
  const app = await crearApp(t, { rol: "AGENDADOR" });
  const response = await app.inject("/exportar?profesionalId=3&fecha=2026-11-15");

  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.headers["content-type"], "text/csv; charset=utf-8");
  assert.equal(response.headers["content-disposition"], 'attachment; filename="citas_profesional-3_2026-11-15.csv"');
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.ok(response.body.startsWith(`${BOM_UTF8}${ENCABEZADO}\r\n`));
  assert.doesNotMatch(response.body, /Luis Ríos/);
});

test("un profesional solo exporta su propia agenda", async (t) => {
  const app = await crearApp(t, { rol: "MEDICO_TERAPISTA", profesionalId: 3 });

  assert.equal((await app.inject("/exportar?fecha=2026-11-15")).statusCode, 200);
  assert.equal((await app.inject("/exportar?profesionalId=3&fecha=2026-11-15")).statusCode, 200);
  assert.equal((await app.inject("/exportar?profesionalId=4&fecha=2026-11-15")).statusCode, 403);
});

test("la exportación rechaza solicitudes no autenticadas o sin rol autorizado", async (t) => {
  const sinSesion = await crearApp(t, null);
  assert.equal((await sinSesion.inject("/exportar?profesionalId=3&fecha=2026-11-15")).statusCode, 401);

  const paciente = await crearApp(t, { rol: "PACIENTE" });
  assert.equal((await paciente.inject("/exportar?profesionalId=3&fecha=2026-11-15")).statusCode, 403);
});
