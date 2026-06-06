import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIAS, CATEGORIA_LABEL } from "@/lib/categorias";

/**
 * Defaults sensatos por tipo de entidad. Se usan cuando la IA falla, devuelve
 * vacío, o el perfil tiene poca información — para no dejar el calendario vacío.
 */
const DEFAULTS_POR_TIPO: Record<string, string[]> = {
  ong_pequena: ["social", "solidaridad_dh"],
  ong_mediana: ["social", "solidaridad_dh"],
  empresa: ["social"],
};

function defaultsPara(tipo: string | null | undefined): string[] {
  return (tipo && DEFAULTS_POR_TIPO[tipo]) || ["social"];
}

/** Extrae y valida el array de categorías de la respuesta de Claude. */
function extraerCategorias(raw: string): string[] {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // La IA pudo envolver el JSON en texto: extraemos el primer objeto {...}.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { parsed = JSON.parse(m[0]); } catch { /* noop */ } }
  }
  const arr = (parsed && typeof parsed === "object" && Array.isArray((parsed as { categorias?: unknown }).categorias))
    ? (parsed as { categorias: unknown[] }).categorias
    : [];
  return arr.filter((c): c is string => typeof c === "string" && (CATEGORIAS as readonly string[]).includes(c)).slice(0, 5);
}

/** Inserta las categorías para el usuario, ignorando duplicados. Devuelve true si OK. */
async function insertarCategorias(supabase: SupabaseClient, userId: string, cats: string[]): Promise<boolean> {
  if (!cats.length) return true;
  const { error } = await supabase
    .from("categorias_usuario")
    .upsert(cats.map((c) => ({ user_id: userId, categoria: c })), { onConflict: "user_id,categoria", ignoreDuplicates: true });
  if (error) { console.error("preseleccionarCategorias: error al insertar categorías:", error); return false; }
  return true;
}

/**
 * Preselecciona hasta 5 categorías de interés a partir de los datos del perfil,
 * usando Claude. Inserta en categorias_usuario (ignorando duplicados). Es
 * idempotente y tolerante a fallos: si la IA falla o hay pocos datos, siembra
 * unos defaults razonables por tipo de entidad en lugar de dejar el calendario
 * vacío. Solo devuelve [] si no se pudo escribir nada en absoluto.
 */
export async function preseleccionarCategorias(supabase: SupabaseClient, userId: string): Promise<string[]> {
  let tipoEntidad: string | null = null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("mision_valores, publico_objetivo, servicios_programas, causas_o_productos, temas_prioritarios, info_extra, sector, tipo_entidad")
      .eq("id", userId)
      .single();
    if (!profile) return [];
    tipoEntidad = profile.tipo_entidad ?? null;

    const temas = Array.isArray(profile.temas_prioritarios) ? profile.temas_prioritarios.join(", ") : "";
    const contexto = [
      profile.mision_valores, profile.publico_objetivo, profile.servicios_programas,
      profile.causas_o_productos, temas, profile.info_extra, profile.sector,
    ].filter(Boolean).join("\n").trim();

    let cats: string[] = [];

    // Solo llamamos a la IA si hay contexto suficiente. Si falla, no rompe nada:
    // caemos a los defaults por tipo de entidad más abajo.
    if (contexto.length >= 20) {
      try {
        const lista = CATEGORIAS.map((c) => `- ${c} (${CATEGORIA_LABEL[c]})`).join("\n");
        const tipoLabel = tipoEntidad === "empresa" ? "empresa / PYME" : "ONG / entidad sin ánimo de lucro";
        const prompt = `Eres un clasificador. A partir de los datos de una organización, elige hasta 5 categorías (de la lista) que mejor encajen con su actividad.

TIPO DE ORGANIZACIÓN: ${tipoLabel}

CATEGORÍAS VÁLIDAS (usa exactamente estos identificadores):
${lista}

DATOS DE LA ORGANIZACIÓN:
${contexto}

Responde ÚNICAMENTE con un JSON válido: {"categorias": ["id1", "id2", ...]} con un máximo de 5 identificadores de la lista. Si no hay información suficiente, devuelve {"categorias": []}. No inventes categorías que no estén en la lista.`;

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const res = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 200,
          messages: [{ role: "user", content: prompt }],
        });
        const raw = res.content[0]?.type === "text" ? res.content[0].text : "";
        cats = extraerCategorias(raw);
      } catch (e) {
        console.error("preseleccionarCategorias: fallo en la llamada IA, se usarán defaults:", e);
      }
    }

    // Fallback: si la IA no aportó nada (error, datos escasos o respuesta vacía),
    // sembramos defaults por tipo para que el calendario no quede vacío.
    if (cats.length === 0) cats = defaultsPara(tipoEntidad);

    const ok = await insertarCategorias(supabase, userId, cats);
    return ok ? cats : [];
  } catch (e) {
    console.error("preseleccionarCategorias error:", e);
    // Último recurso: intentar sembrar defaults de todas formas.
    try {
      const cats = defaultsPara(tipoEntidad);
      const ok = await insertarCategorias(supabase, userId, cats);
      return ok ? cats : [];
    } catch {
      return [];
    }
  }
}
