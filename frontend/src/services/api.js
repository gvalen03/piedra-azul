import { renovarTokenKeycloak } from "./keycloak.service.js";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const { _keycloakRetried = false, ...fetchOptions } = options;
  const headers = new Headers(options.headers);
  const token = localStorage.getItem("token");
  if (token && path !== "/auth/login" && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con el servidor. Verifica que el backend esté iniciado.",
      { cause: error }
    );
  }
  if (response.status !== 401 || _keycloakRetried) return response;

  let refreshedToken;
  try {
    refreshedToken = await renovarTokenKeycloak();
  } catch (error) {
    throw new Error("No se pudo renovar la sesión con Keycloak.", { cause: error });
  }
  if (!refreshedToken) return response;

  const retryHeaders = new Headers(fetchOptions.headers);
  retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
  try {
    return await fetch(`${API_URL}${path}`, { ...fetchOptions, headers: retryHeaders });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con el servidor. Verifica que el backend esté iniciado.",
      { cause: error }
    );
  }
}
