// ADM-01 — textos y utilidades del diálogo de desactivación/reactivación.
// Son funciones puras (sin Solid ni DOM) para poder probarlas con `node --test`.

export const sustantivo = { medicos: "médico", pacientes: "paciente" };
const articulo = { medicos: "el", pacientes: "el" };

export function textoCitas(n) {
  return n === 1 ? "1 cita futura pendiente" : `${n} citas futuras pendientes`;
}

/** Mensaje de confirmación con el conteo exacto y lo que se conserva. */
export function mensajeDesactivacion({ tipo, nombre, cantidad }) {
  const quien = `${sustantivo[tipo]} ${nombre}`.trim();
  const resultado = cantidad === 0
    ? `${capitalizar(quien)} no tiene citas futuras pendientes (programadas o confirmadas), por lo que no se cancelará ninguna cita.`
    : `${capitalizar(quien)} tiene ${textoCitas(cantidad)} (programadas o confirmadas). ` +
      `Al desactivarlo se ${cantidad === 1 ? "cancelará esa cita" : `cancelarán esas ${cantidad} citas`}.`;
  return {
    titulo: `Desactivar ${sustantivo[tipo]}`,
    resultado,
    conservacion: "Las citas anteriores, las ya atendidas o canceladas y el historial clínico se conservan.",
    pregunta: "¿Deseas continuar?"
  };
}

/** Aviso cuando, al confirmar, el conteo ya no es el que vio el administrador. */
export function mensajeConteoCambiado({ anterior, actual }) {
  return `La cantidad de citas pendientes cambió mientras revisabas: antes eran ${anterior} y ahora son ${actual}. ` +
    "Revisa el nuevo valor y confirma de nuevo.";
}

export function mensajeReactivacion({ tipo, nombre }) {
  return {
    titulo: `Reactivar ${sustantivo[tipo]}`,
    resultado: `${capitalizar(`${sustantivo[tipo]} ${nombre}`.trim())} volverá a estar activo y podrá recibir nuevas reservas.`,
    conservacion: "Las citas que se cancelaron al desactivarlo no se recuperan.",
    pregunta: "¿Deseas reactivarlo?"
  };
}

export function mensajeExito({ tipo, nombre, accion, cantidad = 0 }) {
  const quien = `${capitalizar(sustantivo[tipo])} ${nombre}`.trim();
  if (accion === "reactivar") return `${quien} fue reactivado. Las citas canceladas no se restauran.`;
  return cantidad === 0
    ? `${quien} fue desactivado. No tenía citas futuras pendientes.`
    : `${quien} fue desactivado y se ${cantidad === 1 ? "canceló 1 cita futura pendiente" : `cancelaron ${cantidad} citas futuras pendientes`}.`;
}

/** Línea corta para listar una cita: "2026-11-02 · 09:00–09:30 · Confirmada". */
export function resumenCita(cita) {
  const hora = valor => String(valor ?? "").slice(0, 5);
  const estado = { PROGRAMADA: "Programada", CONFIRMADA: "Confirmada" }[cita.estado] ?? cita.estado;
  return `${String(cita.fecha).slice(0, 10)} · ${hora(cita.hora_inicio)}–${hora(cita.hora_fin)} · ${estado}`;
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
