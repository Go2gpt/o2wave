/**
 * Hace polling al endpoint de estado hasta que la predicción de Replicate
 * termina. El servidor sube la imagen LIMPIA (sin texto) a Storage y devuelve
 * su URL. El texto se hornea luego al descargar. El token de Replicate nunca
 * llega al cliente.
 *
 * Devuelve la URL de la imagen, o null en fallo/timeout.
 */
export async function pollForImage(
  predictionId: string,
  { maxAttempts = 30, intervalMs = 2000 }: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const res = await fetch(`/api/generate-image/status?id=${predictionId}`);
      const data = await res.json();
      if (data.status === "succeeded" && data.imagenUrl) return data.imagenUrl;
      if (data.status === "failed" || data.status === "canceled") return null;
    } catch {
      // error transitorio — seguimos intentando
    }
  }
  return null;
}

/** Calcula el aspect_ratio a partir de la red y el formato. Fuente única: aspectPorRed. */
export { aspectPorRed as aspectFor } from "@/lib/aspectPorRed";
