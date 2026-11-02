import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import Fastify from "fastify";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { authRoutes } from "../src/modules/auth/web/auth.routes.js";
import { authPlugin } from "../src/modules/auth/plugins/auth.js";
import { loadAuthConfig } from "../src/shared/security/auth.config.js";
import { authorize } from "../src/shared/security/authorize.js";
import { mapearRolKeycloak, rolesInternos } from "../src/shared/security/keycloak-jwt.verifier.js";

const issuer = "http://localhost:8188/realms/piedra-azul";
const audience = "piedra-azul-api";
const subject = "kc-subject-test-123";
const user = {
  id: 21,
  keycloak_subject: subject,
  username: "admin-test",
  nombre: "Cuenta sintética",
  rol: "ADMINISTRADOR",
  activo: true,
  medico_id: null,
  paciente_id: null,
  updated_at: new Date(),
  medico_activo: null,
  paciente_estado: null
};

async function tokenFor(privateKey, {
  tokenIssuer = issuer,
  tokenAudience = audience,
  authorizedParty = audience,
  roles = ["ADMINISTRADOR"],
  expiresIn = "5m",
  notBefore,
  tokenSubject = subject
} = {}) {
  let token = new SignJWT({ azp: authorizedParty, realm_access: { roles } })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(tokenIssuer)
    .setAudience(tokenAudience)
    .setIssuedAt();
  if (tokenSubject) token = token.setSubject(tokenSubject);
  if (notBefore) token = token.setNotBefore(notBefore);
  return token.setExpirationTime(expiresIn).sign(privateKey);
}

async function startJwksServer(publicKey) {
  const jwk = await exportJWK(publicKey);
  Object.assign(jwk, { kid: "test-key", alg: "RS256", use: "sig" });
  const server = createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { server, jwksUri: `http://127.0.0.1:${port}/certs` };
}

async function createApp(config, db, t) {
  const app = Fastify({ logger: false });
  app.decorate("authProvider", "keycloak");
  app.decorate("authController", { login: async () => ({}) });
  await app.register(authPlugin, { config, db });
  await app.register(authRoutes, { prefix: "/api/auth" });
  app.get("/api/admin/probe", {
    preHandler: [app.authenticate, authorize("ADMINISTRADOR")]
  }, async () => ({ ok: true }));
  for (const role of rolesInternos) {
    app.get(`/api/role-probe/${role}`, {
      preHandler: [app.authenticate, authorize(role)]
    }, async () => ({ ok: true }));
  }
  t.after(() => app.close());
  return app;
}

test("Keycloak verifica firma, issuer, audience, tiempos y mapea el sub al usuario local", async t => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const { server, jwksUri } = await startJwksServer(publicKey);
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const config = { provider: "keycloak", issuer, audience, clientId: "piedra-azul-api", jwksUri };
  const lookups = [];
  const app = await createApp(config, {
    query: async (sql, [requestedSubject]) => {
      const selectedUser = requestedSubject === "kc-patient-subject"
        ? {
            ...user,
            id: 22,
            keycloak_subject: requestedSubject,
            username: "patient-test",
            rol: "PACIENTE",
            paciente_id: 34,
            paciente_estado: "ACTIVO"
          }
        : user;
      const params = [requestedSubject];
      lookups.push({ sql, params });
      return { rows: [selectedUser] };
    }
  }, t);

  const validToken = await tokenFor(privateKey);
  const valid = await app.inject({
    method: "GET",
    url: "/api/auth/session",
    headers: { authorization: `Bearer ${validToken}` }
  });
  assert.equal(valid.statusCode, 200, valid.body);
  assert.deepEqual(valid.json(), {
    usuarioId: 21,
    username: "admin-test",
    nombre: "Cuenta sintética",
    rol: "ADMINISTRADOR",
    pacienteId: null,
    medicoId: null
  });
  assert.match(lookups[0].sql, /u\.keycloak_subject=\$1/);
  assert.deepEqual(lookups[0].params, [subject]);
  assert.equal((await app.inject({
    method: "GET",
    url: "/api/admin/probe",
    headers: { authorization: `Bearer ${validToken}` }
  })).statusCode, 200);
  const patientToken = await tokenFor(privateKey, {
    roles: ["PACIENTE"],
    tokenSubject: "kc-patient-subject"
  });
  assert.equal((await app.inject({
    method: "GET",
    url: "/api/admin/probe",
    headers: { authorization: `Bearer ${patientToken}` }
  })).statusCode, 403);

  const noToken = await app.inject({ method: "GET", url: "/api/auth/session" });
  assert.equal(noToken.statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/api/auth/login", payload: {} })).statusCode, 404);
});

test("rechaza firma, issuer, audience, expiración y nbf inválidos con 401", async t => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const { privateKey: otherPrivateKey } = await generateKeyPair("RS256");
  const { server, jwksUri } = await startJwksServer(publicKey);
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const app = await createApp({ provider: "keycloak", issuer, audience, clientId: "piedra-azul-api", jwksUri }, { query: async () => ({ rows: [user] }) }, t);
  const invalidTokens = [
    await tokenFor(otherPrivateKey),
    await tokenFor(privateKey, { tokenIssuer: "http://localhost:8188/realms/other" }),
    await tokenFor(privateKey, { tokenAudience: "other-api" }),
    await tokenFor(privateKey, { authorizedParty: "other-client" }),
    await tokenFor(privateKey, { expiresIn: "-1s" }),
    await tokenFor(privateKey, { notBefore: "2m" }),
    await tokenFor(privateKey, { tokenSubject: null })
  ];

  for (const token of invalidTokens) {
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(response.statusCode, 401, response.body);
  }
});

test("roles se mapean solo cuando hay exactamente un rol interno", async () => {
  for (const role of rolesInternos) {
    assert.equal(mapearRolKeycloak({ realm_access: { roles: [role, "offline_access"] } }), role);
  }
  assert.equal(mapearRolKeycloak({ realm_access: { roles: ["ADMINISTRADOR", "AGENDADOR"] } }), null);
  assert.equal(mapearRolKeycloak({ realm_access: { roles: ["offline_access"] } }), null);
});

test("la matriz Keycloak permite el rol correspondiente y devuelve 403/401 en los demás casos", async t => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const { server, jwksUri } = await startJwksServer(publicKey);
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const users = new Map(rolesInternos.map((role, index) => {
    const tokenSubject = `role-subject-${index}`;
    return [tokenSubject, {
      ...user,
      id: index + 1,
      keycloak_subject: tokenSubject,
      username: `synthetic-${role.toLowerCase()}`,
      rol: role,
      medico_id: role === "MEDICO_TERAPISTA" ? 41 : null,
      paciente_id: role === "PACIENTE" ? 51 : null,
      medico_activo: role === "MEDICO_TERAPISTA" ? true : null,
      paciente_estado: role === "PACIENTE" ? "ACTIVO" : null
    }];
  }));
  const app = await createApp({
    provider: "keycloak", issuer, audience, clientId: "piedra-azul-api", jwksUri
  }, {
    query: async (_sql, [tokenSubject]) => ({ rows: users.has(tokenSubject) ? [users.get(tokenSubject)] : [] })
  }, t);
  const tokens = new Map();
  for (const [index, role] of rolesInternos.entries()) {
    tokens.set(role, await tokenFor(privateKey, {
      roles: [role],
      tokenSubject: `role-subject-${index}`
    }));
  }

  for (const routeRole of rolesInternos) {
    for (const tokenRole of rolesInternos) {
      const response = await app.inject({
        method: "GET",
        url: `/api/role-probe/${routeRole}`,
        headers: { authorization: `Bearer ${tokens.get(tokenRole)}` }
      });
      assert.equal(response.statusCode, routeRole === tokenRole ? 200 : 403, `${tokenRole} on ${routeRole} route`);
    }
  }

  const unauthenticated = await app.inject({
    method: "GET",
    url: `/api/role-probe/${rolesInternos[0]}`
  });
  assert.equal(unauthenticated.statusCode, 401);
});

test("rol de Keycloak debe coincidir con la cuenta local, y el usuario debe estar activo", async t => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const { server, jwksUri } = await startJwksServer(publicKey);
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const app = await createApp({ provider: "keycloak", issuer, audience, clientId: "piedra-azul-api", jwksUri }, {
    query: async (_sql, [requestedSubject]) => ({
      rows: requestedSubject === "inactive"
        ? [{ ...user, activo: false }]
        : requestedSubject === "not-linked"
          ? []
          : [{ ...user, rol: "PACIENTE", paciente_estado: "ACTIVO" }]
    })
  }, t);
  const mismatchedRole = await tokenFor(privateKey);
  const forbidden = await app.inject({
    method: "GET",
    url: "/api/auth/session",
    headers: { authorization: `Bearer ${mismatchedRole}` }
  });
  assert.equal(forbidden.statusCode, 403);

  const inactiveToken = await tokenFor(privateKey, { tokenSubject: "inactive" });
  const inactive = await app.inject({
    method: "GET",
    url: "/api/auth/session",
    headers: { authorization: `Bearer ${inactiveToken}` }
  });
  assert.equal(inactive.statusCode, 401);

  const unlinkedToken = await tokenFor(privateKey, { tokenSubject: "not-linked" });
  const unlinked = await app.inject({
    method: "GET",
    url: "/api/auth/session",
    headers: { authorization: `Bearer ${unlinkedToken}` }
  });
  assert.equal(unlinked.statusCode, 401);
});

test("configuración exige Keycloak en producción y claims esenciales", () => {
  assert.throws(() => loadAuthConfig({ NODE_ENV: "production", AUTH_PROVIDER: "local", JWT_SECRET: "x" }), /deshabilitado en producción/);
  assert.throws(() => loadAuthConfig({ AUTH_PROVIDER: "keycloak" }), /KEYCLOAK_ISSUER y KEYCLOAK_AUDIENCE/);
  assert.throws(() => loadAuthConfig({
    NODE_ENV: "production",
    AUTH_PROVIDER: "keycloak",
    KEYCLOAK_ISSUER: "http://example.test/realms/test",
    KEYCLOAK_AUDIENCE: "api"
  }), /HTTPS/);
});
