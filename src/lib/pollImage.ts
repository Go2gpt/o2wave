/**
 * Polls our own server-side status endpoint until the Replicate prediction
 * completes. The Replicate token stays on the server — the client only ever
 * talks to /api/generate-image/status.
 *
 * Returns the image URL on success, or null on failure/timeout.
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
      // transient error — keep polling
    }
  }
  return null;
}
