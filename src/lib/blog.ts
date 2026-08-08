/**
 * Lectura del blog WordPress (generacion-o2.org) vía REST pública, para llevar
 * noticias YA publicadas a redes desde o2Wave. Solo LECTURA de posts en estado
 * publicado (no requiere auth). El agente "buenas noticias blog" publica en
 * WordPress; o2Wave lee de aquí. Solo servidor.
 */
const WP_BASE = process.env.BLOG_WP_BASE || "https://generacion-o2.org/wp-json/wp/v2";

export interface EntradaBlog {
  id: number; titulo: string; fecha: string; resumen: string;
  texto: string; imagenUrl: string | null; link: string; tags: string[];
}

function decode(s: string): string {
  return (s || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#0?39;|&apos;/g, "'");
}

function stripHtml(html: string): string {
  return decode((html || "")
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Últimas entradas publicadas del blog (más recientes primero). Devuelve [] si falla. */
export async function fetchEntradasBlog(limit = 8): Promise<EntradaBlog[]> {
  try {
    const url = `${WP_BASE}/posts?per_page=${Math.min(20, Math.max(1, limit))}&_embed&status=publish`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return [];
    const posts = (await res.json()) as Record<string, unknown>[];
    return (Array.isArray(posts) ? posts : []).map((p) => {
      const emb = (p._embedded ?? {}) as Record<string, unknown>;
      const media = ((emb["wp:featuredmedia"] as { source_url?: string }[] | undefined)?.[0]?.source_url) ?? null;
      const terms = ((emb["wp:term"] as { taxonomy?: string; name?: string }[][] | undefined) || []).flat();
      const tags = terms.filter((t) => t?.taxonomy === "post_tag" && t?.name)
        .map((t) => `#${String(t.name).replace(/\s+/g, "")}`).slice(0, 6);
      const title = p.title as { rendered?: string } | undefined;
      const excerpt = p.excerpt as { rendered?: string } | undefined;
      const content = p.content as { rendered?: string } | undefined;
      return {
        id: Number(p.id),
        titulo: decode(title?.rendered || "").trim(),
        fecha: String(p.date || "").slice(0, 10),
        resumen: stripHtml(excerpt?.rendered || "").slice(0, 240),
        texto: stripHtml(content?.rendered || "").slice(0, 1800),
        imagenUrl: media,
        link: String(p.link || ""),
        tags,
      };
    });
  } catch {
    return [];
  }
}
