import type { SupabaseClient } from "@supabase/supabase-js";
import { generarImagenIA } from "@/lib/imageGen";
import { generarVideoIA } from "@/lib/videoGen";

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
): Promise<{ video_url: string; keyframe_url: string } | { error: string }> {
  // 1) Fotograma base on-brand (9:16).
  const img = await generarImagenIA(ESCENA_KEYFRAME, "9:16");
  if (!img) return { error: "No se pudo generar el fotograma base (Gemini/Replicate)." };
  const kfPath = `reels/${cuentaId}/${Date.now()}-keyframe.png`;
  const upKf = await admin.storage.from("post-images").upload(kfPath, img.buffer, { contentType: "image/png", upsert: false });
  if (upKf.error) return { error: `No se pudo subir el fotograma: ${upKf.error.message}` };
  const keyframe_url = admin.storage.from("post-images").getPublicUrl(kfPath).data.publicUrl;

  // 2) Animar el fotograma a vídeo (Replicate necesita la URL pública del keyframe).
  const vid = await generarVideoIA(keyframe_url, MOTION);
  if ("error" in vid) return { error: vid.error };
  const vPath = `reels/${cuentaId}/${Date.now()}-reel.mp4`;
  const upV = await admin.storage.from("post-images").upload(vPath, vid.buffer, { contentType: "video/mp4", upsert: false });
  if (upV.error) return { error: `No se pudo subir el vídeo: ${upV.error.message}` };
  const video_url = admin.storage.from("post-images").getPublicUrl(vPath).data.publicUrl;

  return { video_url, keyframe_url };
}
