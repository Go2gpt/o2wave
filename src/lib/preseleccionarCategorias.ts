import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIA_LABEL, categoriasParaTipo } from "@/lib/categorias";

/**
 * Defaults sensatos por tipo de entidad. Se usan cuando la IA falla, devuelve
 * vacío, o el perfil tiene poca información — para no dejar el calendario vacío.
 */
const DEFAULTS_POR_TIPO: Record<string, string[]> = {
  ong_pequena: ["causas_sociales", "derechos_humanos", "educacion_formacion"],
  ong_mediana: ["causas_sociales", "derechos_humanos", "educacion_formacion"],
  empresa: ["fechas_comerciales", "ventas_marketing", "cliente_atencion", "rrhh_equipo"],
};

function defaultsPara(tipo: string | null | undefined): string[] {
  if (tipo && DEFAULTS_POR_TIPO[tipo]) return DEFAULTS_POR_TIPO[tipo];
  return tipo === "empresa" ? ["fechas_comerciales", "ventas_marketing"] : ["causas_sociales"];
}

/** Descripciones para guiar a la IA en la preselección. */
const CATEGORIA_DESC: Record<string, string> = {
  salud: "salud física y mental, enfermedades, prevención, investigación médica",
  causas_sociales: "exclusión social, pobreza, vivienda, empleo, personas sin hogar, migración",
  medioambiente: "clima, biodiversidad, contaminación, reciclaje, sostenibilidad",
  mujer_igualdad: "igualdad de género, violencia machista, empoderamiento de la mujer",
  infancia_juventud: "derechos de la infancia, juventud, educación temprana, protección de menores",
  diversidad_lgbtiq: "diversidad sexual y de género, colectivo LGBTIQ+, orgullo",
  mayores_discapacidad: "personas mayores, discapacidad, accesibilidad, dependencia",
  educacion_cultura: "educación, cultura, arte, lectura, ciencia, patrimonio",
  derechos_humanos: "derechos humanos, paz, refugio, justicia social, solidaridad internacional",
  fiestas_tradiciones: "fiestas nacionales, autonómicas y religiosas (Constitución, Reyes, Sant Jordi, Navidad, etc.)",
  fechas_comerciales: "campañas comerciales: San Valentín, Día del Padre/Madre, Black Friday, Navidad, rebajas",
  cliente_atencion: "atención al cliente, fidelización, experiencia de cliente, Día del Cliente/Consumidor",
  ventas_marketing: "ventas, marketing digital, redes sociales, email marketing, captación",
  innovacion_tecnologia: "innovación, tecnología, internet, ciberseguridad, transformación digital",
  rrhh_equipo: "personas, equipo, talento, bienestar laboral, salud y seguridad en el trabajo",
  sostenibilidad_empresa: "sostenibilidad, RSC, medio ambiente, reciclaje, economía circular",
  educacion_formacion: "educación, formación, aprendizaje continuo, lectura, alfabetización",
  industria_emprendimiento: "emprendimiento, pymes, industria, innovación empresarial, autónomos",
};

/** Extrae y valida el array de categorías de la respuesta de Claude. */
function extraerCategorias(raw: string, validas: string[]): string[] {
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
  return arr.filter((c): c is string => typeof c === "string" && validas.includes(c)).slice(0, 5);
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
        const validas = categoriasParaTipo(tipoEntidad);
        const lista = validas.map((c) => `- ${c} (${CATEGORIA_LABEL[c]}): ${CATEGORIA_DESC[c]}`).join("\n");
        const tipoLabel = tipoEntidad === "empresa" ? "empresa / PYME" : "ONG / entidad sin ánimo de lucro";
        const prompt = `Eres un clasificador. A partir de los datos de una organización, elige hasta 5 categorías (de la lista) que mejor encajen con su actividad y causas.

TIPO DE ORGANIZACIÓN: ${tipoLabel}

CATEGORÍAS VÁLIDAS (usa exactamente estos identificadores):
${lista}

REGLA IMPORTANTE sobre "fiestas_tradiciones": esta categoría es SOLO para organizaciones que claramente quieran publicar sobre fiestas nacionales, autonómicas o religiosas (Constitución, Reyes, Sant Jordi, Navidad, etc.). Para una ONG o entidad que trabaja con causas sociales NO la sugieras, salvo que los datos indiquen explícitamente un interés en celebrar fiestas o tradiciones culturales/religiosas.

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
        cats = extraerCategorias(raw, validas);
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
