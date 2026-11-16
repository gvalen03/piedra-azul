const authProvider = import.meta.env.VITE_AUTH_PROVIDER || "local";
const keycloakBaseUrl = (import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8081").replace(/\/$/, "");
const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM || "piedra-azul";
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || "piedra-azul-api";
const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
const redirectUri = import.meta.env.VITE_KEYCLOAK_REDIRECT_URI || `${window.location.origin}/`;

export const isKeycloakAuthEnabled = () => authProvider === "keycloak";

const issuer = () => `${keycloakBaseUrl}/realms/${encodeURIComponent(keycloakRealm)}`;
const endpoint = name => `${issuer()}/protocol/openid-connect/${name}`;
const base64Url = bytes => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

function randomVerifier() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64Url(bytes);
}

async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function requireSecureCrypto() {
  if (!crypto?.subtle || !crypto?.getRandomValues) {
    throw new Error("El inicio de sesión seguro requiere HTTPS o localhost.");
  }
}

export async function iniciarSesionKeycloak() {
  requireSecureCrypto();
  const verifier = randomVerifier();
  const state = randomVerifier();
  const challenge = await challengeFor(verifier);
  sessionStorage.setItem("oidc_code_verifier", verifier);
  sessionStorage.setItem("oidc_state", state);

  const authorization = new URL(endpoint("auth"));
  authorization.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state
  });
  window.location.assign(authorization.toString());
}

export async function completarSesionKeycloak() {
  requireSecureCrypto();
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code && !params.has("error")) return null;

  const expectedState = sessionStorage.getItem("oidc_state");
  const receivedState = params.get("state");
  const verifier = sessionStorage.getItem("oidc_code_verifier");
  sessionStorage.removeItem("oidc_state");
  sessionStorage.removeItem("oidc_code_verifier");
  window.history.replaceState({}, document.title, window.location.pathname);

  if (params.has("error")) {
    throw new Error("Keycloak no completó la autenticación. Intenta de nuevo.");
  }
  if (!expectedState || receivedState !== expectedState || !verifier || !code) {
    throw new Error("La respuesta de autenticación no superó la validación de estado.");
  }

  const response = await fetch(endpoint("token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier
    })
  });
  const tokens = await response.json();
  if (!response.ok || !tokens.access_token) {
    throw new Error("Keycloak rechazó el código de autenticación.");
  }

  const profileResponse = await fetch(`${apiUrl}/auth/session`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok) {
    throw new Error(profile.message || profile.error || "No se pudo validar la cuenta con PiedraAzul.");
  }

  sessionStorage.setItem("oidc_refresh_token", tokens.refresh_token || "");
  sessionStorage.setItem("oidc_id_token", tokens.id_token || "");
  return { ...profile, token: tokens.access_token };
}

export async function renovarTokenKeycloak() {
  if (!isKeycloakAuthEnabled()) return null;
  const refreshToken = sessionStorage.getItem("oidc_refresh_token");
  if (!refreshToken) return null;

  const response = await fetch(endpoint("token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken
    })
  });
  const tokens = await response.json();
  if (!response.ok || !tokens.access_token) {
    sessionStorage.removeItem("oidc_refresh_token");
    sessionStorage.removeItem("oidc_id_token");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    return null;
  }
  if (tokens.refresh_token) sessionStorage.setItem("oidc_refresh_token", tokens.refresh_token);
  if (tokens.id_token) sessionStorage.setItem("oidc_id_token", tokens.id_token);
  localStorage.setItem("token", tokens.access_token);
  return tokens.access_token;
}

export function cerrarSesionKeycloak() {
  if (!isKeycloakAuthEnabled()) return;
  const logout = new URL(endpoint("logout"));
  const params = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: redirectUri
  });
  const idToken = sessionStorage.getItem("oidc_id_token");
  if (idToken) params.set("id_token_hint", idToken);
  logout.search = params;
  sessionStorage.removeItem("oidc_refresh_token");
  sessionStorage.removeItem("oidc_id_token");
  window.location.assign(logout.toString());
}
