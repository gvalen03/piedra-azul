import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import {
  NotificadorCitas,
  construirNotificacion,
  EVENTO_CITA_CREADA,
  EVENTO_CITA_CONFIRMADA
} from "./cita-eventos.subscriber.js";
import { CitaService } from "./cita.service.js";

const FILA = {
  id: "7",
  paciente_id: "4",
  medico_id: "3",
  fecha: "2026-11-02",
  hora_inicio: "08:00:00",
  hora_fin: "08:30:00"
};

const loggerFalso = () => {
  const registros = { info: [], error: [] };
  return {
    registros,
    info: (...args) => registros.info.push(args),
    error: (...args) => registros.error.push(args)
  };
};

test("observador: recibe cita.creada y cita.confirmada y notifica con los datos de la cita", () => {
  const bus = new EventEmitter();
  const recibidas = [];
  new NotificadorCitas({ notificar: (n) => recibidas.push(n), logger: loggerFalso() }).registrar(bus);

  bus.emit(EVENTO_CITA_CREADA, FILA);
  bus.emit(EVENTO_CITA_CONFIRMADA, FILA);

  assert.equal(recibidas.length, 2);
  assert.deepEqual(recibidas[0], {
    evento: "cita.creada",
    citaId: "7",
    pacienteId: "4",
    medicoId: "3",
    mensaje: "Tu cita fue agendada para el 2026-11-02 de 08:00 a 08:30."
  });
  assert.equal(recibidas[1].evento, "cita.confirmada");
  assert.match(recibidas[1].mensaje, /^Tu cita fue confirmada/);
});

test("observador: una fecha tipo Date de pg se formatea como AAAA-MM-DD", () => {
  const n = construirNotificacion(EVENTO_CITA_CREADA, { ...FILA, fecha: new Date(2026, 10, 2) });
  assert.match(n.mensaje, /para el 2026-11-02 de/);
});

test("observador: acepta también la cita en camelCase", () => {
  const n = construirNotificacion(EVENTO_CITA_CREADA, {
    id: 1, pacienteId: 4, medicoId: 3, fecha: "2026-11-02", horaInicio: "09:00", horaFin: "09:30"
  });
  assert.equal(n.pacienteId, 4);
  assert.equal(n.medicoId, 3);
  assert.match(n.mensaje, /de 09:00 a 09:30/);
});

test("observador: sin canal configurado registra la notificación simulada en el log", () => {
  const bus = new EventEmitter();
  const logger = loggerFalso();
  new NotificadorCitas({ logger }).registrar(bus);
  bus.emit(EVENTO_CITA_CREADA, FILA);
  assert.equal(logger.registros.info.length, 1);
  assert.equal(logger.registros.info[0][0].notificacion.citaId, "7");
});

test("observador: si falla, no propaga la excepción al emisor y la registra", () => {
  const bus = new EventEmitter();
  const logger = loggerFalso();
  new NotificadorCitas({
    notificar: () => { throw new Error("canal caído"); },
    logger
  }).registrar(bus);

  assert.doesNotThrow(() => bus.emit(EVENTO_CITA_CREADA, FILA));
  assert.equal(logger.registros.error.length, 1);
  assert.equal(logger.registros.error[0][0].evento, "cita.creada");
});

test("observador: tolera un evento sin datos", () => {
  const bus = new EventEmitter();
  const recibidas = [];
  new NotificadorCitas({ notificar: (n) => recibidas.push(n), logger: loggerFalso() }).registrar(bus);
  assert.doesNotThrow(() => bus.emit(EVENTO_CITA_CREADA, undefined));
  assert.equal(recibidas[0].citaId, null);
});

test("observador: cancelar la suscripción detiene las notificaciones", () => {
  const bus = new EventEmitter();
  const recibidas = [];
  const cancelar = new NotificadorCitas({ notificar: (n) => recibidas.push(n), logger: loggerFalso() }).registrar(bus);

  bus.emit(EVENTO_CITA_CREADA, FILA);
  cancelar();
  bus.emit(EVENTO_CITA_CREADA, FILA);

  assert.equal(recibidas.length, 1);
  assert.equal(bus.listenerCount(EVENTO_CITA_CREADA), 0);
  assert.equal(bus.listenerCount(EVENTO_CITA_CONFIRMADA), 0);
});

test("integración: CitaService (sujeto) publica y el observador recibe la cita, sin acoplarse entre sí", async () => {
  const bus = new EventEmitter();
  const recibidas = [];
  new NotificadorCitas({ notificar: (n) => recibidas.push(n), logger: loggerFalso() }).registrar(bus);

  const service = new CitaService({
    citaRepository: {
      existeCitaEnHorario: async () => false,
      guardar: async (cita) => ({ id: "9", paciente_id: cita.pacienteId, medico_id: cita.medicoId, fecha: cita.fecha, hora_inicio: cita.horaInicio, hora_fin: cita.horaFin })
    },
    disponibilidadService: {
      obtenerFranjasDisponibles: async () => [{ horaInicio: "08:00", horaFin: "08:30" }]
    },
    eventBus: bus
  });

  await service.agendar({ pacienteId: 4, medicoId: 3, fecha: "2026-11-02", horaInicio: "08:00", motivo: "Control" });

  assert.equal(recibidas.length, 1);
  assert.equal(recibidas[0].citaId, "9");
  assert.equal(recibidas[0].evento, "cita.creada");
});

test("integración: un observador que falla no impide que la cita se agende", async () => {
  const bus = new EventEmitter();
  new NotificadorCitas({ notificar: () => { throw new Error("boom"); }, logger: loggerFalso() }).registrar(bus);

  const service = new CitaService({
    citaRepository: {
      existeCitaEnHorario: async () => false,
      guardar: async (cita) => ({ ...cita, id: "9" })
    },
    disponibilidadService: {
      obtenerFranjasDisponibles: async () => [{ horaInicio: "08:00", horaFin: "08:30" }]
    },
    eventBus: bus
  });

  const cita = await service.agendar({ pacienteId: 4, medicoId: 3, fecha: "2026-11-02", horaInicio: "08:00" });
  assert.equal(cita.id, "9");
});
