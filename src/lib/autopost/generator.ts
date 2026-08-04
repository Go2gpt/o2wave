import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generarImagenIA } from "@/lib/imageGen";
import { proximaPublicacion } from "@/lib/autopost/schedule";
import { construirPieza, featuresCandidatas, type Pieza } from "@/lib/autopost/tipos";
import { reservarSiguiente, type EstadoCiclo } from "@/lib/autopost/rotacion";
import { enviarAutopostSinNovedad } from "@/lib/emails";

/**
 * Generación de piezas de autopost con perfil "producto" (marketing de o2Wave).
 * Fase 1a — uso interno. Cada pieza = texto + imagen IA, cross-post FB+IG.
 * Solo servidor.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";
const MAX_IG_CHARS = 2200;

/* ============================================================================
 * Perfilado del copy autopost — guía Marketing v1 (guia-copy-autopost-o2wave-v1)
 * Decisiones aplicadas: 4 focos (A/B/C/D), política features A, hashtags SIN
 * tildes, arquetipos Ana/Carlos/María. Actualizar aquí si sale una v1.1.
 * ==========================================================================*/

/** Fórmula obligatoria al nombrar el "para quién" (nunca reducir a org/negocio ni a "creadores"). */
const AUDIENCIA = "ONGs, empresas y personas";

interface Arquetipo { nombre: string; rol: string; equipo: string; problema: string; subvariantes: string[]; publico: "ong" | "pyme" | "particular" }

const ARQUETIPOS: Arquetipo[] = [
  {
    nombre: "Ana", rol: "dirige una pequeña ONG", equipo: "3-5 personas voluntarias o mixta",
    problema: "las redes son una tarea más que nadie quiere asumir; tiempo escaso y nadie con perfil de comunicación",
    subvariantes: ["ONG de reforestación en zona rural", "asociación de apoyo a personas mayores en el barrio", "protectora de animales pequeña", "asociación cultural local (teatro amateur, patrimonio)"],
    publico: "ong",
  },
  {
    nombre: "Carlos", rol: "dirige o trabaja en una pyme o emprendimiento pequeño", equipo: "solo o con 1-2 personas",
    problema: "las redes son una tarea más entre veinte; el cliente delante siempre gana prioridad y publicar queda para el final del día",
    subvariantes: ["estudio de diseño gráfico de 2 personas", "cafetería con servicio delivery", "freelance desarrollador web", "taller mecánico de barrio o pequeño comercio local"],
    publico: "pyme",
  },
  {
    nombre: "María", rol: "lleva un proyecto personal", equipo: "solo ella misma",
    problema: "su marca personal ES su trabajo, pero mantenerla activa en redes le agota; perfeccionista, tarda horas en cada post",
    subvariantes: ["coach de bienestar y hábitos", "creadora de contenido cultural o educativo", "autora auto-publicada", "terapeuta con consulta propia (psicóloga, fisio, nutricionista)"],
    publico: "particular",
  },
];

interface Foco { id: string; usaArquetipo: boolean; cta: "general" | "curiosidad" | "beneficio"; hashFoco: string[]; molde: string }

// Foco #0 "novedad reciente" ELIMINADO (alucinaba features). 4 focos rotativos.
const FOCOS: Foco[] = [
  { id: "narrativo", usaArquetipo: true, cta: "beneficio", hashFoco: ["#CasosDeUso", "#InspiracionDigital"],
    molde: "Presenta al personaje, describe SU problema semanal específico con las redes, y muestra en concreto cómo o2Wave lo resuelve (describe la idea en una frase → genera texto e imagen listos)." },
  { id: "educativo", usaArquetipo: false, cta: "curiosidad", hashFoco: ["#ComunicacionEfectiva", "#TipsRedesSociales", "#ContenidoDeValor"],
    molde: `Da un consejo de comunicación genuinamente útil (UNA idea por post, cuidar el primer segundo, medir tras 3 semanas...). Plantea el problema real y menciona o2Wave al final como resolución. Cubre en el cierre a ${AUDIENCIA}.` },
  { id: "beneficio", usaArquetipo: false, cta: "general", hashFoco: ["#AhorraTiempo", "#Productividad"],
    molde: `Describe la fricción genérica del proceso manual (pensar tema, redactar, buscar imagen, ajustar tono), presenta la solución y cierra cubriendo a ${AUDIENCIA}.` },
  { id: "contraste", usaArquetipo: false, cta: "general", hashFoco: ["#TransformacionDigital", "#Productividad"],
    molde: "Contraste ANTES/DESPUÉS: una semana sin o2Wave (fricción concreta y humana: pestañas abiertas, listas tachadas, café frío, tarde) y una con o2Wave (fricción reducida). PROHIBIDO usar cifras numéricas de tiempo o engagement." },
];

// Hashtags canónicos (v1, SIN tildes). Lista CERRADA: el modelo no inventa hashtags.
const HASH_BASE = ["#o2Wave", "#IAparaRedes", "#ContenidoEnRedes", "#GestionDeRedes"];
const HASH_PUBLICO: Record<string, string[]> = {
  ong: ["#ONGs", "#TercerSector", "#ComunicacionSocial"],
  pyme: ["#Pymes", "#EmprendedoresDigitales", "#NegocioLocal"],
  particular: ["#ProyectosPersonales", "#FreelanceProductivo", "#MarcaPersonal"],
  generico: ["#ONGs", "#Pymes", "#ProyectosPersonales"],
};
const CTAS: Record<Foco["cta"], string> = {
  general: "Prueba o2Wave en o2wave.app",
  curiosidad: "Descubre cómo funciona en o2wave.app",
  beneficio: "Recupera esas horas — o2wave.app",
};

/** Hashtags finales (9-10): base + público (por arquetipo o genérico) + foco. */
function hashtagsDe(foco: Foco, arq: Arquetipo): string[] {
  const publico = foco.usaArquetipo ? HASH_PUBLICO[arq.publico] : HASH_PUBLICO.generico;
  return [...HASH_BASE, ...publico, ...foco.hashFoco];
}

// Guardarraíles duros del copy (política features A + terminología prohibida).
const GUARDARRAILES = `REGLAS DURAS (no las incumplas nunca):
- NO menciones ni inventes features/módulos por nombre (p. ej. "Packs Temáticos", "Panel de Planificación", "Editor visual", "Calendario integrado", "Suite Pro/Premium/Enterprise"). Describe SOLO la capacidad genérica real: generar texto e imagen para redes a partir de una descripción, adaptado al perfil del usuario. Nada más.
- NO uses verbos de lanzamiento: "hoy lanzamos", "estrenamos", "hemos añadido", "acabamos de sacar", "ya disponible", "última novedad", "novedad reciente".
- NO inventes cifras ni estadísticas ("3x engagement", "5.000 ONGs", "en 5 minutos", "reduce un 80%"). Ninguna cifra concreta.
- NO inventes citas de usuarios ni testimonios reales.
- NO menciones competidores ni otras herramientas (Buffer, Later, Hootsuite, Canva, ChatGPT...).
- NO hagas promesas comerciales no verificadas ("gratis", "prueba 14 días", "sin tarjeta", precios) ni inventes planes.
- o2Wave es una WEB (webapp), NO una app de móvil. PROHIBIDO: "descarga la app", "descarga o2Wave", "en la app", "instala/instalar la app", "App Store", "Google Play", "Play Store". USA: "en o2wave.app", "desde tu navegador", "en la web", "sin instalación". Toda CTA lleva SIEMPRE "o2wave.app".
- Al hablar del "para quién", cubre SIEMPRE a "${AUDIENCIA}". Nunca reduzcas a "organización o negocio" ni a "creadores".
- Emojis: MÁXIMO 2, solo de este set [🌊 ⏳ ✨ 🚀], al cierre o en el CTA. Nunca al principio.`;

// Reglas para la escena de imagen (image_prompt_en). Muestra el MOMENTO DE TRABAJO
// real (el problema/proceso manual), NO una escena aspiracional de éxito, pero SIN
// tono lúgubre (feedback Sebas: las imágenes tristes/oscuras desmotivan).
const IMAGEN_REGLAS = `El "image_prompt_en" es una descripción de ESCENA en INGLÉS (40-80 palabras) para un modelo fotorrealista. Muestra el MOMENTO DE TRABAJO real (la persona preparando su contenido), NO una escena de éxito aspiracional, pero SIN tono lúgubre. Elige y adapta UNA de estas escenas canónicas luminosas:
  1. A tidy desk in warm afternoon light: an open laptop, a cup of coffee and an open notebook; a person calmly thinking while looking at the laptop screen (focused, not exhausted).
  2. A bright coworking space with natural window light: one or two people working with normal, relaxed concentration.
  3. A calm work table next to a large window with warm afternoon light: an open laptop, a steaming cup of coffee, a small plant beside it.
  4. A home desk in natural daylight: a person writing in a physical notebook before moving to the laptop screen.
REGLAS DURAS de la imagen:
- ILUMINACIÓN Y ÁNIMO: "warm afternoon light, natural window light, neutral-to-positive mood, focused expression (not exhausted)". PROHIBIDO: "dark night", "single lamp only", "exhausted / tired / overwhelmed", "hands on head", "cold coffee as misery", "hunched despair", "late-hour clock (23:47)".
- 1-2 personas como máximo, expresión concentrada y tranquila (NUNCA agotamiento ni angustia).
- NO aspiracional: sin celebración, sin éxito triunfal, sin estética influencer / ring light, sin stock pulido.
- La escena SIEMPRE incluye un portátil (laptop) con la CARA EXTERIOR DE LA TAPA de frente a la cámara (se ve el respaldo de la tapa, no la pantalla). NUNCA un monitor de sobremesa, NUNCA el portátil de perfil. La tapa es una superficie oscura mate, prominente en el encuadre; la persona está detrás o al lado.
- NO describas TÚ el logo de la tapa: se añadirá automáticamente una especificación de logo detallada al final del prompt. Solo deja clara la tapa oscura mate de frente.
- PROHIBIDO cualquier UI/pantalla de app inventada, mockups, dashboards ni business charts.
- PROHIBIDO logos de marcas comerciales reales (Apple/manzana mordida, Windows/cuadrado de 4, Dell, HP, Lenovo, Google, Instagram, Facebook, TikTok, o cualquier otra marca existente).
- Termina siempre con "no real brand logos, no text, no letters, no watermarks".`;

/* ============================================================================
 * Logo onda de la tapa del portátil — v1.4: lo DIBUJA Gemini con una spec
 * ultra-detallada (el composite mecánico del SVG se descartó: Gemini colocaba
 * el portátil en posiciones aleatorias y el logo quedaba flotando). El SVG
 * canónico queda archivado en src/lib/autopost/assets/ por si se retoma la vía
 * de detección de tapa por visión IA. LOGO_SPEC se anexa VERBATIM al final del
 * image_prompt_en que va a Gemini (mismos descriptores en todas las piezas).
 * ==========================================================================*/
const LOGO_SPEC = `LAPTOP LID LOGO — MANDATORY SPECIFICATION:
The laptop lid facing the camera must display a single glowing wave-shaped symbol.
SHAPE: single continuous horizontal wave, like a stylized flowing ribbon or brushstroke. Two soft crests (one left, one right) connected by a smooth curved line. Organic, hand-drawn feel like a signature or calligraphy stroke. SOLID FILLED shape (NOT thin outline strokes). Uniform thickness. Proportion ~3:1 (three times wider than tall). Smooth rounded ends, no sharp corners.
SIZE: occupies 35-45% of visible laptop lid width. Clearly visible from normal viewing distance. Centered horizontally on the lid, vertically centered or slightly above center.
COLOR/LIGHT: bright white #FFFFFF, luminous, backlit from inside the lid. Subtle warm glow around the shape (soft orange-white halo, radius ~5% of symbol width). Emits light like an Apple logo or Dell LED, but with the described shape. Strong contrast against dark matte laptop lid.
STYLE: minimalist, modern, elegant. Evokes fluid movement — water, air, sound wave.
PROHIBITED: real brand logos (Apple/Windows/HP/Dell/Lenovo/Asus/Acer/Samsung/Microsoft/etc), fruit shapes, geometric icons, tech-brand references, thin outline lines, extra symbols/stickers/decals on lid, any text/letters/numbers on or near symbol.`;

/** Deriva una escena visual EN (40-80 palabras) a partir del copy de una pieza. */
async function escenaDesdeTexto(texto: string): Promise<string> {
  const fallback = `A tidy desk in warm afternoon light: an open laptop with its outer lid facing the camera (a dark matte lid, prominent in frame — we see the back of the lid, not the screen), a cup of coffee and an open notebook, a person calmly thinking while looking at the laptop, focused but not exhausted, natural window light. Documentary photorealistic. no real brand logos, no text, no letters, no watermarks.`;
  let escena = fallback;
  try {
    const prompt = `You are an art director. From this social post caption, write ONE vivid English VISUAL SCENE (40-80 words) for a photorealistic image model — concrete subjects, setting, objects, lighting, mood. NOT a slogan.
The scene MUST include: a SINGLE person calmly working or thinking (focused, NOT tired or overwhelmed); a laptop with its OUTER LID facing the camera (we see the back of the lid, not the screen — dark matte lid, prominent in frame); warm afternoon / natural window light, neutral-to-positive mood. Do NOT describe any logo on the lid (a detailed logo spec is appended automatically). No desktop monitor, no laptop in profile. Avoid dark night, single lamp, exhaustion or despair.
End with "no real brand logos, no text, no letters, no watermarks".

Caption:
${texto.slice(0, 600)}

Return ONLY the scene description, one paragraph.`;
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 300, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    if (raw.split(/\s+/).length >= 15) escena = raw;
  } catch { /* usa fallback */ }
  return `${escena}\n\n${LOGO_SPEC}`;
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

async function piezaProducto(foco: Foco, arquetipo: Arquetipo): Promise<{ texto: string; hashtags: string[]; img: string } | null> {
  const sub = arquetipo.subvariantes[Math.floor(Math.random() * arquetipo.subvariantes.length)];
  const cta = CTAS[foco.cta];
  const contexto = foco.usaArquetipo
    ? `PROTAGONISTA (ficticio; NO uses nombres reales de personas, ONGs, empresas ni ciudades): ${arquetipo.nombre}, que ${arquetipo.rol}. Variante concreta: ${sub}. Equipo: ${arquetipo.equipo}. Problema típico: ${arquetipo.problema}.`
    : `SIN protagonista concreto (post genérico).`;

  const prompt = `Eres el community manager de o2Wave, una app que genera contenido para redes (texto + imágenes con IA) para ${AUDIENCIA}. Escribe UN post de marketing para las redes de o2Wave (Instagram + Facebook), tono profesional y cercano.

TIPO DE POST — foco "${foco.id}": ${foco.molde}
${contexto}

${GUARDARRAILES}

${IMAGEN_REGLAS}

Termina el "texto" con EXACTAMENTE esta llamada a la acción, tal cual y en su propia línea al final: "${cta}"

Responde SOLO con JSON válido:
{
  "texto": "caption lista para publicar (máx 1500 caracteres), SIN hashtags en el cuerpo, terminando con el CTA indicado",
  "image_prompt_en": "escena en INGLÉS que cumple TODAS las reglas de imagen de arriba"
}`;
  try {
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 900, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const o = JSON.parse(m[0]) as Record<string, unknown>;
    const texto = typeof o.texto === "string" ? o.texto.trim() : "";
    const img = typeof o.image_prompt_en === "string" && o.image_prompt_en.trim().length > 10 ? o.image_prompt_en.trim() : "";
    if (!texto || !img) return null;
    // La spec del logo se anexa VERBATIM (misma onda en todas las piezas).
    // Hashtags SIEMPRE de la lista canónica (el modelo no los inventa).
    return { texto, hashtags: hashtagsDe(foco, arquetipo), img: `${img}\n\n${LOGO_SPEC}` };
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
    // Rotación canónica v2.1: RESERVA el slot (avanza el ciclo) ANTES de generar,
    // para que disparos solapados no dupliquen tipo/subvariante (bug v2.1.2).
    const ciclo = await reservarSiguiente(admin, cuenta.id);
    const estado = autoAprob ? "scheduled" : "pending_review";
    const publishAt = autoAprob ? proximaPublicacion(cuenta.dias_horas) : null;
    // La primera pieza de la semana lleva semana_inicio (índice único anti-duplicado).
    const semanaCol = ya === 0 && k === 0 ? semanaInicio : null;

    const r = await crearPieza(admin, cuenta.id, cuenta.perfil_publicacion, ciclo, { estado, publishAt, semanaInicio: semanaCol, sufijo: `${k}` });
    if (!r) continue; // pieza fallida: su slot ya quedó consumido (se recupera en la siguiente ejecución)
    generadas++; if (autoAprob) programadas++; else pendientes++;
  }
  return { cuenta: cuenta.etiqueta, generadas, programadas, pendientes, saltada: false };
}

/**
 * Crea e inserta UNA pieza del tipo indicado (v2.1). piezaProducto usa el motor
 * v1.4 (foco+arquetipo+onda); el resto de tipos vienen de tipos.ts. Guarda el
 * `tipo` en autopost_posts. Tolerante: si falla el texto/insert devuelve null.
 */
async function crearPieza(
  admin: SupabaseClient, cuentaId: string, perfil: string, entry: EstadoCiclo,
  opts: { estado: string; publishAt: string | null; semanaInicio: string | null; sufijo?: string; novedad?: { featureId?: string } },
): Promise<{ id: string; texto: string; imagen_url: string | null; tipo: string } | null> {
  let pieza: Pieza | null;
  if (entry.tipo === "piezaProducto") {
    const foco = FOCOS[Math.floor(Math.random() * FOCOS.length)];
    const arquetipo = ARQUETIPOS[Math.floor(Math.random() * ARQUETIPOS.length)];
    pieza = await piezaProducto(foco, arquetipo);
  } else {
    // subIndex → subvariante/causa rota de forma determinista por tipo.
    pieza = await construirPieza(entry.tipo, { variante: entry.variante, subIndex: entry.subIndex, novedad: opts.novedad });
  }
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
    cuenta_id: cuentaId, estado: opts.estado, perfil_publicacion: perfil, tipo: entry.tipo,
    texto, imagen_url: imagenUrl, red: "ambas", publish_at: opts.publishAt,
    semana_inicio: opts.semanaInicio,
  }).select("id").single();
  if (error) { console.error("autopost crear pieza insert:", error.message); return null; }
  return { id: data.id as string, texto, imagen_url: imagenUrl, tipo: entry.tipo };
}

/**
 * Generación MANUAL ("Generar pack ahora"): bypassa el guard semanal, siempre a
 * pending_review. RESERVA el slot ANTES de generar (1 pieza/disparo) para que
 * clics rápidos no dupliquen tipo/subvariante (bug v2.1.2). Solo producto.
 */
export async function generarPiezaManual(admin: SupabaseClient, cuentaId: string, perfil: string): Promise<{ pieza_id: string; texto: string; imagen_url: string | null; tipo: string } | { error: string }> {
  const ciclo = await reservarSiguiente(admin, cuentaId); // reserva antes de generar
  const r = await crearPieza(admin, cuentaId, perfil, ciclo, { estado: "pending_review", publishAt: null, semanaInicio: null, sufijo: "manual" });
  if (!r) return { error: "No se pudo generar la pieza (texto o imagen)." };
  return { pieza_id: r.id, texto: r.texto, imagen_url: r.imagen_url, tipo: r.tipo };
}

/**
 * piezaNovedad AD-HOC: NO entra en la rotación (no avanza el ciclo). La feature se
 * elige de la whitelist filtrada por las 3 condiciones de Marketing (activa +
 * no anunciada + no caducada). Si el panel pasa un featureId se respeta solo si
 * sigue siendo candidato. Si NO hay candidatas → aborta y avisa a Sebas por email
 * (auto-poda garantizada). Siempre pending_review, solo producto.
 */
export async function generarPiezaNovedadManual(
  admin: SupabaseClient, cuentaId: string, perfil: string, ctx?: { featureId?: string },
): Promise<{ pieza_id: string; texto: string; imagen_url: string | null } | { error: string }> {
  const cands = featuresCandidatas(new Date());
  if (cands.length === 0) {
    await enviarAutopostSinNovedad({ motivo: "Whitelist vacía o todas las features caducadas / ya anunciadas." });
    return { error: "No hay features candidatas a novedad. Whitelist vacía o toda caducada. Se ha avisado a Sebas por email." };
  }
  const featureId = (ctx?.featureId && cands.find((f) => f.id === ctx.featureId)?.id) || cands[0].id;
  // Fuera de la rotación: entry sintético, no avanza el ciclo.
  const entry: EstadoCiclo = { tipo: "piezaNovedad", semana: 0, subIndex: 0, subIndices: {} };
  const r = await crearPieza(admin, cuentaId, perfil, entry, { estado: "pending_review", publishAt: null, semanaInicio: null, sufijo: "novedad", novedad: { featureId } });
  if (!r) return { error: "No se pudo generar la pieza de novedad." };
  return { pieza_id: r.id, texto: r.texto, imagen_url: r.imagen_url };
}
