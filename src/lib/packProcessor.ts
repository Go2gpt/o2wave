import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { composeImage } from "@/lib/composeImage";
import type { PackDia, PackFuente, GuionTikTok } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

// Presupuesto de tiempo: margen bajo el maxDuration=300 del endpoint (Vercel Pro).
// Con ~30s por imagen (FLUX + sharp), 290s permiten generar las 5-7 imágenes
// del pack con holgura. Abandonamos imagen si quedan <40s de seguridad.
const TIEMPO_TOTAL_MS = 290_000;
const MIN_MS_PARA_IMAGEN = 40_000;

const pad = (n: number) => String(n).padStart(2, "0");
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
}

function contextoDe(p: PerfilPack): string {
  const temas = Array.isArray(p.temas_prioritarios) ? p.temas_prioritarios.join(", ") : "";
  return [
    p.sector && `Sector: ${p.sector}`,
    p.mision_valores && `Misión y valores: ${p.mision_valores}`,
    p.publico_objetivo && `Público objetivo: ${p.publico_objetivo}`,
    p.servicios_programas && `Servicios/programas: ${p.servicios_programas}`,
    p.causas_o_productos && `Causas/productos: ${p.causas_o_productos}`,
    temas && `Temas prioritarios: ${temas}`,
    p.logros_numeros && `Logros/números: ${p.logros_numeros}`,
  ].filter(Boolean).join("\n");
}

/** Temas sugeridos por IA basados en la actividad real (no efemérides genéricas). */
async function temasIA(p: PerfilPack, n: number): Promise<string[]> {
  if (n <= 0) return [];
  try {
    const prompt = `Eres estratega de contenido para "${p.nombre_entidad || "una organización"}".
${contextoDe(p)}

Propón ${n} temas de publicación variados y CONCRETOS, basados en la actividad real de esta organización (sus servicios, causas, público y logros). NO uses efemérides genéricas ni días internacionales. Cada tema en una frase corta y accionable.
Responde SOLO con JSON: {"temas": ["tema 1", "tema 2", ...]} con exactamente ${n} elementos.`;
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 400, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
    const parsed = parseJSON(raw) as { temas?: unknown };
    const temas = Array.isArray(parsed?.temas) ? parsed.temas.filter((t): t is string => typeof t === "string") : [];
    // Rellenar si la IA devuelve menos de los pedidos.
    while (temas.length < n) temas.push("Comparte una historia o impacto de tu organización");
    return temas.slice(0, n);
  } catch {
    return Array.from({ length: n }, () => "Comparte una historia o impacto de tu organización");
  }
}

interface TextoRed { titular: string; texto: string; hashtags: string[]; prompt_imagen: string; }

const promptImagenFallback = (tema: string) =>
  `Fotografía realista de alta calidad relacionada con "${tema}". Composición limpia, luminosa y profesional, ambiente positivo.`;

/** Genera titular + texto + hashtags + descripción visual de la imagen (Instagram/Facebook). */
async function generarTextoRed(p: PerfilPack, tema: string, red: string): Promise<TextoRed> {
  try {
    const limite = red === "Instagram" ? "máximo 150 palabras" : "máximo 200 palabras";
    const prompt = `Genera un post para ${red} de "${p.nombre_entidad || "la organización"}" (${p.tipo_entidad || "ong"}).
Tema: ${tema}
${contextoDe(p)}

Responde SOLO con JSON válido:
{
  "titular": "6-8 palabras impactantes para superponer sobre la imagen",
  "texto": "texto listo para publicar (${limite}), con emojis",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "prompt_imagen": "DESCRIPCIÓN VISUAL de la imagen ideal para acompañar el post"
}
- Incluye 8-12 hashtags relevantes al tema y al sector.
- "prompt_imagen" debe ser una descripción VISUAL concreta de qué pintar (escena, sujetos, lugar, luz, ambiente, estilo fotográfico). NO un eslogan ni una frase del texto. Ejemplo: "Vista aérea de un océano azul cristalino al amanecer, una ola suave acercándose a una playa de arena clara, luz dorada cálida, fotografía realista de alta calidad". No menciones texto ni logos.`;
    const res = await anthropic.messages.create({ model: MODEL, max_tokens: 1000, messages: [{ role: "user", content: prompt }] });
    const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
    const o = (parseJSON(raw) || {}) as Record<string, unknown>;
    const promptImg = typeof o.prompt_imagen === "string" && o.prompt_imagen.trim().length > 10
      ? o.prompt_imagen.trim() : promptImagenFallback(tema);
    return {
      titular: typeof o.titular === "string" ? o.titular.replace(/^["'«»]|["'«»]$/g, "") : tema,
      texto: typeof o.texto === "string" ? o.texto : "",
      hashtags: (Array.isArray(o.hashtags) ? o.hashtags : []).filter((h): h is string => typeof h === "string").map((h) => h.startsWith("#") ? h : `#${h}`),
      prompt_imagen: promptImg,
    };
  } catch {
    return { titular: tema, texto: "", hashtags: [], prompt_imagen: promptImagenFallback(tema) };
  }
}

/** Genera guion estructurado de TikTok. */
async function generarGuionTikTok(p: PerfilPack, tema: string): Promise<{ guion: GuionTikTok | null; texto: string; titular: string; hashtags: string[] }> {
  try {
    const prompt = `Crea un guion de TikTok (30s, tono cercano) para "${p.nombre_entidad || "la organización"}".
Tema: ${tema}
${contextoDe(p)}

Responde SOLO con JSON válido:
{"titular":"6-10 palabras","guion":[{"tiempo":"0-3s","voz":"...","accion":"..."}],"planos":[{"numero":1,"descripcion":"plano práctico con smartphone"}],"hashtags":["#fyp","#parati"],"audio_sugerido":"tipo de audio genérico, no una canción concreta"}
Usa 3-4 segmentos. 10-12 hashtags.`;
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

const aspectPara = (red: string) => (red === "Facebook" ? "16:9" : "1:1");

/** Genera imagen FLUX (con prompt visual) + hornea titular con sharp + sube a post-images. Devuelve URL o null. */
async function generarImagen(
  admin: SupabaseClient, userId: string, promptImagen: string, titular: string, red: string, presupuestoMs: number,
): Promise<string | null> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token || presupuestoMs < MIN_MS_PARA_IMAGEN) return null;
  try {
    const aspect = aspectPara(red);
    // Usamos la descripción VISUAL de Claude y forzamos SIEMPRE el "sin texto"
    // para que FLUX no pinte letras inventadas (el titular lo horneamos nosotros).
    const fluxPrompt = `${promptImagen} Sin texto, sin letras, sin palabras, sin logos. High quality, clean composition.`;
    const startRes = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input: { prompt: fluxPrompt, aspect_ratio: aspect, num_outputs: 1, guidance: 3.5, num_inference_steps: 28, output_format: "webp", output_quality: 90 } }),
    });
    if (!startRes.ok) return null;
    const pred = await startRes.json();
    const id = pred.id as string;

    // Polling directo a Replicate dentro del presupuesto.
    const deadline = Date.now() + presupuestoMs - 4000;
    let rawUrl: string | null = null;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const st = await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!st.ok) continue;
      const d = await st.json();
      if (d.status === "succeeded") { rawUrl = d.output?.[0] ?? null; break; }
      if (d.status === "failed" || d.status === "canceled") return null;
    }
    if (!rawUrl) return null;

    const imgRes = await fetch(rawUrl);
    const clean = Buffer.from(await imgRes.arrayBuffer());
    const composed = await composeImage({ imageBuffer: clean, headline: titular, positionX: 50, positionY: 85, fontSize: 52, aspectRatio: aspect });

    const filePath = `${userId}/pack-${Date.now()}.png`;
    const { error } = await admin.storage.from("post-images").upload(filePath, composed, { contentType: "image/png", upsert: false });
    if (error) return null;
    return admin.storage.from("post-images").getPublicUrl(filePath).data.publicUrl;
  } catch {
    return null;
  }
}

/* --------------------------- distribución de redes --------------------------- */

const PESOS: Record<string, number> = { instagram: 0.7, facebook: 0.2, tiktok: 0.1 };

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

const RED_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" };

/* --------------------------------- principal --------------------------------- */

export interface ProcesarResultado { pack_id: string; dias: number; con_imagen: number; }

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

  const { data: profile } = await admin
    .from("profiles")
    .select("nombre_entidad, tipo_entidad, mision_valores, publico_objetivo, servicios_programas, causas_o_productos, temas_prioritarios, logros_numeros, info_extra, sector, pack_dias_semana, redes_activas, mostrar_dias_espana")
    .eq("id", userId).single();
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

  // Asignar fuente y tema a cada día.
  type Plan = { fecha: string; nombre_dia: string; tema: string; fuente: PackFuente };
  const planes: Plan[] = [];
  const indicesIA: number[] = [];
  dias.forEach((d, idx) => {
    const fu = fechas.find((f) => f.mes === d.mes && f.dia === d.dia && (f.recurrente !== false || f.ano_especifico === d.ano));
    if (fu) { planes.push({ fecha: d.fecha, nombre_dia: d.nombre_dia, tema: fu.nombre, fuente: "fecha_usuario" }); return; }
    const dc = diasClave.find((c) => c.mes === d.mes && c.dia === d.dia);
    if (dc) { planes.push({ fecha: d.fecha, nombre_dia: d.nombre_dia, tema: dc.nombre, fuente: "dia_clave" }); return; }
    planes.push({ fecha: d.fecha, nombre_dia: d.nombre_dia, tema: "", fuente: "ia_sugerencia" });
    indicesIA.push(idx);
  });

  // Rellenar huecos con temas IA basados en la actividad.
  if (indicesIA.length) {
    const temas = await temasIA(perfil, indicesIA.length);
    indicesIA.forEach((idx, k) => { planes[idx].tema = temas[k] || "Comparte una historia de tu organización"; });
  }

  // Distribución de redes.
  const redes = distribuirRedes(redesActivas, N);

  // Pase 1: texto/guion para TODOS los días (barato, garantizado).
  const contenido: PackDia[] = [];
  for (let i = 0; i < N; i++) {
    const plan = planes[i];
    const red = redes[i] || "instagram";
    const tipo = red;
    if (red === "tiktok") {
      const g = await generarGuionTikTok(perfil, plan.tema);
      contenido.push({ fecha: plan.fecha, nombre_dia: plan.nombre_dia, tipo, tema: plan.tema, imagen_url: null, titular: g.titular, texto: g.texto, hashtags: g.hashtags, guion_tiktok: g.guion, fuente: plan.fuente });
    } else {
      const r = await generarTextoRed(perfil, plan.tema, RED_LABEL[red] || "Instagram");
      contenido.push({ fecha: plan.fecha, nombre_dia: plan.nombre_dia, tipo, tema: plan.tema, imagen_url: null, titular: r.titular, texto: r.texto, hashtags: r.hashtags, prompt_imagen: r.prompt_imagen, guion_tiktok: null, fuente: plan.fuente });
    }
  }

  // Pase 2: imágenes EN PARALELO (no TikTok), tolerante a fallos individuales.
  let conImagen = 0;
  const restante = TIEMPO_TOTAL_MS - (Date.now() - t0);
  if (restante >= MIN_MS_PARA_IMAGEN) {
    const objetivos = contenido.map((d, i) => ({ d, i })).filter((x) => x.d.tipo !== "tiktok");
    const resultados = await Promise.allSettled(
      objetivos.map(({ d }) =>
        generarImagen(admin, userId, d.prompt_imagen || promptImagenFallback(d.tema), d.titular || d.tema, RED_LABEL[d.tipo] || "Instagram", restante)
      )
    );
    resultados.forEach((res, k) => {
      if (res.status === "fulfilled" && res.value) { objetivos[k].d.imagen_url = res.value; conImagen++; }
    });
  }

  // Guardar el pack y cerrar el job.
  const { data: pack, error: packErr } = await admin
    .from("packs_semanales")
    .insert({ user_id: userId, fecha_inicio: fechaInicio, pdf_url: null, contenido: { dias: contenido }, email_enviado: false })
    .select("id").single();
  if (packErr || !pack) throw new Error(`No se pudo guardar el pack: ${packErr?.message}`);

  await admin.from("pack_jobs").update({ estado: "done", pack_id: pack.id, updated_at: new Date().toISOString() }).eq("id", jobId);

  return { pack_id: pack.id as string, dias: N, con_imagen: conImagen };
}

export { MESES_DIA };
