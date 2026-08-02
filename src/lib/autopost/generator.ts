import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generarImagenIA } from "@/lib/imageGen";
import { proximaPublicacion } from "@/lib/autopost/schedule";

/**
 * Generación de piezas de autopost con perfil "producto" (marketing de o2Wave).
 * Fase 1a — uso interno. Cada pieza = texto + imagen IA, cross-post FB+IG.
 * Solo servidor.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";
const MAX_IG_CHARS = 2200;

// Focos rotativos para no repetir el mismo ángulo cada semana.
const FOCOS_PRODUCTO = [
  "una novedad o mejora reciente del producto (una feature nueva y para qué sirve)",
  "cómo o2Wave ahorra tiempo frente a crear contenido de redes a mano",
  "un caso de uso concreto (una ONG o pyme publicando en minutos)",
  "un consejo práctico de comunicación en redes que o2Wave resuelve",
  "la propuesta de valor de o2Wave para ONGs, pymes y particulares",
];

/** Deriva una escena visual EN (40-80 palabras) a partir del copy de una pieza. */
async function escenaDesdeTexto(texto: string): Promise<string> {
  const fallback = `Modern clean marketing scene related to social media and communication. Photorealistic, natural lighting, human and warm, no text, no letters, no logos, no watermarks.`;
  try {
    const prompt = `You are an art director. From this social post caption, write ONE vivid English VISUAL SCENE (40-80 words) for a photorealistic image model — concrete subjects, setting, objects, lighting, mood. NOT a slogan, NOT the caption. Avoid clichés like generic business charts on laptops unless truly relevant. End with "no text, no letters, no logos, no watermarks".

Caption:
${texto.slice(0, 600)}

Return ONLY the scene description, one paragraph.`;
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 300, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    return raw.split(/\s+/).length >= 15 ? raw : fallback;
  } catch { return fallback; }
}

/**
 * Regenera la imagen de una pieza (botón "Regenerar imagen"). Deriva una escena
 * nueva del copy, la genera con el mismo pipeline que C4 (generarImagenIA) y la
 * sube a post-images/autopost. Devuelve la URL pública o un error legible.
 */
export async function regenerarImagenAutopost(admin: SupabaseClient, cuentaId: string, texto: string): Promise<{ url: string } | { error: string }> {
  try {
    const escena = await escenaDesdeTexto(texto);
    const gen = await generarImagenIA(escena, "1:1");
    if (!gen) return { error: "No se pudo generar la imagen (Gemini/Replicate)." };
    const path = `autopost/${cuentaId}/${Date.now()}-regen.png`;
    const { error } = await admin.storage.from("post-images").upload(path, gen.buffer, { contentType: "image/png", upsert: false });
    if (error) return { error: `No se pudo subir la imagen: ${error.message}` };
    return { url: admin.storage.from("post-images").getPublicUrl(path).data.publicUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "error al regenerar" };
  }
}

export interface CuentaGen {
  id: string; etiqueta: string; perfil_publicacion: string;
  auto_approve: boolean; frecuencia_semanal: number;
  dias_horas: { dia: number; hora: string }[] | null;
}
export interface ResultadoGen { cuenta: string; generadas: number; programadas: number; pendientes: number; saltada: boolean }

async function piezaProducto(foco: string): Promise<{ texto: string; hashtags: string[]; img: string } | null> {
  const prompt = `Eres el community manager de o2Wave, una app que genera contenido para redes (texto + imágenes con IA) para ONGs, pymes y particulares. Escribe UN post de marketing para las redes de o2Wave (Instagram + Facebook), tono profesional y cercano, sobre: ${foco}.

Responde SOLO con JSON válido:
{
  "texto": "caption lista para publicar (máx 1800 caracteres), 1-3 emojis, SIN hashtags en el cuerpo, con una llamada a la acción (probar o2Wave en o2wave.app)",
  "hashtags": ["#..."],
  "image_prompt_en": "ENGLISH photorealistic/editorial image SCENE (40-80 words): concrete subjects, setting, objects, lighting, mood; clean modern SaaS/marketing aesthetic is fine; NO slogans; end with 'no text, no letters, no logos, no watermarks'"
}
- 6-10 hashtags relevantes (comunicación, redes sociales, IA, tercer sector, pymes).
- NO inventes cifras concretas de resultados.`;
  try {
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 900, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const o = JSON.parse(m[0]) as Record<string, unknown>;
    const texto = typeof o.texto === "string" ? o.texto.trim() : "";
    const img = typeof o.image_prompt_en === "string" && o.image_prompt_en.trim().length > 10 ? o.image_prompt_en.trim() : "";
    if (!texto || !img) return null;
    const hashtags = (Array.isArray(o.hashtags) ? o.hashtags : []).filter((h): h is string => typeof h === "string").map((h) => h.startsWith("#") ? h : `#${h}`);
    return { texto, hashtags, img };
  } catch { return null; }
}

/**
 * Genera hasta `frecuencia_semanal` piezas para la cuenta esta semana.
 * Idempotente: cuenta las ya creadas esta semana y solo completa las que falten.
 * auto_approve (solo producto) → scheduled con publish_at; si no → pending_review.
 */
export async function generarPiezasAutopost(admin: SupabaseClient, cuenta: CuentaGen, semanaInicio: string, semanaIdx: number): Promise<ResultadoGen> {
  const { count } = await admin.from("autopost_posts")
    .select("*", { count: "exact", head: true })
    .eq("cuenta_id", cuenta.id).gte("created_at", `${semanaInicio}T00:00:00Z`);
  const ya = count ?? 0;
  const objetivo = Math.max(1, Math.min(3, cuenta.frecuencia_semanal || 1));
  const faltan = objetivo - ya;
  if (faltan <= 0) return { cuenta: cuenta.etiqueta, generadas: 0, programadas: 0, pendientes: 0, saltada: true };

  const autoAprob = cuenta.auto_approve && cuenta.perfil_publicacion === "producto";
  let generadas = 0, programadas = 0, pendientes = 0;

  for (let k = 0; k < faltan; k++) {
    const foco = FOCOS_PRODUCTO[(semanaIdx + ya + k) % FOCOS_PRODUCTO.length];
    const estado = autoAprob ? "scheduled" : "pending_review";
    const publishAt = autoAprob ? proximaPublicacion(cuenta.dias_horas) : null;
    // La primera pieza de la semana lleva semana_inicio (índice único anti-duplicado).
    const semanaCol = ya === 0 && k === 0 ? semanaInicio : null;

    const r = await crearPiezaProducto(admin, cuenta.id, cuenta.perfil_publicacion, foco, { estado, publishAt, semanaInicio: semanaCol, sufijo: `${k}` });
    if (!r) continue;
    generadas++; if (autoAprob) programadas++; else pendientes++;
  }
  return { cuenta: cuenta.etiqueta, generadas, programadas, pendientes, saltada: false };
}

/**
 * Crea e inserta UNA pieza de producto (texto + imagen). Devuelve id/texto/url
 * o null si falla la generación de texto/inserción. Reutilizado por el cron C4
 * y por la generación manual.
 */
async function crearPiezaProducto(
  admin: SupabaseClient, cuentaId: string, perfil: string, foco: string,
  opts: { estado: string; publishAt: string | null; semanaInicio: string | null; sufijo?: string },
): Promise<{ id: string; texto: string; imagen_url: string | null } | null> {
  const pieza = await piezaProducto(foco);
  if (!pieza) return null;

  // Imagen IA (1:1 sirve para IG y FB). Tolerante: si falla, la pieza va sin imagen.
  let imagenUrl: string | null = null;
  try {
    const gen = await generarImagenIA(pieza.img, "1:1");
    if (gen) {
      const path = `autopost/${cuentaId}/${Date.now()}-${opts.sufijo ?? "0"}.png`;
      const { error: upErr } = await admin.storage.from("post-images").upload(path, gen.buffer, { contentType: "image/png", upsert: false });
      if (!upErr) imagenUrl = admin.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }
  } catch { /* pieza sin imagen */ }

  const texto = `${pieza.texto}\n\n${pieza.hashtags.join(" ")}`.trim().slice(0, MAX_IG_CHARS);
  const { data, error } = await admin.from("autopost_posts").insert({
    cuenta_id: cuentaId, estado: opts.estado, perfil_publicacion: perfil,
    texto, imagen_url: imagenUrl, red: "ambas", publish_at: opts.publishAt,
    semana_inicio: opts.semanaInicio,
  }).select("id").single();
  if (error) { console.error("autopost crear pieza insert:", error.message); return null; }
  return { id: data.id as string, texto, imagen_url: imagenUrl };
}

/**
 * Generación MANUAL de una pieza (botón "Generar pack ahora"): bypassa el guard
 * semanal, siempre a pending_review, semana_inicio=null (no choca con el índice
 * único). Foco variado por invocación. Solo perfil producto (Fase 1a).
 */
export async function generarPiezaManual(admin: SupabaseClient, cuentaId: string, perfil: string): Promise<{ pieza_id: string; texto: string; imagen_url: string | null } | { error: string }> {
  const foco = FOCOS_PRODUCTO[Math.floor(Math.random() * FOCOS_PRODUCTO.length)];
  const r = await crearPiezaProducto(admin, cuentaId, perfil, foco, { estado: "pending_review", publishAt: null, semanaInicio: null, sufijo: "manual" });
  if (!r) return { error: "No se pudo generar la pieza (texto o imagen)." };
  return { pieza_id: r.id, texto: r.texto, imagen_url: r.imagen_url };
}
