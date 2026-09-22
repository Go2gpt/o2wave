import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generarImagenIA } from "@/lib/imageGen";
import { iniciarVideo, iniciarMusica, resultadoPrediccion, descargarUrl } from "@/lib/videoGen";
import { overlayReelPNG } from "@/lib/composeImage";
import { componerReel } from "@/lib/reelCompose";
import { generarTitular } from "@/lib/autopost/generator";

/**
 * Reel de autopost en dos fases (async, sin polling bloqueante):
 * - iniciarReel: genera el fotograma on-brand, arranca vídeo (image-to-video) y
 *   música en Replicate, y devuelve sus IDs + caption. Responde rápido.
 * - finalizarReel: consulta el estado; cuando el vídeo está listo, superpone el
 *   texto nítido + la música (ffmpeg) y sube el MP4 final. El cliente hace polling.
 * Solo servidor.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";
const HASHTAGS_REEL = ["#o2Wave", "#IAparaRedes", "#ContenidoEnRedes", "#GestionDeRedes", "#Reels"];
const CTA_REEL = "Pruébalo desde tu navegador — o2wave.app ✨";

const ESCENA_KEYFRAME = `A tidy desk in warm afternoon light, vertical composition: an open laptop with its OUTER LID facing the camera (dark matte lid, prominent in frame — we see the back of the lid, not the screen), a cup of coffee with soft rising steam, an open notebook and a small plant; a person calmly working, focused but not exhausted, natural window light, neutral-to-positive mood. Documentary photorealistic. no real brand logos, no text, no letters, no watermarks.`;
const MOTION = `Subtle cinematic motion: slow gentle camera push-in, soft rising steam from the coffee, slight natural ambient movement, calm and smooth. Keep the scene stable and realistic. No text, no letters, no logos.`;

/** Caption automático del Reel (cuerpo IA + CTA + hashtags). Sin copiar/pegar. */
async function generarCaptionReel(): Promise<string> {
  const cierre = `\n\n${CTA_REEL}\n\n${HASHTAGS_REEL.join(" ")}`;
  const fallback = `Crea el contenido de tus redes en un momento, sin pelearte con la página en blanco.${cierre}`;
  try {
    const prompt = `Eres el community manager de o2Wave (herramienta web que genera texto e imágenes para redes con IA, para ONGs, empresas y personas). Escribe un caption CORTO para un Reel de Instagram (máx 4-5 líneas), cercano y claro. PROHIBIDO: emojis en el cuerpo, hashtags (se añaden aparte), cifras/estadísticas inventadas, nombres de features, "descarga la app" (es web). NO cierres con CTA (se añade aparte). Devuelve SOLO el texto del cuerpo.`;
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 250, messages: [{ role: "user", content: prompt }] });
    const body = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    if (body.length > 20) return `${body}${cierre}`;
  } catch { /* usa fallback */ }
  return fallback;
}

export interface ReelJob { keyframe_url: string; video_id: string; music_id: string | null; caption: string }

/**
 * FASE 1 — arranca la generación. Fotograma on-brand (9:16) → sube → arranca vídeo
 * y música en Replicate (sin esperar). Devuelve IDs + caption para el polling.
 */
export async function iniciarReel(admin: SupabaseClient, cuentaId: string): Promise<ReelJob | { error: string }> {
  const img = await generarImagenIA(ESCENA_KEYFRAME, "9:16");
  if (!img) return { error: "No se pudo generar el fotograma base (Gemini/Replicate)." };
  // Normaliza a JPEG 720×1280 sin alfa: es el formato/tamaño que el modelo de vídeo
  // procesa de forma fiable. El PNG grande de Gemini hacía que Replicate devolviera
  // un vídeo VACÍO (probado: wan funciona con 720×1280 JPEG, no con el keyframe crudo).
  let kfBuffer: Buffer;
  try {
    kfBuffer = await sharp(img.buffer).resize(720, 1280, { fit: "cover" }).flatten({ background: "#000000" }).jpeg({ quality: 88 }).toBuffer();
  } catch { kfBuffer = img.buffer; }
  const kfPath = `reels/${cuentaId}/${Date.now()}-keyframe.jpg`;
  const upKf = await admin.storage.from("post-images").upload(kfPath, kfBuffer, { contentType: "image/jpeg", upsert: false });
  if (upKf.error) return { error: `No se pudo subir el fotograma: ${upKf.error.message}` };
  const keyframe_url = admin.storage.from("post-images").getPublicUrl(kfPath).data.publicUrl;

  const [vid, mus, caption] = await Promise.all([
    iniciarVideo(keyframe_url, MOTION),
    iniciarMusica(8),
    generarCaptionReel(),
  ]);
  if ("error" in vid) return { error: `No se pudo arrancar el vídeo: ${vid.error}` };
  return { keyframe_url, video_id: vid.id, music_id: "id" in mus ? mus.id : null, caption };
}

/**
 * FASE 2 — el cliente consulta hasta que el vídeo esté listo. Mientras se genera,
 * devuelve {estado:"generando"}. Cuando el vídeo está listo, compone (texto+música)
 * y sube el MP4 final → {estado:"listo", video_url}. Errores → {error}.
 */
export async function finalizarReel(
  admin: SupabaseClient, cuentaId: string, job: { video_id: string; music_id: string | null; caption: string },
): Promise<{ estado: "generando" } | { estado: "listo"; video_url: string; aviso?: string } | { error: string }> {
  const v = await resultadoPrediccion(job.video_id);
  if (v.status === "starting" || v.status === "processing") return { estado: "generando" };
  if (v.status !== "succeeded" || !v.url) return { error: `El vídeo falló en Replicate (${v.status})${v.error ? ": " + v.error : ""}` };

  // Vídeo listo → descarga. Guard: si Replicate devuelve un vídeo vacío, lo reporta
  // con la URL y el tamaño para diagnosticar (no seguir subiendo MP4 vacíos).
  const videoBuffer = await descargarUrl(v.url);
  if (videoBuffer.length < 10000) {
    return { error: `Replicate devolvió un vídeo vacío (${videoBuffer.length} bytes). URL: ${v.url}` };
  }

  // Música: si sigue en curso, espera un poco (acotado); si falla, se sigue sin ella.
  let musicBuf: Buffer | null = null;
  let aviso: string | undefined;
  if (job.music_id) {
    for (let i = 0; i < 10; i++) { // ~30s máx esperando la música
      const m = await resultadoPrediccion(job.music_id);
      if (m.status === "succeeded" && m.url) { try { musicBuf = await descargarUrl(m.url); } catch { /* sin música */ } break; }
      if (m.status === "failed" || m.status === "canceled") { aviso = "sin música (falló la generación)"; break; }
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (!musicBuf && !aviso) aviso = "sin música (tardó demasiado)";
  }

  // Compone texto nítido + música sobre el vídeo. Si falla, sube el vídeo en crudo.
  let finalBuffer = videoBuffer;
  try {
    const hook = await generarTitular(job.caption);
    const overlay = await overlayReelPNG({ headline: hook, cta: "Pruébalo en o2wave.app" });
    const comp = await componerReel(videoBuffer, overlay, musicBuf);
    if ("buffer" in comp) finalBuffer = comp.buffer;
    else aviso = `vídeo SIN texto/música — ${comp.error}`;
  } catch (e) {
    aviso = `vídeo SIN texto/música — ${e instanceof Error ? e.message : e}`;
  }

  const vPath = `reels/${cuentaId}/${Date.now()}-reel.mp4`;
  const upV = await admin.storage.from("post-images").upload(vPath, finalBuffer, { contentType: "video/mp4", upsert: false });
  if (upV.error) return { error: `No se pudo subir el vídeo: ${upV.error.message}` };
  const video_url = admin.storage.from("post-images").getPublicUrl(vPath).data.publicUrl;
  return { estado: "listo", video_url, aviso };
}
