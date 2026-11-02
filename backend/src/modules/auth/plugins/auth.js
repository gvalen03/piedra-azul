import fp from "fastify-plugin";
import jwt from "jsonwebtoken";
import { db } from "../../../shared/db/database.js";
import { loadAuthConfig } from "../../../shared/security/auth.config.js";
import { KeycloakJwtVerifier, mapearRolKeycloak } from "../../../shared/security/keycloak-jwt.verifier.js";

export const authPlugin = fp(async function authPlugin(fastify, options) {
  const database = options.db || db;
  const config = options.config || loadAuthConfig();
  const keycloakVerifier = config.provider === "keycloak" ? new KeycloakJwtVerifier(config) : null;
  fastify.decorate("authenticate", async function (request, reply) {
    let payload;
    try {
      const [tipo, token] = (request.headers.authorization || "").split(" ");
      if (tipo !== "Bearer" || !token) throw new Error();
      payload = config.provider === "keycloak"
        ? await keycloakVerifier.verificar(token)
        : jwt.verify(token, config.secret, { algorithms: ["HS256"] });
      if (!payload.sub) throw new Error();
      if (config.provider === "local" && !Number.isFinite(payload.version)) throw new Error();
    } catch {
      return reply.code(401).send({ error: "Sesión inválida o expirada. Inicia sesión nuevamente." });
    }
    const rolToken = config.provider === "keycloak" ? mapearRolKeycloak(payload) : payload.rol;
    if (!rolToken) {
      return reply.code(403).send({ error: "El token no contiene exactamente un rol de aplicación autorizado." });
    }

    const identidad = config.provider === "keycloak" ? "u.keycloak_subject" : "u.username";
    const result = await database.query(`SELECT u.id, u.username, u.nombre, u.rol, u.activo, u.medico_id, u.paciente_id, u.updated_at,
      m.activo AS medico_activo, p.estado AS paciente_estado
      FROM usuarios u LEFT JOIN medicos m ON m.id=u.medico_id LEFT JOIN pacientes p ON p.id=u.paciente_id
      WHERE ${identidad}=$1`, [payload.sub]);
    const usuario = result.rows[0];
    if (!usuario?.activo ||
        (config.provider === "local" && new Date(usuario.updated_at).getTime() !== payload.version) ||
        (usuario?.rol === "MEDICO_TERAPISTA" && !usuario.medico_activo) ||
        (usuario?.rol === "PACIENTE" && usuario.paciente_estado !== "ACTIVO")) {
      return reply.code(401).send({ error: "La cuenta o sus permisos cambiaron. Inicia sesión nuevamente o contacta al administrador." });
    }
    if (usuario.rol !== rolToken) {
      return reply.code(403).send({ error: "El rol del token no coincide con los permisos registrados para esta cuenta." });
    }
    request.user = { sub: usuario.username, username: usuario.username, usuarioId: Number(usuario.id), rol: usuario.rol,
      medicoId: usuario.medico_id == null ? null : Number(usuario.medico_id),
      pacienteId: usuario.paciente_id == null ? null : Number(usuario.paciente_id),
      keycloakSubject: config.provider === "keycloak" ? payload.sub : null,
      nombre: usuario.nombre };
  });
});
