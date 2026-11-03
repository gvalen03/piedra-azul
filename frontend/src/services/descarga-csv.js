import { apiFetch } from "./api.js";

// RF-04: descarga el CSV de la jornada de un médico en una fecha.
// El agendador envía `medicoId`; el médico lo omite (el servidor usa el suyo).
export async function descargarCsvAgenda({ medicoId, fecha }) {
  const params = new URLSearchParams({ fecha });
  if (medicoId) params.set("medicoId", medicoId);

  const response = await apiFetch(`/citas/exportar?${params}`);

  if (response.status === 401) {
    throw new Error("Tu sesión debe renovarse. Cierra sesión e ingresa nuevamente.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "No se pudo exportar la agenda.");
  }

  const blob = await response.blob();
  const nombre =
    /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ??
    `citas_${fecha}.csv`;

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
