import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchEntradasBlog, type EntradaBlog } from "@/lib/blog";

/**
 * Blog → Instagram (go2.bcn). Detecta noticias NUEVAS del blog y las deja
 * PROGRAMADAS en autopost_posts, en orden cronológico. REUTILIZA la imagen
 * destacada del blog (misma imagen y mismo color que la web → blog e Instagram
 * siempre idénticos y sincronizados; el color lo decide el agente del blog). El
 * cron de publicación (C5) las publica.
 *
 * Diseño sin migración: cada pieza se marca con tipo="blog" y
 * perfil_publicacion="blog:{blogId}" → dedup por blogId. Solo servidor.
 */

const ETIQUETA_CUENTA = process.env.BLOG_IG_CUENTA || "go2.bcn";
const BUCKET = "post-images";
// Solo auto-publica noticias publicadas a partir de esta fecha (evita re-publicar
// las que ya estaban en el feed al arrancar). Configurable por env.
const DESDE = process.env.BLOG_IG_DESDE || "2026-10-27";
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
  const tags = (e.tags || []).join(" ");
  const cola = tags ? `\n\n${tags}` : "";
  const cabecera = `${e.titulo}\n\n`;
  const espacio = Math.max(0, IG_MAX - cabecera.length - cola.length);
  const cuerpo = recortarLimpio((e.texto || e.resumen || "").trim(), espacio);
  return `${cabecera}${cuerpo}${cola}`.replace(/\n{3,}/g, "\n\n").trim();
}

/** Reutiliza la imagen destacada del blog. La copia al bucket propio (estabilidad
 *  / CORS); si la copia falla, usa la URL de WordPress directamente. */
async function imagenDelBlog(admin: SupabaseClient, e: EntradaBlog): Promise<string | null> {
  if (!e.imagenUrl) return null;
  try {
    const res = await fetch(e.imagenUrl);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get("content-type") || "image/jpeg";
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const path = `blog-ig/${e.id}-${Date.now()}.${ext}`;
      const { error } = await admin.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: false });
      if (!error) return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }
  } catch { /* usa la URL del blog como respaldo */ }
  return e.imagenUrl;
}

export interface CrearNovedadOpts {
  max?: number;            // cuántas piezas crear en esta ejecución (orden cronológico). Def. 1.
  dryRun?: boolean;        // devuelve la 1ª candidata SIN crear la pieza ni publicar.
  ignorarCutoff?: boolean; // ignora DESDE (solo pruebas).
}

export interface PiezaBlog {
  postId?: string; blogId: number; titulo: string; imagen_url: string;
}
export interface NovedadBlogResult {
  creadas?: PiezaBlog[];
  dry?: PiezaBlog;
  nada?: string;
  error?: string;
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

  // 3. Dedup: ids ya publicados (perfil_publicacion = "blog:{id}" o legado "blog:{id}:{variante}")
  const { data: previos } = await admin.from("autopost_posts")
    .select("perfil_publicacion").eq("cuenta_id", cuenta.id).eq("tipo", "blog");
  const yaIds = new Set<number>();
  for (const p of previos || []) {
    const m = /^blog:(\d+)/.exec(String((p as { perfil_publicacion?: string }).perfil_publicacion || ""));
    if (m) yaIds.add(Number(m[1]));
  }

  // 4. Nuevas (no publicadas) + a partir de DESDE, en ORDEN CRONOLÓGICO (más
  //    antigua primero → el feed queda igual que el blog). Reversa del orden WP.
  const nuevas = entradas
    .filter((e) => !yaIds.has(e.id))
    .filter((e) => opts.ignorarCutoff || (e.fecha && e.fecha >= DESDE))
    .reverse();
  if (!nuevas.length) return { nada: `Sin noticias nuevas desde ${DESDE}.` };

  // Dry-run: devuelve la 1ª candidata con su imagen del blog, sin crear nada.
  if (opts.dryRun) {
    const e = nuevas[0];
    const img = await imagenDelBlog(admin, e);
    if (!img) return { error: `La noticia ${e.id} no tiene imagen destacada.` };
    return { dry: { blogId: e.id, titulo: e.titulo, imagen_url: img } };
  }

  // 5. Crear hasta `max` piezas programadas (orden cronológico), con la imagen del blog.
  const creadas: PiezaBlog[] = [];
  for (const e of nuevas.slice(0, max)) {
    const imagen_url = await imagenDelBlog(admin, e);
    if (!imagen_url) continue; // sin imagen no se puede publicar en IG → la saltamos
    const { data: post, error: insErr } = await admin.from("autopost_posts").insert({
      cuenta_id: cuenta.id, estado: "scheduled", perfil_publicacion: `blog:${e.id}`,
      tipo: "blog", texto: captionDe(e), imagen_url, red: "instagram",
      // semana_inicio = null: queda fuera del índice único uq_autopost_posts_semana
      // (cuenta_id, semana_inicio) WHERE semana_inicio IS NOT NULL.
      publish_at: new Date().toISOString(), semana_inicio: null,
    }).select("id").single();
    if (insErr) { if (creadas.length) break; return { error: "No se pudo crear la pieza: " + insErr.message }; }
    creadas.push({ postId: post.id as string, blogId: e.id, titulo: e.titulo, imagen_url });
  }
  if (!creadas.length) return { nada: "No se creó ninguna pieza (¿sin imagen destacada?)." };
  return { creadas };
}
