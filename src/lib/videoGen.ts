/**
 * Generación de vídeo (Reel) y música con Replicate, en modo ASÍNCRONO: se crea
 * la predicción y se consulta su estado por separado, sin polling bloqueante (así
 * la función del servidor no se queda colgada minutos y no agota el tiempo).
 * Solo servidor.
 */

// Modelo image-to-video. Se puede subir a seedance/veo cambiando esta constante.
const MODELO_VIDEO = "wan-video/wan-2.2-i2v-fast";

function token(): string | null {
  return process.env.REPLICATE_API_TOKEN || null;
}

/** Crea una predicción por endpoint de modelo (versión por defecto). Devuelve el id. */
async function crearPorModelo(modelPath: string, input: Record<string, unknown>): Promise<{ id: string } | { error: string }> {
  const t = token();
  if (!t) return { error: "Falta REPLICATE_API_TOKEN." };
  try {
    const r = await fetch(`https://api.replicate.com/v1/models/${modelPath}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    if (!r.ok) return { error: `Replicate create ${r.status}: ${(await r.text()).slice(0, 200)}` };
    return { id: (await r.json()).id as string };
  } catch (e) { return { error: e instanceof Error ? e.message : "error" }; }
}

/** Arranca la generación del vídeo (image-to-video). Devuelve el id de predicción. */
export async function iniciarVideo(imageUrl: string, prompt: string): Promise<{ id: string } | { error: string }> {
  return crearPorModelo(MODELO_VIDEO, { image: imageUrl, prompt, resolution: "720p", num_frames: 81 });
}

/** Arranca la generación de música (meta/musicgen: busca versión + crea predicción). */
export async function iniciarMusica(segundos = 8): Promise<{ id: string } | { error: string }> {
  const t = token();
  if (!t) return { error: "Falta REPLICATE_API_TOKEN." };
  try {
    const m = await fetch("https://api.replicate.com/v1/models/meta/musicgen", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
    if (!m.ok) return { error: `Replicate music model ${m.status}` };
    const version = (await m.json())?.latest_version?.id as string | undefined;
    if (!version) return { error: "MusicGen: sin versión." };
    const r = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        version,
        input: {
          prompt: "calm uplifting modern corporate background music, gentle piano and soft light beat, hopeful and clean, instrumental",
          duration: segundos, output_format: "mp3",
        },
      }),
    });
    if (!r.ok) return { error: `Replicate music create ${r.status}` };
    return { id: (await r.json()).id as string };
  } catch (e) { return { error: e instanceof Error ? e.message : "error música" }; }
}

/** Consulta el estado de una predicción. status: starting|processing|succeeded|failed|canceled. */
export async function resultadoPrediccion(id: string): Promise<{ status: string; url?: string; error?: string }> {
  const t = token();
  if (!t) return { status: "failed", error: "Falta REPLICATE_API_TOKEN." };
  try {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
    if (!r.ok) return { status: "processing" }; // reintenta en la siguiente consulta
    const d = await r.json();
    if (d.status === "succeeded") {
      const o = d.output;
      const url = typeof o === "string" ? o : Array.isArray(o) ? o[0] : o?.video ?? o?.audio ?? null;
      return { status: "succeeded", url: url || undefined };
    }
    if (d.status === "failed" || d.status === "canceled") return { status: d.status, error: (d.error ?? "").toString().slice(0, 200) };
    return { status: d.status || "processing" };
  } catch { return { status: "processing" }; }
}

/** Descarga una URL a Buffer. */
export async function descargarUrl(url: string): Promise<Buffer> {
  const r = await fetch(url);
  return Buffer.from(await r.arrayBuffer());
}
