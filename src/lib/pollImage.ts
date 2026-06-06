/**
 * Hace polling al endpoint de estado hasta que la predicción de Replicate
 * termina. En ese momento el servidor descarga la imagen, estampa el titular
 * y la sube a Storage, devolviendo la URL final. El token de Replicate nunca
 * llega al cliente.
 *
 * Devuelve la URL de la imagen compuesta, o null en fallo/timeout.
 */
export async function pollForImage(
  predictionId: string,
  headline: string,
  aspectRatio: string,
  { maxAttempts = 30, intervalMs = 2000 }: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const res = await fetch("/api/generate-image/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: predictionId, headline, aspectRatio }),
      });
      const data = await res.json();
      if (data.status === "succeeded" && data.imagenUrl) return data.imagenUrl;
      if (data.status === "failed" || data.status === "canceled") return null;
    } catch {
      // error transitorio — seguimos intentando
    }
  }
  return null;
}

/** Calcula el aspect_ratio a partir de la red y el formato. */
export function aspectFor(redSocial: string, formato?: string | null): string {
  if (redSocial === "Instagram" && formato === "Story 9:16") return "9:16";
  if (redSocial === "Facebook") return "16:9";
  return "1:1";
}
