import { test } from "node:test";
import assert from "node:assert/strict";

import { CitaService } from "./cita.service.js";

test(
  "consultarPorMedicoYFecha retorna la cantidad y las citas",
  async () => {
    const citaRepository = {
      listarAgendaMedico: async () => [
        { id: 1 },
        { id: 2 }
      ]
    };

    const service = new CitaService({
      citaRepository,
      disponibilidadService: {},
      eventBus: null,
      medicoRepository: { buscarPorId: async () => ({ id: 1 }) }
    });

    const resultado =
      await service.consultarPorMedicoYFecha(
        1,
        "2026-09-28"
      );

    assert.equal(resultado.cantidad, 2);
    assert.equal(resultado.citas.length, 2);
  }
);

function servicioAgenda({ citas = [], medico = { id: 1 } } = {}) {
  const llamadas = [];
  const service = new CitaService({
    citaRepository: {
      listarAgendaMedico: async (...args) => {
        llamadas.push(args);
        return citas;
      }
    },
    disponibilidadService: {},
    eventBus: null,
    medicoRepository: { buscarPorId: async () => medico }
  });
  return { service, llamadas };
}

test("agenda sin citas es válida: cantidad 0 y lista vacía", async () => {
  const { service } = servicioAgenda({ citas: [] });
  const resultado = await service.consultarPorMedicoYFecha(1, "2026-09-28");
  assert.deepEqual(resultado, { cantidad: 0, citas: [] });
});

test("agenda con varias citas incluye las CANCELADA y la cantidad coincide con la lista", async () => {
  const citas = [
    { id: 1, estado: "PROGRAMADA" },
    { id: 2, estado: "CONFIRMADA" },
    { id: 3, estado: "CANCELADA" },
    { id: 4, estado: "ATENDIDA" }
  ];
  const { service } = servicioAgenda({ citas });
  const resultado = await service.consultarPorMedicoYFecha("1", "2026-09-28");
  assert.equal(resultado.cantidad, 4);
  assert.equal(resultado.cantidad, resultado.citas.length);
  assert.ok(resultado.citas.some(cita => cita.estado === "CANCELADA"));
});

test("agenda pasa el médico como número y la fecha al repositorio", async () => {
  const { service, llamadas } = servicioAgenda();
  await service.consultarPorMedicoYFecha("7", "2026-09-28");
  assert.deepEqual(llamadas, [[7, "2026-09-28"]]);
});

for (const fecha of [undefined, null, "", "28-09-2026", "2026-9-28", "2026-02-30", "2026-13-01", "abc", 20260928]) {
  test(`agenda rechaza fecha inválida (${JSON.stringify(fecha)}) sin consultar el repositorio`, async () => {
    const { service, llamadas } = servicioAgenda();
    await assert.rejects(service.consultarPorMedicoYFecha(1, fecha), { statusCode: 400 });
    assert.equal(llamadas.length, 0);
  });
}

test("agenda acepta 29 de febrero solo en año bisiesto", async () => {
  const { service } = servicioAgenda();
  await service.consultarPorMedicoYFecha(1, "2028-02-29");
  await assert.rejects(service.consultarPorMedicoYFecha(1, "2027-02-29"), { statusCode: 400 });
});

for (const medicoId of [undefined, null, "", 0, -1, "abc", 1.5]) {
  test(`agenda rechaza médico inválido (${JSON.stringify(medicoId)})`, async () => {
    const { service, llamadas } = servicioAgenda();
    await assert.rejects(service.consultarPorMedicoYFecha(medicoId, "2026-09-28"), { statusCode: 400 });
    assert.equal(llamadas.length, 0);
  });
}

test("agenda responde 404 si el médico no existe y no consulta citas", async () => {
  const { service, llamadas } = servicioAgenda({ medico: null });
  await assert.rejects(service.consultarPorMedicoYFecha(99, "2026-09-28"), { statusCode: 404 });
  assert.equal(llamadas.length, 0);
});

test(
  "agendar crea una cita usando la hora final de la franja disponible",
  async () => {
    const citaRepository = {
      existeCitaEnHorario: async () => false,

      guardar: async (cita) => ({
        ...cita,
        id: 1
      })
    };

    const disponibilidadService = {
      obtenerFranjasDisponibles: async () => [
        {
          horaInicio: "09:00",
          horaFin: "09:30"
        }
      ]
    };

    const service = new CitaService({
      citaRepository,
      disponibilidadService,
      eventBus: null
    });

    const cita = await service.agendar({
      pacienteId: 1,
      medicoId: 1,
      fecha: "2026-09-28",
      horaInicio: "09:00",
      motivo: "Consulta de prueba"
    });

    assert.equal(cita.id, 1);
    assert.equal(cita.horaInicio, "09:00");
    assert.equal(cita.horaFin, "09:30");
    assert.equal(cita.estado, "PROGRAMADA");
  }
);

test(
  "agendar rechaza un horario que no esta disponible",
  async () => {
    const disponibilidadService = {
      obtenerFranjasDisponibles: async () => []
    };

    const service = new CitaService({
      citaRepository: {},
      disponibilidadService,
      eventBus: null
    });

    await assert.rejects(
      () =>
        service.agendar({
          pacienteId: 1,
          medicoId: 1,
          fecha: "2026-09-28",
          horaInicio: "09:00",
          motivo: "Consulta"
        }),
      /no está disponible/
    );
  }
);

test(
  "agendar rechaza una cita cuando el horario ya esta ocupado",
  async () => {
    const disponibilidadService = {
      obtenerFranjasDisponibles: async () => [
        {
          horaInicio: "09:00",
          horaFin: "09:30"
        }
      ]
    };

    const citaRepository = {
      existeCitaEnHorario: async () => true
    };

    const service = new CitaService({
      citaRepository,
      disponibilidadService,
      eventBus: null
    });

    await assert.rejects(
      () =>
        service.agendar({
          pacienteId: 1,
          medicoId: 1,
          fecha: "2026-09-28",
          horaInicio: "09:00",
          motivo: "Consulta"
        }),
      /ya se encuentra reservado/
    );
  }
);

test(
  "confirmar cambia una cita programada a confirmada",
  async () => {
    const citaRepository = {
      buscarPorId: async () => ({
        id: 1,
        estado: "PROGRAMADA"
      }),

      actualizarEstado: async (id, estado) => ({
        id,
        estado
      })
    };

    const service = new CitaService({
      citaRepository,
      disponibilidadService: {},
      eventBus: null
    });

    const cita = await service.confirmar(1);

    assert.equal(cita.id, 1);
    assert.equal(cita.estado, "CONFIRMADA");
  }
);

test(
  "confirmar rechaza una cita que ya esta confirmada",
  async () => {
    const citaRepository = {
      buscarPorId: async () => ({
        id: 1,
        estado: "CONFIRMADA"
      })
    };

    const service = new CitaService({
      citaRepository,
      disponibilidadService: {},
      eventBus: null
    });

    await assert.rejects(
      () => service.confirmar(1),
      /ya se encuentra confirmada/
    );
  }
);