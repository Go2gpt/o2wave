import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { FEATURES, canUseFeature, isPlanActivo, puedeGenerarPostGratis, limitePostsMes, type PerfilGating } from "@/lib/plans";
import { detectarPremio, construirBloquePremio } from "@/lib/premios";
import { enriquecerDesdeWikipedia } from "@/lib/wikipedia";
import type { ContentFormData, GuionTikTok } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INSTRUCCION_TILDES = `IMPORTANTE: respeta SIEMPRE las tildes y diacríticos del nombre de la entidad y del idioma español. No escribas 'Fundacion', escribe 'Fundación'. No escribas 'Educacion', escribe 'Educación'. La acentuación es parte de la identidad correcta.`;

const NOMBRE_IDIOMA: Record<string, string> = { es: "español castellano", ca: "catalán", en: "inglés" };
function instruccionIdioma(idioma: string | null | undefined): string {
  const nombre = NOMBRE_IDIOMA[idioma || ""] ?? "español castellano";
  return `IMPORTANTE: el idioma del contenido (texto, hashtags, guion, titular) debe ser ESTRICTAMENTE ${nombre}. NO mezcles palabras de otros idiomas (catalán/español/inglés). Si el nombre de la entidad o un término técnico es inalterable, déjalo, pero el resto del texto y los hashtags deben ser ${nombre} puro.`;
}

// Regla de calidad de redacción. Literal en español (caso por defecto); variante
// equivalente para ca/en para no contradecir el idioma elegido (idioma_principal).
function reglaIdioma(idioma: string | null | undefined): string {
  if (idioma === "ca") return "REGLA D'IDIOMA: Escriu en català perfecte. Fes servir bé els accents. Sense faltes d'ortografia ni gramaticals. Revisa el text abans de retornar-lo.";
  if (idioma === "en") return "LANGUAGE RULE: Write in flawless English. No spelling or grammar mistakes. Proofread the text before returning it.";
  return "REGLA DE IDIOMA: Escribe en español ibérico (España) perfecto. Usa tildes correctamente. Sin faltas de ortografía ni gramaticales. Si hay dudas con palabras técnicas, usa el equivalente aceptado por la RAE. Revisa el texto antes de devolverlo.";
}

/** Tras una generación correcta, cuenta el post si el usuario está en plan gratuito. */
async function contarUsoGratis(supabase: SupabaseClient, p: (PerfilGating & { id: string }) | null) {
  if (!p || p.es_admin) return;
  const plan = p.plan_actual ?? "ong_pequena";
  if (FEATURES[plan]?.includes("posts_ilimitados")) return;
  await supabase.rpc("increment_posts_gratis", { p_user_id: p.id });
}

/** Nº de segmentos sugeridos según la duración elegida. */
function segmentosPara(duracion: string): string {
  if (duracion.startsWith("15")) return "1-2 segmentos muy cortos";
  if (duracion.startsWith("60")) return "5-7 segmentos";
  return "3-4 segmentos";
}

/** Parseo robusto: intenta JSON.parse directo y, si falla, extrae el primer {...}. */
function parseJSON(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { /* noop */ } }
  }
  return null;
}

/** Normaliza/valida la respuesta de Claude a un GuionTikTok. Devuelve null si no es usable. */
function normalizarGuion(data: unknown): Omit<GuionTikTok, "params"> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const guion = Array.isArray(o.guion) ? o.guion : [];
  if (!guion.length) return null;
  return {
    titular: typeof o.titular === "string" ? o.titular : "",
    guion: guion.map((s) => {
      const seg = (s ?? {}) as Record<string, unknown>;
      return {
        tiempo: String(seg.tiempo ?? ""),
        voz: String(seg.voz ?? ""),
        accion: String(seg.accion ?? ""),
      };
    }),
    planos: (Array.isArray(o.planos) ? o.planos : []).map((p, i) => {
      const pl = (p ?? {}) as Record<string, unknown>;
      return {
        numero: typeof pl.numero === "number" ? pl.numero : i + 1,
        descripcion: String(pl.descripcion ?? ""),
      };
    }),
    hashtags: (Array.isArray(o.hashtags) ? o.hashtags : [])
      .filter((h): h is string => typeof h === "string")
      .map((h) => (h.startsWith("#") ? h : `#${h}`)),
    audio_sugerido: typeof o.audio_sugerido === "string" ? o.audio_sugerido : "",
  };
}

/** Texto plano legible del guion (fallback para copiar/compartir y para la columna texto). */
function guionToText(g: Omit<GuionTikTok, "params">): string {
  const lineas: string[] = [];
  if (g.titular) lineas.push(`🎬 ${g.titular}`, "");
  lineas.push("📜 GUION");
  g.guion.forEach((s) => {
    lineas.push(`[${s.tiempo}] ${s.voz}${s.accion ? `\n   → ${s.accion}` : ""}`);
  });
  if (g.planos.length) {
    lineas.push("", "🎬 PLANOS A GRABAR");
    g.planos.forEach((p) => lineas.push(`${p.numero}. ${p.descripcion}`));
  }
  if (g.audio_sugerido) lineas.push("", `🎵 AUDIO: ${g.audio_sugerido}`);
  if (g.hashtags.length) lineas.push("", g.hashtags.join(" "));
  return lineas.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const formData: ContentFormData = await request.json();
    const { nombreOrganizacion, tipoOrganizacion, redSocial, formatoInstagram,
            entornoTikTok, duracionTikTok, tonoTikTok, tema, tono,
            incluirHashtags, incluirEmojis } = formData;

    // --- Auth + feature gating + límite de posts gratis ---
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "no_autenticado", mensaje: "Inicia sesión para generar contenido." }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, plan_actual, plan_estado, es_admin, posts_gratis_usados, sector, mision_valores, publico_objetivo, idioma_principal, acepta_mencion_go2")
      .eq("id", user.id)
      .single();

    if (!isPlanActivo(profile)) {
      return NextResponse.json({ error: "plan_suspendido", mensaje: "Tu suscripción tiene un pago pendiente. Actualiza tu método de pago para seguir generando contenido." }, { status: 402 });
    }
    const featRed = (redSocial || "").toLowerCase(); // "Instagram"→"instagram", etc.
    if (!canUseFeature(profile, featRed)) {
      return NextResponse.json({ error: "feature_no_disponible", mensaje: `${redSocial} no está disponible en tu plan. Mejora tu plan para usarlo.`, feature: featRed }, { status: 403 });
    }
    // Reset del contador si toca (día 1 de mes) y relectura del valor fresco.
    await supabase.rpc("reset_posts_gratis_if_due", { p_user_id: user.id });
    const { data: pFresh } = await supabase
      .from("profiles").select("plan_actual, es_admin, posts_gratis_usados").eq("id", user.id).single();
    const pUso = pFresh ?? profile; // respaldo si la relectura falla
    if (!puedeGenerarPostGratis(pUso)) {
      const limite = limitePostsMes(pUso);
      return NextResponse.json({ error: "limite_gratis_alcanzado", mensaje: `Has alcanzado el límite de tu plan (${limite} posts/mes). Mejora tu plan para seguir generando.` }, { status: 429 });
    }
    const perfilGating = { id: user.id, plan_actual: pUso?.plan_actual ?? null, es_admin: pUso?.es_admin ?? null };

    // Contexto del usuario (sector/misión/público) para enriquecer la generación.
    const contextoUsuario = [
      profile?.sector && `Sector: ${profile.sector}`,
      profile?.mision_valores && `Misión: ${profile.mision_valores}`,
      profile?.publico_objetivo && `Público objetivo: ${profile.publico_objetivo}`,
    ].filter(Boolean).join("\n");

    // Plan Estrella (MVP): si el tema menciona un premio conocido, enriquecemos
    // el prompt con su hashtag/cuentas oficiales y datos de la obra (Wikipedia).
    // Totalmente resiliente: cualquier fallo deja el flujo normal intacto.
    let bloquePremio = "";
    let premioDetectado: string | null = null;
    try {
      const premio = await detectarPremio(supabase, tema);
      if (premio) {
        premioDetectado = premio.nombre;
        const wiki = await enriquecerDesdeWikipedia(tema);
        bloquePremio = construirBloquePremio(premio, wiki);
      }
    } catch (e) {
      console.error("premios enriquecimiento error:", e instanceof Error ? e.message : e);
    }

    // Programa opt-in: solo si el usuario lo ha activado (10% dto.), añadimos una
    // mención discreta a Generación o2 al final del post. Si no, no se inyecta nada.
    const bloqueMencion = profile?.acepta_mencion_go2
      ? `\nAl final del post, añade una mención discreta tipo "Contenido creado con o2Wave, de la asociación @generacion-o2". Hazlo natural, sin alterar el mensaje principal del post.`
      : "";

    // ---------- TikTok: guion estructurado en JSON ----------
    if (redSocial === "TikTok") {
      const duracion = duracionTikTok || "30s";
      const tonoTk = tonoTikTok || "Cercano";
      const entorno = entornoTikTok || "no especificado";

      const system = `Eres un guionista experto en vídeos cortos para TikTok orientados al tercer sector y PYMEs.
Creas guiones prácticos y grabables con un smartphone y luz natural, sin equipo profesional.
Respondes SIEMPRE y ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, sin markdown.
${INSTRUCCION_TILDES}
${instruccionIdioma(profile?.idioma_principal)}
${reglaIdioma(profile?.idioma_principal)}`;

      const prompt = `Crea un guion de TikTok para "${nombreOrganizacion}" (${tipoOrganizacion}).

PARÁMETROS:
- Tema: ${tema}
- Duración total: ${duracion} → usa ${segmentosPara(duracion)}
- Tono: ${tonoTk} (refléjalo en el vocabulario y la energía del texto)
- Entorno o ubicación de grabación: ${entorno}
${contextoUsuario ? `\nCONTEXTO DE LA ENTIDAD:\n${contextoUsuario}\n` : ""}${bloquePremio ? `${bloquePremio}\n` : ""}
INSTRUCCIONES:
- El guion debe caber en la duración indicada.
- Los planos deben ser PRÁCTICOS para alguien sin equipo (smartphone + luz natural) y deben encajar con el entorno indicado (${entorno}): ambienta las tomas en ese lugar.
- ${incluirHashtags ? "Incluye 10-15 hashtags" : "Incluye 8-12 hashtags"} específicos para TikTok: mezcla virales (#fyp, #parati) con otros relevantes al tema y al sector.
- El audio sugerido NO debe ser una canción concreta (no sabes qué está en tendencia): describe el TIPO de audio que encaja (p. ej. "música instrumental suave tipo Lo-Fi", "audio viral de tendencia con ritmo enérgico", "solo voz, sin música").
${incluirEmojis ? "- Puedes usar emojis con moderación en la voz." : "- No uses emojis."}

Devuelve EXACTAMENTE esta estructura JSON:
{
  "titular": "string corto de 6-10 palabras, para usar como texto sobre la miniatura",
  "guion": [
    { "tiempo": "0-3s", "voz": "lo que se dice a cámara", "accion": "qué se muestra visualmente" }
  ],
  "planos": [
    { "numero": 1, "descripcion": "descripción práctica del plano" }
  ],
  "hashtags": ["#fyp", "#parati"],
  "audio_sugerido": "descripción genérica del tipo de audio"
}`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1600,
        system,
        messages: [{ role: "user", content: prompt }],
      });
      const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
      const guion = normalizarGuion(parseJSON(raw));

      if (guion) {
        await contarUsoGratis(supabase, perfilGating);
        return NextResponse.json({
          guion: { ...guion, params: { duracion, tono: tonoTk, entorno } },
          texto: guionToText(guion),
          titular: guion.titular || "",
          premio: premioDetectado,
        });
      }
      // Fallback: el JSON no se pudo estructurar → devolvemos el texto bruto.
      await contarUsoGratis(supabase, perfilGating);
      return NextResponse.json({ guion: null, texto: raw.trim(), titular: "", premio: premioDetectado });
    }

    // ---------- Instagram / Facebook: texto plano (como antes) ----------
    const system = `Eres un experto en comunicación para el tercer sector y PYMEs.
Genera contenido auténtico, directo y efectivo para redes sociales.
Adapta el tono y formato exactamente a la red social indicada.
Responde SOLO con el contenido generado, sin explicaciones adicionales.
${INSTRUCCION_TILDES}
${instruccionIdioma(profile?.idioma_principal)}
${reglaIdioma(profile?.idioma_principal)}`;

    const esWhatsApp = redSocial === "WhatsApp";
    const prompt = `Contenido para ${redSocial}${formatoInstagram ? ` (${formatoInstagram})` : ""}:
Entidad: ${nombreOrganizacion} (${tipoOrganizacion})
Tema: ${tema} | Tono: ${tono}
${contextoUsuario ? `\n${contextoUsuario}\n` : ""}${(esWhatsApp || !incluirHashtags) ? "❌ Sin hashtags" : "✅ Con hashtags"} | ${incluirEmojis ? "✅ Con emojis" : "❌ Sin emojis"}
${redSocial === "Instagram" ? "Máximo 150 palabras, impacto visual." : ""}
${redSocial === "Facebook" ? "Hasta 200 palabras, narrativo." : ""}
${esWhatsApp ? "Mensaje para difundir por WhatsApp: breve y conversacional (máximo 80 palabras), cercano y directo como un mensaje a la comunidad. NO incluyas hashtags ni el símbolo #." : ""}${bloquePremio ? `\n${bloquePremio}\n` : ""}${bloqueMencion}
Texto listo para publicar, sin explicaciones:`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const texto = response.content[0].type === "text" ? response.content[0].text : "";

    // Titular corto para estampar sobre la imagen.
    const tRes = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 40,
      messages: [{
        role: "user",
        content: `Dame un titular muy corto (máximo 8 palabras), impactante y en castellano, para superponer sobre una imagen de redes sociales de "${nombreOrganizacion}" sobre: ${tema}. Responde SOLO con el titular, sin comillas ni explicaciones.`,
      }],
    });
    const titular = (tRes.content[0].type === "text" ? tRes.content[0].text : "").trim().replace(/^["'«»]|["'«»]$/g, "");

    await contarUsoGratis(supabase, perfilGating);
    return NextResponse.json({ texto, titular, premio: premioDetectado });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: `Error generando texto: ${msg}` }, { status: 500 });
  }
}
