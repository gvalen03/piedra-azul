// Patrón Observer (GoF).
//
//   Sujeto (subject):   CitaService, que publica "cita.creada" y "cita.confirmada"
//                       en el eventBus (shared/event-bus.js) después de guardar.
//   Observador:         NotificadorCitas, que se suscribe a esos eventos y genera
//                       la notificación para el paciente.
//
// El sujeto no conoce a sus observadores: para añadir otro (correo, SMS,
// recordatorios) basta con suscribirlo al mismo bus, sin tocar CitaService.
//
// Aislamiento de fallos: EventEmitter ejecuta los oyentes de forma síncrona,
// dentro de emit(). Si un observador lanzara una excepción, esta subiría hasta
// CitaService y la petición fallaría con la cita ya guardada. Por eso cada
// manejador captura sus errores y los registra sin propagarlos.

export const EVENTO_CITA_CREADA = "cita.creada";
export const EVENTO_CITA_CONFIRMADA = "cita.confirmada";

const hhmm = (hora) => String(hora ?? "").slice(0, 5);

// pg entrega las columnas DATE como Date en hora local; se normaliza a AAAA-MM-DD.
function fechaISO(valor) {
  if (valor instanceof Date) {
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  return String(valor ?? "").slice(0, 10);
}

const MENSAJES = Object.freeze({
  [EVENTO_CITA_CREADA]: "Tu cita fue agendada",
  [EVENTO_CITA_CONFIRMADA]: "Tu cita fue confirmada"
});

export function construirNotificacion(evento, cita) {
  const fecha = fechaISO(cita.fecha);
  const inicio = hhmm(cita.hora_inicio ?? cita.horaInicio);
  const fin = hhmm(cita.hora_fin ?? cita.horaFin);

  return {
    evento,
    citaId: cita.id ?? null,
    pacienteId: cita.paciente_id ?? cita.pacienteId ?? null,
    medicoId: cita.medico_id ?? cita.medicoId ?? null,
    mensaje: `${MENSAJES[evento]} para el ${fecha} de ${inicio} a ${fin}.`
  };
}

export class NotificadorCitas {
  /**
   * @param {object}   opciones
   * @param {function} opciones.notificar  Recibe la notificación. Es el punto de
   *        extensión para un canal real (correo, SMS); por defecto solo la registra.
   * @param {object}   opciones.logger     Objeto con info() y error().
   */
  constructor({ notificar, logger = console } = {}) {
    this.logger = logger;
    this.notificar =
      notificar ??
      ((notificacion) =>
        this.logger.info(
          { notificacion },
          "Notificación de cita (simulada, sin canal externo)"
        ));
  }

  /** Suscribe el observador al bus. Devuelve una función para cancelar la suscripción. */
  registrar(eventBus) {
    const manejadores = [EVENTO_CITA_CREADA, EVENTO_CITA_CONFIRMADA].map(
      (evento) => [evento, (cita) => this.#manejar(evento, cita)]
    );

    for (const [evento, manejador] of manejadores) {
      eventBus.on(evento, manejador);
    }

    return () => {
      for (const [evento, manejador] of manejadores) {
        eventBus.off(evento, manejador);
      }
    };
  }

  #manejar(evento, cita) {
    try {
      this.notificar(construirNotificacion(evento, cita ?? {}));
    } catch (error) {
      this.logger.error(
        { err: error, evento },
        "Falló el observador de citas; la operación original no se ve afectada"
      );
    }
  }
}
