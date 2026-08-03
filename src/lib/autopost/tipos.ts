import Anthropic from "@anthropic-ai/sdk";
import datos from "@/lib/autopost/data/datos-piezadato.json";
import tips from "@/lib/autopost/data/tips-piezaeducativa.json";
import causas from "@/lib/autopost/data/causas-piezaarquetipoONG.json";
import features from "@/lib/autopost/data/features-piezanovedad.json";

/**
 * Builders de los 7 tipos de pieza autopost (guía Marketing v2.1). Cada builder
 * devuelve { texto, hashtags, img }. La ESCENA de imagen la elige el código de
 * una lista canónica por tipo (variedad, no todo "persona con laptop"); el TEXTO
 * lo redacta Claude con guardarraíles; hashtags y CTA son canónicos (código).
 * Solo servidor.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

export type TipoPieza =
  | "piezaProducto" | "piezaNovedad" | "piezaArquetipoONG"
  | "piezaArquetipoEmpresa" | "piezaArquetipoParticular" | "piezaDato" | "piezaEducativa";

export interface Pieza { texto: string; hashtags: string[]; img: string }

const AUDIENCIA = "ONGs, empresas y personas";
const EMOJIS = "🌊 ⏳ ✨ 🚀";

// Guardarraíles v2 (features A + terminología v1 + añadidos v2: anglicismos,
// superlativos, tech-bro, nomenclatura canónica).
const GUARDARRAILES = `REGLAS DURAS (cúmplelas siempre):
- Español natural y cercano. NO uses hashtags (se añaden aparte) ni cierres tú con CTA (se añade aparte).
- NO menciones ni inventes features de o2Wave por nombre. NO verbos de lanzamiento ("lanzamos", "estrenamos", "ya disponible"). NO cifras/estadísticas inventadas. NO citas/testimonios inventados. NO competidores (Buffer, Later, Hootsuite, Canva, ChatGPT...). NO promesas comerciales ("gratis", "prueba 14 días", "sin tarjeta") ni precios.
- Nomenclatura canónica: "${AUDIENCIA}". NUNCA "creadores"/"influencer" como genérico, ni "PYMEs/autónomos" para reemplazar "empresas/personas".
- SIN anglicismos innecesarios (startup→proyecto, founder→fundador, engagement→interacción, reach→alcance, storytelling→narrativa, growth hacking, hack/trick→truco). SIN superlativos vacíos ("revolucionario", "el mejor", "cambia el juego"). SIN tech-bro ("disruptivo", "escalar mercados", "10x", "sinergias").
- Emojis: máximo 2, solo del set [${EMOJIS}], al final. Nunca al principio.`;

// Logo onda para escenas que muestran la tapa de un portátil de frente.
const LOGO_SPEC = `LAPTOP LID LOGO — MANDATORY SPECIFICATION:
The laptop lid facing the camera must display a single glowing wave-shaped symbol.
SHAPE: single continuous horizontal wave, like a stylized flowing ribbon or brushstroke. Two soft crests connected by a smooth curved line. SOLID FILLED shape (not thin outline). Proportion ~3:1. Smooth rounded ends.
SIZE: 35-45% of the visible lid width, centered.
COLOR/LIGHT: bright white #FFFFFF, luminous, backlit, subtle warm halo. Strong contrast against a dark matte lid.
PROHIBITED: real brand logos (Apple/Windows/HP/Dell/Lenovo/etc), fruit shapes, geometric icons, thin outline lines, text/letters/numbers near the symbol.`;

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

async function claudeTexto(prompt: string): Promise<string | null> {
  try {
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 700, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
    return raw.replace(/^["'«»]|["'«»]$/g, "").trim().length > 20 ? raw.replace(/^["'«»]|["'«»]$/g, "").trim() : null;
  } catch { return null; }
}

interface Escena { en: string; logo?: boolean }
/** Compone el image_prompt final: escena + estilo documental (+ logo onda si aplica). */
function imagen(e: Escena, permitirTexto = false): string {
  const suffix = permitirTexto
    ? "Clean editorial style, natural lighting, no brand logos, no watermarks."
    : "Documentary photorealistic, natural warm lighting, single subject, no real brand logos, no text, no letters, no watermarks.";
  const base = `${e.en} ${suffix}`;
  return e.logo ? `${base}\n\n${LOGO_SPEC}` : base;
}

const hash = (...arrs: string[][]): string[] => Array.from(new Set(arrs.flat()));
const HB = ["#o2Wave", "#IAparaRedes", "#ContenidoEnRedes", "#GestionDeRedes"]; // base común

/* --------------------------------- ONG (Ana) -------------------------------- */
const ESCENAS_ONG: Escena[] = [
  { en: "Small meeting table with 3-5 volunteers of mixed ages around a computer and sticky notes, a thermos of coffee at the center, a warm but modest room with mismatched chairs and papers on the wall." },
  { en: "A modest shared NGO office: a wall with posters of past campaigns, a discreet plant, a work desk with papers more or less tidy." },
  { en: "A small charity event in a neighborhood square or local hall: a table with leaflets, two or three people attending, a varied local public." },
  { en: "A community workshop with 5-10 people seated in a circle around a table, listening and taking part." },
  { en: "A wall calendar with dates marked in red and blue, stacked envelopes, a phone off the hook." },
];

async function piezaArquetipoONG(): Promise<Pieza | null> {
  const activas = (causas as { label: string; estado: string }[]).filter((c) => c.estado === "activa");
  const causa = pick(activas);
  const cta = pick(["Prueba o2Wave en o2wave.app", "Recupera esas horas — o2wave.app"]);
  const foco = pick([
    "arranque de temporada o campaña anual tras el verano",
    "comunicar el impacto del último año con datos reales de la ONG ficticia (sin inventar cifras)",
    "una campaña de sensibilización sobre su causa",
    "una colaboración con otra ONG local (framing 'Colaboramos con')",
  ]);
  const prompt = `${GUARDARRAILES}

Escribe el CUERPO (sin CTA, sin hashtags) de un post de marketing para las redes de o2Wave. Caso concreto FICTICIO y verosímil de una ONG pequeña que usa o2Wave. Historia por encima del eslogan.
Protagonista: Ana, que dirige o coordina una ${causa.label}, con un equipo de 3-5 personas (mezcla de voluntarias y contratadas). Problema: las redes son "una tarea más que nadie quiere asumir"; nadie tiene perfil de comunicación; el tiempo escasea. Enfoque de esta pieza: ${foco}.
o2Wave resuelve: Ana describe en una frase lo que quiere comunicar y la app genera texto e imagen listos para publicar; el equipo recupera esas horas.
OBLIGATORIO: verbo genérico ("dirige", "coordina", "impulsa"), zona genérica ("en un barrio", "en zona rural"). PROHIBIDO: nombres reales de ONGs o personas, ciudades identificables, cifras inventadas, tech-bro speak. Máx ~120 palabras.`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  return {
    texto: `${body}\n\n${cta}`,
    hashtags: hash(HB, ["#ONGs", "#TercerSector", "#ComunicaciónSocial"], ["#CasoDeUso", "#InspiraciónDigital"]),
    img: imagen(pick(ESCENAS_ONG)),
  };
}

/* ------------------------------ Empresa (Carlos) ---------------------------- */
const SUBV_EMPRESA = [
  "un estudio de diseño gráfico de 2 personas", "una cafetería con servicio a domicilio en el barrio",
  "un negocio freelance de desarrollo web", "un taller mecánico o un pequeño comercio local",
  "una escuela de idiomas pequeña con 2 profesores", "una tienda online de artesanía propia",
];
const ESCENAS_EMPRESA: Escena[] = [
  { en: "A neighborhood shop with the owner behind the counter on a quiet day, shopfront with natural light, camera from inside looking out." },
  { en: "A solo midday café: a table with a closed laptop, an almost-empty cup, an open notebook with jottings." },
  { en: "A small coworking with two or three desks occupied, warm light, a discreet plant, the owner in a hoodie (not a suit)." },
  { en: "A garage or small workshop with the tools of the trade, a real working atmosphere, not aspirational." },
  { en: "A back-office desk with genuinely stacked papers: invoices, catalogues, notes." },
  { en: "Someone preparing delivery orders by bicycle or motorbike outside a small business." },
];

async function piezaArquetipoEmpresa(): Promise<Pieza | null> {
  const sub = pick(SUBV_EMPRESA);
  const cta = pick(["Prueba o2Wave en o2wave.app", "Recupera esas horas — o2wave.app"]);
  const prompt = `${GUARDARRAILES}

Escribe el CUERPO (sin CTA, sin hashtags) de un post de marketing para las redes de o2Wave. Caso concreto FICTICIO y verosímil de una pyme/negocio local. Historia por encima del eslogan.
Protagonista: Carlos, que lleva ${sub}, solo o con 1-2 personas. Problema: las redes son "una tarea más entre veinte"; el cliente delante siempre gana prioridad; publicar queda para el final del día y no sale.
o2Wave resuelve: Carlos describe en una frase lo que quiere anunciar y la app genera texto e imagen listos; los posts salen sin robarle la mañana.
OBLIGATORIO: verbo humano ("lleva", "gestiona", "atiende"), nunca "CEO". PROHIBIDO: nombres reales de negocios/marcas, precios concretos, "emprendedor exitoso"/"self-made", anglicismos (startup, founder, growth hacking), referencias a Musk/Jobs. Máx ~120 palabras.`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  return {
    texto: `${body}\n\n${cta}`,
    hashtags: hash(HB, ["#Pymes", "#EmprendedoresDigitales", "#NegocioLocal"], ["#CasoDeUso", "#InspiraciónDigital"]),
    img: imagen(pick(ESCENAS_EMPRESA)),
  };
}

/* ----------------------------- Particular (María) --------------------------- */
const SUBV_PARTICULAR = [
  "coach de bienestar y hábitos con clientes 1 a 1", "creadora de contenido cultural o educativo (pódcast, boletín)",
  "autora auto-publicada (novela o no ficción)", "terapeuta con consulta propia (psicóloga, fisio o nutricionista)",
  "ilustradora freelance con encargos", "formadora online con cursos propios",
];
const ESCENAS_PARTICULAR: Escena[] = [
  { en: "A home desk moderately tidy (a small plant, a cup, a notebook) — not a perfect 'clean girl' setup; there is a notebook, a post-it, maybe an open book." },
  { en: "A bright café working alone: a table by the window, a laptop, a notebook, other people blurred in the background, a calm atmosphere.", logo: true },
  { en: "A small colorful coworking, the person wearing headphones or writing by hand." },
  { en: "A small classroom giving a workshop to 5-10 people, seated in a circle or U shape." },
  { en: "A home study corner: a bookshelf, a desk, a comfy chair, warm afternoon light." },
];

async function piezaArquetipoParticular(): Promise<Pieza | null> {
  const sub = pick(SUBV_PARTICULAR);
  const cta = pick(["Prueba o2Wave en o2wave.app", "Recupera esas horas — o2wave.app"]);
  const prompt = `${GUARDARRAILES}

Escribe el CUERPO (sin CTA, sin hashtags) de un post de marketing para las redes de o2Wave. Caso concreto FICTICIO y verosímil de una persona con proyecto propio. Historia por encima del eslogan.
Protagonista: María, ${sub}, que trabaja sola. Problema: su marca personal ES su trabajo, pero mantenerla activa en redes le agota; perfeccionista, tarda horas en cada post; prefiere dedicarse a su oficio.
o2Wave resuelve: María describe la reflexión o idea de la semana y la app genera texto e imagen listos; sigue siendo su voz, sale antes.
OBLIGATORIO: "su marca personal", "su trabajo", "lo que hace". PROHIBIDO: "creator"/"influencer" (usa "creadora"/"autora"/el oficio), "boss babe"/"girl boss", "personal branding"/"storytelling"/"content strategy", superlativos, seguidores como métrica, precios. Máx ~120 palabras.`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  return {
    texto: `${body}\n\n${cta}`,
    hashtags: hash(HB, ["#ProyectosPersonales", "#FreelanceProductivo", "#MarcaPersonal"], ["#CasoDeUso", "#InspiraciónDigital"]),
    img: imagen(pick(ESCENAS_PARTICULAR)),
  };
}

/* ---------------------------------- Dato ------------------------------------ */
const ESCENAS_DATO: Escena[] = [
  { en: "A minimalist infographic with the big figure centered (bold numbers, plain background, simple typography)." },
  { en: "A clean chart (bars or a line) on a neutral background, no logos." },
  { en: "A hand pointing at a printed chart on paper." },
  { en: "People seen from behind looking at a figure projected on a screen at a talk." },
  { en: "A desk with a printed report or newspaper showing a highlighted figure." },
];

async function piezaDato(): Promise<Pieza | null> {
  const d = pick(datos as { frase: string; anio: string; fuente: string; afinidad: string }[]);
  const cta = pick(["Comparte con quien lo necesite", "Más info en o2wave.app", "Sigue por más datos como este — @o2wave.app"]);
  const prompt = `${GUARDARRAILES}

Escribe el CUERPO (sin CTA, sin hashtags, sin la línea de fuente) de un post de o2Wave que ancla autoridad con un dato REAL. NO vender directamente.
Dato exacto a comunicar (no lo alteres ni redondees): "${d.frase}"
Estructura: presenta el dato con naturalidad y añade 1-2 frases de contexto útil (por qué importa para comunicar mejor). Voz de marca, tercera persona neutra. NO fuerces "pero con o2Wave todo cambia". Máx ~90 palabras.`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  const contexto = d.afinidad === "ONG" ? "#TercerSector" : "#RedesSociales";
  return {
    // Fuente OBLIGATORIA al final, antes del CTA.
    texto: `${body}\n\n(Fuente: ${d.fuente}, ${d.anio})\n\n${cta}`,
    hashtags: hash(HB, ["#DatoInteresante", "#DatoDelDía"], [contexto]),
    img: imagen(pick(ESCENAS_DATO), true),
  };
}

/* -------------------------------- Educativa --------------------------------- */
const ESCENAS_EDU: Escena[] = [
  { en: "An open notebook with a post-it highlighting a key phrase, a calm desk." },
  { en: "A quiet café without a laptop: a notebook, a pen, a cup, a calm atmosphere." },
  { en: "A person thinking with a hand on the chin, a reflective expression." },
  { en: "A small chalkboard with a single phrase written on it." },
  { en: "An armchair with an open book and a notebook beside it." },
  { en: "A window with natural light, a slow shot with paper and a pen." },
];

async function piezaEducativa(variante?: string): Promise<Pieza | null> {
  // Pool general: excluye tips restringidos (compatibles_con != null, p. ej. #13
  // "comparte errores", que solo va con arquetipo ONG/Particular).
  const pool = (tips as { tip: string; compatibles_con: string[] | null }[]).filter((t) => !t.compatibles_con);
  const t = pick(pool);
  const prompt = `${GUARDARRAILES}

Escribe el CUERPO (sin hashtags, sin CTA, sin mencionar o2Wave en el cuerpo) de un post EDUCATIVO de redes: un consejo útil de comunicación, tono editorial (parece un post orgánico, no publicitario).
Consejo a desarrollar: "${t.tip}"
Estructura: plantea el consejo claro y accionable + un ejemplo concreto (aunque sea genérico) de cómo aplicarlo. PROHIBIDO: mencionar features de o2Wave, "hack/trick" (usa "un consejo"/"un truco"), "engagement/reach/conversion" (usa interacción/alcance/resultado), competidores. Máx ~110 palabras.`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  // Variante B → mini-firma; variante A → sin CTA. (El ciclo pasa A/B; aleatorio si no.)
  const conFirma = variante ? variante === "B" : Math.random() < 0.5;
  const texto = conFirma ? `${body}\n\n─────────────\nCompartido por el equipo de o2Wave · o2wave.app 🌊` : body;
  return {
    texto,
    hashtags: hash(HB, ["#ComunicaciónEfectiva", "#TipsRedesSociales", "#ContenidoDeValor"]),
    img: imagen(pick(ESCENAS_EDU)),
  };
}

/* --------------------------------- Novedad ---------------------------------- */
const ESCENAS_NOVEDAD: Escena[] = [
  { en: "An abstract drawing of an improvement (a cloud, a timeline, an arrow), no brand." },
  { en: "A hand touching a blurry phone screen (an app-like look is fine, no real UI or logos)." },
  { en: "A generic minimalist flow (step 1 → step 2 → step 3), abstract, no brand." },
  { en: "A person with an 'oh, this is easier' expression looking at a screen." },
];

async function piezaNovedad(ctx?: { version?: string; feature?: string }): Promise<Pieza | null> {
  // La feature DEBE venir de la whitelist (o del ctx que pasa el admin).
  const fallback = pick(features as { version: string; feature: string; descripcion: string }[]);
  const version = ctx?.version || fallback.version;
  const feature = ctx?.feature || fallback.feature;
  const desc = (features as { feature: string; descripcion: string }[]).find((f) => f.feature === feature)?.descripcion || "";
  const cta = pick(["Descubre qué hay nuevo — o2wave.app", "Actualiza tu experiencia — o2wave.app"]);
  const prompt = `${GUARDARRAILES}

EXCEPCIÓN a la política de features: en esta pieza SÍ puedes nombrar la feature REAL indicada (y solo esa). Escribe el CUERPO (sin CTA, sin hashtags) de un post que anuncia una mejora de o2Wave.
Feature real (${version}): "${feature}". Qué hace: ${desc}
Estructura: anuncio directo + beneficio concreto para la persona usuaria. PROHIBIDO: nombrar cualquier otra feature no indicada, "revolucionario"/"único en el mercado", comparaciones con competidores. Máx ~100 palabras.`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  return {
    texto: `${body}\n\n${cta}`,
    hashtags: hash(HB, ["#Actualización", "#Novedad", "#MejoraDelProducto"]),
    img: imagen(pick(ESCENAS_NOVEDAD)),
  };
}

/**
 * Dispatcher: construye una pieza del tipo dado. `piezaProducto` sigue en
 * generator.ts (v1.4) — este módulo cubre los 6 tipos nuevos de v2.1.
 */
export async function construirPieza(
  tipo: TipoPieza, opts?: { variante?: string; novedad?: { version?: string; feature?: string } },
): Promise<Pieza | null> {
  switch (tipo) {
    case "piezaArquetipoONG": return piezaArquetipoONG();
    case "piezaArquetipoEmpresa": return piezaArquetipoEmpresa();
    case "piezaArquetipoParticular": return piezaArquetipoParticular();
    case "piezaDato": return piezaDato();
    case "piezaEducativa": return piezaEducativa(opts?.variante);
    case "piezaNovedad": return piezaNovedad(opts?.novedad);
    default: return null; // piezaProducto lo maneja generator.ts
  }
}
