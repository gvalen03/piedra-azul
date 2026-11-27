import { test } from "node:test";
import assert from "node:assert/strict";

import { CitaService } from "./cita.service.js";

test(
  "consultarPorProfesionalYFecha retorna la cantidad y las citas",
  async () => {
    const citaRepository = {
      listarAgendaProfesional: async () => [
        { id: 1 },
        { id: 2 }
      ]
    };

    const service = new CitaService({
      citaRepository,
      disponibilidadService: {},
      eventBus: null
    });

    const resultado =
      await service.consultarPorProfesionalYFecha(
        1,
        "2026-09-28"
      );

    assert.equal(resultado.cantidad, 2);
    assert.equal(resultado.citas.length, 2);
  }
);

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
      profesionalId: 1,
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
          profesionalId: 1,
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
          profesionalId: 1,
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

test("cancelarPorPaciente exige justificación y delega una cancelación válida", async () => {
  const llamadas = [];
  const service = new CitaService({
    citaRepository: { cancelarPorPaciente: async (...args) => { llamadas.push(args); return { id: args[0], estado: "CANCELADA" }; } },
    disponibilidadService: {}, eventBus: null
  });
  await assert.rejects(() => service.cancelarPorPaciente(1, 2, "   "), { statusCode: 400 });
  assert.deepEqual(await service.cancelarPorPaciente(1, 2, "  Viaje imprevisto  "), { id: 1, estado: "CANCELADA" });
  assert.deepEqual(llamadas, [[1, 2, "Viaje imprevisto"]]);
});

test("cancelarPorPaciente rechaza citas que no cumplen la regla de dos días", async () => {
  const service = new CitaService({ citaRepository: { cancelarPorPaciente: async () => null }, disponibilidadService: {}, eventBus: null });
  await assert.rejects(() => service.cancelarPorPaciente(1, 2, "No podré asistir"), { statusCode: 409 });
});

test("obtenerReporteAnual valida el año y delega al repositorio", async () => {
  const llamadas = [];
  const service = new CitaService({
    citaRepository: {
      obtenerReporteAnual: async (...args) => {
        llamadas.push(args);
        return [];
      }
    },
    disponibilidadService: {},
    eventBus: null
  });

  assert.deepEqual(
    await service.obtenerReporteAnual("2026", 18),
    { anio: 2026, profesionales: [] }
  );
  assert.deepEqual(llamadas, [[2026, 18]]);

  for (const anio of [1899, 10000, "20a6", null]) {
    await assert.rejects(
      () => service.obtenerReporteAnual(anio),
      error => error.statusCode === 400
    );
  }
  assert.equal(llamadas.length, 1);
});
