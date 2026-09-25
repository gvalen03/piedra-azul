import "dotenv/config";

import { buildApp } from "./app.js";
import { db } from "./shared/db/database.js";

const PORT = Number(process.env.PORT || 3000);

const app = await buildApp();

try {
  // Verificar PostgreSQL antes de arrancar
  await db.query("SELECT 1");

  app.log.info("Conexión a PostgreSQL establecida");

  await app.listen({
    port: PORT,
    host: "0.0.0.0"
  });

  console.log(
    `Servidor ejecutándose en http://localhost:${PORT}`
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

async function shutdown() {
  app.log.info("Cerrando Piedra Azul...");

  await app.close();
  await db.end();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);