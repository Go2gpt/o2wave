import type { SupabaseClient } from "@supabase/supabase-js";

export interface PremioEvento {
  id: string;
  slug: string;
  nombre: string;
  sector: string;
  hashtag_oficial: string | null;
  instagram_oficial: string | null;
  twitter_oficial: string | null;
  web_oficial: string | null;
  mes_celebracion: number | null;
  keywords: string[];
  descripcion: string | null;
}

/** minúsculas + sin tildes/diacríticos (para comparar keywords con el tema). */
export function normaliza(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Detecta si el tema del usuario menciona un premio del catálogo. Carga las
 * filas (son pocas) y busca cada keyword como palabra completa en el tema
 * normalizado. Resiliente: si la tabla no existe o falla, devuelve null y el
 * flujo de generación sigue normal.
 */
export async function detectarPremio(supabase: SupabaseClient, tema: string): Promise<PremioEvento | null> {
  const t = normaliza(tema);
  if (!t.trim()) return null;
  try {
    const { data, error } = await supabase.from("premios_eventos").select("*");
    if (error || !data) return null;
    for (const p of data as PremioEvento[]) {
      const match = (p.keywords || []).some((k) => {
        const kn = normaliza(k).trim();
        if (!kn) return false;
        const re = new RegExp(`\\b${kn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
        return re.test(t);
      });
      if (match) return p;
    }
    return null;
  } catch {
    return null;
  }
}

/** Bloque de contexto que se añade al prompt de Claude cuando hay premio detectado. */
export function construirBloquePremio(premio: PremioEvento, wiki: { titulo: string; extracto: string } | null): string {
  const lineas = [
    "",
    `EVENTO DETECTADO: el usuario habla de "${premio.nombre}".`,
    premio.hashtag_oficial ? `- Incluye el hashtag oficial del premio: ${premio.hashtag_oficial}.` : "",
    premio.instagram_oficial ? `- Puedes mencionar la cuenta oficial si encaja: ${premio.instagram_oficial}.` : "",
    "INSTRUCCIONES PARA EL POST DE AGRADECIMIENTO:",
    "- Tono cálido, cercano y profesional, en primera persona.",
    "- Reconoce el premio con naturalidad (sin sonar a nota de prensa).",
    "- Menciona al director, productores o equipo SOLO si aparecen en los datos de la obra de abajo; NUNCA inventes nombres.",
    "- Máximo 2200 caracteres.",
  ];
  if (wiki) {
    lineas.push(`DATOS DE LA OBRA (Wikipedia, "${wiki.titulo}") — usa SOLO lo que aparezca aquí, no añadas datos que no estén: ${wiki.extracto}`);
  }
  return lineas.filter(Boolean).join("\n");
}
