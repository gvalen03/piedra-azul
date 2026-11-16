import { createRemoteJWKSet, jwtVerify } from "jose";

export const rolesInternos = Object.freeze([
  "ADMINISTRADOR",
  "AGENDADOR",
  "MEDICO_TERAPISTA",
  "PACIENTE"
]);

export class KeycloakJwtVerifier {
  constructor({ issuer, audience, clientId, jwksUri }) {
    this.issuer = issuer;
    this.audience = audience;
    this.clientId = clientId;
    this.jwks = createRemoteJWKSet(new URL(jwksUri));
  }

  async verificar(token) {
    const { payload } = await jwtVerify(token, this.jwks, {
      algorithms: ["RS256"],
      issuer: this.issuer,
      audience: this.audience,
      requiredClaims: ["sub", "exp", "iat", "iss", "aud", "azp"]
    });
    if (payload.azp !== this.clientId) throw new Error("JWT client no autorizado");
    return payload;
  }
}

export function mapearRolKeycloak(payload) {
  const rolesRealm = payload.realm_access?.roles;
  if (!Array.isArray(rolesRealm)) return null;
  const rolesPresentes = rolesInternos.filter(rol => rolesRealm.includes(rol));
  return rolesPresentes.length === 1 ? rolesPresentes[0] : null;
}
