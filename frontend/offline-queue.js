import { abrirDB } from "./indexed-db.js";

export async function agregarOperacionPendiente(operacion) {
  const db = await abrirDB();

  const transaction = db.transaction(
    "queue",
    "readwrite"
  );

  transaction.objectStore("queue").add({
    ...operacion,
    fecha: new Date().toISOString()
  });
}