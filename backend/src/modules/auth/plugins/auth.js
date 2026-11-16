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
    const rolLocal = config.provider === "local" ? ", u.rol" : "";
    const result = await database.query(`SELECT u.id, u.username, pe.nombre, u.activo, u.updated_at${rolLocal},
      pr.id AS profesional_id, pa.id AS paciente_id, pr.activo AS profesional_activo, pa.estado AS paciente_estado
      FROM usuarios u JOIN personas pe ON pe.id=u.persona_id
      LEFT JOIN profesionales pr ON pr.persona_id=u.persona_id LEFT JOIN pacientes pa ON pa.persona_id=u.persona_id
      WHERE ${identidad}=$1`, [payload.sub]);
    const usuario = result.rows[0];
    if (!usuario?.activo ||
        (config.provider === "local" && new Date(usuario.updated_at).getTime() !== payload.version) ||
        (rolToken === "MEDICO_TERAPISTA" && !usuario.profesional_activo) ||
        (rolToken === "PACIENTE" && usuario.paciente_estado !== "ACTIVO")) {
      return reply.code(401).send({ error: "La cuenta o sus permisos cambiaron. Inicia sesión nuevamente o contacta al administrador." });
    }
    if (config.provider === "local" && usuario.rol !== rolToken) {
      return reply.code(403).send({ error: "El rol del token no coincide con los permisos registrados para esta cuenta." });
    }
    request.user = { sub: usuario.username, username: usuario.username, usuarioId: Number(usuario.id), rol: rolToken,
      profesionalId: usuario.profesional_id == null ? null : Number(usuario.profesional_id),
      pacienteId: usuario.paciente_id == null ? null : Number(usuario.paciente_id),
      keycloakSubject: config.provider === "keycloak" ? payload.sub : null,
      nombre: usuario.nombre };
  });
});
