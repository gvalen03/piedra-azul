import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { BOM_UTF8, escaparCampo, neutralizarFormula, serializarCsv } from "../src/shared/csv/csv.js";
import { citaRoutes } from "../src/modules/citas/web/cita.routes.js";
import { crearCitaController } from "../src/modules/citas/web/cita.controller.js";
import { CitaService } from "../src/modules/citas/application/cita.service.js";

// RF-04 — exportar citas por médico/fecha a CSV (GET /citas/exportar)

const ENCABEZADO = "Fecha,Hora inicio,Hora fin,Documento,Paciente,Estado,Motivo";

const CITAS = [
  { fecha: "2026-11-02", hora_inicio: "08:00:00", hora_fin: "08:30:00", paciente_documento: "1061", paciente_nombre: "Ana", paciente_apellido: "Muñoz", estado: "PROGRAMADA", motivo: "Control" },
  { fecha: "2026-11-02", hora_inicio: "08:30:00", hora_fin: "09:00:00", paciente_documento: "1062", paciente_nombre: "Luis", paciente_apellido: "Paz", estado: "CANCELADA", motivo: "No asistirá" },
  { fecha: "2026-11-02", hora_inicio: "09:00:00", hora_fin: "09:30:00", paciente_documento: "1063", paciente_nombre: "Eva", paciente_apellido: "Ríos", estado: "ATENDIDA", motivo: null }
];

// ---------- serializador ----------

test("serializador: BOM UTF-8, CRLF y línea final", () => {
  const csv = serializarCsv(["a", "b"], [["1", "2"]]);
  assert.equal(csv, `${BOM_UTF8}a,b\r\n1,2\r\n`);
});

test("serializador: sin filas devuelve solo encabezados", () => {
  assert.equal(serializarCsv(["a", "b"], []), `${BOM_UTF8}a,b\r\n`);
});

test("campo: null/undefined quedan vacíos y los números se conservan", () => {
  assert.equal(escaparCampo(null), "");
  assert.equal(escaparCampo(undefined), "");
  assert.equal(escaparCampo(0), "0");
  assert.equal(escaparCampo(12.5), "12.5");
});

for (const [entrada, esperado] of [
  ["Pérez, Ana", '"Pérez, Ana"'],
  ['dijo "hola"', '"dijo ""hola"""'],
  ["línea1\nlínea2", '"línea1\nlínea2"'],
  ["línea1\r\nlínea2", '"línea1\r\nlínea2"'],
  ["tilde ñ áéíóú", "tilde ñ áéíóú"],
  ["texto normal", "texto normal"]
]) {
  test(`campo: escapa ${JSON.stringify(entrada)}`, () => {
    assert.equal(escaparCampo(entrada), esperado);
  });
}

for (const peligroso of [
  "=SUMA(A1:A2)", "+57300", "-2+3", "@usuario", "=HYPERLINK(\"http://x\")",
  "\t=1+1", "\r=1+1", "  =1+1", "=cmd|' /C calc'!A0"
]) {
  test(`campo: neutraliza fórmula ${JSON.stringify(peligroso)}`, () => {
    const salida = escaparCampo(peligroso);
    const sinComillas = salida.startsWith('"') ? salida.slice(1, -1).replaceAll('""', '"') : salida;
    assert.ok(sinComillas.startsWith("'"), `debe empezar por comilla simple: ${salida}`);
    assert.equal(neutralizarFormula(peligroso), `'${peligroso}`);
  });
}

test("campo: no altera textos que contienen (pero no empiezan por) caracteres de fórmula", () => {
  for (const texto of ["a=b", "x+y", "correo@dominio", "10-12", "Dr. -"]) {
    assert.equal(escaparCampo(texto), texto);
  }
});

// ---------- servicio ----------

function servicio({ citas = CITAS, medico = { id: 3 } } = {}) {
  return new CitaService({
    citaRepository: { listarAgendaMedico: async () => citas },
    disponibilidadService: {},
    eventBus: null,
    medicoRepository: { buscarPorId: async () => medico }
  });
}

test("servicio: exporta citas vigentes (sin CANCELADA) con encabezados y columnas esperadas", async () => {
  const { contenido, nombreArchivo, cantidad } = await servicio().exportarCsv(3, "2026-11-02");
  assert.equal(nombreArchivo, "citas_medico-3_2026-11-02.csv");
  assert.equal(cantidad, 2);
  assert.equal(
    contenido,
    `${BOM_UTF8}${ENCABEZADO}\r\n` +
    "2026-11-02,08:00,08:30,1061,Ana Muñoz,PROGRAMADA,Control\r\n" +
    "2026-11-02,09:00,09:30,1063,Eva Ríos,ATENDIDA,\r\n"
  );
});

test("servicio: cero citas es válido y produce solo encabezados", async () => {
  const { contenido, cantidad } = await servicio({ citas: [] }).exportarCsv(3, "2026-11-02");
  assert.equal(cantidad, 0);
  assert.equal(contenido, `${BOM_UTF8}${ENCABEZADO}\r\n`);
});

test("servicio: solo canceladas también produce solo encabezados", async () => {
  const { cantidad } = await servicio({ citas: [CITAS[1]] }).exportarCsv(3, "2026-11-02");
  assert.equal(cantidad, 0);
});

test("servicio: neutraliza y escapa datos de paciente maliciosos", async () => {
  const citas = [{
    ...CITAS[0],
    paciente_nombre: "=HYPERLINK(\"http://malo\")",
    paciente_apellido: "O'Brien, Jr.",
    motivo: "+cmd|' /C calc'!A0\nsegunda línea"
  }];
  const { contenido } = await servicio({ citas }).exportarCsv(3, "2026-11-02");
  assert.match(contenido, /"'=HYPERLINK\(""http:\/\/malo""\) O'Brien, Jr\."/);
  assert.match(contenido, /"'\+cmd\|' \/C calc'!A0\nsegunda línea"/);
});

test("servicio: reutiliza validaciones de fecha y médico", async () => {
  await assert.rejects(servicio().exportarCsv(3, "2026-02-30"), { statusCode: 400 });
  await assert.rejects(servicio().exportarCsv(0, "2026-11-02"), { statusCode: 400 });
  await assert.rejects(servicio({ medico: null }).exportarCsv(99, "2026-11-02"), { statusCode: 404 });
});

// ---------- ruta ----------

async function appPara(t, user, opciones) {
  const app = Fastify();
  t.after(() => app.close());
  // Imita al hook real: sin usuario responde 401 (el hook real lo hace por token).
  app.decorate("authenticate", async (req, reply) => {
    if (!user) return reply.code(401).send({ error: "Token requerido" });
    req.user = user;
  });
  app.decorate("citaController", crearCitaController({ citaService: servicio(opciones) }));
  await app.register(citaRoutes);
  return app;
}

const AGENDADOR = { rol: "AGENDADOR", sub: "agendador" };
const MEDICO_3 = { rol: "MEDICO_TERAPISTA", sub: "medico3", medicoId: 3 };

test("ruta: agendador descarga el CSV con Content-Type, filename y cabeceras de seguridad", async t => {
  const app = await appPara(t, AGENDADOR);
  const response = await app.inject("/exportar?medicoId=3&fecha=2026-11-02");
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "text/csv; charset=utf-8");
  assert.equal(response.headers["content-disposition"], 'attachment; filename="citas_medico-3_2026-11-02.csv"');
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.ok(response.body.startsWith(`${BOM_UTF8}${ENCABEZADO}\r\n`));
  assert.equal(response.rawPayload.subarray(0, 3).toString("hex"), "efbbbf");
  assert.match(response.body, /Ana Muñoz/);
  assert.doesNotMatch(response.body, /Luis Paz/);
});

test("ruta: el médico exporta su propia agenda con o sin medicoId", async t => {
  const app = await appPara(t, MEDICO_3);
  for (const consulta of ["/exportar?fecha=2026-11-02", "/exportar?medicoId=3&fecha=2026-11-02"]) {
    const response = await app.inject(consulta);
    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-disposition"], /citas_medico-3_2026-11-02\.csv/);
  }
});

test("ruta: el médico no puede exportar la agenda de otro médico", async t => {
  const app = await appPara(t, MEDICO_3);
  assert.equal((await app.inject("/exportar?medicoId=4&fecha=2026-11-02")).statusCode, 403);
});

test("ruta: médico sin médico asociado en el token recibe 403", async t => {
  const app = await appPara(t, { rol: "MEDICO_TERAPISTA", medicoId: null });
  assert.equal((await app.inject("/exportar?fecha=2026-11-02")).statusCode, 403);
});

for (const user of [{ rol: "PACIENTE", pacienteId: 4 }, { rol: "ADMINISTRADOR" }]) {
  test(`ruta: rol sin acceso (${user.rol}) recibe 403`, async t => {
    const app = await appPara(t, user);
    assert.equal((await app.inject("/exportar?medicoId=3&fecha=2026-11-02")).statusCode, 403);
  });
}

test("ruta: sin sesión 401, incluso con parámetros inválidos (autentica antes de validar)", async t => {
  const app = await appPara(t, undefined);
  assert.equal((await app.inject("/exportar?medicoId=3&fecha=2026-11-02")).statusCode, 401);
  assert.equal((await app.inject("/exportar?medicoId=abc&fecha=mala")).statusCode, 401);
});

test("ruta: un rol sin acceso recibe 403 y no 400 aunque los parámetros sean inválidos", async t => {
  const app = await appPara(t, { rol: "PACIENTE", pacienteId: 4 });
  assert.equal((await app.inject("/exportar?fecha=mala")).statusCode, 403);
});

for (const [descripcion, consulta] of [
  ["sin fecha", "/exportar?medicoId=3"],
  ["fecha inválida", "/exportar?medicoId=3&fecha=02-11-2026"],
  ["fecha inexistente", "/exportar?medicoId=3&fecha=2026-02-30"],
  ["médico no numérico", "/exportar?medicoId=abc&fecha=2026-11-02"],
  ["intento de inyección SQL en medicoId", "/exportar?medicoId=3%3BDROP%20TABLE%20citas&fecha=2026-11-02"],
  ["médico 0", "/exportar?medicoId=0&fecha=2026-11-02"]
]) {
  test(`ruta: ${descripcion} responde 400`, async t => {
    const app = await appPara(t, AGENDADOR);
    assert.equal((await app.inject(consulta)).statusCode, 400);
  });
}

test("ruta: el agendador debe indicar el médico (400 sin medicoId)", async t => {
  const app = await appPara(t, AGENDADOR);
  assert.equal((await app.inject("/exportar?fecha=2026-11-02")).statusCode, 400);
});

test("ruta: médico inexistente responde 404", async t => {
  const app = await appPara(t, AGENDADOR, { medico: null });
  assert.equal((await app.inject("/exportar?medicoId=99&fecha=2026-11-02")).statusCode, 404);
});

test("ruta: cero resultados responde 200 con solo encabezados", async t => {
  const app = await appPara(t, AGENDADOR, { citas: [] });
  const response = await app.inject("/exportar?medicoId=3&fecha=2026-11-02");
  assert.equal(response.statusCode, 200);
  assert.equal(response.body, `${BOM_UTF8}${ENCABEZADO}\r\n`);
});
