import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { db } from "../../../shared/db/database.js";

export const authPlugin = fp(async function authPlugin(fastify, options) {
  const database = options.db || db;
  fastify.decorate("authenticate", async function (request, reply) {
    let payload;
    try {
      const [tipo, token] = (request.headers.authorization || "").split(" ");
      if (tipo !== "Bearer" || !token) throw new Error();
      payload = jwt.verify(token, process.env.JWT_SECRET);
      if (!payload.sub || !Number.isFinite(payload.version)) throw new Error();
    } catch {
      return reply.code(401).send({ error: "Sesión inválida o expirada. Inicia sesión nuevamente." });
    }
    const result = await database.query(`SELECT u.id, u.username, u.rol, u.activo, u.medico_id, u.paciente_id, u.updated_at,
      m.activo AS medico_activo, p.estado AS paciente_estado
      FROM usuarios u LEFT JOIN medicos m ON m.id=u.medico_id LEFT JOIN pacientes p ON p.id=u.paciente_id
      WHERE u.username=$1`, [payload.sub]);
    const usuario = result.rows[0];
    if (!usuario?.activo || new Date(usuario.updated_at).getTime() !== payload.version || usuario.rol !== payload.rol ||
        (usuario.rol === "MEDICO_TERAPISTA" && !usuario.medico_activo) ||
        (usuario.rol === "PACIENTE" && usuario.paciente_estado !== "ACTIVO")) {
      return reply.code(401).send({ error: "La cuenta o sus permisos cambiaron. Inicia sesión nuevamente o contacta al administrador." });
    }
    request.user = { sub: usuario.username, username: usuario.username, usuarioId: Number(usuario.id), rol: usuario.rol,
      medicoId: usuario.medico_id == null ? null : Number(usuario.medico_id),
      pacienteId: usuario.paciente_id == null ? null : Number(usuario.paciente_id) };
  });
});
