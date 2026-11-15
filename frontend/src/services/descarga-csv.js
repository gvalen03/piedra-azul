import { apiFetch } from "./api.js";

export async function descargarCsvAgenda({ profesionalId, fecha }) {
  const params = new URLSearchParams({ fecha });

  if (profesionalId) params.set("profesionalId", profesionalId);

  const response = await apiFetch(`/citas/exportar?${params}`);

  if (response.status === 401) {
    throw new Error("Tu sesión debe renovarse. Cierra sesión e ingresa nuevamente.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "No se pudo exportar la agenda.");
  }

  const contenido = await response.blob();
  const nombreArchivo =
    /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ??
    `citas_${fecha}.csv`;
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
