import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIAS, CATEGORIA_LABEL } from "@/lib/categorias";

/**
 * Preselecciona hasta 5 categorías de interés a partir de los datos del perfil,
 * usando Claude. Inserta en categorias_usuario (ignorando duplicados). Es
 * idempotente y tolerante a fallos: si algo falla o no hay datos, devuelve [].
 */
export async function preseleccionarCategorias(supabase: SupabaseClient, userId: string): Promise<string[]> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("mision_valores, publico_objetivo, servicios_programas, causas_o_productos, temas_prioritarios, info_extra, sector, tipo_entidad")
      .eq("id", userId)
      .single();
    if (!profile) return [];

    const temas = Array.isArray(profile.temas_prioritarios) ? profile.temas_prioritarios.join(", ") : "";
    const contexto = [
      profile.mision_valores, profile.publico_objetivo, profile.servicios_programas,
      profile.causas_o_productos, temas, profile.info_extra, profile.sector,
    ].filter(Boolean).join("\n").trim();

    // Sin datos suficientes → no preseleccionamos nada.
    if (contexto.length < 20) return [];

    const lista = CATEGORIAS.map((c) => `- ${c} (${CATEGORIA_LABEL[c]})`).join("\n");
    const prompt = `Eres un clasificador. A partir de los datos de una organización, elige hasta 5 categorías (de la lista) que mejor encajen con su actividad.

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

    const raw = res.content[0].type === "text" ? res.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    const cats: string[] = Array.isArray(parsed.categorias)
      ? parsed.categorias.filter((c: unknown) => typeof c === "string" && (CATEGORIAS as readonly string[]).includes(c)).slice(0, 5)
      : [];

    if (cats.length) {
      await supabase
        .from("categorias_usuario")
        .upsert(cats.map((c) => ({ user_id: userId, categoria: c })), { onConflict: "user_id,categoria", ignoreDuplicates: true });
    }
    return cats;
  } catch (e) {
    console.error("preseleccionarCategorias error:", e);
    return [];
  }
}
