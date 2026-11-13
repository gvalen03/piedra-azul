export async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${(import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "")}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error && data.message ? data.message : data.error || data.message || "No se pudo completar la solicitud");
  return data;
}
