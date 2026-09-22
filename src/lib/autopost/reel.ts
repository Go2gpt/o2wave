import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generarImagenIA } from "@/lib/imageGen";
import { generarVideoIA, generarMusicaIA } from "@/lib/videoGen";
import { overlayReelPNG } from "@/lib/composeImage";
import { componerReel } from "@/lib/reelCompose";
import { generarTitular } from "@/lib/autopost/generator";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";
const HASHTAGS_REEL = ["#o2Wave", "#IAparaRedes", "#ContenidoEnRedes", "#GestionDeRedes", "#Reels"];
const CTA_REEL = "Pruébalo desde tu navegador — o2wave.app ✨";

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

/**
 * Reel de autopost (prototipo): genera un fotograma on-brand 9:16 con el pipeline
 * de imagen actual (Gemini/FLUX) y lo anima a un vídeo corto con image-to-video
 * (Replicate). Sube keyframe + MP4 a post-images/reels y devuelve las URLs. NO
 * publica: es para validar calidad antes de automatizar. Solo servidor.
 */

// Escena base del keyframe (vertical, cálida, on-brand: persona trabajando + tapa
// del portátil de frente). La onda del logo la dibuja el modelo por la spec.
const ESCENA_KEYFRAME = `A tidy desk in warm afternoon light, vertical composition: an open laptop with its OUTER LID facing the camera (dark matte lid, prominent in frame — we see the back of the lid, not the screen), a cup of coffee with soft rising steam, an open notebook and a small plant; a person calmly working, focused but not exhausted, natural window light, neutral-to-positive mood. Documentary photorealistic. no real brand logos, no text, no letters, no watermarks.`;

// Movimiento suave para el image-to-video (evita deformaciones bruscas).
const MOTION = `Subtle cinematic motion: slow gentle camera push-in, soft rising steam from the coffee, slight natural ambient movement, calm and smooth. Keep the scene stable and realistic. No text, no letters, no logos.`;

export async function generarReelPrueba(
  admin: SupabaseClient, cuentaId: string,
): Promise<{ video_url: string; keyframe_url: string; caption: string } | { error: string }> {
  // 1) Fotograma base on-brand (9:16).
  const img = await generarImagenIA(ESCENA_KEYFRAME, "9:16");
  if (!img) return { error: "No se pudo generar el fotograma base (Gemini/Replicate)." };
  const kfPath = `reels/${cuentaId}/${Date.now()}-keyframe.png`;
  const upKf = await admin.storage.from("post-images").upload(kfPath, img.buffer, { contentType: "image/png", upsert: false });
  if (upKf.error) return { error: `No se pudo subir el fotograma: ${upKf.error.message}` };
  const keyframe_url = admin.storage.from("post-images").getPublicUrl(kfPath).data.publicUrl;

  // 2) En paralelo (independientes): animar el fotograma limpio a vídeo, música IA
  //    y el caption. Ahorra tiempo de servidor (todo dentro del maxDuration).
  const [vid, musica, caption] = await Promise.all([
    generarVideoIA(keyframe_url, MOTION, 220000),
    generarMusicaIA(8),
    generarCaptionReel(),
  ]);
  if ("error" in vid) return { error: vid.error };

  // 3) Gancho de portada (texto en pantalla) derivado del caption.
  const hook = await generarTitular(caption);

  // 4) Componer: overlay de texto NÍTIDO + música IA sobre el vídeo (ffmpeg).
  //    Tolerante: si falla la composición o la música, sube el vídeo tal cual.
  let finalBuffer = vid.buffer;
  try {
    const overlay = await overlayReelPNG({ headline: hook, cta: "Pruébalo en o2wave.app" });
    const musicBuf = "buffer" in musica ? musica.buffer : null;
    const comp = await componerReel(vid.buffer, overlay, musicBuf);
    if ("buffer" in comp) finalBuffer = comp.buffer;
    else console.warn("reel: composición falló, se sube el vídeo sin texto/música:", comp.error);
  } catch (e) {
    console.warn("reel: fallo componiendo, se sube el vídeo en crudo:", e instanceof Error ? e.message : e);
  }

  // 5) Subir el Reel final.
  const vPath = `reels/${cuentaId}/${Date.now()}-reel.mp4`;
  const upV = await admin.storage.from("post-images").upload(vPath, finalBuffer, { contentType: "video/mp4", upsert: false });
  if (upV.error) return { error: `No se pudo subir el vídeo: ${upV.error.message}` };
  const video_url = admin.storage.from("post-images").getPublicUrl(vPath).data.publicUrl;

  return { video_url, keyframe_url, caption };
}
