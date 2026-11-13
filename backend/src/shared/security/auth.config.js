const authProviders = new Set(["local", "keycloak"]);

export function loadAuthConfig(env = process.env) {
  const provider = env.AUTH_PROVIDER || (env.NODE_ENV === "production" ? "keycloak" : "local");
  if (!authProviders.has(provider)) {
    throw new Error("AUTH_PROVIDER debe ser 'local' o 'keycloak'");
  }
  if (env.NODE_ENV === "production" && provider !== "keycloak") {
    throw new Error("El modo de autenticación local está deshabilitado en producción");
  }

  if (provider === "local") {
    if (!env.JWT_SECRET) throw new Error("JWT_SECRET es obligatorio con AUTH_PROVIDER=local");
    return { provider, secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN || "8h" };
  }

  if (!env.KEYCLOAK_ISSUER || !env.KEYCLOAK_AUDIENCE) {
    throw new Error("KEYCLOAK_ISSUER y KEYCLOAK_AUDIENCE son obligatorios con AUTH_PROVIDER=keycloak");
  }
  const issuer = new URL(env.KEYCLOAK_ISSUER);
  if (issuer.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(issuer.hostname)) {
    throw new Error("KEYCLOAK_ISSUER debe usar HTTPS fuera del entorno local");
  }

  const normalizedIssuer = issuer.toString().replace(/\/$/, "");
  const jwksUri = env.KEYCLOAK_JWKS_URI || `${normalizedIssuer}/protocol/openid-connect/certs`;
  const jwksUrl = new URL(jwksUri);
  if (jwksUrl.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(jwksUrl.hostname)) {
    throw new Error("KEYCLOAK_JWKS_URI debe usar HTTPS fuera del entorno local");
  }

  return {
    provider,
    issuer: normalizedIssuer,
    audience: env.KEYCLOAK_AUDIENCE,
    clientId: env.KEYCLOAK_CLIENT_ID || env.KEYCLOAK_AUDIENCE,
    jwksUri: jwksUrl.toString(),
    provisioner: env.KEYCLOAK_PROVISIONER_CLIENT_ID && env.KEYCLOAK_PROVISIONER_CLIENT_SECRET
      ? { clientId: env.KEYCLOAK_PROVISIONER_CLIENT_ID, clientSecret: env.KEYCLOAK_PROVISIONER_CLIENT_SECRET }
      : null
  };
}
