import pg from "pg";

const { Pool } = pg;

export const db = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

db.on("error", (error) => {
  console.error("Error inesperado en PostgreSQL:", error);
});