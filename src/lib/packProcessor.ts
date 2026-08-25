import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { composeImage, bannerMarca } from "@/lib/composeImage";
import { generarImagenIA } from "@/lib/imageGen";
import { quitarHashtags } from "@/lib/formatText";
import { grupoCuenta } from "@/lib/copys-por-tipo";
import { aspectPorRed } from "@/lib/aspectPorRed";
import type { PackDia, PackFuente, GuionTikTok, ProyectoPropio, Colaboracion } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

const INSTRUCCION_TILDES = `IMPORTANTE: respeta SIEMPRE las tildes y diacríticos del nombre de la entidad y del idioma español. No escribas 'GeneracionO2', escribe 'GeneraciónO2'. No escribas 'Educacion', escribe 'Educación'. La acentuación es parte de la identidad correcta.`;

const NOMBRE_IDIOMA: Record<string, string> = { es: "español castellano", ca: "catalán", en: "inglés" };
function instruccionIdioma(idioma: string | null | undefined): string {
  const nombre = NOMBRE_IDIOMA[idioma || ""] ?? "español castellano";
  return `IMPORTANTE: el idioma del contenido (texto, hashtags, guion, titular) debe ser ESTRICTAMENTE ${nombre}. NO mezcles palabras de otros idiomas (catalán/español/inglés). Si el nombre de la entidad o un término técnico es inalterable, déjalo, pero el resto del texto y los hashtags deben ser ${nombre} puro.`;
}

// Regla de calidad de redacción. Literal en español (por defecto); variante para ca/en.
function reglaIdioma(idioma: string | null | undefined): string {
  if (idioma === "ca") return "REGLA D'IDIOMA: Escriu en català perfecte. Fes servir bé els accents. Sense faltes d'ortografia ni gramaticals. Revisa el text abans de retornar-lo.";
  if (idioma === "en") return "LANGUAGE RULE: Write in flawless English. No spelling or grammar mistakes. Proofread the text before returning it.";
  return "REGLA DE IDIOMA: Escribe en español ibérico (España) perfecto. Usa tildes correctamente. Sin faltas de ortografía ni gramaticales. Si hay dudas con palabras técnicas, usa el equivalente aceptado por la RAE. Revisa el texto antes de devolverlo.";
}

// Presupuesto de tiempo: con flux-1.1-pro y concurrencia 5, las 5-7 imágenes se
// resuelven en ~1 tanda (~10-30s). Bajamos a 180s para dejar ~120s de margen
// bajo el maxDuration=300 y nunca morir a mitad de escritura en BD.
const TIEMPO_TOTAL_MS = 180_000;
const MIN_MS_PARA_IMAGEN = 40_000;

// Imágenes en paralelo (flux-1.1-pro aguanta bien la concurrencia).
const CONCURRENCIA_IMAGENES = 5;

const pad = (n: number) => String(n).padStart(2, "0");

/** Ejecuta `fn` sobre `items` con un máximo de `limit` en paralelo (tolerante a fallos). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try { results[i] = await fn(items[i], i); } catch { results[i] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
const MESES_DIA = (mes: number, dia: number) =>
  new Date(2000, mes - 1, dia).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

/* ----------------------------- utilidades IA ----------------------------- */

function parseJSON(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fallthrough */ }
  const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* noop */ } }
  return null;
}

interface PerfilPack {
  nombre_entidad: string | null;
  tipo_entidad: string | null;
  mision_valores: string | null;
  publico_objetivo: string | null;
  servicios_programas: string | null;
  causas_o_productos: string | null;
  temas_prioritarios: string[] | null;
  logros_numeros: string | null;
  info_extra: string | null;
  sector: string | null;
  idioma_principal: string | null;
  genero: string | null;
  proyectos_propios: ProyectoPropio[] | null;
  colaboraciones: Colaboracion[] | null;
  novedad_semanal_texto: string | null;
  novedad_semanal_activa: boolean | null;
}

/** "empresa" u "organización" según el tipo, para textos de los prompts. */
function enteDe(p: PerfilPack): string {
  return p.tipo_entidad === "empresa" ? "empresa" : "organización";
}

function contextoDe(p: PerfilPack): string {
  const temas = Array.isArray(p.temas_prioritarios) ? p.temas_prioritarios.join(", ") : "";
  // Particular: omitir campos B2B (servicios/causas/logros) aunque tengan valor en BBDD.
  const esParticular = grupoCuenta(p.tipo_entidad) === "particular";
  const proyectos = Array.isArray(p.proyectos_propios) ? p.proyectos_propios : [];
  const colabs = Array.isArray(p.colaboraciones) ? p.colaboraciones : [];
  // Si ya hay modelo estructurado (v2.4), no volcamos el textarea libre
  // servicios/causas (deprecated): evita que la IA se atribuya lo que no ejecuta.
  const tieneEstructura = proyectos.length > 0 || colabs.length > 0;
  return [
    p.sector && `Sector: ${p.sector}`,
    p.mision_valores && `Misión y valores: ${p.mision_valores}`,
    p.publico_objetivo && `Público objetivo: ${p.publico_objetivo}`,
    (!esParticular && !tieneEstructura) && p.servicios_programas && `Servicios/programas: ${p.servicios_programas}`,
    (!esParticular && !tieneEstructura) && p.causas_o_productos && `Causas/productos: ${p.causas_o_productos}`,
    temas && `Temas prioritarios: ${temas}`,
    !esParticular && p.logros_numeros && `Logros/números: ${p.logros_numeros}`,
    proyectos.length > 0 && `Proyectos propios (solo como REFERENCIA de contexto; NO te los atribuyas salvo que el post trate explícitamente de uno): ${proyectos.map((x) => x.nombre).join(", ")}`,
  ].filter(Boolean).join("\n");
}

/* --- Fuentes de actualidad por categoría (inspiración temática, NO citar) --- */
const FUENTES_GRUPOS: { claves: string[]; fuentes: string }[] = [
  { claves: ["infancia", "niñ", "menor"], fuentes: "UNICEF, Save the Children, Aldeas Infantiles, Fundación ANAR" },
  { claves: ["mayor", "depend", "anciano", "tercera edad"], fuentes: "Fundación Amigos de los Mayores, IMSERSO, Fundación Grandes Amigos" },
  { claves: ["lgbt", "divers", "trans", "género", "orgullo", "sexual"], fuentes: "ILGA-Europe, FELGTBI+, Observatorio contra la LGTBIfobia, Fundación Triángulo" },
  { claves: ["sosten", "medio ambiente", "clima", "recicl", "co2", "co₂", "ecolog", "residuo"], fuentes: "Ecoembes, WWF España, Greenpeace, Ministerio para la Transición Ecológica, IPCC" },
  { claves: ["refug", "derechos humanos", "asilo", "migra"], fuentes: "ACNUR, Amnistía Internacional, CEAR" },
  { claves: ["mujer", "igualdad", "violencia de género"], fuentes: "ONU Mujeres, Instituto de la Mujer, Delegación del Gobierno contra la Violencia de Género" },
  { claves: ["salud", "sanit", "médic", "hospital"], fuentes: "Redacción Médica, El Médico Interactivo, Consalud" },
  { claves: ["voluntariado", "tercer sector", "catalu", "cataluña"], fuentes: "Plataforma del Voluntariado, Taula del Tercer Sector Social de Catalunya, La Confederación" },
];

/** Devuelve las fuentes de referencia relevantes al perfil (o un set genérico). */
function fuentesPara(p: PerfilPack, cats: string[]): string {
  const heno = `${(p.temas_prioritarios || []).join(" ")} ${p.sector || ""} ${p.causas_o_productos || ""} ${p.mision_valores || ""} ${cats.join(" ")}`.toLowerCase();
  const sel = FUENTES_GRUPOS.filter((g) => g.claves.some((k) => heno.includes(k))).map((g) => g.fuentes);
  return sel.length ? Array.from(new Set(sel)).join("; ") : "UNICEF, WWF España, ACNUR, ONU Mujeres, Plataforma del Voluntariado";
}

/** Temas sugeridos por IA basados en la actividad real (no efemérides genéricas). */
async function temasIA(p: PerfilPack, n: number): Promise<string[]> {
  if (n <= 0) return [];
  try {
    const prompt = `Eres estratega de contenido para "${p.nombre_entidad || `una ${enteDe(p)}`}".
${contextoDe(p)}

Propón ${n} temas de publicación variados y CONCRETOS, basados en la actividad real de esta ${enteDe(p)} (sus servicios, productos, causas, público y logros). NO uses efemérides genéricas ni días internacionales. Cada tema en una frase corta y accionable.
Responde SOLO con JSON: {"temas": ["tema 1", "tema 2", ...]} con exactamente ${n} elementos.
${INSTRUCCION_TILDES}
${instruccionIdioma(p.idioma_principal)}
${reglaIdioma(p.idioma_principal)}`;
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 400, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
    const parsed = parseJSON(raw) as { temas?: unknown };
    const temas = Array.isArray(parsed?.temas) ? parsed.temas.filter((t): t is string => typeof t === "string") : [];
    // Rellenar si la IA devuelve menos de los pedidos.
    while (temas.length < n) temas.push(`Comparte una historia o impacto de tu ${enteDe(p)}`);
    return temas.slice(0, n);
  } catch {
    return Array.from({ length: n }, () => `Comparte una historia o impacto de tu ${enteDe(p)}`);
  }
}

interface TextoRed { titular: string; texto: string; hashtags: string[]; prompt_imagen: string; }

const promptImagenFallback = (tema: string) =>
  `Photograph related to "${tema}", documentary editorial style, photorealistic, natural lighting, shallow depth of field, no text, no letters, no logos, no watermarks`;

/** Mapea profiles.genero a una pista de protagonista en inglés (o null). */
function pistaGenero(genero?: string | null): string | null {
  switch (genero) {
    case "hombre": return "the main person is a man";
    case "mujer": return "the main person is a woman";
    case "no_binario": return "the main person is non-binary";
    case "persona_trans": return "the main person is a trans person";
    case "equipo_mixto": return "show a small mixed team of people";
    default: return null;
  }
}

interface CtxImagen {
  titular: string;
  texto: string;
  hashtags: string[];
  tema: string;
  pais?: string | null;   // colaboración internacional (ej. Guinea-Bissau)
  base?: string | null;   // descripcion_imagen_base de una colaboración
}

/**
 * Genera una DESCRIPCIÓN VISUAL de escena (no un eslogan) para el modelo de
 * imagen. Llamada dedicada con contexto completo: 40-80 palabras en inglés,
 * sujetos/entorno/luz/estilo. Si hay `base` (colaboración) la usa como ancla.
 * Tolerante: fallback a base o plantilla.
 */
async function generarDescripcionImagen(p: PerfilPack, ctx: CtxImagen): Promise<string> {
  try {
    const genero = pistaGenero(p.genero);
    const prompt = `You are an art director writing an image-generation prompt for a photorealistic model.
Return ONLY a vivid VISUAL SCENE in ENGLISH — NOT a slogan, NOT a headline, NOT the caption. Describe something a photographer could actually shoot.

Grounding (do NOT quote literally):
- Entity: ${p.nombre_entidad || enteDe(p)} (${p.tipo_entidad || "ong"}), sector ${p.sector || "n/d"}
- Audience: ${p.publico_objetivo || "general"}
- Topic: ${ctx.tema}
- Post title: ${ctx.titular}
- Post text: ${ctx.texto.slice(0, 400)}
- Hashtags: ${ctx.hashtags.slice(0, 8).join(" ")}${ctx.pais ? `\n- Country/context: ${ctx.pais}` : ""}${genero ? `\n- Protagonist: ${genero}` : ""}${ctx.base ? `\n\nUse THIS scene as the visual anchor and adapt it faithfully:\n"${ctx.base}"` : ""}

Rules:
- 40-80 words. Concrete subjects, setting, objects, lighting, mood, composition.
- Documentary photojournalism style, photorealistic, natural lighting, shallow depth of field.
- People: general traits only (age, expression, context); NEVER real/identifiable people or celebrities.
- Dignity and respect; no "poverty porn", no staged misery.
- End with: "no text, no letters, no logos, no watermarks".
Return ONLY the description, one paragraph, no quotes, no preamble.`;
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 300, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    const limpio = raw.replace(/^["'«»]|["'«»]$/g, "").trim();
    // Guarda anti-eslogan: si sale demasiado corto, caemos a base o plantilla.
    if (limpio.split(/\s+/).length < 15) return ctx.base || promptImagenFallback(ctx.tema);
    return limpio;
  } catch {
    return ctx.base || promptImagenFallback(ctx.tema);
  }
}

interface OpcionesTexto { instruccion?: string; imgCtx?: { pais?: string | null; base?: string | null }; }

/** Genera titular + texto + hashtags (Instagram/Facebook) y, aparte, la descripción visual. */
async function generarTextoRed(p: PerfilPack, tema: string, red: string, opts: OpcionesTexto = {}): Promise<TextoRed> {
  try {
    const limite = red === "X" ? "máximo 280 caracteres, muy conciso" : red === "Instagram" ? "máximo 150 palabras" : "máximo 200 palabras";
    const prompt = `Genera un post para ${red} de "${p.nombre_entidad || `la ${enteDe(p)}`}" (${p.tipo_entidad || "ong"}).
Tema: ${tema}
${contextoDe(p)}
${opts.instruccion ? `\nINSTRUCCIÓN DE ESTE POST:\n${opts.instruccion}\n` : ""}
Responde SOLO con JSON válido:
{
  "titular": "6-8 palabras impactantes para superponer sobre la imagen",
  "texto": "texto listo para publicar (${limite}), con emojis y SIN hashtags",
  "hashtags": ["#hashtag1", "#hashtag2"]
}
- IMPORTANTE: el campo "texto" NO debe contener hashtags ni el símbolo #. Los hashtags van EXCLUSIVAMENTE en el array "hashtags" (se muestran aparte en la app).
- Incluye 8-12 hashtags relevantes al tema y al sector.
${INSTRUCCION_TILDES}
${instruccionIdioma(p.idioma_principal)}
${reglaIdioma(p.idioma_principal)}`;
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 1000, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
    const o = (parseJSON(raw) || {}) as Record<string, unknown>;
    const titular = typeof o.titular === "string" ? o.titular.replace(/^["'«»]|["'«»]$/g, "") : tema;
    const texto = typeof o.texto === "string" ? quitarHashtags(o.texto) : "";
    const hashtags = (Array.isArray(o.hashtags) ? o.hashtags : []).filter((h): h is string => typeof h === "string").map((h) => h.startsWith("#") ? h : `#${h}`);
    // Descripción de imagen: paso propio con contexto completo (escena, no eslogan).
    const prompt_imagen = await generarDescripcionImagen(p, {
      titular, texto, hashtags, tema, pais: opts.imgCtx?.pais, base: opts.imgCtx?.base,
    });
    return { titular, texto, hashtags, prompt_imagen };
  } catch {
    return { titular: tema, texto: "", hashtags: [], prompt_imagen: promptImagenFallback(tema) };
  }
}

/** Genera guion estructurado de TikTok. */
async function generarGuionTikTok(p: PerfilPack, tema: string, instruccion?: string): Promise<{ guion: GuionTikTok | null; texto: string; titular: string; hashtags: string[] }> {
  try {
    const prompt = `Crea un guion de TikTok (30s, tono cercano) para "${p.nombre_entidad || `la ${enteDe(p)}`}".
Tema: ${tema}
${contextoDe(p)}
${instruccion ? `\nINSTRUCCIÓN DE ESTE POST:\n${instruccion}\n` : ""}
Responde SOLO con JSON válido:
{"titular":"6-10 palabras","guion":[{"tiempo":"0-3s","voz":"...","accion":"..."}],"planos":[{"numero":1,"descripcion":"plano práctico con smartphone"}],"hashtags":["#fyp","#parati"],"audio_sugerido":"tipo de audio genérico, no una canción concreta"}
Usa 3-4 segmentos. 10-12 hashtags.
${INSTRUCCION_TILDES}
${instruccionIdioma(p.idioma_principal)}
${reglaIdioma(p.idioma_principal)}`;
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 1400, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
    const o = (parseJSON(raw) || {}) as Record<string, unknown>;
    const segs = Array.isArray(o.guion) ? o.guion : [];
    if (!segs.length) return { guion: null, texto: "", titular: tema, hashtags: [] };
    const guion: GuionTikTok = {
      titular: typeof o.titular === "string" ? o.titular : tema,
      guion: segs.map((s) => { const x = (s ?? {}) as Record<string, unknown>; return { tiempo: String(x.tiempo ?? ""), voz: String(x.voz ?? ""), accion: String(x.accion ?? "") }; }),
      planos: (Array.isArray(o.planos) ? o.planos : []).map((pp, i) => { const x = (pp ?? {}) as Record<string, unknown>; return { numero: typeof x.numero === "number" ? x.numero : i + 1, descripcion: String(x.descripcion ?? "") }; }),
      hashtags: (Array.isArray(o.hashtags) ? o.hashtags : []).filter((h): h is string => typeof h === "string").map((h) => h.startsWith("#") ? h : `#${h}`),
      audio_sugerido: typeof o.audio_sugerido === "string" ? o.audio_sugerido : "",
    };
    const texto = [
      guion.titular && `🎬 ${guion.titular}`, "",
      "📜 GUION", ...guion.guion.map((s) => `[${s.tiempo}] ${s.voz}${s.accion ? `\n   → ${s.accion}` : ""}`),
      guion.audio_sugerido && `\n🎵 AUDIO: ${guion.audio_sugerido}`,
      guion.hashtags.length ? `\n${guion.hashtags.join(" ")}` : "",
    ].filter((x) => x !== undefined).join("\n");
    return { guion, texto, titular: guion.titular, hashtags: guion.hashtags };
  } catch {
    return { guion: null, texto: "", titular: tema, hashtags: [] };
  }
}

/* --------------------------- imagen (FLUX + sharp) --------------------------- */

const aspectPara = (red: string) => aspectPorRed(red);

interface ImagenResultado { url: string | null; url_limpia?: string | null; error: string | null; }

/** Genera imagen (OpenAI gpt-image-2 → fallback Replicate FLUX) + hornea titular con sharp + sube a post-images. */
async function generarImagen(
  admin: SupabaseClient, userId: string, promptImagen: string, titular: string, red: string, presupuestoMs: number, label: string,
): Promise<ImagenResultado> {
  if (presupuestoMs < MIN_MS_PARA_IMAGEN) { console.warn(`${label}: presupuesto insuficiente (${presupuestoMs}ms)`); return { url: null, error: `presupuesto insuficiente (${presupuestoMs}ms)` }; }
  const t = Date.now();
  const ms = () => Date.now() - t;
  try {
    const aspect = aspectPara(red);

    console.log(`${label}: generando imagen (OpenAI gpt-image-2, fallback FLUX; aspect ${aspect})...`);
    const gen = await generarImagenIA(promptImagen, aspect, presupuestoMs - 4000);
    if (!gen) { console.error(`${label}: sin imagen tras OpenAI+fallback en ${ms()}ms`); return { url: null, error: "sin imagen (openai+replicate)" }; }
    const clean = gen.buffer;
    console.log(`${label}: imagen lista vía ${gen.fuente} (${clean.length}B) en ${ms()}ms, componiendo...`);

    let composed: Buffer;
    try {
      composed = await composeImage({ imageBuffer: clean, headline: titular, positionX: 50, positionY: 85, fontSize: 52, aspectRatio: aspect });
    } catch (e) {
      console.error(`${label}: composeImage FALLÓ:`, e);
      return { url: null, error: `compose: ${e instanceof Error ? e.message : String(e)}`.slice(0, 150) };
    }
    console.log(`${label}: composición OK en ${ms()}ms (${composed.length}B), subiendo a Storage...`);

    const ts = Date.now();
    const filePath = `${userId}/pack-${ts}-${Math.round(presupuestoMs)}.png`;
    const { error } = await admin.storage.from("post-images").upload(filePath, composed, { contentType: "image/png", upsert: false });
    if (error) {
      console.error(`${label}: Storage upload FALLÓ:`, error.message);
      return { url: null, error: `storage: ${error.message}`.slice(0, 150) };
    }
    const url = admin.storage.from("post-images").getPublicUrl(filePath).data.publicUrl;

    // Subir TAMBIÉN la imagen limpia (webp original) para poder recomponer el
    // titular después sin regenerar. Si falla, no rompe (url_limpia queda null).
    let url_limpia: string | null = null;
    const cleanPath = `${userId}/pack-${ts}-clean.webp`;
    const { error: cleanErr } = await admin.storage.from("post-images").upload(cleanPath, clean, { contentType: "image/webp", upsert: false });
    if (cleanErr) console.error(`${label}: subida limpia FALLÓ:`, cleanErr.message);
    else url_limpia = admin.storage.from("post-images").getPublicUrl(cleanPath).data.publicUrl;

    console.log(`${label}: OK total ${ms()}ms → ${url}`);
    return { url, url_limpia, error: null };
  } catch (e) {
    console.error(`${label}: excepción tras ${ms()}ms:`, e);
    return { url: null, error: `excepción: ${e instanceof Error ? e.message : String(e)}`.slice(0, 150) };
  }
}

/** Aspect ratio del formato según el tipo de red del día del pack. Fuente única: aspectPorRed. */
export const aspectDeTipo = (tipo: string): string => aspectPorRed(tipo);

/* ---------------------------------------------------------------------------
 * Banner de marca vs foto IA por tipo de contenido. Piezas de MENSAJE (idea,
 * dato, actualidad, día mundial, conversación) → banner tipográfico; piezas de
 * HISTORIA (proyecto propio, colaboración) → foto IA. Da variedad y quita la
 * monotonía de "siempre una foto".
 * ------------------------------------------------------------------------- */
const ESTILO_IMAGEN: Record<string, "banner" | "foto"> = {
  conversacion: "banner", actualidad: "banner", dia_mundial: "banner",
  propio: "foto", colaboracion: "foto",
};
const PILL_CONTENIDO: Record<string, string> = {
  conversacion: "Para pensar", actualidad: "Actualidad", dia_mundial: "Efeméride",
  propio: "Nuestro trabajo", colaboracion: "Colaboramos",
};
/** Subtítulo del banner = primera frase del cuerpo (sin hashtags), recortada. */
function subtituloBanner(texto: string): string {
  const limpio = quitarHashtags(texto || "").replace(/\s+/g, " ").trim();
  let frase = limpio.split(/(?<=[.!?])\s/)[0] || limpio;
  if (frase.length > 140) frase = `${frase.slice(0, 137).replace(/\s+\S*$/, "")}…`; // corte por palabra
  return frase;
}
/** Color del banner por paridad del día del mes → días consecutivos alternan; estable en regeneración. */
function varianteBanner(fecha: string): "dark" | "light" {
  const d = parseInt((fecha || "").slice(8, 10), 10);
  return Number.isFinite(d) && d % 2 === 0 ? "dark" : "light";
}
/** Genera el banner de marca de un día y lo sube. Rápido (sin IA de imagen). */
async function generarBanner(admin: SupabaseClient, userId: string, d: PackDia, perfil: PerfilPack, label: string): Promise<ImagenResultado> {
  try {
    const png = await bannerMarca({
      aspectRatio: aspectDeTipo(d.tipo),
      variante: varianteBanner(d.fecha),
      pill: PILL_CONTENIDO[d.tipo_contenido || ""] || "o2Wave",
      titulo: d.titular || d.tema,
      subtitulo: subtituloBanner(d.texto || ""),
      organizacion: perfil.nombre_entidad || "",
    });
    const url = await subirImagenLimpia(admin, userId, png, "image/png");
    if (!url) return { url: null, error: "storage banner" };
    return { url, url_limpia: null, error: null };
  } catch (e) {
    console.error(`${label}: banner FALLÓ:`, e);
    return { url: null, error: `banner: ${e instanceof Error ? e.message : String(e)}`.slice(0, 150) };
  }
}

/** Hornea un titular sobre una imagen limpia y sube la compuesta. Devuelve la URL o null. */
export async function componerYSubir(
  admin: SupabaseClient, userId: string, cleanBuffer: Buffer, titular: string, aspect: string,
): Promise<string | null> {
  try {
    const composed = await composeImage({ imageBuffer: cleanBuffer, headline: titular, positionX: 50, positionY: 85, fontSize: 52, aspectRatio: aspect });
    const filePath = `${userId}/pack-${Date.now()}-recomp.png`;
    const { error } = await admin.storage.from("post-images").upload(filePath, composed, { contentType: "image/png", upsert: false });
    if (error) { console.error("componerYSubir: storage", error.message); return null; }
    return admin.storage.from("post-images").getPublicUrl(filePath).data.publicUrl;
  } catch (e) {
    console.error("componerYSubir:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Sube una imagen "limpia" (original del usuario o de FLUX) a post-images. Devuelve la URL o null. */
export async function subirImagenLimpia(
  admin: SupabaseClient, userId: string, buffer: Buffer, contentType: string,
): Promise<string | null> {
  const ext = contentType.includes("png") ? "png" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "webp";
  const filePath = `${userId}/pack-${Date.now()}-user.${ext}`;
  const { error } = await admin.storage.from("post-images").upload(filePath, buffer, { contentType, upsert: false });
  if (error) { console.error("subirImagenLimpia: storage", error.message); return null; }
  return admin.storage.from("post-images").getPublicUrl(filePath).data.publicUrl;
}

/* --------------------------- distribución de redes --------------------------- */

// Pesos de reparto entre las redes activas del perfil (se normalizan por las activas).
const PESOS: Record<string, number> = { instagram: 0.7, facebook: 0.2, linkedin: 0.15, x: 0.1, tiktok: 0.1 };

export function distribuirRedes(redes: string[], n: number): string[] {
  const activas = (redes || []).filter((r) => r in PESOS);
  if (!activas.length || n <= 0) return Array(Math.max(0, n)).fill("instagram");
  const sumW = activas.reduce((s, r) => s + PESOS[r], 0);
  const counts = activas.map((r) => ({ r, exact: (PESOS[r] / sumW) * n, c: 0, frac: 0 }));
  counts.forEach((x) => { x.c = Math.floor(x.exact); x.frac = x.exact - x.c; });
  let asignados = counts.reduce((s, x) => s + x.c, 0);
  const orden = [...counts].sort((a, b) => b.frac - a.frac);
  let i = 0;
  while (asignados < n) { orden[i % orden.length].c++; asignados++; i++; }
  const prioridad = ["instagram", "facebook", "tiktok"];
  const out: string[] = [];
  for (const p of prioridad) { const f = counts.find((x) => x.r === p); if (f) for (let k = 0; k < f.c; k++) out.push(p); }
  return out;
}

const RED_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", x: "X", tiktok: "TikTok" };

/* --------------------------------- principal --------------------------------- */

export interface ProcesarResultado { pack_id: string; dias: number; con_imagen: number; fallos: string[]; }

/**
 * Procesa un pack_job completo: arma los N días (fecha_usuario > día clave > IA),
 * genera texto/guion siempre e imagen donde dé tiempo, y guarda el pack.
 * Lanza si algo crítico falla (el caller marca el job como 'failed').
 */
export async function procesarPackJob(admin: SupabaseClient, jobId: string): Promise<ProcesarResultado> {
  const t0 = Date.now();

  const { data: job, error: jobErr } = await admin.from("pack_jobs").select("*").eq("id", jobId).single();
  if (jobErr || !job) throw new Error("pack_job no encontrado");
  await admin.from("pack_jobs").update({ estado: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

  const userId = job.user_id as string;
  const fechaInicio = job.fecha_inicio as string; // 'YYYY-MM-DD' (lunes)

  // select("*"): incluye columnas nuevas (proyectos/colaboraciones/novedad) sin
  // romper si la migración v2.4 aún no se aplicó.
  const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).single();
  if (!profile) throw new Error("perfil no encontrado");

  const N = Math.min(7, Math.max(1, profile.pack_dias_semana ?? 5));
  const redesActivas: string[] = (profile.redes_activas?.length ? profile.redes_activas : ["instagram"]);
  const perfil = profile as unknown as PerfilPack;

  // Fechas objetivo (lunes + i).
  const base = new Date(fechaInicio + "T00:00:00");
  const dias = Array.from({ length: N }, (_, i) => {
    const d = new Date(base); d.setDate(base.getDate() + i);
    return { fecha: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, mes: d.getMonth() + 1, dia: d.getDate(), ano: d.getFullYear(),
      nombre_dia: d.toLocaleDateString("es-ES", { weekday: "long" }) };
  });

  // Fechas del usuario.
  const { data: fechasRows } = await admin.from("fechas_usuario").select("*").eq("user_id", userId);
  const fechas = fechasRows || [];

  // Días clave de sus categorías.
  const { data: catRows } = await admin.from("categorias_usuario").select("categoria").eq("user_id", userId);
  const catList = (catRows || []).map((c) => c.categoria);
  let diasClave: { mes: number; dia: number; nombre: string }[] = [];
  if (catList.length) {
    const ambitos = profile.mostrar_dias_espana === false ? ["internacional"] : ["internacional", "espana"];
    const { data: dc } = await admin.from("dias_clave").select("mes, dia, nombre").in("categoria", catList).in("ambito", ambitos);
    diasClave = dc || [];
  }

  // ---- Mix semanal (v2.4): 1-2 días mundiales + 1-2 conversación + 1-2
  //      actualidad + 1 colaboración recurrente + 0 propios (salvo novedad). ----
  type TipoContenido = "dia_mundial" | "conversacion" | "actualidad" | "colaboracion" | "propio";
  type Plan = { fecha: string; nombre_dia: string; tema: string; fuente: PackFuente; tipo_contenido: TipoContenido; instruccion?: string; imgPais?: string | null; imgBase?: string | null };

  const proyectos = Array.isArray(perfil.proyectos_propios) ? perfil.proyectos_propios : [];
  const colabs = Array.isArray(perfil.colaboraciones) ? perfil.colaboraciones : [];
  const colabsRec = colabs.filter((c) => c.recurrente);
  const novedadTxt = (perfil.novedad_semanal_texto || "").trim();
  const novedadActiva = !!perfil.novedad_semanal_activa && !!novedadTxt && proyectos.length > 0;
  const fuentes = fuentesPara(perfil, catList);

  const planes: (Plan | undefined)[] = new Array(N);

  // 1) Slots de calendario (fecha_usuario / día clave), máximo 2 (variedad).
  let diasMundiales = 0;
  dias.forEach((d, idx) => {
    if (diasMundiales >= 2) return;
    const fu = fechas.find((f) => f.mes === d.mes && f.dia === d.dia && (f.recurrente !== false || f.ano_especifico === d.ano));
    const dc = fu ? null : diasClave.find((c) => c.mes === d.mes && c.dia === d.dia);
    if (fu || dc) {
      planes[idx] = { fecha: d.fecha, nombre_dia: d.nombre_dia, tema: (fu?.nombre || dc?.nombre) as string, fuente: fu ? "fecha_usuario" : "dia_clave", tipo_contenido: "dia_mundial" };
      diasMundiales++;
    }
  });

  // 2) Cola de tipos para los huecos, por prioridad.
  const libres: number[] = [];
  for (let i = 0; i < N; i++) if (!planes[i]) libres.push(i);

  const temasBase = (perfil.temas_prioritarios && perfil.temas_prioritarios.length) ? perfil.temas_prioritarios : [`la causa de tu ${enteDe(perfil)}`];
  const rot = (k: number) => temasBase[k % temasBase.length];
  const nuevo = (patch: Partial<Plan>): Plan => ({ fecha: "", nombre_dia: "", tema: "", fuente: "ia_sugerencia", tipo_contenido: "conversacion", ...patch });

  const cola: Plan[] = [];

  // 2a) Proyecto propio SOLO si hay novedad de la semana.
  if (novedadActiva) {
    const proy = proyectos.find((x) => novedadTxt.toLowerCase().includes((x.nombre || "").toLowerCase().slice(0, 12))) || proyectos[0];
    cola.push(nuevo({
      tipo_contenido: "propio", tema: novedadTxt,
      instruccion: `Este post trata de un PROYECTO PROPIO con una NOVEDAD real: "${novedadTxt}". Framing correcto: "${proy.framing_correcto}". Habla en primera persona (nuestro/a).${proy.matiz ? ` MATIZ IMPORTANTE: ${proy.matiz}` : ""}${proy.cifra_clave ? ` Si citas cifras usa EXACTAMENTE: ${proy.cifra_clave}.` : ""}`,
      imgBase: proy.resumen_visual || null,
    }));
  }

  // 2b) 1 colaboración recurrente (rota por semana si hay varias).
  if (colabsRec.length) {
    const semanaIdx = Math.floor(new Date(fechaInicio + "T00:00:00").getTime() / (7 * 24 * 3600 * 1000));
    const c = colabsRec[semanaIdx % colabsRec.length];
    cola.push(nuevo({
      tipo_contenido: "colaboracion", tema: `${c.proyecto} (${c.entidad})`,
      instruccion: `Este post trata de una COLABORACIÓN con "${c.entidad}". Habla SIEMPRE en tercera persona dando crédito a la entidad original — NUNCA te lo atribuyas. Framing correcto: "${c.framing_correcto}". PROHIBIDO usar: ${c.framing_prohibido}.${c.cifra_clave ? ` Si citas cifras usa EXACTAMENTE: ${c.cifra_clave} (no inventes otras).` : ""}`,
      imgPais: c.pais || null, imgBase: c.descripcion_imagen_base || null,
    }));
  }

  // 2c) Hasta 2 de actualidad/educativo (fuentes como inspiración, sin cifras inventadas).
  for (let k = 0; k < 2; k++) {
    cola.push(nuevo({
      tipo_contenido: "actualidad", tema: `Actualidad: ${rot(k)}`,
      instruccion: `Este post es de ACTUALIDAD/EDUCATIVO sobre el sector, NO sobre la entidad. Inspírate en los temas típicos de estas fuentes de referencia (NO las cites literalmente, NO inventes cifras exactas; usa rangos genéricos como "según estudios recientes" o "los datos apuntan a que…"): ${fuentes}. Aporta contexto útil y una reflexión; no atribuyas nada a la entidad.`,
    }));
  }

  // 2d) Conversación rellena el resto.
  let ck = 0;
  while (cola.length < libres.length) {
    cola.push(nuevo({
      tipo_contenido: "conversacion", tema: `Conversación: ${rot(ck++)}`,
      instruccion: `Este post es de CONVERSACIÓN: plantea una pregunta abierta, encuesta o dilema afín a las causas de la entidad para generar interacción y comentarios ("¿Alguna vez has sentido que…?", "¿Qué haces cuando…?"). NO promociones proyectos concretos. Tono cercano y humano.`,
    }));
  }

  // Recorta manteniendo prioridad (propio → colab → actualidad → conversación) y asigna a los huecos.
  cola.length = Math.min(cola.length, libres.length);
  libres.forEach((idx, k) => {
    const s = cola[k] || nuevo({ tipo_contenido: "conversacion", tema: `Conversación: ${rot(k)}` });
    planes[idx] = { ...s, fecha: dias[idx].fecha, nombre_dia: dias[idx].nombre_dia };
  });

  // Distribución de redes.
  const redes = distribuirRedes(redesActivas, N);

  // Pase 1: texto/guion para TODOS los días (barato, garantizado).
  const contenido: PackDia[] = [];
  for (let i = 0; i < N; i++) {
    const plan = planes[i]!;
    const red = redes[i] || "instagram";
    const tipo = red;
    const imgCtx = (plan.imgPais || plan.imgBase) ? { pais: plan.imgPais, base: plan.imgBase } : undefined;
    if (red === "tiktok") {
      const g = await generarGuionTikTok(perfil, plan.tema, plan.instruccion);
      contenido.push({ fecha: plan.fecha, nombre_dia: plan.nombre_dia, tipo, tema: plan.tema, tipo_contenido: plan.tipo_contenido, imagen_url: null, imagen_limpia_url: null, titular: g.titular, texto: g.texto, hashtags: g.hashtags, guion_tiktok: g.guion, fuente: plan.fuente });
    } else {
      const r = await generarTextoRed(perfil, plan.tema, RED_LABEL[red] || "Instagram", { instruccion: plan.instruccion, imgCtx });
      contenido.push({ fecha: plan.fecha, nombre_dia: plan.nombre_dia, tipo, tema: plan.tema, tipo_contenido: plan.tipo_contenido, imagen_url: null, imagen_limpia_url: null, titular: r.titular, texto: r.texto, hashtags: r.hashtags, prompt_imagen: r.prompt_imagen, guion_tiktok: null, fuente: plan.fuente });
    }
  }

  // Pase 2: imágenes con concurrencia limitada (no TikTok), tolerante a fallos.
  let conImagen = 0;
  const fallos: string[] = [];
  if (TIEMPO_TOTAL_MS - (Date.now() - t0) >= MIN_MS_PARA_IMAGEN) {
    const objetivos = contenido.map((d, i) => ({ d, i })).filter((x) => x.d.tipo !== "tiktok");
    const resultados = await mapLimit(objetivos, CONCURRENCIA_IMAGENES, ({ d, i }) => {
      const label = `Día ${i + 1} (${d.tipo})`;
      // Piezas de mensaje → banner de marca (rápido, sin IA); historias → foto IA.
      if ((ESTILO_IMAGEN[d.tipo_contenido || ""] || "foto") === "banner") return generarBanner(admin, userId, d, perfil, label);
      const presupuesto = TIEMPO_TOTAL_MS - (Date.now() - t0); // recalculado por llamada
      if (presupuesto < MIN_MS_PARA_IMAGEN) return Promise.resolve({ url: null, error: `presupuesto agotado (${presupuesto}ms)` } as ImagenResultado);
      return generarImagen(admin, userId, d.prompt_imagen || promptImagenFallback(d.tema), d.titular || d.tema, RED_LABEL[d.tipo] || "Instagram", presupuesto, label);
    });
    resultados.forEach((res, k) => {
      const { d, i } = objetivos[k];
      if (res && res.url) { d.imagen_url = res.url; d.imagen_limpia_url = res.url_limpia ?? null; conImagen++; }
      else fallos.push(`Día ${i + 1} (${d.tipo}): ${res?.error || "desconocido"}`);
    });
  }
  console.log(`pack ${userId}: ${conImagen}/${contenido.filter((d) => d.tipo !== "tiktok").length} imágenes OK; fallos: ${JSON.stringify(fallos)}`);

  // Guardar el pack y cerrar el job.
  const { data: pack, error: packErr } = await admin
    .from("packs_semanales")
    .insert({ user_id: userId, fecha_inicio: fechaInicio, pdf_url: null, contenido: { dias: contenido }, email_enviado: false })
    .select("id").single();
  if (packErr || !pack) throw new Error(`No se pudo guardar el pack: ${packErr?.message}`);

  await admin.from("pack_jobs").update({ estado: "done", pack_id: pack.id, updated_at: new Date().toISOString() }).eq("id", jobId);

  return { pack_id: pack.id as string, dias: N, con_imagen: conImagen, fallos };
}

const PERFIL_SELECT = "*"; // incluye columnas v2.4 sin romper si aún no se migró

/**
 * Regenera UN día del pack. modo:
 *  - "completo" (def): texto + imagen (usa nuevoTema o uno propuesto por IA).
 *  - "texto": solo texto/titular/hashtags (+guion si TikTok); conserva la imagen.
 *  - "imagen": solo la imagen (re-hornea el titular actual); conserva el texto.
 * Tolerante a fallos de imagen (queda imagen_url=null si Replicate falla).
 */
export async function regenerarDia(
  admin: SupabaseClient, userId: string, dia: PackDia,
  opts: { nuevoTema?: string; modo?: "completo" | "texto" | "imagen" } = {},
): Promise<PackDia> {
  const modo = opts.modo || "completo";
  const { data: profile } = await admin.from("profiles").select(PERFIL_SELECT).eq("id", userId).single();
  const perfil = (profile || {}) as unknown as PerfilPack;
  const red = dia.tipo;
  const label = RED_LABEL[red] || "Instagram";

  // Tema: el nuevo si se da; si es "completo" sin tema, lo propone la IA; si no, el actual.
  let tema = (opts.nuevoTema || "").trim();
  if (!tema) {
    if (modo === "completo") { const t = await temasIA(perfil, 1); tema = t[0] || dia.tema; }
    else tema = dia.tema;
  }

  const out: PackDia = { ...dia, tema };
  const esBanner = (ESTILO_IMAGEN[dia.tipo_contenido || ""] || "foto") === "banner";

  // --- Solo imagen ---
  if (modo === "imagen") {
    if (red === "tiktok") return { ...out, imagen_url: null, imagen_limpia_url: null };
    const img = esBanner
      ? await generarBanner(admin, userId, out, perfil, `Regenerar banner (${red})`)
      : await generarImagen(admin, userId, dia.prompt_imagen || promptImagenFallback(out.tema), dia.titular || out.tema, label, 110_000, `Regenerar imagen (${red})`);
    return { ...out, imagen_url: img.url, imagen_limpia_url: img.url_limpia ?? null };
  }

  // --- Texto (y guion si TikTok) ---
  if (red === "tiktok") {
    const g = await generarGuionTikTok(perfil, tema);
    return { ...out, titular: g.titular, texto: g.texto, hashtags: g.hashtags, guion_tiktok: g.guion, imagen_url: null, prompt_imagen: null };
  }
  const r = await generarTextoRed(perfil, tema, label);
  const conTexto: PackDia = { ...out, titular: r.titular, texto: r.texto, hashtags: r.hashtags, prompt_imagen: r.prompt_imagen, guion_tiktok: null };

  if (modo === "texto") return conTexto; // conserva imagen actual

  // --- Completo: texto + imagen nueva (banner o foto según el tipo) ---
  const img = esBanner
    ? await generarBanner(admin, userId, conTexto, perfil, `Regenerar completo banner (${red})`)
    : await generarImagen(admin, userId, r.prompt_imagen, r.titular, label, 110_000, `Regenerar completo (${red})`);
  return { ...conTexto, imagen_url: img.url, imagen_limpia_url: img.url_limpia ?? null };
}

export { MESES_DIA };
