import { apiFetch } from "./api.js";
export async function apiJson(path, options) {
  const response = await apiFetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(response.status === 401 ? "Tu sesión expiró. Cierra sesión e ingresa nuevamente." : data.message || data.error || "No se pudo completar la operación");
  return data;
}
