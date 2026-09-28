import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { CitaRepository } from "../src/modules/citas/infrastructure/cita.repository.js";
import { citaRoutes } from "../src/modules/citas/web/cita.routes.js";
import { PacienteRepository } from "../src/modules/pacientes/infrastructure/paciente.repository.js";
import { PacienteService } from "../src/modules/pacientes/application/paciente.service.js";

const manana = () => {
  const date = new Date(); date.setUTCDate(date.getUTCDate()+1); return date.toISOString().slice(0,10);
};
function repositorio({ ocupada = false, estado = "CONFIRMADA", futura = true } = {}) {
  const llamadas = [];
  const cita = { id: "7", medico_id: "3", paciente_id: "4", estado, futura, fecha: manana(), hora_inicio: "08:00:00", hora_fin: "09:00:00" };
  const client = {
    query: async (sql, params) => {
      llamadas.push([sql, params]);
      if (sql.startsWith("SELECT medico_id")) return { rows: [{ medico_id: "3" }] };
      if (sql.includes("AS futura")) return { rows: [cita] };
      if (sql.includes("FROM medicos") && !sql.includes("disponibilidades")) return { rows: [{ id: "3" }] };
      if (sql.includes("FROM pacientes")) return { rows: [{ id: "4" }] };
      if (sql.includes("FROM disponibilidades")) return { rows: [{ hora_inicio: "08:00", hora_fin: "10:00", intervalo_minutos: 30, semanas_habilitadas: 4 }] };
      if (sql.includes("FROM citas") && sql.includes("estado <>")) return { rows: [cita, ...(ocupada ? [{ id:"8", hora_inicio:"08:30", hora_fin:"09:00" }] : [])] };
      if (sql.startsWith("UPDATE citas")) return { rows: [{ ...cita, hora_inicio: params[2], hora_fin: params[3], estado:"PROGRAMADA" }] };
      return { rows: [] };
    }, release: () => llamadas.push(["release"])
  };
  return { repo: new CitaRepository({ connect: async () => client }), llamadas };
}
test("reprograma la misma cita, excluye su horario original y vuelve a PROGRAMADA", async () => {
  const { repo, llamadas } = repositorio();
  const result = await repo.reprogramar(7, { fecha:manana(), horaInicio:"08:30" }, "agendador");
  assert.equal(result.id, "7"); assert.equal(result.estado, "PROGRAMADA");
  const update = llamadas.find(([sql]) => sql.startsWith("UPDATE citas"));
  assert.deepEqual(update[1], [7, manana(), "08:30", "09:00"]);
  assert.equal(llamadas.some(([sql]) => sql.includes("INSERT INTO citas")), false);
  assert.ok(llamadas.findIndex(([sql]) => sql.includes("FROM medicos")) < llamadas.findIndex(([sql]) => sql.includes("AS futura")));
  assert.equal(llamadas.find(([sql]) => sql.includes("INSERT INTO auditorias"))[1][3], "agendador");
  assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["COMMIT", "release"]);
});
for (const caso of [{ ocupada:true }, { estado:"CANCELADA" }, { estado:"ATENDIDA" }, { futura:false }]) {
  test(`no altera la cita original si la reprogramación falla ${JSON.stringify(caso)}`, async () => {
    const { repo, llamadas } = repositorio(caso);
    await assert.rejects(repo.reprogramar(7, { fecha:manana(), horaInicio:"08:30" }, "agendador"), { statusCode:409 });
    assert.equal(llamadas.some(([sql]) => sql.startsWith("UPDATE citas")), false);
    assert.deepEqual(llamadas.slice(-2).map(x => x[0]), ["ROLLBACK", "release"]);
  });
}
test("cancelar y confirmar comprueban estado y horario en la actualización", async () => {
  const llamadas = [];
  const client = { query: async (sql, params) => { llamadas.push([sql,params]); return { rows: [] }; }, release: () => {} };
  const repo = new CitaRepository({ connect: async () => client });
  await assert.rejects(repo.actualizarEstado(7,"CANCELADA","agendador"), { statusCode:409 });
  const [sql, params] = llamadas.find(([sql]) => sql.startsWith("UPDATE citas"));
  assert.match(sql, /estado='PROGRAMADA'/); assert.match(sql, /hora_inicio\) > /);
  assert.deepEqual(params,[7,"CANCELADA"]);
  assert.equal(llamadas.at(-1)[0],"ROLLBACK");
});
test("solo agendador y administrador pueden cancelar, reprogramar y consultar franjas de una cita", async t => {
  const app = Fastify(); t.after(() => app.close());
  let llamadas = 0;
  app.decorate("authenticate", async (req, reply) => {
    if (!req.headers.authorization) return reply.code(401).send({});
    req.user = { rol:req.headers.authorization, sub:"prueba" };
  });
  const handler = async () => { llamadas++; return {}; };
  app.decorate("citaController", { cancelar:handler, reprogramar:handler, franjasReprogramacion:handler, confirmar:handler, consultarPorMedicoYFecha:handler, agendar:handler });
  await app.register(citaRoutes);
  for (const rol of [undefined,"PACIENTE","MEDICO_TERAPISTA","AGENDADOR","ADMINISTRADOR"]) {
    const headers = rol ? { authorization:rol } : {};
    for (const req of [
      { method:"PATCH", url:"/7/cancelar" },
      { method:"PATCH", url:"/7/reprogramar", payload:{ fecha:manana(), horaInicio:"09:00" } },
      { method:"GET", url:`/7/franjas?fecha=${manana()}` }
    ]) assert.equal((await app.inject({ ...req, headers })).statusCode, !rol ? 401 : ["AGENDADOR","ADMINISTRADOR"].includes(rol) ? 200 : 403);
  }
  assert.equal(llamadas,6);
  assert.equal((await app.inject({ method:"PATCH", url:"/7/reprogramar", headers:{authorization:"AGENDADOR"}, payload:{fecha:manana(),horaInicio:"25:00"} })).statusCode,400);
  assert.equal(llamadas,6);
});
test("registro de paciente se revierte si falla auditoría", async () => {
  const llamadas = [];
  const client = { query: async sql => {
    llamadas.push(sql);
    if (sql.includes("INSERT INTO auditorias")) throw new Error("Fallo de auditoría");
    return { rows:[{id:1}] };
  }, release: () => llamadas.push("release") };
  const repo = new PacienteRepository({ connect:async () => client });
  await assert.rejects(repo.registrarConAuditoria({},"agendador"),/auditoría/);
  assert.deepEqual(llamadas.slice(-2),["ROLLBACK","release"]);
});
test("registro rechaza fechas de nacimiento futuras", async () => {
  const service = new PacienteService({ pacienteRepository:{} });
  await assert.rejects(service.registrar({fechaNacimiento:"2999-01-01"}),{statusCode:400});
});
