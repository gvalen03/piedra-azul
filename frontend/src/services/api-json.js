import { apiFetch } from "./api.js";

export async function apiJson(
  endpoint,
  options = {}
) {
  const token =
    localStorage.getItem("token");

  const headers = {
    ...options.headers
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  if (
    options.body &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] =
      "application/json";
  }

  const response = await apiFetch(
    endpoint,
    {
      ...options,
      headers
    }
  );

  if (response.status === 401) {
    throw new Error(
      "Tu sesión debe renovarse. Cierra sesión e ingresa nuevamente."
    );
  }

  const data = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "Error al procesar la solicitud"
    );
  }

  return data;
}