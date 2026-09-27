import { apiFetch } from "./api.js";

export async function login(credentials) {
  const response = await apiFetch(
    "/auth/login",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(credentials)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      "No fue posible iniciar sesión"
    );
  }

  return data;
}