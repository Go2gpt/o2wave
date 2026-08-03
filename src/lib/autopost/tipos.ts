import Anthropic from "@anthropic-ai/sdk";
import datos from "@/lib/autopost/data/datos-piezadato.json";
import tips from "@/lib/autopost/data/tips-piezaeducativa.json";
import causas from "@/lib/autopost/data/causas-piezaarquetipoONG.json";
import featuresData from "@/lib/autopost/data/features-piezanovedad.json";

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
- o2Wave es una WEB (webapp), NO una app de móvil. PROHIBIDO: "descarga la app", "descarga o2Wave", "en la app", "instala/instalar la app", "App Store", "Google Play", "Play Store". USA: "en o2wave.app", "desde tu navegador", "en la web", "sin instalación". Toda CTA lleva SIEMPRE "o2wave.app".
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
// Pool genérico (a Marketing le gustó). Nota de género no forzada: si hay persona
// focal, la coordinadora es Ana (mujer); el resto, voluntariado mixto.
const ONG_PERSONA = "If a focal person appears, the coordinator is an adult woman (Ana); any others are volunteers of mixed ages and genders. Warm and candid, not glossy stock.";
const ESCENAS_ONG: Escena[] = [
  { en: "Small meeting table with 3-5 volunteers of mixed ages around a computer and sticky notes, a thermos of coffee at the center, a warm but modest room with mismatched chairs and papers on the wall." },
  { en: "A modest shared NGO office: a wall with posters of past campaigns, a discreet plant, a work desk with papers more or less tidy." },
  { en: "A small charity event in a neighborhood square or local hall: a table with leaflets, two or three people attending, a varied local public." },
  { en: "A community workshop with 5-10 people seated in a circle around a table, listening and taking part." },
  { en: "A wall calendar with dates marked in red and blue, stacked envelopes, a phone off the hook." },
];

async function piezaArquetipoONG(subIndex = 0): Promise<Pieza | null> {
  const activas = (causas as { label: string; estado: string }[]).filter((c) => c.estado === "activa");
  const causa = activas[subIndex % activas.length]; // rotación determinista de causa
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
QUÉDATE EN EL CARRIL: habla SOLO de Ana y su entidad social; NO menciones empresas/pymes, "marca personal" ni "Particulares".
OBLIGATORIO: verbo genérico ("dirige", "coordina", "impulsa"), zona genérica ("en un barrio", "en zona rural"). PROHIBIDO: nombres reales de ONGs o personas, ciudades identificables, cifras inventadas, tech-bro speak. Máx ~120 palabras.`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  return {
    texto: `${body}\n\n${cta}`,
    hashtags: hash(HB, ["#ONGs", "#TercerSector", "#ComunicaciónSocial"], ["#CasoDeUso", "#InspiraciónDigital"]),
    img: `${imagen(pick(ESCENAS_ONG))}\n\n${ONG_PERSONA}`,
  };
}

/* ------------------------------ Empresa (Carlos) ---------------------------- */
// Cada subvariante trae SUS propias escenas, con GÉNERO (Carlos = hombre) y
// CONTEXTO del negocio bakeados en el texto — la imagen no puede salir con
// género/contexto incompatible con el copy (bug v2.1.1). Escena determinista por
// subIndex (escena↔copy bloqueados, sin pick aleatorio).
const PERSONA_HOMBRE = "PERSON SHOWN: the protagonist is an adult man. One or two people maximum, no crowd, natural and candid (not glossy stock).";
const SUBV_EMPRESA: { label: string; escenas: Escena[] }[] = [
  { label: "un estudio de diseño gráfico de 2 personas", escenas: [
    { en: "A man at a small graphic design studio desk, printed mockups and colour swatches pinned on the wall behind him, daylight, focused and calm." },
    { en: "A man reviewing printed posters pinned on a studio wall, a creative small studio, natural light." },
    { en: "A man working at a design studio desk with a drawing tablet and mugs of coffee, engaged in his work." },
  ] },
  { label: "una cafetería con servicio a domicilio en el barrio", escenas: [
    { en: "A man behind a neighbourhood café counter at opening time, pastries in the display case, warm morning light, welcoming attitude." },
    { en: "A man working as a barista, steaming milk at a café bar with cups lined up on the counter." },
    { en: "A man setting up his café at dawn, arranging chairs and preparing delivery orders, warm light." },
  ] },
  { label: "un negocio freelance de desarrollo web", escenas: [
    { en: "A man at a calm daytime home office with two monitors showing blurred code and a mechanical keyboard, focused." },
    { en: "A man at a tidy developer desk with a laptop, a coffee and a small plant, quiet room, natural light.", logo: true },
    { en: "A man at a coworking desk with headphones and a notebook full of wireframe sketches, engaged." },
  ] },
  { label: "un taller mecánico o un pequeño comercio local", escenas: [
    { en: "A man working in a small mechanic workshop with tools and a car lifted, a real working atmosphere." },
    { en: "A man arranging products on the shelves of his small local shop, daylight, focused." },
    { en: "A man at a workshop bench with the tools of the trade and a handwritten order list." },
  ] },
  { label: "una escuela de idiomas pequeña con 2 profesores", escenas: [
    { en: "A man teaching in a small language classroom, a whiteboard full of vocabulary behind him, a few chairs." },
    { en: "A male teacher at a desk with textbooks and flashcards, warm light, focused." },
    { en: "A man arranging chairs in a semicircle in a small classroom with language posters on the wall." },
  ] },
  { label: "una tienda online de artesanía propia", escenas: [
    { en: "A man at a craft workshop table with handmade products and packaging materials, photographing an item with a phone." },
    { en: "A man wrapping a small parcel of handmade crafts on a wooden table, warm light." },
    { en: "A man's hands finishing a handmade product on a wooden table, warm light, focused craftsmanship." },
  ] },
];

/** Escena determinista: subvariante por (subIndex % nSub), escena por ciclo (subIndex / nSub). */
function escenaDeSub(sub: { escenas: Escena[] }, subIndex: number, nSub: number): Escena {
  return sub.escenas[Math.floor(subIndex / nSub) % sub.escenas.length];
}

async function piezaArquetipoEmpresa(subIndex = 0): Promise<Pieza | null> {
  const sub = SUBV_EMPRESA[subIndex % SUBV_EMPRESA.length]; // rotación determinista de subvariante
  const escena = escenaDeSub(sub, subIndex, SUBV_EMPRESA.length);
  const cta = pick(["Prueba o2Wave en o2wave.app", "Recupera esas horas — o2wave.app"]);
  const prompt = `${GUARDARRAILES}

Escribe el CUERPO (sin CTA, sin hashtags) de un post de marketing para las redes de o2Wave. Caso concreto FICTICIO y verosímil de una EMPRESA / pyme / negocio local. Historia por encima del eslogan.
Protagonista: Carlos, que lleva ${sub.label}, solo o con 1-2 personas. Problema: las redes son "una tarea más entre veinte"; el cliente delante siempre gana prioridad; publicar queda para el final del día y no sale.
o2Wave resuelve: Carlos describe en una frase lo que quiere anunciar y la app genera texto e imagen listos; los posts salen sin robarle la mañana.
QUÉDATE EN EL CARRIL: habla SOLO de Carlos y su negocio. PROHIBIDO mencionar "marca personal", "Particulares", "personas con proyectos personales", ONGs o "creadores" — este post es de EMPRESA.
OBLIGATORIO: verbo humano ("lleva", "gestiona", "atiende"), nunca "CEO". PROHIBIDO: nombres reales de negocios/marcas, precios concretos, "emprendedor exitoso"/"self-made", anglicismos (startup, founder, growth hacking), referencias a Musk/Jobs. Máx ~120 palabras.`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  return {
    texto: `${body}\n\n${cta}`,
    hashtags: hash(HB, ["#Pymes", "#EmprendedoresDigitales", "#NegocioLocal"], ["#CasoDeUso", "#InspiraciónDigital"]),
    img: `${imagen(escena)}\n\n${PERSONA_HOMBRE}`,
  };
}

/* ----------------------------- Particular (María) --------------------------- */
// Escenas con GÉNERO (María = mujer) + ELEMENTOS DEL OFICIO del copy (micrófono/
// paneles acústicos para pódcast, tableta+bocetos para ilustradora, etc.) — la
// imagen refleja el oficio ficticio, no un rincón genérico (bug v2.1.1).
const PERSONA_MUJER = "PERSON SHOWN: the protagonist is an adult woman. One or two people maximum, no crowd, natural and candid (not glossy stock).";
const SUBV_PARTICULAR: { label: string; escenas: Escena[] }[] = [
  { label: "coach de bienestar y hábitos con clientes 1 a 1", escenas: [
    { en: "A woman coach at a calm desk with a notebook, a laptop and handwritten notes, warm afternoon light, focused and positive." },
    { en: "A woman writing goals in a planner beside a rolled-up yoga mat, a bright room, engaged." },
    { en: "A woman reviewing session notes in a notebook by a window, calm and content." },
  ] },
  { label: "creadora de contenido cultural o educativo (pódcast o boletín)", escenas: [
    { en: "A woman at a home podcast setup: a professional microphone, headphones and a small audio interface on the desk, acoustic foam panels on the wall, focused." },
    { en: "A woman recording into a professional microphone with headphones on, a modest home studio, warm light." },
    { en: "A woman editing audio on a laptop with headphones, a microphone beside her, engaged." },
  ] },
  { label: "autora auto-publicada (novela o no ficción)", escenas: [
    { en: "A woman author at a writing desk with an open notebook and a stack of her own printed books, a warm lamp, focused." },
    { en: "A woman writing by hand at a desk with a printed manuscript and a pen, engaged and calm." },
    { en: "A woman reviewing the page proofs of her book at a bright table, content." },
  ] },
  { label: "terapeuta con consulta propia (psicóloga, fisio o nutricionista)", escenas: [
    { en: "A woman therapist in her own small consultation room with two chairs, a plant and a notebook, warm light, welcoming." },
    { en: "A woman at a tidy consultation desk writing notes, a calm professional room, natural light." },
    { en: "A woman preparing her consultation room, arranging chairs and a notebook, positive attitude." },
  ] },
  { label: "ilustradora freelance con encargos", escenas: [
    { en: "A woman illustrator at her desk with a graphics tablet, pencils and sketches pinned around, natural light, focused." },
    { en: "A woman sketching with watercolours and brushes on paper at an artist's table, engaged." },
    { en: "A woman finishing an illustration at a wooden table covered with art materials, warm light." },
  ] },
  { label: "formadora online con cursos propios", escenas: [
    { en: "A woman online trainer at a home setup with a laptop, a notebook and a printed course outline, daytime, focused and positive.", logo: true },
    { en: "A woman recording a lesson at a desk with a laptop and lesson notes, natural light, engaged." },
    { en: "A woman preparing course materials at a bright desk with a laptop and handwritten plans." },
  ] },
];

async function piezaArquetipoParticular(subIndex = 0): Promise<Pieza | null> {
  const sub = SUBV_PARTICULAR[subIndex % SUBV_PARTICULAR.length]; // rotación determinista de subvariante
  const escena = escenaDeSub(sub, subIndex, SUBV_PARTICULAR.length);
  const cta = pick(["Prueba o2Wave en o2wave.app", "Recupera esas horas — o2wave.app"]);
  const prompt = `${GUARDARRAILES}

Escribe el CUERPO (sin CTA, sin hashtags) de un post de marketing para las redes de o2Wave. Caso concreto FICTICIO y verosímil de una PARTICULAR (persona con proyecto propio). Historia por encima del eslogan.
Protagonista: María, ${sub.label}, que trabaja sola. Problema: su marca personal ES su trabajo, pero mantenerla activa en redes le agota; perfeccionista, tarda horas en cada post; prefiere dedicarse a su oficio.
o2Wave resuelve: María describe la reflexión o idea de la semana y la app genera texto e imagen listos; sigue siendo su voz, sale antes.
NOMENCLATURA (guía Marketing §0): en el copy publicado di "personas" / "personas que gestionan su marca personal" — NUNCA "Particulares" (suena burocrático). A María descríbela por su oficio. Evita "creator"/"influencer" (usa "creadora"/"autora"/el oficio).
QUÉDATE EN EL CARRIL: habla SOLO de María y su proyecto propio; NO menciones empresas ni ONGs como sujeto.
OBLIGATORIO: "su marca personal", "su trabajo", "lo que hace". PROHIBIDO: "boss babe"/"girl boss", "personal branding"/"storytelling"/"content strategy", superlativos, seguidores como métrica, precios. Máx ~120 palabras.`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  return {
    texto: `${body}\n\n${cta}`,
    hashtags: hash(HB, ["#ProyectosPersonales", "#FreelanceProductivo", "#MarcaPersonal"], ["#CasoDeUso", "#InspiraciónDigital"]),
    img: `${imagen(escena)}\n\n${PERSONA_MUJER}`,
  };
}

/* ---------------------------------- Dato ------------------------------------ */
// Gemini inventaba texto/cifras ilegibles ("gibberish") en periódicos/pizarras y
// resaltaba un número que no era el del copy. Escenas 100% abstractas, SIN texto:
// el dato vive SOLO en el copy; la imagen pone ambiente, no repite el dato.
// Bug v2.1.1: 100% abstracta perdía ancla humana. Se añade presencia humana
// ANÓNIMA (manos, siluetas, personas de espaldas) SIN texto — DATO_SIN_TEXTO sigue.
const ESCENAS_DATO: Escena[] = [
  { en: "Two people's hands collaborating over a table, passing a blank sheet of paper (nothing written on it), natural daylight." },
  { en: "Two people seen from behind looking at abstract coloured bars and circles on a screen, blurred and unreadable, no labels." },
  { en: "A minimalist composition of geometric shapes and generic icons with a small human figure for scale, earthy tones, no labels." },
  { en: "Anonymous hands writing on a blank sheet beside a calculator and a small plant, no readable text, soft daylight." },
  { en: "People from behind working together in front of a wall of abstract coloured shapes (no words, no numbers)." },
];
// Regla dura anti-gibberish que se anexa al prompt de imagen del Dato.
const DATO_SIN_TEXTO = `NO readable text, headlines, statistics or numbers as text elements in the image. NO newspapers, magazines or documents with visible text. NO whiteboards with words. Use abstract visual metaphors: geometric shapes, colored bars/circles without labels, silhouettes with unreadable/blurred graphs behind, minimalist infographics with generic icons. The figure lives in the caption — the image sets ambient, it does NOT repeat the data.`;

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
    // permitirTexto=false (aplica "no text, no letters") + regla anti-gibberish.
    img: `${imagen(pick(ESCENAS_DATO))}\n\n${DATO_SIN_TEXTO}`,
  };
}

/* -------------------------------- Educativa --------------------------------- */
// Bug v2.1.1: la escena "pensativa con mano en mejilla mirando por ventana" se leía
// como tristeza/melancolía. Escenas con actitud ACTIVA y positiva; EDU_ANIMO fuerza
// expresión concentrada/positiva y prohíbe la lectura melancólica.
const ESCENAS_EDU: Escena[] = [
  { en: "An open notebook with a post-it highlighting a key phrase, a calm bright desk, no readable text." },
  { en: "A quiet café table without a laptop: a notebook, a pen and a cup, a calm bright atmosphere." },
  { en: "A person actively writing a note in a notebook at a bright desk, focused and content." },
  { en: "A small chalkboard with a simple hand-drawn arrow or shape (no words), a tidy bright desk." },
  { en: "An armchair with an open book and a notebook beside it, warm natural light." },
  { en: "A person actively jotting an idea on paper at a desk by a window, engaged and calm." },
];
const EDU_ANIMO = "If a person appears: focused positive expression, a subtle smile or a neutral professional attitude, actively engaged in the activity (writing, reading a note, actively sipping coffee). NOT sad, NOT melancholic, NOT resting the head on the hand, NOT staring pensively through a window.";

// Firma canónica v2.1.1 §1.7: línea horizontal + salto DOBLE + firma. Va al final
// del cuerpo, ANTES de los hashtags (los añade crearPieza).
const FIRMA_EDU = "─────────────\n\nCompartido por el equipo de o2Wave · o2wave.app 🌊";

async function piezaEducativa(): Promise<Pieza | null> {
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
  // Patch guía v2.1.1 §1.7: SIEMPRE variante B (firma discreta) en fase de
  // captación. Variante A (sin firma) pospuesta hasta 100 usuarios pagos / 6
  // meses de tracción → se reactivará en v2.2.
  const texto = `${body}\n\n${FIRMA_EDU}`;
  return {
    texto,
    hashtags: hash(HB, ["#ComunicaciónEfectiva", "#TipsRedesSociales", "#ContenidoDeValor"]),
    img: `${imagen(pick(ESCENAS_EDU))}\n\n${EDU_ANIMO}`,
  };
}

/* --------------------------------- Novedad ---------------------------------- */
export interface FeatureNovedad {
  id: string; activa: boolean; version: string; nombre_interno: string;
  titulo_corto: string; descripcion_beneficio_usuario: string;
  fecha_lanzamiento: string; fecha_anuncio_externo: string | null;
  caducidad_automatica_semanas?: number;
  focos_sugeridos?: string[]; notas_marketing?: string[];
}
const FEATURES: FeatureNovedad[] = (featuresData as { features?: FeatureNovedad[] }).features ?? [];

/**
 * Features candidatas a piezaNovedad (guía Marketing v2.1, 3 condiciones DURAS):
 * activa === true AND fecha_anuncio_externo === null AND
 * (hoy - fecha_lanzamiento) < caducidad_automatica_semanas·7d (default 4 semanas).
 * Auto-poda: al anunciarse o caducar, la feature deja de ser candidata sola.
 */
export function featuresCandidatas(hoy: Date): FeatureNovedad[] {
  return FEATURES.filter((f) => {
    if (!f.activa) return false;
    if (f.fecha_anuncio_externo !== null) return false;
    const lanz = Date.parse(`${f.fecha_lanzamiento}T00:00:00Z`);
    if (Number.isNaN(lanz)) return false;
    const semanas = f.caducidad_automatica_semanas ?? 4;
    const diff = hoy.getTime() - lanz;
    return diff >= 0 && diff < semanas * 7 * 24 * 60 * 60 * 1000;
  });
}

const ESCENAS_NOVEDAD: Escena[] = [
  { en: "An abstract drawing of an improvement (a cloud, a timeline, an arrow), no brand." },
  { en: "A hand touching a blurry phone screen (an app-like look is fine, no real UI or logos)." },
  { en: "A generic minimalist flow (step 1 → step 2 → step 3), abstract, no brand." },
  { en: "A person with an 'oh, this is easier' expression looking at a screen." },
];

async function piezaNovedad(ctx?: { featureId?: string }): Promise<Pieza | null> {
  // Solo se anuncian features candidatas (filtro Marketing). Si el generador pasó
  // un featureId, se respeta si sigue siendo candidato; si no, la primera candidata.
  const cands = featuresCandidatas(new Date());
  const feat = (ctx?.featureId && cands.find((f) => f.id === ctx.featureId)) || cands[0];
  if (!feat) return null; // sin candidatas → el generador ya avisa a Sebas por email
  const cta = pick(["Descúbrelo en o2wave.app", "Entra en o2wave.app y pruébalo"]);
  const notas = (feat.notas_marketing ?? []).map((n) => `- ${n}`).join("\n");
  const prompt = `${GUARDARRAILES}

EXCEPCIÓN a la política de features: en esta pieza SÍ puedes describir la mejora REAL indicada (y solo esa). Escribe el CUERPO (sin CTA, sin hashtags) de un post que anuncia una mejora de o2Wave.
Mejora real (${feat.version}): "${feat.titulo_corto}". Qué aporta al usuario: ${feat.descripcion_beneficio_usuario}
REGLAS DE ESTA PIEZA (Marketing):
- La mejora YA lleva semanas publicada. PROHIBIDO "hoy lanzamos", "acabamos de sacar", "ya disponible". USA "en la última actualización de o2Wave" o "desde hace unas semanas".
- NO uses la palabra "novedad" de forma redundante.
- NO inventes cifras de impacto (no hay medición): describe el beneficio en cualitativo.
- NO nombres ninguna otra feature ni "revolucionario"/"único en el mercado". Máx ~100 palabras.
${notas ? `NOTAS ADICIONALES:\n${notas}` : ""}`;
  const body = await claudeTexto(prompt);
  if (!body) return null;
  return {
    texto: `${body}\n\n${cta}`,
    hashtags: hash(HB, ["#Actualización", "#MejoraDelProducto"]),
    img: imagen(pick(ESCENAS_NOVEDAD)),
  };
}

/**
 * Dispatcher: construye una pieza del tipo dado. `piezaProducto` sigue en
 * generator.ts (v1.4) — este módulo cubre los 6 tipos nuevos de v2.1.
 */
export async function construirPieza(
  tipo: TipoPieza, opts?: { variante?: string; subIndex?: number; novedad?: { featureId?: string } },
): Promise<Pieza | null> {
  const s = opts?.subIndex ?? 0;
  switch (tipo) {
    case "piezaArquetipoONG": return piezaArquetipoONG(s);
    case "piezaArquetipoEmpresa": return piezaArquetipoEmpresa(s);
    case "piezaArquetipoParticular": return piezaArquetipoParticular(s);
    case "piezaDato": return piezaDato();
    case "piezaEducativa": return piezaEducativa(); // v2.1.1: siempre variante B (firma)
    case "piezaNovedad": return piezaNovedad(opts?.novedad);
    default: return null; // piezaProducto lo maneja generator.ts
  }
}
