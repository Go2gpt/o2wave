/**
 * Generación de vídeo corto (Reel) animando un fotograma (image-to-video) con
 * Replicate. Modelo wan-video/wan-2.2-i2v-fast: barato/rápido, 9:16 según el
 * keyframe, ~5 s. Mismo patrón que generarImagenReplicate (crear predicción +
 * polling + descarga). Devuelve el MP4 en Buffer o un error legible. Solo servidor.
 */

// Modelo por defecto. Se puede subir a "bytedance/seedance-1-lite" (calidad) o
// "google/veo-3.1" (audio nativo, más caro) cambiando solo esta constante y los inputs.
const MODELO_VIDEO = "wan-video/wan-2.2-i2v-fast";

export async function generarVideoIA(
  imageUrl: string,
  prompt: string,
  deadlineMs = 270000,
): Promise<{ buffer: Buffer; fuente: string } | { error: string }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return { error: "Falta REPLICATE_API_TOKEN." };
  try {
    // Endpoint por modelo (usa la versión por defecto, como el FLUX de imagen).
    const startRes = await fetch(`https://api.replicate.com/v1/models/${MODELO_VIDEO}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: { image: imageUrl, prompt, resolution: "720p", num_frames: 81 } }),
    });
    if (!startRes.ok) return { error: `Replicate create ${startRes.status}: ${(await startRes.text()).slice(0, 300)}` };
    const id = (await startRes.json()).id as string;

    const deadline = Date.now() + deadlineMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const st = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      if (!st.ok) continue;
      const d = await st.json();
      if (d.status === "succeeded") {
        const out = d.output;
        const url = Array.isArray(out) ? out[0] : typeof out === "string" ? out : out?.video ?? null;
        if (!url) return { error: "Replicate no devolvió URL de vídeo." };
        const vid = await fetch(url);
        return { buffer: Buffer.from(await vid.arrayBuffer()), fuente: MODELO_VIDEO };
      }
      if (d.status === "failed" || d.status === "canceled") {
        return { error: `Replicate ${d.status}: ${(d.error ?? "").toString().slice(0, 300)}` };
      }
    }
    return { error: "Tiempo agotado generando el vídeo (Replicate)." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "error de vídeo" };
  }
}
