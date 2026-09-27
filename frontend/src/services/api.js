const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem("token");
  if (token && path !== "/auth/login") {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con el servidor. Verifica que el backend esté iniciado.",
      { cause: error }
    );
  }
}
