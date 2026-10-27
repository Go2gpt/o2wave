import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEntradasBlog, type EntradaBlog } from "@/lib/blog";
import { bannerMarca } from "@/lib/composeImage";

/**
 * Blog → Instagram (go2.bcn). Detecta noticias NUEVAS del blog y las deja
 * PROGRAMADAS en autopost_posts, en orden cronológico (más antigua primero, para
 * que el feed quede en el mismo orden que el blog) y alternando claro/oscuro para
 * mantener el damero. El cron de publicación (C5) las publica.
 *
 * Diseño sin migración: cada pieza se marca con tipo="blog" y
 * perfil_publicacion="blog:{blogId}:{variante}" → sirve de dedup (blogId) y de
 * estado de color (variante). Solo servidor.
 */

const ETIQUETA_CUENTA = process.env.BLOG_IG_CUENTA || "go2.bcn";
const BUCKET = "post-images";
// Solo auto-publica noticias publicadas a partir de esta fecha (evita re-publicar
// las que ya estaban en el feed al arrancar). Configurable por env.
const DESDE = process.env.BLOG_IG_DESDE || "2026-10-27";

function semanaInicioHoy(): string {
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  return base.toISOString().slice(0, 10);
}

function subtituloDe(e: EntradaBlog): string | null {
  const s = (e.resumen || "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  const frase = s.split(/(?<=[.!?])\s/)[0] || s;
  return frase.split(/\s+/).slice(0, 14).join(" ");
}

const IG_MAX = 2200;

/** Recorta sin cortar a mitad de frase: intenta acabar en . ! ? o salto; si no, en palabra. */
function recortarLimpio(txt: string, max: number): string {
  if (txt.length <= max) return txt;
  const cut = txt.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf("\n"));
  if (stop > max * 0.6) return cut.slice(0, stop + 1).trim();
  const sp = cut.lastIndexOf(" ");
  return ((sp > 0 ? cut.slice(0, sp) : cut).trim()) + "…";
}

function captionDe(e: EntradaBlog): string {
  // Texto COMPLETO de la noticia para leerla entera en Instagram (sin "leer más").
  // Reserva sitio para título + hashtags y recorta el cuerpo de forma limpia.
  const tags = (e.tags || []).join(" ");
  const cola = tags ? `\n\n${tags}` : "";
  const cabecera = `${e.titulo}\n\n`;
  const espacio = Math.max(0, IG_MAX - cabecera.length - cola.length);
  const cuerpo = recortarLimpio((e.texto || e.resumen || "").trim(), espacio);
  return `${cabecera}${cuerpo}${cola}`.replace(/\n{3,}/g, "\n\n").trim();
}

export interface CrearNovedadOpts {
  max?: number;            // cuántas piezas crear en esta ejecución (orden cronológico). Def. 1.
  dryRun?: boolean;        // genera banner + sube imagen de la 1ª, pero NO crea pieza ni publica.
  ignorarCutoff?: boolean; // ignora DESDE (solo pruebas).
  forzarVariante?: "dark" | "light";
}

export interface PiezaBlog {
  postId?: string; blogId: number; titulo: string; variante: "dark" | "light"; pill: string; imagen_url: string;
}
export interface NovedadBlogResult {
  creadas?: PiezaBlog[];
  dry?: PiezaBlog;
  nada?: string;
  error?: string;
}

async function generarYSubir(admin: SupabaseClient, entrada: EntradaBlog, variante: "dark" | "light"): Promise<{ imagen_url: string; pill: string } | { error: string }> {
  const pill = entrada.categoria || "Buenas noticias";
  const banner = await bannerMarca({
    aspectRatio: "4:5", variante, pill,
    titulo: entrada.titulo, subtitulo: subtituloDe(entrada), organizacion: "generacion-o2.org",
  });
  const path = `blog-ig/${entrada.id}-${variante}-${Date.now()}.png`;
  const { error: upErr } = await admin.storage.from(BUCKET).upload(path, banner, { contentType: "image/png", upsert: false });
  if (upErr) return { error: "No se pudo subir la imagen: " + upErr.message };
  return { imagen_url: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, pill };
}

export async function crearNovedadesBlog(admin: SupabaseClient, opts: CrearNovedadOpts = {}): Promise<NovedadBlogResult> {
  const max = Math.max(1, Math.min(20, opts.max ?? 1));

  // 1. Cuenta go2.bcn
  const { data: cuenta } = await admin.from("autopost_cuentas")
    .select("id, etiqueta, ig_user_id, activo").ilike("etiqueta", ETIQUETA_CUENTA).maybeSingle();
  if (!cuenta) return { error: `No encuentro la cuenta "${ETIQUETA_CUENTA}" en autopost_cuentas.` };
  if (!cuenta.ig_user_id) return { error: `La cuenta ${ETIQUETA_CUENTA} no tiene Instagram vinculado.` };

  // 2. Noticias del blog (WordPress las devuelve de más nueva a más antigua)
  const entradas = await fetchEntradasBlog(20);
  if (!entradas.length) return { nada: "El blog no devolvió entradas." };

  // 3. Dedup + última variante usada (de nuestras piezas tipo="blog")
  const { data: previos } = await admin.from("autopost_posts")
    .select("perfil_publicacion, created_at").eq("cuenta_id", cuenta.id).eq("tipo", "blog")
    .order("created_at", { ascending: false });
  const yaIds = new Set<number>();
  let ultimaVariante: "dark" | "light" | null = null;
  for (const p of previos || []) {
    const m = /^blog:(\d+):(dark|light)$/.exec(String((p as { perfil_publicacion?: string }).perfil_publicacion || ""));
    if (m) { yaIds.add(Number(m[1])); if (ultimaVariante === null) ultimaVariante = m[2] as "dark" | "light"; }
  }

  // 4. Nuevas (no publicadas) + a partir de DESDE, en ORDEN CRONOLÓGICO (más
  //    antigua primero → el feed queda igual que el blog). Reversa del orden WP.
  const nuevas = entradas
    .filter((e) => !yaIds.has(e.id))
    .filter((e) => opts.ignorarCutoff || (e.fecha && e.fecha >= DESDE))
    .reverse();
  if (!nuevas.length) return { nada: `Sin noticias nuevas desde ${DESDE}.` };

  // 5. Variante inicial: contraria a la última (si no hay, el feed más reciente es
  //    claro → empezamos en oscuro).
  let variante: "dark" | "light" = opts.forzarVariante ?? (ultimaVariante === "dark" ? "light" : "dark");

  // Dry-run: solo genera la 1ª y la devuelve, sin publicar.
  if (opts.dryRun) {
    const e = nuevas[0];
    const r = await generarYSubir(admin, e, variante);
    if ("error" in r) return { error: r.error };
    return { dry: { blogId: e.id, titulo: e.titulo, variante, pill: r.pill, imagen_url: r.imagen_url } };
  }

  // 6. Crear hasta `max` piezas programadas, alternando color.
  const creadas: PiezaBlog[] = [];
  for (const e of nuevas.slice(0, max)) {
    const r = await generarYSubir(admin, e, variante);
    if ("error" in r) { if (creadas.length) break; return { error: r.error }; }
    const { data: post, error: insErr } = await admin.from("autopost_posts").insert({
      cuenta_id: cuenta.id, estado: "scheduled", perfil_publicacion: `blog:${e.id}:${variante}`,
      tipo: "blog", texto: captionDe(e), imagen_url: r.imagen_url, red: "instagram",
      publish_at: new Date().toISOString(), semana_inicio: semanaInicioHoy(),
    }).select("id").single();
    if (insErr) { if (creadas.length) break; return { error: "No se pudo crear la pieza: " + insErr.message }; }
    creadas.push({ postId: post.id as string, blogId: e.id, titulo: e.titulo, variante, pill: r.pill, imagen_url: r.imagen_url });
    variante = variante === "dark" ? "light" : "dark"; // alterna para la siguiente
  }
  if (!creadas.length) return { nada: "No se creó ninguna pieza." };
  return { creadas };
}
